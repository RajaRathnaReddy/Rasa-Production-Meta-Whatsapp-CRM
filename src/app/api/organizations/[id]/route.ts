import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/ai/admin-client';
import { encrypt } from '@/lib/whatsapp/encryption';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const { data: account, error: accErr } = await admin
      .from('accounts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (accErr || !account) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { data: config } = await admin
      .from('whatsapp_config')
      .select('phone_number, phone_number_id, waba_id, status, verified_name, quality_rating')
      .eq('account_id', id)
      .maybeSingle();

    return NextResponse.json({
      organization: {
        ...account,
        whatsapp_config: config,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const admin = supabaseAdmin();

    const updates: Record<string, any> = {};
    if (typeof body.name === 'string' && body.name.trim().length > 0) {
      updates.name = body.name.trim();
    }
    if (body.serviceStatus && ['active', 'paused', 'suspended'].includes(body.serviceStatus)) {
      updates.service_status = body.serviceStatus;
    }
    if (body.billingStatus && ['paid', 'unpaid', 'trial', 'overdue'].includes(body.billingStatus)) {
      updates.billing_status = body.billingStatus;
    }
    if (body.contactEmail !== undefined) {
      updates.contact_email = body.contactEmail ? String(body.contactEmail).trim() : null;
    }
    if (body.contactPhone !== undefined) {
      updates.contact_phone = body.contactPhone ? String(body.contactPhone).trim() : null;
    }
    if (body.notes !== undefined) {
      updates.notes = body.notes ? String(body.notes).trim() : null;
    }
    if (body.wabaId !== undefined) {
      updates.waba_id = body.wabaId ? String(body.wabaId).trim() : null;
    }
    if (body.phoneNumberId !== undefined) {
      updates.phone_number_id = body.phoneNumberId ? String(body.phoneNumberId).trim() : null;
    }

    const { data: updated, error: updateErr } = await admin
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      console.error('[PATCH /api/organizations/[id]] error:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Update whatsapp_config token if provided
    if (body.accessToken && typeof body.accessToken === 'string' && body.accessToken.trim()) {
      try {
        const encrypted = encrypt(body.accessToken.trim());
        await admin.from('whatsapp_config').upsert(
          {
            account_id: id,
            access_token_encrypted: encrypted,
            waba_id: updates.waba_id ?? body.wabaId,
            phone_number_id: updates.phone_number_id ?? body.phoneNumberId,
            phone_number: body.phoneNumber,
            status: 'connected',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'account_id' }
        );
      } catch (tokenErr) {
        console.warn('[PATCH /api/organizations/[id]] token update error:', tokenErr);
      }
    }

    return NextResponse.json({ success: true, organization: updated });
  } catch (err: any) {
    console.error('[PATCH /api/organizations/[id]] error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
