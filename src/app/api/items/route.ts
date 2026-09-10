import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { getEffectiveUserId } from '../../../lib/supabase/auth-helper';
import { BacklogItem } from '../../../types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const tag = searchParams.get('tag');

    const supabase = await createClient();
    const userId = await getEffectiveUserId();

     
    let query: any = supabase
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

    const { data: initialData, error: initialError } = await query;
    let items: BacklogItem[] | null = initialData as BacklogItem[] | null;
    let error = initialError;

    if (error || !items) {
      const admin = createAdminClient();
       
      let adminQuery: any = admin
        .from('backlog_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        adminQuery = adminQuery.eq('status', status);
      }
      if (type && type !== 'all') {
        adminQuery = adminQuery.eq('type', type);
      }
      if (tag) {
        adminQuery = adminQuery.contains('tags', [tag]);
      }

      const adminRes = await adminQuery;
      items = adminRes.data as BacklogItem[] | null;
      error = adminRes.error;
    }

    if (error) {
      return NextResponse.json({ error: 'Ошибка получения списка' }, { status: 500 });
    }

    return NextResponse.json({ items: items || [] });
  } catch (err: unknown) {
    console.error('Error fetching items:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
