import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/ai/admin-client';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const targetAccountId = body?.accountId;

    if (!targetAccountId || typeof targetAccountId !== 'string') {
      return NextResponse.json(
        { error: 'Valid accountId is required' },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    // Verify the target account exists
    const { data: targetAccount, error: accErr } = await admin
      .from('accounts')
      .select('id, name')
      .eq('id', targetAccountId)
      .maybeSingle();

    if (accErr || !targetAccount) {
      return NextResponse.json(
        { error: 'Target organization not found' },
        { status: 404 }
      );
    }

    // Update profiles.account_id using service role to bypass authenticated client restrictions
    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        account_id: targetAccountId,
        // Ensure owner privilege on switched account so admin can fully manage it
        account_role: 'owner',
      })
      .eq('user_id', user.id);

    if (updateErr) {
      console.error('[POST /api/account/switch] update error:', updateErr);
      return NextResponse.json(
        { error: 'Failed to switch active organization' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      account: targetAccount,
    });
  } catch (err: any) {
    console.error('[POST /api/account/switch] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
