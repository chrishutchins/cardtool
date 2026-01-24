import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveUserId } from '@/lib/emulation';
import { plaidClient } from '@/lib/plaid';
import { Products } from 'plaid';
import logger from '@/lib/logger';
import { FORMULA_INFO, BillingCycleFormula } from '@/lib/billing-cycle';

export async function POST() {
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

    // Get all Plaid items for this user
    const { data: plaidItems, error: itemsError } = await supabase
      .from('user_plaid_items')
      .select('id, access_token, consented_products')
      .eq('user_id', effectiveUserId);

    if (itemsError) {
      logger.error({ err: itemsError, userId: effectiveUserId }, 'Failed to fetch plaid items');
      return NextResponse.json(
        { error: 'Failed to fetch plaid items' },
        { status: 500 }
      );
    }

    if (!plaidItems || plaidItems.length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    let totalUpdated = 0;
    const itemsNeedingConsent: string[] = [];

    // Refresh liabilities for each Plaid item
    for (const item of plaidItems) {
      try {
        // First, check if this item has liabilities consent
        // We need to call itemGet to get the current consented_products
        const itemResponse = await plaidClient.itemGet({
          access_token: item.access_token,
        });
        
        const consentedProducts = itemResponse.data.item.consented_products || [];
        const hasLiabilitiesConsent = consentedProducts.includes(Products.Liabilities);
        
        // Update the stored consented_products
        await supabase
          .from('user_plaid_items')
          .update({ consented_products: consentedProducts })
          .eq('id', item.id);

        if (!hasLiabilitiesConsent) {
          itemsNeedingConsent.push(item.id);
          continue;
        }

        logger.debug({ plaidItemId: item.id, userId: effectiveUserId }, 'Refreshing liabilities for item');
        
        // Get liabilities data
        const liabilitiesResponse = await plaidClient.liabilitiesGet({
          access_token: item.access_token,
        });

        const creditLiabilities = liabilitiesResponse.data.liabilities.credit || [];

        // Update each account's liability data
        for (const liability of creditLiabilities) {
          // Skip if no account_id
          if (!liability.account_id) continue;
          
          const { data: updatedRows, error: updateError } = await supabase
            .from('user_linked_accounts')
            .update({
              last_statement_balance: liability.last_statement_balance,
              last_statement_date: liability.last_statement_issue_date,
              last_statement_issue_date: liability.last_statement_issue_date,
              next_payment_due_date: liability.next_payment_due_date,
              minimum_payment_amount: liability.minimum_payment_amount,
              is_overdue: liability.is_overdue ?? false,
              last_payment_amount: liability.last_payment_amount,
              last_payment_date: liability.last_payment_date,
              liabilities_updated_at: new Date().toISOString(),
            })
            .eq('plaid_item_id', item.id)
            .eq('plaid_account_id', liability.account_id)
            .select('id, wallet_card_id');

          if (updateError) {
            logger.error(
              { err: updateError, accountId: liability.account_id, plaidItemId: item.id },
              'Failed to update account liabilities'
            );
          } else if (updatedRows && updatedRows.length > 0) {
            totalUpdated += updatedRows.length;
            
            // Auto-populate wallet billing fields from liabilities data
            // Only populate the PRIMARY field based on the card's billing formula
            for (const linkedAccount of updatedRows) {
              if (!linkedAccount.wallet_card_id) continue;
              
              // Get wallet card with card and issuer info to determine billing formula
              const { data: walletCard } = await supabase
                .from('user_wallets')
                .select(`
                  id, 
                  statement_close_day, 
                  payment_due_day,
                  cards:card_id (
                    issuers:issuer_id (
                      billing_cycle_formula
                    )
                  )
                `)
                .eq('id', linkedAccount.wallet_card_id)
                .single();
              
              if (!walletCard) continue;
              
              // Determine which field is primary based on the billing formula
              const formula = (walletCard.cards as { issuers?: { billing_cycle_formula?: string } })?.issuers?.billing_cycle_formula as BillingCycleFormula | null;
              const formulaInfo = formula ? FORMULA_INFO[formula] : null;
              const primaryInput = formulaInfo?.primaryInput ?? 'due'; // Default to 'due' if no formula
              
              const updates: { statement_close_day?: number; payment_due_day?: number } = {};
              
              // Only populate the PRIMARY field
              if (primaryInput === 'close') {
                // Close-primary formulas (BoA): populate statement_close_day from last_statement_issue_date
                if (walletCard.statement_close_day === null && liability.last_statement_issue_date) {
                  const closeDate = new Date(liability.last_statement_issue_date + 'T12:00:00');
                  updates.statement_close_day = closeDate.getDate();
                }
              } else {
                // Due-primary formulas (Amex, Chase, Citi, etc.): populate payment_due_day from next_payment_due_date
                if (walletCard.payment_due_day === null && liability.next_payment_due_date) {
                  const dueDate = new Date(liability.next_payment_due_date + 'T12:00:00');
                  updates.payment_due_day = dueDate.getDate();
                }
              }
              
              // Update wallet if we have changes
              if (Object.keys(updates).length > 0) {
                const { error: walletUpdateError } = await supabase
                  .from('user_wallets')
                  .update(updates)
                  .eq('id', linkedAccount.wallet_card_id);
                
                if (walletUpdateError) {
                  logger.warn(
                    { err: walletUpdateError, walletCardId: linkedAccount.wallet_card_id },
                    'Failed to auto-populate wallet billing fields'
                  );
                } else {
                  logger.debug(
                    { walletCardId: linkedAccount.wallet_card_id, updates, primaryInput },
                    'Auto-populated wallet billing fields from liabilities'
                  );
                }
              }
            }
          }
        }
      } catch (plaidError: unknown) {
        const error = plaidError as { response?: { data?: { error_code?: string } } };
        
        // Handle specific Plaid errors
        if (error.response?.data?.error_code === 'ADDITIONAL_CONSENT_REQUIRED') {
          itemsNeedingConsent.push(item.id);
        } else if (error.response?.data?.error_code === 'PRODUCTS_NOT_SUPPORTED') {
          // Institution doesn't support liabilities - this is expected for some banks
          logger.debug({ plaidItemId: item.id }, 'Institution does not support liabilities');
        } else {
          logger.error(
            { err: plaidError, plaidItemId: item.id, userId: effectiveUserId },
            'Failed to refresh liabilities for item'
          );
        }
        // Continue with other items even if one fails
      }
    }

    logger.info(
      { updated: totalUpdated, needingConsent: itemsNeedingConsent.length, userId: effectiveUserId },
      'Liabilities refresh completed'
    );
    
    return NextResponse.json({ 
      success: true, 
      updated: totalUpdated,
      itemsNeedingConsent: itemsNeedingConsent.length > 0 ? itemsNeedingConsent : undefined,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to refresh liabilities');
    return NextResponse.json(
      { error: 'Failed to refresh liabilities' },
      { status: 500 }
    );
  }
}
