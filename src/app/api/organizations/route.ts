import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/ai/admin-client';
import { encrypt } from '@/lib/whatsapp/encryption';

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

    const admin = supabaseAdmin();

    // Fetch all accounts
    const { data: accounts, error: accErr } = await admin
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (accErr) {
      console.error('[GET /api/organizations] accounts error:', accErr);
      return NextResponse.json({ error: accErr.message }, { status: 500 });
    }

    // Fetch whatsapp_config rows for all accounts
    const { data: configs } = await admin
      .from('whatsapp_config')
      .select('account_id, phone_number, phone_number_id, waba_id, status, verified_name, quality_rating');

    // Fetch members count per account
    const { data: profiles } = await admin
      .from('profiles')
      .select('account_id');

    const configMap = new Map();
    (configs || []).forEach((c) => {
      if (c.account_id) configMap.set(c.account_id, c);
    });

    const memberCountMap = new Map();
    (profiles || []).forEach((p) => {
      if (p.account_id) {
        memberCountMap.set(p.account_id, (memberCountMap.get(p.account_id) || 0) + 1);
      }
    });

    const enriched = (accounts || []).map((acc) => {
      const cfg = configMap.get(acc.id);
      return {
        id: acc.id,
        name: acc.name,
        service_status: acc.service_status ?? 'active',
        billing_status: acc.billing_status ?? 'paid',
        contact_email: acc.contact_email ?? null,
        contact_phone: acc.contact_phone ?? null,
        notes: acc.notes ?? null,
        default_currency: acc.default_currency ?? 'USD',
        created_at: acc.created_at,
        waba_id: cfg?.waba_id ?? acc.waba_id ?? null,
        phone_number_id: cfg?.phone_number_id ?? acc.phone_number_id ?? null,
        phone_number: cfg?.phone_number ?? null,
        whatsapp_status: cfg?.status ?? (cfg ? 'connected' : 'disconnected'),
        verified_name: cfg?.verified_name ?? null,
        member_count: memberCountMap.get(acc.id) || 1,
      };
    });

    return NextResponse.json({ organizations: enriched });
  } catch (err: any) {
    console.error('[GET /api/organizations] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    if (!body || !body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    const name = body.name.trim();
    const contactEmail = body.contactEmail?.trim() || null;
    const contactPhone = body.contactPhone?.trim() || null;
    const notes = body.notes?.trim() || null;
    const billingStatus = ['paid', 'unpaid', 'trial', 'overdue'].includes(body.billingStatus)
      ? body.billingStatus
      : 'paid';
    const serviceStatus = ['active', 'paused', 'suspended'].includes(body.serviceStatus)
      ? body.serviceStatus
      : 'active';
    const wabaId = body.wabaId?.trim() || null;
    const phoneNumberId = body.phoneNumberId?.trim() || null;
    const phoneNumber = body.phoneNumber?.trim() || null;
    const accessToken = body.accessToken?.trim() || null;

    const admin = supabaseAdmin();

    // 1. Create the account row
    const accountInsert: Record<string, any> = {
      name,
      owner_user_id: user.id,
      service_status: serviceStatus,
      billing_status: billingStatus,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      notes,
      waba_id: wabaId,
      phone_number_id: phoneNumberId,
    };

    const { data: newAccount, error: insertErr } = await admin
      .from('accounts')
      .insert(accountInsert)
      .select('*')
      .single();

    if (insertErr || !newAccount) {
      console.error('[POST /api/organizations] account insert error:', insertErr);
      return NextResponse.json(
        { error: insertErr?.message || 'Failed to create organization' },
        { status: 500 }
      );
    }

    // 2. If WhatsApp credentials provided, configure whatsapp_config
    if (phoneNumberId && accessToken) {
      try {
        const encryptedToken = encrypt(accessToken);
        await admin.from('whatsapp_config').upsert(
          {
            account_id: newAccount.id,
            user_id: user.id,
            phone_number_id: phoneNumberId,
            waba_id: wabaId,
            phone_number: phoneNumber,
            access_token_encrypted: encryptedToken,
            status: 'connected',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'account_id' }
        );
      } catch (encErr) {
        console.warn('[POST /api/organizations] whatsapp_config save error:', encErr);
      }
    }

    // 3. Generate client onboarding invitation token
    let inviteToken: string | null = null;
    let inviteUrl: string | null = null;
    try {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

      const { error: inviteErr } = await admin.from('account_invitations').insert({
        account_id: newAccount.id,
        token_hash: tokenHash,
        role: 'admin',
        created_by_user_id: user.id,
        label: `Client Onboarding: ${name}`,
        expires_at: expiresAt,
      });

      if (!inviteErr) {
        inviteToken = rawToken;
        const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';
        inviteUrl = `${origin}/join/${rawToken}`;
      }
    } catch (inviteErr) {
      console.warn('[POST /api/organizations] invite generation error:', inviteErr);
    }

    return NextResponse.json({
      success: true,
      organization: {
        ...newAccount,
        inviteToken,
        inviteUrl,
      },
    });
  } catch (err: any) {
    console.error('[POST /api/organizations] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
