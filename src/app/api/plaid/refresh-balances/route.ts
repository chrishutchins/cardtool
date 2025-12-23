import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { plaidClient } from '@/lib/plaid';

export async function POST() {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get all Plaid items for this user
    const { data: plaidItems, error: itemsError } = await supabase
      .from('user_plaid_items')
      .select('id, access_token')
      .eq('user_id', user.id);

    if (itemsError) {
      console.error('Error fetching plaid items:', itemsError);
      return NextResponse.json(
        { error: 'Failed to fetch plaid items' },
        { status: 500 }
      );
    }

    if (!plaidItems || plaidItems.length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    let totalUpdated = 0;

    // Refresh balances for each Plaid item
    for (const item of plaidItems) {
      try {
        console.log('Refreshing balances for item:', item.id);
        
        // Set min_last_updated_datetime to 24 hours ago
        // Required for some institutions like Capital One (ins_128026)
        const minLastUpdated = new Date();
        minLastUpdated.setHours(minLastUpdated.getHours() - 24);
        
        const balanceResponse = await plaidClient.accountsBalanceGet({
          access_token: item.access_token,
          options: {
            min_last_updated_datetime: minLastUpdated.toISOString(),
          },
        });

        console.log('Received accounts:', balanceResponse.data.accounts.map(a => ({
          name: a.name,
          type: a.type,
          subtype: a.subtype,
          balances: a.balances,
        })));

        // Update each account's balance - include both type=credit AND subtype=credit card
        for (const account of balanceResponse.data.accounts) {
          if (account.type === 'credit' || account.subtype === 'credit card') {
            const { data: updatedRows, error: updateError } = await supabase
              .from('user_linked_accounts')
              .update({
                current_balance: account.balances.current,
                available_balance: account.balances.available,
                credit_limit: account.balances.limit,
                last_balance_update: new Date().toISOString(),
              })
              .eq('plaid_item_id', item.id)
              .eq('plaid_account_id', account.account_id)
              .select('id');

            if (updateError) {
              console.error('Error updating account:', account.name, updateError);
            } else if (updatedRows && updatedRows.length > 0) {
              console.log('Updated account:', account.name, 'balances:', account.balances);
              totalUpdated += updatedRows.length;
            }
          }
        }
      } catch (plaidError: unknown) {
        const errorMessage = plaidError instanceof Error ? plaidError.message : 'Unknown error';
        console.error('Error refreshing balances for item:', item.id, errorMessage);
        // Continue with other items even if one fails
      }
    }

    return NextResponse.json({ success: true, updated: totalUpdated });
  } catch (error) {
    console.error('Error refreshing balances:', error);
    return NextResponse.json(
      { error: 'Failed to refresh balances' },
      { status: 500 }
    );
  }
}
