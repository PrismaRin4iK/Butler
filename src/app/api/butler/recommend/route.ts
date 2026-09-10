import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { selectButlerRecommendation } from '../../../../lib/butler/engine';
import { BacklogItem, EnergyLevel, ItemType, RecommendRequest } from '../../../../types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { availableMinutes, energyState, preferredType, excludeIds } = body;

    if (typeof availableMinutes !== 'number' || availableMinutes <= 0) {
      return NextResponse.json(
        { error: 'Параметр availableMinutes должен быть положительным числом' },
        { status: 400 }
      );
    }

    if (!['low', 'medium', 'high'].includes(energyState)) {
      return NextResponse.json(
        { error: 'Неверный уровень энергии (допустимы: low, medium, high)' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || '00000000-0000-0000-0000-000000000000';

    // Fetch inbox candidates from database
     
    let query: any = supabase
      .from('backlog_items')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'inbox')
      .lte('estimated_minutes', availableMinutes);

    if (preferredType && preferredType !== 'all') {
      query = query.eq('type', preferredType);
    }

    const { data: initialData, error: initialError } = await query;
    let items: BacklogItem[] | null = initialData as BacklogItem[] | null;
    let error = initialError;

    // Fallback to admin client if RLS blocked unauthenticated guest query
    if (error || !items) {
      const admin = createAdminClient();
       
      let adminQuery: any = admin
        .from('backlog_items')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'inbox')
        .lte('estimated_minutes', availableMinutes);

      if (preferredType && preferredType !== 'all') {
        adminQuery = adminQuery.eq('type', preferredType);
      }

      const adminRes = await adminQuery;
      items = adminRes.data as BacklogItem[] | null;
      error = adminRes.error;
    }

    if (error) {
      console.error('Error querying backlog items for recommendation:', error);
      return NextResponse.json(
        { error: 'Ошибка при получении элементов бэклога' },
        { status: 500 }
      );
    }

    const allItems = (items || []) as BacklogItem[];

    // Exclude previously skipped IDs in the current session if provided
    const filteredItems = Array.isArray(excludeIds) && excludeIds.length > 0
      ? allItems.filter(i => !excludeIds.includes(i.id))
      : allItems;

    const recommendParams: RecommendRequest = {
      availableMinutes,
      energyState: energyState as EnergyLevel,
      preferredType,
    };

    const recommendation = selectButlerRecommendation(
      filteredItems.length > 0 ? filteredItems : allItems,
      recommendParams
    );

    if (!recommendation) {
      return NextResponse.json({
        status: 'EMPTY_POOL',
        item: null,
      });
    }

    // Update last_suggested_at timestamp
    const nowIso = new Date().toISOString();
     
    await (supabase.from('backlog_items') as any)
      .update({ last_suggested_at: nowIso })
      .eq('id', recommendation.item.id);

    // Also update via admin in case user is guest
    try {
      const admin = createAdminClient();
       
      await (admin.from('backlog_items') as any)
        .update({ last_suggested_at: nowIso })
        .eq('id', recommendation.item.id);
    } catch {
      // ignore
    }

    return NextResponse.json({
      status: 'SUCCESS',
      item: {
        ...recommendation.item,
        last_suggested_at: nowIso,
      },
      score: recommendation.score,
      breakdown: recommendation.breakdown,
    });
  } catch (err: unknown) {
    console.error('API /api/butler/recommend error:', err);
    const message = err instanceof Error ? err.message : 'Внутренняя ошибка сервера';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
