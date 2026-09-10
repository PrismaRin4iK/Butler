import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { isYouTubeUrl, extractYouTubeVideoId, extractYouTubePlaylistId, fetchYouTubeVideoInfo, fetchYouTubePlaylistVideos } from '../../../../lib/parsers/youtube';
import { isHttpUrl, parseArticle } from '../../../../lib/parsers/article';
import { enrichItemWithAI } from '../../../../lib/ai/gemini';
import { BacklogItemInsert, ItemType, Json } from '../../../../types/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, customMinutes, type: explicitType, rawContent: explicitRawContent } = body;

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json(
        { error: 'Необходимо указать ссылку или название задачи' },
        { status: 400 }
      );
    }

    const trimmedInput = input.trim();
    const supabase = await createClient();

    // 1. Get authenticated user
    let userId: string | null = null;
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      userId = user.id;
    } else {
      // In local development or guest mode, fallback to demo/admin user
      const demoId = '00000000-0000-0000-0000-000000000000';
      userId = demoId;

      // Ensure demo profile exists using admin client if configured
      try {
        const admin = createAdminClient();
        await admin.from('profiles').upsert({
          id: demoId,
          email: 'demo@butler.app',
        });
      } catch (err) {
        console.warn('Could not auto-create demo profile:', err);
      }
    }

    // 2. Identify content type and parse
    const itemsToInsert: BacklogItemInsert[] = [];

    if (isYouTubeUrl(trimmedInput)) {
      const playlistId = extractYouTubePlaylistId(trimmedInput);
      const videoId = extractYouTubeVideoId(trimmedInput);

      // Check if it's a playlist
      if (playlistId && !videoId) {
        const playlistVideos = await fetchYouTubePlaylistVideos(playlistId);
        if (playlistVideos.length > 0) {
          for (const vid of playlistVideos) {
            const aiData = await enrichItemWithAI({
              title: vid.title,
              type: 'youtube',
              estimatedMinutes: vid.estimatedMinutes,
            });

            itemsToInsert.push({
              user_id: userId,
              type: 'youtube',
              title: vid.title,
              url: `https://www.youtube.com/watch?v=${vid.videoId}`,
              source_metadata: vid.metadata as unknown as Json,
              estimated_minutes: aiData.estimated_minutes || vid.estimatedMinutes,
              energy_level: aiData.energy_level,
              ai_summary: aiData.ai_summary,
              tags: aiData.tags,
              status: 'inbox',
            });
          }
        }
      }

      // If single video or playlist fallback
      if (itemsToInsert.length === 0 && videoId) {
        const videoInfo = await fetchYouTubeVideoInfo(videoId);
        const aiData = await enrichItemWithAI({
          title: videoInfo.title,
          type: 'youtube',
          estimatedMinutes: videoInfo.estimatedMinutes,
        });

        itemsToInsert.push({
          user_id: userId,
          type: 'youtube',
          title: videoInfo.title,
          url: `https://www.youtube.com/watch?v=${videoInfo.videoId}`,
          source_metadata: videoInfo.metadata as unknown as Json,
          estimated_minutes: aiData.estimated_minutes || videoInfo.estimatedMinutes,
          energy_level: aiData.energy_level,
          ai_summary: aiData.ai_summary,
          tags: aiData.tags,
          status: 'inbox',
        });
      }
    } else if (isHttpUrl(trimmedInput)) {
      // 3. Article
      const article = await parseArticle(trimmedInput);
      const aiData = await enrichItemWithAI({
        title: article.title,
        type: 'article',
        contentSnippet: article.metadata.description || article.rawContent.slice(0, 1000),
        estimatedMinutes: article.estimatedMinutes,
      });

      itemsToInsert.push({
        user_id: userId,
        type: 'article',
        title: article.title,
        url: trimmedInput,
        raw_content: article.rawContent,
        source_metadata: article.metadata as unknown as Json,
        estimated_minutes: aiData.estimated_minutes || article.estimatedMinutes,
        energy_level: aiData.energy_level,
        ai_summary: aiData.ai_summary,
        tags: aiData.tags,
        status: 'inbox',
      });
    } else {
      // 4. Custom Task
      const initialMinutes = customMinutes ? parseInt(String(customMinutes), 10) : undefined;
      const aiData = await enrichItemWithAI({
        title: trimmedInput,
        type: explicitType || 'custom_task',
        estimatedMinutes: initialMinutes,
      });

      const finalMinutes = initialMinutes || aiData.estimated_minutes || 15;

      itemsToInsert.push({
        user_id: userId,
        type: (explicitType as ItemType) || 'custom_task',
        title: trimmedInput,
        url: null,
        raw_content: explicitRawContent || null,
        source_metadata: { notes: explicitRawContent || '' } as unknown as Json,
        estimated_minutes: finalMinutes,
        energy_level: aiData.energy_level,
        ai_summary: aiData.ai_summary,
        tags: aiData.tags,
        status: 'inbox',
      });
    }

    if (itemsToInsert.length === 0) {
      return NextResponse.json(
        { error: 'Не удалось обработать входящие данные' },
        { status: 422 }
      );
    }

    // 5. Insert into Supabase
    // We try with user's client first; if not authenticated, fallback to admin client
    let insertedData = null;
    let insertError = null;

     
    const res = await (supabase.from('backlog_items') as any).insert(itemsToInsert).select();
    if (res.error) {
      // Fallback to admin client if RLS blocked unauthenticated dev request
      const admin = createAdminClient();
       
      const adminRes = await (admin.from('backlog_items') as any).insert(itemsToInsert).select();
      insertedData = adminRes.data;
      insertError = adminRes.error;
    } else {
      insertedData = res.data;
    }

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return NextResponse.json(
        { error: 'Ошибка сохранения в базу данных', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        count: insertedData?.length || itemsToInsert.length,
        items: insertedData || itemsToInsert,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('API /api/items/create error:', error);
    const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
