import { createClient } from './server';
import { createAdminClient } from './admin';

/**
 * Returns the authenticated user's ID if a session is present.
 * If running in guest/dev mode (no active auth session), it returns
 * the first valid profile ID or provisions a guest user in auth.users
 * so foreign key constraints on backlog_items are always satisfied.
 */
export async function getEffectiveUserId(): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      return user.id;
    }
  } catch {
    // Ignore error if invoked outside request scope
  }

  const admin = createAdminClient();

  // 1. Check for any existing profile in public.profiles
  try {
    const { data: profiles } = await admin.from('profiles').select('id').limit(1);

    if (profiles && profiles.length > 0 && profiles[0]?.id) {
      return profiles[0].id;
    }
  } catch (err) {
    console.warn('Error querying existing profiles:', err);
  }

  // 2. If no profile exists, provision a default guest user in auth.users
  // The database trigger handle_new_user() will automatically insert a row in profiles
  try {
    const { data: created } = await admin.auth.admin.createUser({
      email: 'guest@butler.app',
      password: 'guest-password-123456!',
      email_confirm: true,
      user_metadata: { role: 'guest' },
    });

    if (created?.user?.id) {
      return created.user.id;
    }
  } catch (err) {
    console.warn('Could not auto-create guest user in auth.users:', err);
  }

  return '00000000-0000-0000-0000-000000000000';
}

export interface EffectiveUserContext {
  userId: string;
  isGuest: boolean;
  client: any;
}

export async function getEffectiveUserContext(): Promise<EffectiveUserContext> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      return { userId: user.id, isGuest: false, client: supabase };
    }
  } catch {
    // Ignore error if invoked outside request scope
  }

  const admin = createAdminClient();
  const userId = await getEffectiveUserId();
  return { userId, isGuest: true, client: admin };
}
