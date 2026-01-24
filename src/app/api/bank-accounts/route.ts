import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import logger from '@/lib/logger';
import { randomUUID } from 'crypto';

/**
 * GET - Fetch all bank accounts for the current user
 * POST - Create a manual bank account
 * DELETE - Delete a bank account
 * PATCH - Update a bank account
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

    const { data: bankAccounts, error } = await supabase
      .from('user_bank_accounts')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('is_primary', { ascending: false })
      .order('institution_name', { ascending: true });

    if (error) {
      logger.error({ err: error, userId: effectiveUserId }, 'Failed to fetch bank accounts');
      return NextResponse.json({ error: 'Failed to fetch bank accounts' }, { status: 500 });
    }

    return NextResponse.json({ accounts: bankAccounts });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get bank accounts');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Create a manual bank account
 */
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

    const { name, institutionName, subtype, mask, availableBalance } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Account name is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if this is the user's first bank account (make it primary)
    const { count: existingCount } = await supabase
      .from('user_bank_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', effectiveUserId);

    const isFirstAccount = !existingCount || existingCount === 0;

    // Create the manual bank account
    const { data: newAccount, error: insertError } = await supabase
      .from('user_bank_accounts')
      .insert({
        user_id: effectiveUserId,
        plaid_item_id: null,
        plaid_account_id: `manual_${randomUUID()}`,
        name: name.trim(),
        official_name: null,
        type: 'depository',
        subtype: subtype || 'checking',
        mask: mask || null,
        institution_name: institutionName || null,
        current_balance: availableBalance ?? null,
        available_balance: availableBalance ?? null,
        iso_currency_code: 'USD',
        last_balance_update: availableBalance != null ? new Date().toISOString() : null,
        is_primary: isFirstAccount,
        is_manual: true,
      })
      .select()
      .single();

    if (insertError) {
      logger.error({ err: insertError, userId: effectiveUserId }, 'Failed to create manual bank account');
      return NextResponse.json({ error: 'Failed to create account', details: insertError.message }, { status: 500 });
    }

    logger.info({ accountId: newAccount.id, userId: effectiveUserId }, 'Manual bank account created');
    return NextResponse.json({ success: true, account: newAccount });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create manual bank account');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await request.json();
    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // First verify the account belongs to this user
    const { data: account } = await supabase
      .from('user_bank_accounts')
      .select('id, plaid_item_id, is_manual')
      .eq('id', accountId)
      .eq('user_id', effectiveUserId)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Delete the bank account
    const { error: deleteError } = await supabase
      .from('user_bank_accounts')
      .delete()
      .eq('id', accountId);

    if (deleteError) {
      logger.error({ err: deleteError, accountId }, 'Failed to delete bank account');
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    // If this was a Plaid-linked account, check if there are any other accounts from this Plaid item
    if (!account.is_manual && account.plaid_item_id) {
      const { count } = await supabase
        .from('user_bank_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('plaid_item_id', account.plaid_item_id);

      // If no more accounts from this item, delete the Plaid item too
      if (count === 0) {
        await supabase
          .from('user_plaid_items')
          .delete()
          .eq('id', account.plaid_item_id);
      }
    }

    logger.info({ accountId, userId: effectiveUserId, isManual: account.is_manual }, 'Bank account deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete bank account');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveUserId = await getEffectiveUserId();
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, isPrimary, displayName, availableBalance, institutionName, name } = await request.json();
    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Build update object
    const updates: Record<string, unknown> = {};
    if (isPrimary !== undefined) updates.is_primary = isPrimary;
    if (displayName !== undefined) updates.display_name = displayName;
    if (name !== undefined) updates.name = name;
    if (institutionName !== undefined) updates.institution_name = institutionName;
    
    // Allow updating balance for manual accounts
    if (availableBalance !== undefined) {
      // First check if this is a manual account
      const { data: account } = await supabase
        .from('user_bank_accounts')
        .select('is_manual')
        .eq('id', accountId)
        .eq('user_id', effectiveUserId)
        .single();

      if (account?.is_manual) {
        updates.available_balance = availableBalance;
        updates.current_balance = availableBalance;
        updates.last_balance_update = new Date().toISOString();
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_bank_accounts')
      .update(updates)
      .eq('id', accountId)
      .eq('user_id', effectiveUserId);

    if (error) {
      logger.error({ err: error, accountId }, 'Failed to update bank account');
      return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
    }

    logger.info({ accountId, updates, userId: effectiveUserId }, 'Bank account updated');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update bank account');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
