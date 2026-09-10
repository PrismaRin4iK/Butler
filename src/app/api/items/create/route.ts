import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { getEffectiveUserId } from '../../../../lib/supabase/auth-helper';
import { isYouTubeUrl, extractYouTubeVideoId, extractYouTubePlaylistId, fetchYouTubeVideoInfo, fetchYouTubePlaylistVideos } from '../../../../lib/parsers/youtube';
import { isHttpUrl, parseArticle } from '../../../../lib/parsers/article';
import { enrichItemWithAI } from '../../../../lib/ai/groq';
import { BacklogItemInsert, EnergyLevel, ItemType, Json } from '../../../../types/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      input,
      customMinutes,
      type: explicitType,
      rawContent: explicitRawContent,
      energyLevel: explicitEnergyLevel,
    } = body;

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json(
        { error: 'Необходимо указать ссылку или название задачи' },
        { status: 400 }
      );
    }

    const trimmedInput = input.trim();
    const supabase = await createClient();

    // 1. Get authenticated or guest user ID
    const userId = await getEffectiveUserId();

    const normalizedUrl = trimmedInput.startsWith('http://') || trimmedInput.startsWith('https://')
      ? trimmedInput
      : `https://${trimmedInput}`;

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
        } else {
          // If no API key or empty playlist, create an item for the playlist itself
          const title = `Плейлист YouTube (${playlistId})`;
          const aiData = await enrichItemWithAI({
            title,
            type: 'youtube',
            estimatedMinutes: 30,
          });

          itemsToInsert.push({
            user_id: userId,
            type: 'youtube',
            title,
            url: `https://www.youtube.com/playlist?list=${playlistId}`,
            source_metadata: { playlist_id: playlistId, type: 'playlist' } as unknown as Json,
            estimated_minutes: aiData.estimated_minutes || 30,
            energy_level: aiData.energy_level,
            ai_summary: aiData.ai_summary,
            tags: aiData.tags,
            status: 'inbox',
          });
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

      // If YouTube URL but neither video nor playlist (e.g. channel URL)
      if (itemsToInsert.length === 0) {
        const title = `YouTube: ${trimmedInput}`;
        const aiData = await enrichItemWithAI({
          title,
          type: 'youtube',
          estimatedMinutes: 20,
        });

        itemsToInsert.push({
          user_id: userId,
          type: 'youtube',
          title,
          url: normalizedUrl,
          source_metadata: { url: normalizedUrl } as unknown as Json,
          estimated_minutes: aiData.estimated_minutes || 20,
          energy_level: aiData.energy_level,
          ai_summary: aiData.ai_summary,
          tags: aiData.tags,
          status: 'inbox',
        });
      }
    } else if (isHttpUrl(trimmedInput)) {
      // 3. Article
      const article = await parseArticle(normalizedUrl);
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
        url: normalizedUrl,
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
      const finalEnergy =
        explicitEnergyLevel && ['low', 'medium', 'high'].includes(explicitEnergyLevel)
          ? (explicitEnergyLevel as EnergyLevel)
          : aiData.energy_level;

      itemsToInsert.push({
        user_id: userId,
        type: (explicitType as ItemType) || 'custom_task',
        title: trimmedInput,
        url: null,
        raw_content: explicitRawContent || null,
        source_metadata: { notes: explicitRawContent || '' } as unknown as Json,
        estimated_minutes: finalMinutes,
        energy_level: finalEnergy,
        ai_summary: aiData.ai_summary,
        tags: aiData.tags,
        status: 'inbox',
      });
    }

    // Safety fallback: itemsToInsert will never be empty
    if (itemsToInsert.length === 0) {
      itemsToInsert.push({
        user_id: userId,
        type: 'custom_task',
        title: trimmedInput,
        url: isHttpUrl(trimmedInput) ? normalizedUrl : null,
        raw_content: null,
        source_metadata: { input: trimmedInput } as unknown as Json,
        estimated_minutes: 15,
        energy_level: 'medium',
        ai_summary: 'Элемент бэклога',
        tags: ['заметка'],
        status: 'inbox',
      });
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
