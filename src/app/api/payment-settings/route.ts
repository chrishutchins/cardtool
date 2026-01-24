import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import logger from '@/lib/logger';

/**
 * GET - Fetch payment settings for all wallet cards
 * POST - Create or update payment settings for a wallet card
 */
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: settings, error } = await supabase
      .from('user_card_payment_settings')
      .select(`
        *,
        user_bank_accounts (
          id,
          name,
          display_name,
          mask,
          institution_name,
          current_balance,
          available_balance
        )
      `)
      .eq('user_id', effectiveUserId);

    if (error) {
      logger.error({ err: error, userId: effectiveUserId }, 'Failed to fetch payment settings');
      return NextResponse.json({ error: 'Failed to fetch payment settings' }, { status: 500 });
    }

    return NextResponse.json({ settings: settings || [] });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get payment settings');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      walletCardId, 
      payFromAccountId, 
      isAutopay, 
      autopayType,
      fixedAutopayAmount,
      reminderDaysBefore,
    } = await request.json();

    if (!walletCardId) {
      return NextResponse.json({ error: 'Missing walletCardId' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify the wallet card belongs to this user
    const { data: walletCard } = await supabase
      .from('user_wallets')
      .select('id')
      .eq('id', walletCardId)
      .eq('user_id', effectiveUserId)
      .single();

    if (!walletCard) {
      return NextResponse.json({ error: 'Wallet card not found' }, { status: 404 });
    }

    // If pay_from_account_id is provided, verify it belongs to this user
    if (payFromAccountId) {
      const { data: bankAccount } = await supabase
        .from('user_bank_accounts')
        .select('id')
        .eq('id', payFromAccountId)
        .eq('user_id', effectiveUserId)
        .single();

      if (!bankAccount) {
        return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
      }
    }

    // Upsert payment settings
    const { error } = await supabase
      .from('user_card_payment_settings')
      .upsert({
        user_id: effectiveUserId,
        wallet_card_id: walletCardId,
        pay_from_account_id: payFromAccountId || null,
        is_autopay: isAutopay ?? false,
        autopay_type: autopayType || null,
        fixed_autopay_amount: fixedAutopayAmount || null,
        reminder_days_before: reminderDaysBefore ?? 3,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'wallet_card_id',
      });

    if (error) {
      logger.error({ err: error, walletCardId }, 'Failed to save payment settings');
      return NextResponse.json({ error: 'Failed to save payment settings' }, { status: 500 });
    }

    logger.info({ walletCardId, userId: effectiveUserId }, 'Payment settings saved');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to save payment settings');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
