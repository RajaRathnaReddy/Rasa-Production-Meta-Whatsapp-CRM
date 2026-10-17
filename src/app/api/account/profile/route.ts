import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select(
        'id, full_name, email, avatar_url, role, beta_features, account_id, account_role'
      )
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileErr) {
      console.error('[GET /api/account/profile] profile error:', profileErr);
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    let account = null;
    if (profile?.account_id) {
      const { data: accountRow } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', profile.account_id)
        .maybeSingle();
      if (accountRow) {
        account = {
          ...accountRow,
          service_status: accountRow.service_status ?? 'active',
          billing_status: accountRow.billing_status ?? 'paid',
        };
      }
    }

    return NextResponse.json({
      profile,
      account,
    });
  } catch (err: any) {
    console.error('[GET /api/account/profile] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
