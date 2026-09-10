import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { getEffectiveUserContext } from '../../../lib/supabase/auth-helper';
import { BacklogItem } from '../../../types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const tag = searchParams.get('tag');

    const { userId, client } = await getEffectiveUserContext();

    let query: any = client
      .from('backlog_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data: items, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Ошибка получения списка' }, { status: 500 });
    }

    return NextResponse.json({ items: items || [] });
  } catch (err: unknown) {
    console.error('Error fetching items:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
