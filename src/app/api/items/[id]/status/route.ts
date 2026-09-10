import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { createAdminClient } from '../../../../../lib/supabase/admin';
import { ItemStatus } from '../../../../../types';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status } = body;

    const validStatuses: ItemStatus[] = ['inbox', 'completed', 'dismissed', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Неверный статус (допустимы: inbox, completed, dismissed, archived)' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

     
    let res = await (supabase.from('backlog_items') as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (res.error) {
      const admin = createAdminClient();
       
      res = await (admin.from('backlog_items') as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    }

    if (res.error) {
      console.error('Error updating item status:', res.error);
      return NextResponse.json(
        { error: 'Ошибка обновления статуса' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, item: res.data });
  } catch (err: unknown) {
    console.error('Error in status update route:', err);
    const message = err instanceof Error ? err.message : 'Внутренняя ошибка сервера';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

     
    let res = await (supabase.from('backlog_items') as any).delete().eq('id', id);

    if (res.error) {
      const admin = createAdminClient();
       
      res = await (admin.from('backlog_items') as any).delete().eq('id', id);
    }

    if (res.error) {
      return NextResponse.json({ error: 'Ошибка удаления элемента' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error deleting item:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
