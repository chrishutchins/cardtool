import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use effective user ID to support admin emulation
    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    const { data: accounts, error } = await supabase
      .from('user_linked_accounts')
      .select(`
        id,
        name,
        official_name,
        type,
        subtype,
        mask,
        current_balance,
        available_balance,
        credit_limit,
        manual_credit_limit,
        iso_currency_code,
        last_balance_update,
        wallet_card_id,
        user_plaid_items:plaid_item_id (
          institution_name
        )
      `)
      .eq('user_id', effectiveUserId)
      .order('name');

    if (error) {
      logger.error({ err: error, userId: effectiveUserId }, 'Failed to fetch linked accounts');
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ accounts });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch accounts');
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
