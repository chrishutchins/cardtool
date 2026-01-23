export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      application_rules: {
        Row: {
          card_limit: number
          card_type: string | null
          charge_type: string | null
          counts_all_issuers: boolean | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          issuer_id: string
          name: string
          requires_banking: boolean | null
          rule_type: string
          time_unit: string | null
          time_window: number | null
        }
        Insert: {
          card_limit: number
          card_type?: string | null
          charge_type?: string | null
          counts_all_issuers?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          issuer_id: string
          name: string
          requires_banking?: boolean | null
          rule_type: string
          time_unit?: string | null
          time_window?: number | null
        }
        Update: {
          card_limit?: number
          card_type?: string | null
          charge_type?: string | null
          counts_all_issuers?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          issuer_id?: string
          name?: string
          requires_banking?: boolean | null
          rule_type?: string
          time_unit?: string | null
          time_window?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "application_rules_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "issuers"
            referencedColumns: ["id"]
          },
        ]
      }
      card_cap_categories: {
        Row: {
          cap_id: string
          category_id: number
        }
        Insert: {
          cap_id: string
          category_id: number
        }
        Update: {
          cap_id?: string
          category_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "card_cap_categories_cap_id_fkey"
            columns: ["cap_id"]
            isOneToOne: false
            referencedRelation: "card_caps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_cap_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "earning_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_cap_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "user_effective_spending"
            referencedColumns: ["category_id"]
          },
        ]
      }
      card_caps: {
        Row: {
          cap_amount: number | null
          cap_period: Database["public"]["Enums"]["cap_period"] | null
          cap_type: Database["public"]["Enums"]["cap_type"]
          card_id: string
          created_at: string | null
          elevated_rate: number
          id: string
          notes: string | null
          post_cap_rate: number | null
          updated_at: string | null
        }
        Insert: {
          cap_amount?: number | null
          cap_period?: Database["public"]["Enums"]["cap_period"] | null
          cap_type: Database["public"]["Enums"]["cap_type"]
          card_id: string
          created_at?: string | null
          elevated_rate: number
          id?: string
          notes?: string | null
          post_cap_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          cap_amount?: number | null
          cap_period?: Database["public"]["Enums"]["cap_period"] | null
          cap_type?: Database["public"]["Enums"]["cap_type"]
          card_id?: string
          created_at?: string | null
          elevated_rate?: number
          id?: string
          notes?: string | null
          post_cap_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_caps_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_caps_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_credits: {
        Row: {
          brand_name: string | null
          card_id: string
          created_at: string | null
          credit_count: number
          default_quantity: number | null
          default_value_cents: number | null
          id: string
          inventory_type_id: string | null
          is_active: boolean
          must_be_earned: boolean
          name: string
          notes: string | null
          renewal_period_months: number | null
          reset_cycle: Database["public"]["Enums"]["credit_reset_cycle"]
          reset_day_of_month: number | null
          travel_category: string | null
          unit_name: string | null
          updated_at: string | null
        }
        Insert: {
          brand_name?: string | null
          card_id: string
          created_at?: string | null
          credit_count?: number
          default_quantity?: number | null
          default_value_cents?: number | null
          id?: string
          inventory_type_id?: string | null
          is_active?: boolean
          must_be_earned?: boolean
          name: string
          notes?: string | null
          renewal_period_months?: number | null
          reset_cycle?: Database["public"]["Enums"]["credit_reset_cycle"]
          reset_day_of_month?: number | null
          travel_category?: string | null
          unit_name?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_name?: string | null
          card_id?: string
          created_at?: string | null
          credit_count?: number
          default_quantity?: number | null
          default_value_cents?: number | null
          id?: string
          inventory_type_id?: string | null
          is_active?: boolean
          must_be_earned?: boolean
          name?: string
          notes?: string | null
          renewal_period_months?: number | null
          reset_cycle?: Database["public"]["Enums"]["credit_reset_cycle"]
          reset_day_of_month?: number | null
          travel_category?: string | null
          unit_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_credits_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_credits_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_credits_inventory_type_id_fkey"
            columns: ["inventory_type_id"]
            isOneToOne: false
            referencedRelation: "inventory_types"
            referencedColumns: ["id"]
          },
        ]
      }
      card_earning_rules: {
        Row: {
          booking_method: Database["public"]["Enums"]["booking_method"]
          brand_name: string | null
          cap_amount: number | null
          cap_period: Database["public"]["Enums"]["cap_period"]
          cap_unit: Database["public"]["Enums"]["cap_unit"] | null
          card_id: string
          category_id: number
          created_at: string | null
          has_cap: boolean
          id: string
          notes: string | null
          post_cap_rate: number | null
          rate: number
          updated_at: string | null
        }
        Insert: {
          booking_method?: Database["public"]["Enums"]["booking_method"]
          brand_name?: string | null
          cap_amount?: number | null
          cap_period?: Database["public"]["Enums"]["cap_period"]
          cap_unit?: Database["public"]["Enums"]["cap_unit"] | null
          card_id: string
          category_id: number
          created_at?: string | null
          has_cap?: boolean
          id?: string
          notes?: string | null
          post_cap_rate?: number | null
          rate: number
          updated_at?: string | null
        }
        Update: {
          booking_method?: Database["public"]["Enums"]["booking_method"]
          brand_name?: string | null
          cap_amount?: number | null
          cap_period?: Database["public"]["Enums"]["cap_period"]
          cap_unit?: Database["public"]["Enums"]["cap_unit"] | null
          card_id?: string
          category_id?: number
          created_at?: string | null
          has_cap?: boolean
          id?: string
          notes?: string | null
          post_cap_rate?: number | null
          rate?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_earning_rules_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_earning_rules_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_earning_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "earning_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_earning_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "user_effective_spending"
            referencedColumns: ["category_id"]
          },
        ]
      }
      card_offer_bonuses: {
        Row: {
          benefit_description: string | null
          cash_amount_cents: number | null
          component_type: string
          created_at: string | null
          currency_id: string | null
          default_benefit_value_cents: number | null
          id: string
          offer_id: string
          points_amount: number | null
          spend_requirement_cents: number
          time_period: number
          time_period_unit: string
          updated_at: string | null
        }
        Insert: {
          benefit_description?: string | null
          cash_amount_cents?: number | null
          component_type: string
          created_at?: string | null
          currency_id?: string | null
          default_benefit_value_cents?: number | null
          id?: string
          offer_id: string
          points_amount?: number | null
          spend_requirement_cents?: number
          time_period?: number
          time_period_unit?: string
          updated_at?: string | null
        }
        Update: {
          benefit_description?: string | null
          cash_amount_cents?: number | null
          component_type?: string
          created_at?: string | null
          currency_id?: string | null
          default_benefit_value_cents?: number | null
          id?: string
          offer_id?: string
          points_amount?: number | null
          spend_requirement_cents?: number
          time_period?: number
          time_period_unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_offer_bonuses_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "reward_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_offer_bonuses_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "user_effective_currency_values"
            referencedColumns: ["currency_id"]
          },
          {
            foreignKeyName: "card_offer_bonuses_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "card_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      card_offer_elevated_earnings: {
        Row: {
          category_id: number | null
          created_at: string | null
          duration_months: number | null
          duration_unit: string
          elevated_rate: number
          id: string
          offer_id: string
          updated_at: string | null
        }
        Insert: {
          category_id?: number | null
          created_at?: string | null
          duration_months?: number | null
          duration_unit?: string
          elevated_rate: number
          id?: string
          offer_id: string
          updated_at?: string | null
        }
        Update: {
          category_id?: number | null
          created_at?: string | null
          duration_months?: number | null
          duration_unit?: string
          elevated_rate?: number
          id?: string
          offer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_offer_elevated_earnings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "earning_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_offer_elevated_earnings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "user_effective_spending"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "card_offer_elevated_earnings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "card_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      card_offer_intro_apr: {
        Row: {
          apr_rate: number
          apr_type: string
          created_at: string | null
          duration: number
          duration_unit: string
          id: string
          offer_id: string
          updated_at: string | null
        }
        Insert: {
          apr_rate?: number
          apr_type?: string
          created_at?: string | null
          duration: number
          duration_unit?: string
          id?: string
          offer_id: string
          updated_at?: string | null
        }
        Update: {
          apr_rate?: number
          apr_type?: string
          created_at?: string | null
          duration?: number
          duration_unit?: string
          id?: string
          offer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_offer_intro_apr_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "card_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      card_offers: {
        Row: {
          application_url: string | null
          archived_at: string | null
          ath_redirect_url: string | null
          card_id: string
          created_at: string | null
          editorial_notes: string | null
          expires_at: string | null
          first_year_af_waived: boolean | null
          id: string
          internal_description: string | null
          is_active: boolean | null
          is_archived: boolean | null
          offer_description: string | null
          offer_type: string
          rates_fees_url: string | null
          updated_at: string | null
        }
        Insert: {
          application_url?: string | null
          archived_at?: string | null
          ath_redirect_url?: string | null
          card_id: string
          created_at?: string | null
          editorial_notes?: string | null
          expires_at?: string | null
          first_year_af_waived?: boolean | null
          id?: string
          internal_description?: string | null
          is_active?: boolean | null
          is_archived?: boolean | null
          offer_description?: string | null
          offer_type?: string
          rates_fees_url?: string | null
          updated_at?: string | null
        }
        Update: {
          application_url?: string | null
          archived_at?: string | null
          ath_redirect_url?: string | null
          card_id?: string
          created_at?: string | null
          editorial_notes?: string | null
          expires_at?: string | null
          first_year_af_waived?: boolean | null
          id?: string
          internal_description?: string | null
          is_active?: boolean | null
          is_archived?: boolean | null
          offer_description?: string | null
          offer_type?: string
          rates_fees_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_offers_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_offers_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_spend_bonuses: {
        Row: {
          benefit_description: string | null
          bonus_type: string
          cap_amount: number | null
          cap_period: string | null
          card_id: string
          cash_amount_cents: number | null
          created_at: string | null
          currency_id: string | null
          default_unit_value_cents: number | null
          default_value_cents: number | null
          elite_unit_name: string | null
          id: string
          name: string
          per_spend_cents: number | null
          period: string | null
          points_amount: number | null
          reward_type: string | null
          spend_threshold_cents: number | null
          updated_at: string | null
        }
        Insert: {
          benefit_description?: string | null
          bonus_type: string
          cap_amount?: number | null
          cap_period?: string | null
          card_id: string
          cash_amount_cents?: number | null
          created_at?: string | null
          currency_id?: string | null
          default_unit_value_cents?: number | null
          default_value_cents?: number | null
          elite_unit_name?: string | null
          id?: string
          name: string
          per_spend_cents?: number | null
          period?: string | null
          points_amount?: number | null
          reward_type?: string | null
          spend_threshold_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          benefit_description?: string | null
          bonus_type?: string
          cap_amount?: number | null
          cap_period?: string | null
          card_id?: string
          cash_amount_cents?: number | null
          created_at?: string | null
          currency_id?: string | null
          default_unit_value_cents?: number | null
          default_value_cents?: number | null
          elite_unit_name?: string | null
          id?: string
          name?: string
          per_spend_cents?: number | null
          period?: string | null
          points_amount?: number | null
          reward_type?: string | null
          spend_threshold_cents?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_spend_bonuses_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_spend_bonuses_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_spend_bonuses_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "reward_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_spend_bonuses_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "user_effective_currency_values"
            referencedColumns: ["currency_id"]
          },
        ]
      }
      card_welcome_bonuses: {
        Row: {
          benefit_description: string | null
          card_id: string
          cash_amount_cents: number | null
          component_type: string
          created_at: string | null
          currency_id: string | null
          default_benefit_value_cents: number | null
          id: string
          points_amount: number | null
          spend_requirement_cents: number
          time_period_months: number
          updated_at: string | null
        }
        Insert: {
          benefit_description?: string | null
          card_id: string
          cash_amount_cents?: number | null
          component_type: string
          created_at?: string | null
          currency_id?: string | null
          default_benefit_value_cents?: number | null
          id?: string
          points_amount?: number | null
          spend_requirement_cents: number
          time_period_months?: number
          updated_at?: string | null
        }
        Update: {
          benefit_description?: string | null
          card_id?: string
          cash_amount_cents?: number | null
          component_type?: string
          created_at?: string | null
          currency_id?: string | null
          default_benefit_value_cents?: number | null
          id?: string
          points_amount?: number | null
          spend_requirement_cents?: number
          time_period_months?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_welcome_bonuses_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_welcome_bonuses_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_welcome_bonuses_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "reward_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_welcome_bonuses_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "user_effective_currency_values"
            referencedColumns: ["currency_id"]
          },
        ]
      }
      cards: {
        Row: {
          annual_fee: number
          card_charge_type:
            | Database["public"]["Enums"]["card_charge_type"]
            | null
          created_at: string | null
          default_earn_rate: number
          default_perks_value: number | null
          exclude_from_recommendations: boolean
          id: string
          image_url: string | null
          is_active: boolean
          issuer_id: string
          name: string
          no_foreign_transaction_fees: boolean | null
          official_name: string | null
          primary_currency_id: string
          product_type: Database["public"]["Enums"]["card_product_type"]
          secondary_currency_id: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          annual_fee?: number
          card_charge_type?:
            | Database["public"]["Enums"]["card_charge_type"]
            | null
          created_at?: string | null
          default_earn_rate?: number
          default_perks_value?: number | null
          exclude_from_recommendations?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          issuer_id: string
          name: string
          no_foreign_transaction_fees?: boolean | null
          official_name?: string | null
          primary_currency_id: string
          product_type: Database["public"]["Enums"]["card_product_type"]
          secondary_currency_id?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          annual_fee?: number
          card_charge_type?:
            | Database["public"]["Enums"]["card_charge_type"]
            | null
          created_at?: string | null
          default_earn_rate?: number
          default_perks_value?: number | null
          exclude_from_recommendations?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          issuer_id?: string
          name?: string
          no_foreign_transaction_fees?: boolean | null
          official_name?: string | null
          primary_currency_id?: string
          product_type?: Database["public"]["Enums"]["card_product_type"]
          secondary_currency_id?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "issuers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_primary_currency_id_fkey"
            columns: ["primary_currency_id"]
            isOneToOne: false
            referencedRelation: "reward_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_primary_currency_id_fkey"
            columns: ["primary_currency_id"]
            isOneToOne: false
            referencedRelation: "user_effective_currency_values"
            referencedColumns: ["currency_id"]
          },
          {
            foreignKeyName: "cards_secondary_currency_id_fkey"
            columns: ["secondary_currency_id"]
            isOneToOne: false
            referencedRelation: "reward_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_secondary_currency_id_fkey"
            columns: ["secondary_currency_id"]
            isOneToOne: false
            referencedRelation: "user_effective_currency_values"
            referencedColumns: ["currency_id"]
          },
        ]
      }
      credit_account_wallet_links: {
        Row: {
          created_at: string
          credit_account_id: string
          display_name: string | null
          id: string
          user_id: string
          wallet_card_id: string | null
        }
        Insert: {
          created_at?: string
          credit_account_id: string
          display_name?: string | null
          id?: string
          user_id: string
          wallet_card_id?: string | null
        }
        Update: {
          created_at?: string
          credit_account_id?: string
          display_name?: string | null
          id?: string
          user_id?: string
          wallet_card_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_account_wallet_links_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "credit_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_account_wallet_links_wallet_card_id_fkey"
            columns: ["wallet_card_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_accounts: {
        Row: {
          account_name: string
          account_number_masked: string | null
          account_type: Database["public"]["Enums"]["credit_account_type"]
          balance_cents: number | null
          bureau: Database["public"]["Enums"]["credit_bureau"]
          created_at: string
          credit_limit_cents: number | null
          creditor_name: string | null
          date_closed: string | null
          date_opened: string | null
          date_updated: string | null
          high_balance_cents: number | null
          id: string
          loan_type: Database["public"]["Enums"]["credit_loan_type"]
          monthly_payment_cents: number | null
          payment_status: string | null
          player_number: number
          responsibility: Database["public"]["Enums"]["credit_responsibility"]
          snapshot_id: string | null
          status: Database["public"]["Enums"]["credit_account_status"]
          terms: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          account_number_masked?: string | null
          account_type?: Database["public"]["Enums"]["credit_account_type"]
          balance_cents?: number | null
          bureau: Database["public"]["Enums"]["credit_bureau"]
          created_at?: string
          credit_limit_cents?: number | null
          creditor_name?: string | null
          date_closed?: string | null
          date_opened?: string | null
          date_updated?: string | null
          high_balance_cents?: number | null
          id?: string
          loan_type?: Database["public"]["Enums"]["credit_loan_type"]
          monthly_payment_cents?: number | null
          payment_status?: string | null
          player_number?: number
          responsibility?: Database["public"]["Enums"]["credit_responsibility"]
          snapshot_id?: string | null
          status?: Database["public"]["Enums"]["credit_account_status"]
          terms?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          account_number_masked?: string | null
          account_type?: Database["public"]["Enums"]["credit_account_type"]
          balance_cents?: number | null
          bureau?: Database["public"]["Enums"]["credit_bureau"]
          created_at?: string
          credit_limit_cents?: number | null
          creditor_name?: string | null
          date_closed?: string | null
          date_opened?: string | null
          date_updated?: string | null
          high_balance_cents?: number | null
          id?: string
          loan_type?: Database["public"]["Enums"]["credit_loan_type"]
          monthly_payment_cents?: number | null
          payment_status?: string | null
          player_number?: number
          responsibility?: Database["public"]["Enums"]["credit_responsibility"]
          snapshot_id?: string | null
          status?: Database["public"]["Enums"]["credit_account_status"]
          terms?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_accounts_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "credit_report_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_inquiries: {
        Row: {
          bureau: Database["public"]["Enums"]["credit_bureau"]
          company_name: string
          created_at: string
          id: string
          inquiry_date: string
          inquiry_type: string | null
          last_seen_snapshot_id: string | null
          player_number: number
          snapshot_id: string | null
          user_id: string
        }
        Insert: {
          bureau: Database["public"]["Enums"]["credit_bureau"]
          company_name: string
          created_at?: string
          id?: string
          inquiry_date: string
          inquiry_type?: string | null
          last_seen_snapshot_id?: string | null
          player_number?: number
          snapshot_id?: string | null
          user_id: string
        }
        Update: {
          bureau?: Database["public"]["Enums"]["credit_bureau"]
          company_name?: string
          created_at?: string
          id?: string
          inquiry_date?: string
          inquiry_type?: string | null
          last_seen_snapshot_id?: string | null
          player_number?: number
          snapshot_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_inquiries_last_seen_snapshot_id_fkey"
            columns: ["last_seen_snapshot_id"]
            isOneToOne: false
            referencedRelation: "credit_report_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_inquiries_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "credit_report_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_inquiry_group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          inquiry_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          inquiry_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          inquiry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_inquiry_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "credit_inquiry_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_inquiry_group_members_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "credit_inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_inquiry_groups: {
        Row: {
          created_at: string
          group_name: string | null
          id: string
          player_number: number
          related_card_id: string | null
          related_note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          group_name?: string | null
          id?: string
          player_number?: number
          related_card_id?: string | null
          related_note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          group_name?: string | null
          id?: string
          player_number?: number
          related_card_id?: string | null
          related_note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_inquiry_groups_related_card_id_fkey"
            columns: ["related_card_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_matching_rules: {
        Row: {
          created_at: string | null
          created_by: string | null
          credit_id: string | null
          id: string
          match_amount_cents: number | null
          pattern: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          credit_id?: string | null
          id?: string
          match_amount_cents?: number | null
          pattern: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          credit_id?: string | null
          id?: string
          match_amount_cents?: number | null
          pattern?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_matching_rules_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "card_credits"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_report_snapshots: {
        Row: {
          bureau: Database["public"]["Enums"]["credit_bureau"]
          created_at: string
          fetched_at: string
          id: string
          player_number: number
          report_date: string | null
          source: Database["public"]["Enums"]["credit_report_source"] | null
          user_id: string
        }
        Insert: {
          bureau: Database["public"]["Enums"]["credit_bureau"]
          created_at?: string
          fetched_at?: string
          id?: string
          player_number?: number
          report_date?: string | null
          source?: Database["public"]["Enums"]["credit_report_source"] | null
          user_id: string
        }
        Update: {
          bureau?: Database["public"]["Enums"]["credit_bureau"]
          created_at?: string
          fetched_at?: string
          id?: string
          player_number?: number
          report_date?: string | null
          source?: Database["public"]["Enums"]["credit_report_source"] | null
          user_id?: string
        }
        Relationships: []
      }
      credit_scores: {
        Row: {
          bureau: Database["public"]["Enums"]["credit_bureau"]
          created_at: string
          id: string
          player_number: number
          score: number
          score_date: string | null
          score_type: Database["public"]["Enums"]["credit_score_type"]
          snapshot_id: string | null
          user_id: string
        }
        Insert: {
          bureau: Database["public"]["Enums"]["credit_bureau"]
          created_at?: string
          id?: string
          player_number?: number
          score: number
          score_date?: string | null
          score_type: Database["public"]["Enums"]["credit_score_type"]
          snapshot_id?: string | null
          user_id: string
        }
        Update: {
          bureau?: Database["public"]["Enums"]["credit_bureau"]
          created_at?: string
          id?: string
          player_number?: number
          score?: number
          score_date?: string | null
          score_type?: Database["public"]["Enums"]["credit_score_type"]
          snapshot_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_scores_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "credit_report_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_transfer_partners: {
        Row: {
          created_at: string | null
          destination_currency_id: string
          destination_units: number
          id: string
          is_active: boolean | null
          notes: string | null
          source_currency_id: string
          source_units: number
          transfer_timing: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          destination_currency_id: string
          destination_units?: number
          id?: string
          is_active?: boolean | null
          notes?: string | null
          source_currency_id: string
          source_units?: number
          transfer_timing?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          destination_currency_id?: string
          destination_units?: number
          id?: string
          is_active?: boolean | null
          notes?: string | null
          source_currency_id?: string
          source_units?: number
          transfer_timing?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "currency_transfer_partners_destination_currency_id_fkey"
            columns: ["destination_currency_id"]
            isOneToOne: false
            referencedRelation: "reward_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_transfer_partners_destination_currency_id_fkey"
            columns: ["destination_currency_id"]
            isOneToOne: false
            referencedRelation: "user_effective_currency_values"
            referencedColumns: ["currency_id"]
          },
          {
            foreignKeyName: "currency_transfer_partners_source_currency_id_fkey"
            columns: ["source_currency_id"]
            isOneToOne: false
            referencedRelation: "reward_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "currency_transfer_partners_source_currency_id_fkey"
            columns: ["source_currency_id"]
            isOneToOne: false
            referencedRelation: "user_effective_currency_values"
            referencedColumns: ["currency_id"]
          },
        ]
      }
      earning_categories: {
        Row: {
          created_at: string | null
          description: string | null
          excluded_by_default: boolean
          id: number
          name: string
          parent_category_id: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          excluded_by_default?: boolean
          id?: number
          name: string
          parent_category_id?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          excluded_by_default?: boolean
          id?: number
          name?: string
          parent_category_id?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earning_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "earning_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earning_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "user_effective_spending"
            referencedColumns: ["category_id"]
          },
        ]
      }
      earning_multiplier_cards: {
        Row: {
          card_id: string
          program_id: string
        }
        Insert: {
          card_id: string
          program_id: string
        }
        Update: {
          card_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earning_multiplier_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earning_multiplier_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earning_multiplier_cards_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "earning_multiplier_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      earning_multiplier_currencies: {
        Row: {
          currency_id: string
          program_id: string
        }
        Insert: {
          currency_id: string
          program_id: string
        }
        Update: {
          currency_id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earning_multiplier_currencies_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "reward_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earning_multiplier_currencies_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "user_effective_currency_values"
            referencedColumns: ["currency_id"]
          },
          {
            foreignKeyName: "earning_multiplier_currencies_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "earning_multiplier_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      earning_multiplier_programs: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      earning_multiplier_tiers: {
        Row: {
          cap_amount: number | null
          cap_period: Database["public"]["Enums"]["cap_period"] | null
          created_at: string | null
          has_cap: boolean | null
          id: string
          multiplier: number
          name: string
          post_cap_multiplier: number | null
          program_id: string
          requirements: string | null
          sort_order: number | null
        }
        Insert: {
          cap_amount?: number | null
          cap_period?: Database["public"]["Enums"]["cap_period"] | null
          created_at?: string | null
          has_cap?: boolean | null
          id?: string
          multiplier: number
          name: string
          post_cap_multiplier?: number | null
          program_id: string
          requirements?: string | null
          sort_order?: number | null
        }
        Update: {
          cap_amount?: number | null
          cap_period?: Database["public"]["Enums"]["cap_period"] | null
          created_at?: string | null
          has_cap?: boolean | null
          id?: string
          multiplier?: number
          name?: string
          post_cap_multiplier?: number | null
          program_id?: string
          requirements?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "earning_multiplier_tiers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "earning_multiplier_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_types: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          tracking_type: Database["public"]["Enums"]["inventory_tracking_type"]
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          tracking_type: Database["public"]["Enums"]["inventory_tracking_type"]
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          tracking_type?: Database["public"]["Enums"]["inventory_tracking_type"]
        }
        Relationships: []
      }
      issuers: {
        Row: {
          billing_cycle_formula: string | null
          created_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          billing_cycle_formula?: string | null
          created_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          billing_cycle_formula?: string | null
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      point_value_templates: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_default: boolean | null
          name: string
          slug: string
          source_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_default?: boolean | null
          name: string
          slug: string
          source_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_default?: boolean | null
          name?: string
          slug?: string
          source_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reward_currencies: {
        Row: {
          alliance: string | null
          base_value_cents: number | null
          cash_out_value_cents: number | null
          code: string
          created_at: string | null
          currency_type: Database["public"]["Enums"]["reward_currency_type"]
          expiration_policy: string | null
          id: string
          is_transferable: boolean | null
          name: string
          notes: string | null
          program_name: string | null
          transfer_increment: number | null
          updated_at: string | null
        }
        Insert: {
          alliance?: string | null
          base_value_cents?: number | null
          cash_out_value_cents?: number | null
          code: string
          created_at?: string | null
          currency_type: Database["public"]["Enums"]["reward_currency_type"]
          expiration_policy?: string | null
          id?: string
          is_transferable?: boolean | null
          name: string
          notes?: string | null
          program_name?: string | null
          transfer_increment?: number | null
          updated_at?: string | null
        }
        Update: {
          alliance?: string | null
          base_value_cents?: number | null
          cash_out_value_cents?: number | null
          code?: string
          created_at?: string | null
          currency_type?: Database["public"]["Enums"]["reward_currency_type"]
          expiration_policy?: string | null
          id?: string
          is_transferable?: boolean | null
          name?: string
          notes?: string | null
          program_name?: string | null
          transfer_increment?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      site_configs: {
        Row: {
          aggregate: boolean
          attribute: string | null
          balance_page_url: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string
          domain: string
          format: string | null
          id: string
          is_active: boolean | null
          name: string
          parse_regex: string | null
          selector: string
          updated_at: string | null
        }
        Insert: {
          aggregate?: boolean
          attribute?: string | null
          balance_page_url?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code: string
          domain: string
          format?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parse_regex?: string | null
          selector: string
          updated_at?: string | null
        }
        Update: {
          aggregate?: boolean
          attribute?: string | null
          balance_page_url?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string
          domain?: string
          format?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parse_regex?: string | null
          selector?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      spending_defaults: {
        Row: {
          annual_spend_cents: number
          category_id: number
          created_at: string | null
          id: number
          large_purchase_spend_cents: number | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          annual_spend_cents?: number
          category_id: number
          created_at?: string | null
          id?: number
          large_purchase_spend_cents?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          annual_spend_cents?: number
          category_id?: number
          created_at?: string | null
          id?: number
          large_purchase_spend_cents?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spending_defaults_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "earning_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spending_defaults_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "user_effective_spending"
            referencedColumns: ["category_id"]
          },
        ]
      }
      stripe_members: {
        Row: {
          created_at: string | null
          email: string
          id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      template_currency_values: {
        Row: {
          created_at: string | null
          currency_id: string
          id: string
          is_manual: boolean
          template_id: string
          updated_at: string | null
          value_cents: number
        }
        Insert: {
          created_at?: string | null
          currency_id: string
          id?: string
          is_manual?: boolean
          template_id: string
          updated_at?: string | null
          value_cents: number
        }
        Update: {
          created_at?: string | null
          currency_id?: string
          id?: string
          is_manual?: boolean
          template_id?: string
          updated_at?: string | null
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_currency_values_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "reward_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_currency_values_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "user_effective_currency_values"
            referencedColumns: ["currency_id"]
          },
          {
            foreignKeyName: "template_currency_values_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "point_value_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_exclusion_patterns: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          pattern: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          pattern: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          pattern?: string
        }
        Relationships: []
      }
      user_bonus_display_settings: {
        Row: {
          created_at: string | null
          id: string
          include_debit_pay: boolean
          include_spend_bonuses: boolean
          include_welcome_bonuses: boolean
          show_available_credit: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          include_debit_pay?: boolean
          include_spend_bonuses?: boolean
          include_welcome_bonuses?: boolean
          show_available_credit?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          include_debit_pay?: boolean
          include_spend_bonuses?: boolean
          include_welcome_bonuses?: boolean
          show_available_credit?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_card_debit_pay: {
        Row: {
          created_at: string | null
          debit_pay_percent: number | null
          id: string
          updated_at: string | null
          user_id: string
          wallet_card_id: string
        }
        Insert: {
          created_at?: string | null
          debit_pay_percent?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
          wallet_card_id: string
        }
        Update: {
          created_at?: string | null
          debit_pay_percent?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
          wallet_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_card_debit_pay_wallet_card_id_fkey"
            columns: ["wallet_card_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_card_perks_values: {
        Row: {
          created_at: string | null
          id: string
          perks_value: number
          updated_at: string | null
          user_id: string
          wallet_card_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          perks_value?: number
          updated_at?: string | null
          user_id: string
          wallet_card_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          perks_value?: number
          updated_at?: string | null
          user_id?: string
          wallet_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_card_perks_values_wallet_card_id_fkey"
            columns: ["wallet_card_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_card_selections: {
        Row: {
          cap_id: string
          created_at: string | null
          id: string
          selected_category_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cap_id: string
          created_at?: string | null
          id?: string
          selected_category_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cap_id?: string
          created_at?: string | null
          id?: string
          selected_category_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_card_selections_cap_id_fkey"
            columns: ["cap_id"]
            isOneToOne: false
            referencedRelation: "card_caps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_card_selections_selected_category_id_fkey"
            columns: ["selected_category_id"]
            isOneToOne: false
            referencedRelation: "earning_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_card_selections_selected_category_id_fkey"
            columns: ["selected_category_id"]
            isOneToOne: false
            referencedRelation: "user_effective_spending"
            referencedColumns: ["category_id"]
          },
        ]
      }
      user_category_spend: {
        Row: {
          annual_spend_cents: number
          category_id: number
          created_at: string | null
          id: string
          large_purchase_spend_cents: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          annual_spend_cents: number
          category_id: number
          created_at?: string | null
          id?: string
          large_purchase_spend_cents?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          annual_spend_cents?: number
          category_id?: number
          created_at?: string | null
          id?: string
          large_purchase_spend_cents?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_category_spend_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "earning_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_category_spend_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "user_effective_spending"
            referencedColumns: ["category_id"]
          },
        ]
      }
      user_compare_categories: {
        Row: {
          category_id: number
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          category_id: number
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          category_id?: number
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_compare_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "earning_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_compare_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "user_effective_spending"
            referencedColumns: ["category_id"]
          },
        ]
      }
      user_compare_evaluation_cards: {
        Row: {
          card_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_compare_evaluation_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_compare_evaluation_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credit_settings: {
        Row: {
          created_at: string | null
          credit_id: string
          id: string
          is_auto_repeat: boolean | null
          is_hidden: boolean
          notes: string | null
          updated_at: string | null
          user_value_override_cents: number | null
          user_wallet_id: string
        }
        Insert: {
          created_at?: string | null
          credit_id: string
          id?: string
          is_auto_repeat?: boolean | null
          is_hidden?: boolean
          notes?: string | null
          updated_at?: string | null
          user_value_override_cents?: number | null
          user_wallet_id: string
        }
        Update: {
          created_at?: string | null
          credit_id?: string
          id?: string
          is_auto_repeat?: boolean | null
          is_hidden?: boolean
          notes?: string | null
          updated_at?: string | null
          user_value_override_cents?: number | null
          user_wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credit_settings_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "card_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_credit_settings_user_wallet_id_fkey"
            columns: ["user_wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credit_usage: {
        Row: {
          amount_used: number
          auto_detected: boolean | null
          created_at: string | null
          credit_id: string
          id: string
          is_clawback: boolean | null
          notes: string | null
          perceived_value_cents: number | null
          period_end: string
          period_start: string
          slot_number: number
          updated_at: string | null
          used_at: string
          user_wallet_id: string
        }
        Insert: {
          amount_used: number
          auto_detected?: boolean | null
          created_at?: string | null
          credit_id: string
          id?: string
          is_clawback?: boolean | null
          notes?: string | null
          perceived_value_cents?: number | null
          period_end: string
          period_start: string
          slot_number?: number
          updated_at?: string | null
          used_at?: string
          user_wallet_id: string
        }
        Update: {
          amount_used?: number
          auto_detected?: boolean | null
          created_at?: string | null
          credit_id?: string
          id?: string
          is_clawback?: boolean | null
          notes?: string | null
          perceived_value_cents?: number | null
          period_end?: string
          period_start?: string
          slot_number?: number
          updated_at?: string | null
          used_at?: string
          user_wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credit_usage_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "card_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_credit_usage_user_wallet_id_fkey"
            columns: ["user_wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credit_usage_transactions: {
        Row: {
          amount_cents: number
          created_at: string | null
          id: string
          transaction_id: string | null
          usage_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string | null
          id?: string
          transaction_id?: string | null
          usage_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          id?: string
          transaction_id?: string | null
          usage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_credit_usage_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "user_plaid_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_credit_usage_transactions_usage_id_fkey"
            columns: ["usage_id"]
            isOneToOne: false
            referencedRelation: "user_credit_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      user_currency_values: {
        Row: {
          created_at: string | null
          currency_id: string
          id: string
          updated_at: string | null
          user_id: string
          value_cents: number
        }
        Insert: {
          created_at?: string | null
          currency_id: string
          id?: string
          updated_at?: string | null
          user_id: string
          value_cents: number
        }
        Update: {
          created_at?: string | null
          currency_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_currency_values_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "reward_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_currency_values_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "user_effective_currency_values"
            referencedColumns: ["currency_id"]
          },
        ]
      }
      user_feature_flags: {
        Row: {
          account_linking_enabled: boolean | null
          created_at: string | null
          credit_tracking_enabled: boolean | null
          debit_pay_enabled: boolean | null
          id: string
          onboarding_completed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_linking_enabled?: boolean | null
          created_at?: string | null
          credit_tracking_enabled?: boolean | null
          debit_pay_enabled?: boolean | null
          id?: string
          onboarding_completed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_linking_enabled?: boolean | null
          created_at?: string | null
          credit_tracking_enabled?: boolean | null
          debit_pay_enabled?: boolean | null
          id?: string
          onboarding_completed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          created_at: string | null
          feedback_type: string
          id: string
          message: string
          page_url: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feedback_type: string
          id?: string
          message: string
          page_url?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          feedback_type?: string
          id?: string
          message?: string
          page_url?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_hidden_items: {
        Row: {
          created_at: string
          id: string
          item_key: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_key: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_key?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_inventory: {
        Row: {
          brand: string | null
          code: string | null
          created_at: string | null
          expiration_date: string | null
          external_id: string | null
          id: string
          is_used: boolean
          name: string
          no_expiration: boolean | null
          notes: string | null
          original_value_cents: number | null
          pin: string | null
          player_number: number | null
          quantity: number | null
          quantity_used: number | null
          remaining_value_cents: number | null
          source_credit_usage_id: string | null
          source_wallet_id: string | null
          type_id: string
          updated_at: string | null
          url: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          code?: string | null
          created_at?: string | null
          expiration_date?: string | null
          external_id?: string | null
          id?: string
          is_used?: boolean
          name: string
          no_expiration?: boolean | null
          notes?: string | null
          original_value_cents?: number | null
          pin?: string | null
          player_number?: number | null
          quantity?: number | null
          quantity_used?: number | null
          remaining_value_cents?: number | null
          source_credit_usage_id?: string | null
          source_wallet_id?: string | null
          type_id: string
          updated_at?: string | null
          url?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          code?: string | null
          created_at?: string | null
          expiration_date?: string | null
          external_id?: string | null
          id?: string
          is_used?: boolean
          name?: string
          no_expiration?: boolean | null
          notes?: string | null
          original_value_cents?: number | null
          pin?: string | null
          player_number?: number | null
          quantity?: number | null
          quantity_used?: number | null
          remaining_value_cents?: number | null
          source_credit_usage_id?: string | null
          source_wallet_id?: string | null
          type_id?: string
          updated_at?: string | null
          url?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_source_credit_usage_id_fkey"
            columns: ["source_credit_usage_id"]
            isOneToOne: false
            referencedRelation: "user_credit_usage"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inventory_source_wallet_id_fkey"
            columns: ["source_wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inventory_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "inventory_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_large_purchase_categories: {
        Row: {
          category_id: number
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          category_id: number
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          category_id?: number
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_large_purchase_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "earning_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_large_purchase_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "user_effective_spending"
            referencedColumns: ["category_id"]
          },
        ]
      }
      user_linked_accounts: {
        Row: {
          available_balance: number | null
          created_at: string | null
          credit_limit: number | null
          current_balance: number | null
          id: string
          iso_currency_code: string | null
          last_balance_update: string | null
          manual_credit_limit: number | null
          mask: string | null
          name: string
          official_name: string | null
          plaid_account_id: string
          plaid_item_id: string
          subtype: string | null
          type: string
          updated_at: string | null
          user_id: string
          wallet_card_id: string | null
        }
        Insert: {
          available_balance?: number | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          id?: string
          iso_currency_code?: string | null
          last_balance_update?: string | null
          manual_credit_limit?: number | null
          mask?: string | null
          name: string
          official_name?: string | null
          plaid_account_id: string
          plaid_item_id: string
          subtype?: string | null
          type: string
          updated_at?: string | null
          user_id: string
          wallet_card_id?: string | null
        }
        Update: {
          available_balance?: number | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          id?: string
          iso_currency_code?: string | null
          last_balance_update?: string | null
          manual_credit_limit?: number | null
          mask?: string | null
          name?: string
          official_name?: string | null
          plaid_account_id?: string
          plaid_item_id?: string
          subtype?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
          wallet_card_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_linked_accounts_plaid_item_id_fkey"
            columns: ["plaid_item_id"]
            isOneToOne: false
            referencedRelation: "user_plaid_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_linked_accounts_wallet_card_id_fkey"
            columns: ["wallet_card_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mobile_pay_categories: {
        Row: {
          category_id: number
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          category_id: number
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          category_id?: number
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mobile_pay_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "earning_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mobile_pay_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "user_effective_spending"
            referencedColumns: ["category_id"]
          },
        ]
      }
      user_multiplier_tiers: {
        Row: {
          created_at: string | null
          id: string
          program_id: string
          tier_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          program_id: string
          tier_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          program_id?: string
          tier_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_multiplier_tiers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "earning_multiplier_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_multiplier_tiers_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "earning_multiplier_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_paypal_categories: {
        Row: {
          category_id: number
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          category_id: number
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          category_id?: number
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_paypal_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "earning_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_paypal_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "user_effective_spending"
            referencedColumns: ["category_id"]
          },
        ]
      }
      user_plaid_items: {
        Row: {
          access_token: string
          created_at: string | null
          error_code: string | null
          id: string
          institution_id: string | null
          institution_name: string | null
          item_id: string
          requires_reauth: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          error_code?: string | null
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          item_id: string
          requires_reauth?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          error_code?: string | null
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          item_id?: string
          requires_reauth?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_plaid_sync_state: {
        Row: {
          created_at: string | null
          id: string
          last_synced_at: string | null
          last_transaction_date: string | null
          plaid_item_id: string | null
          sync_cursor: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          last_transaction_date?: string | null
          plaid_item_id?: string | null
          sync_cursor?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          last_transaction_date?: string | null
          plaid_item_id?: string | null
          sync_cursor?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plaid_sync_state_plaid_item_id_fkey"
            columns: ["plaid_item_id"]
            isOneToOne: false
            referencedRelation: "user_plaid_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plaid_transactions: {
        Row: {
          amount_cents: number
          authorized_date: string | null
          category: string[] | null
          created_at: string | null
          date: string
          dismissed: boolean | null
          id: string
          is_clawback: boolean | null
          linked_account_id: string | null
          matched_credit_id: string | null
          matched_rule_id: string | null
          merchant_name: string | null
          name: string
          original_description: string | null
          pending: boolean | null
          plaid_transaction_id: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          authorized_date?: string | null
          category?: string[] | null
          created_at?: string | null
          date: string
          dismissed?: boolean | null
          id?: string
          is_clawback?: boolean | null
          linked_account_id?: string | null
          matched_credit_id?: string | null
          matched_rule_id?: string | null
          merchant_name?: string | null
          name: string
          original_description?: string | null
          pending?: boolean | null
          plaid_transaction_id: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          authorized_date?: string | null
          category?: string[] | null
          created_at?: string | null
          date?: string
          dismissed?: boolean | null
          id?: string
          is_clawback?: boolean | null
          linked_account_id?: string | null
          matched_credit_id?: string | null
          matched_rule_id?: string | null
          merchant_name?: string | null
          name?: string
          original_description?: string | null
          pending?: boolean | null
          plaid_transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plaid_transactions_linked_account_id_fkey"
            columns: ["linked_account_id"]
            isOneToOne: false
            referencedRelation: "user_linked_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_plaid_transactions_matched_credit_id_fkey"
            columns: ["matched_credit_id"]
            isOneToOne: false
            referencedRelation: "card_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_plaid_transactions_matched_rule_id_fkey"
            columns: ["matched_rule_id"]
            isOneToOne: false
            referencedRelation: "credit_matching_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_players: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          player_number: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          player_number: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          player_number?: number
          user_id?: string
        }
        Relationships: []
      }
      user_point_balance_history: {
        Row: {
          balance: number
          currency_id: string
          id: string
          player_number: number
          recorded_at: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          balance: number
          currency_id: string
          id?: string
          player_number: number
          recorded_at?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          currency_id?: string
          id?: string
          player_number?: number
          recorded_at?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_point_balance_history_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "reward_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_point_balance_history_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "user_effective_currency_values"
            referencedColumns: ["currency_id"]
          },
        ]
      }
      user_point_balances: {
        Row: {
          balance: number
          created_at: string | null
          currency_id: string
          expiration_date: string | null
          id: string
          last_update_source: string | null
          notes: string | null
          player_number: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency_id: string
          expiration_date?: string | null
          id?: string
          last_update_source?: string | null
          notes?: string | null
          player_number?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency_id?: string
          expiration_date?: string | null
          id?: string
          last_update_source?: string | null
          notes?: string | null
          player_number?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_point_balances_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "reward_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_point_balances_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "user_effective_currency_values"
            referencedColumns: ["currency_id"]
          },
        ]
      }
      user_point_value_settings: {
        Row: {
          created_at: string | null
          id: string
          selected_template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          selected_template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          selected_template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_point_value_settings_selected_template_id_fkey"
            columns: ["selected_template_id"]
            isOneToOne: false
            referencedRelation: "point_value_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_spend_bonus_values: {
        Row: {
          created_at: string | null
          id: string
          spend_bonus_id: string
          updated_at: string | null
          user_id: string
          value_cents: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          spend_bonus_id: string
          updated_at?: string | null
          user_id: string
          value_cents: number
        }
        Update: {
          created_at?: string | null
          id?: string
          spend_bonus_id?: string
          updated_at?: string | null
          user_id?: string
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_spend_bonus_values_spend_bonus_id_fkey"
            columns: ["spend_bonus_id"]
            isOneToOne: false
            referencedRelation: "card_spend_bonuses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_spend_bonuses: {
        Row: {
          benefit_description: string | null
          bonus_type: string
          cap_amount: number | null
          cap_period: string | null
          cash_amount_cents: number | null
          created_at: string | null
          currency_id: string | null
          elite_unit_name: string | null
          id: string
          is_active: boolean
          name: string
          per_spend_cents: number | null
          period: string | null
          points_amount: number | null
          reward_type: string | null
          spend_threshold_cents: number | null
          unit_value_cents: number | null
          updated_at: string | null
          user_id: string
          value_cents: number | null
          wallet_card_id: string
        }
        Insert: {
          benefit_description?: string | null
          bonus_type: string
          cap_amount?: number | null
          cap_period?: string | null
          cash_amount_cents?: number | null
          created_at?: string | null
          currency_id?: string | null
          elite_unit_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          per_spend_cents?: number | null
          period?: string | null
          points_amount?: number | null
          reward_type?: string | null
          spend_threshold_cents?: number | null
          unit_value_cents?: number | null
          updated_at?: string | null
          user_id: string
          value_cents?: number | null
          wallet_card_id: string
        }
        Update: {
          benefit_description?: string | null
          bonus_type?: string
          cap_amount?: number | null
          cap_period?: string | null
          cash_amount_cents?: number | null
          created_at?: string | null
          currency_id?: string | null
          elite_unit_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          per_spend_cents?: number | null
          period?: string | null
          points_amount?: number | null
          reward_type?: string | null
          spend_threshold_cents?: number | null
          unit_value_cents?: number | null
          updated_at?: string | null
          user_id?: string
          value_cents?: number | null
          wallet_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_spend_bonuses_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "reward_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_spend_bonuses_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "user_effective_currency_values"
            referencedColumns: ["currency_id"]
          },
          {
            foreignKeyName: "user_spend_bonuses_wallet_card_id_fkey"
            columns: ["wallet_card_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sync_tokens: {
        Row: {
          created_at: string | null
          id: string
          last_used_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tracked_currencies: {
        Row: {
          created_at: string | null
          currency_id: string
          id: string
          is_archived: boolean
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency_id: string
          id?: string
          is_archived?: boolean
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency_id?: string
          id?: string
          is_archived?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tracked_currencies_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "reward_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tracked_currencies_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "user_effective_currency_values"
            referencedColumns: ["currency_id"]
          },
        ]
      }
      user_travel_booking_preferences: {
        Row: {
          brand_name: string | null
          category_slug: string
          created_at: string | null
          id: string
          portal_issuer_id: string | null
          preference_type: Database["public"]["Enums"]["travel_preference_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand_name?: string | null
          category_slug: string
          created_at?: string | null
          id?: string
          portal_issuer_id?: string | null
          preference_type?: Database["public"]["Enums"]["travel_preference_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand_name?: string | null
          category_slug?: string
          created_at?: string | null
          id?: string
          portal_issuer_id?: string | null
          preference_type?: Database["public"]["Enums"]["travel_preference_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_travel_booking_preferences_portal_issuer_id_fkey"
            columns: ["portal_issuer_id"]
            isOneToOne: false
            referencedRelation: "issuers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          added_at: string | null
          approval_date: string | null
          card_id: string
          closed_date: string | null
          closed_reason: string | null
          custom_name: string | null
          id: string
          manual_balance_cents: number | null
          manual_credit_limit_cents: number | null
          payment_due_day: number | null
          player_number: number | null
          product_changed_to_id: string | null
          statement_close_day: number | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          approval_date?: string | null
          card_id: string
          closed_date?: string | null
          closed_reason?: string | null
          custom_name?: string | null
          id?: string
          manual_balance_cents?: number | null
          manual_credit_limit_cents?: number | null
          payment_due_day?: number | null
          player_number?: number | null
          product_changed_to_id?: string | null
          statement_close_day?: number | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          approval_date?: string | null
          card_id?: string
          closed_date?: string | null
          closed_reason?: string | null
          custom_name?: string | null
          id?: string
          manual_balance_cents?: number | null
          manual_credit_limit_cents?: number | null
          payment_due_day?: number | null
          player_number?: number | null
          product_changed_to_id?: string | null
          statement_close_day?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wallets_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wallets_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wallets_product_changed_to_id_fkey"
            columns: ["product_changed_to_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_welcome_bonus_settings: {
        Row: {
          card_id: string
          created_at: string | null
          id: string
          is_active: boolean
          spend_requirement_override: number | null
          time_period_override: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          spend_requirement_override?: number | null
          time_period_override?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          spend_requirement_override?: number | null
          time_period_override?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_welcome_bonus_settings_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_welcome_bonus_settings_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_welcome_bonus_value_overrides: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          value_cents: number
          welcome_bonus_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          value_cents: number
          welcome_bonus_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          value_cents?: number
          welcome_bonus_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_welcome_bonus_value_overrides_welcome_bonus_id_fkey"
            columns: ["welcome_bonus_id"]
            isOneToOne: false
            referencedRelation: "card_welcome_bonuses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_welcome_bonuses: {
        Row: {
          benefit_description: string | null
          cash_amount_cents: number | null
          component_type: string
          created_at: string | null
          currency_id: string | null
          id: string
          is_active: boolean
          points_amount: number | null
          spend_requirement_cents: number
          time_period_months: number
          updated_at: string | null
          user_id: string
          value_cents: number | null
          wallet_card_id: string
        }
        Insert: {
          benefit_description?: string | null
          cash_amount_cents?: number | null
          component_type: string
          created_at?: string | null
          currency_id?: string | null
          id?: string
          is_active?: boolean
          points_amount?: number | null
          spend_requirement_cents: number
          time_period_months?: number
          updated_at?: string | null
          user_id: string
          value_cents?: number | null
          wallet_card_id: string
        }
        Update: {
          benefit_description?: string | null
          cash_amount_cents?: number | null
          component_type?: string
          created_at?: string | null
          currency_id?: string | null
          id?: string
          is_active?: boolean
          points_amount?: number | null
          spend_requirement_cents?: number
          time_period_months?: number
          updated_at?: string | null
          user_id?: string
          value_cents?: number | null
          wallet_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_welcome_bonuses_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "reward_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_welcome_bonuses_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "user_effective_currency_values"
            referencedColumns: ["currency_id"]
          },
          {
            foreignKeyName: "user_welcome_bonuses_wallet_card_id_fkey"
            columns: ["wallet_card_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      card_with_currency: {
        Row: {
          annual_fee: number | null
          default_earn_rate: number | null
          default_perks_value: number | null
          exclude_from_recommendations: boolean | null
          id: string | null
          is_active: boolean | null
          issuer_name: string | null
          name: string | null
          primary_currency_name: string | null
          product_type: Database["public"]["Enums"]["card_product_type"] | null
          secondary_currency_name: string | null
          slug: string | null
        }
        Relationships: []
      }
      user_effective_currency_values: {
        Row: {
          code: string | null
          currency_id: string | null
          currency_type:
            | Database["public"]["Enums"]["reward_currency_type"]
            | null
          is_custom: boolean | null
          name: string | null
          user_id: string | null
          value_cents: number | null
        }
        Relationships: []
      }
      user_effective_spending: {
        Row: {
          annual_spend_cents: number | null
          category_id: number | null
          category_name: string | null
          category_slug: string | null
          is_custom: boolean | null
          large_purchase_spend_cents: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_card_rules: {
        Args: {
          p_ads: number
          p_amazon: number
          p_card_name: string
          p_dining: number
          p_drugstore: number
          p_entertainment: number
          p_flights: number
          p_gas: number
          p_grocery: number
          p_home: number
          p_hotels: number
          p_internet: number
          p_mobile_pay: number
          p_office: number
          p_over5k: number
          p_phone: number
          p_rent: number
          p_rental_car: number
          p_streaming: number
          p_transit: number
          p_travel: number
          p_wholesale: number
        }
        Returns: undefined
      }
      get_currency_for_issuer: {
        Args: { issuer_name: string }
        Returns: string
      }
      insert_earning_rules: {
        Args: {
          p_ads: number
          p_amazon: number
          p_card_slug: string
          p_dining: number
          p_drugstore: number
          p_entertainment: number
          p_flights: number
          p_gas: number
          p_grocery: number
          p_home_improvement: number
          p_hotels: number
          p_internet: number
          p_mobile_pay: number
          p_office: number
          p_over_5k: number
          p_phone: number
          p_rent: number
          p_rental_car: number
          p_streaming: number
          p_transit: number
          p_travel: number
          p_wholesale: number
        }
        Returns: undefined
      }
      upsert_balance_additive: {
        Args: {
          p_balance_delta: number
          p_currency_id: string
          p_expiration_date?: string
          p_player_number: number
          p_source: string
          p_user_id: string
        }
        Returns: number
      }
    }
    Enums: {
      booking_method: "any" | "portal" | "brand"
      cap_period: "none" | "month" | "quarter" | "year" | "lifetime"
      cap_type:
        | "single_category"
        | "combined_categories"
        | "selected_category"
        | "top_category"
        | "top_two_categories"
        | "top_three_categories"
        | "second_top_category"
        | "all_categories"
      cap_unit: "spend" | "rewards"
      card_charge_type: "credit" | "charge" | "debit"
      card_product_type: "personal" | "business"
      credit_account_status: "open" | "closed" | "paid" | "unknown"
      credit_account_type:
        | "revolving"
        | "installment"
        | "mortgage"
        | "collection"
        | "other"
      credit_bureau: "equifax" | "experian" | "transunion"
      credit_report_source:
        | "myfico"
        | "equifax"
        | "experian"
        | "transunion"
        | "credit_karma"
        | "annual_credit_report"
      credit_loan_type:
        | "credit_card"
        | "flexible_credit_card"
        | "charge_card"
        | "auto_loan"
        | "mortgage"
        | "student_loan"
        | "personal_loan"
        | "home_equity"
        | "retail"
        | "other"
      credit_reset_cycle:
        | "monthly"
        | "quarterly"
        | "semiannual"
        | "annual"
        | "cardmember_year"
        | "usage_based"
      credit_responsibility:
        | "individual"
        | "joint"
        | "authorized_user"
        | "cosigner"
        | "unknown"
      credit_score_type:
        | "fico_8"
        | "fico_9"
        | "vantage_3"
        | "vantage_4"
        | "other"
        | "fico_bankcard_8"
        | "fico_2"
        | "fico_4"
        | "fico_5"
        | "fico_10"
        | "fico_10t"
        | "fico_auto_2"
        | "fico_auto_4"
        | "fico_auto_5"
        | "fico_auto_8"
        | "fico_auto_9"
        | "fico_auto_10"
        | "fico_bankcard_2"
        | "fico_bankcard_3"
        | "fico_bankcard_4"
        | "fico_bankcard_5"
        | "fico_bankcard_9"
        | "fico_bankcard_10"
      inventory_tracking_type: "quantity" | "dollar_value" | "single_use"
      reward_currency_type:
        | "points"
        | "cash"
        | "miles"
        | "other"
        | "airline_miles"
        | "hotel_points"
        | "transferable_points"
        | "non_transferable_points"
        | "cash_back"
        | "crypto"
      travel_preference_type: "direct" | "brand" | "portal"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_method: ["any", "portal", "brand"],
      cap_period: ["none", "month", "quarter", "year", "lifetime"],
      cap_type: [
        "single_category",
        "combined_categories",
        "selected_category",
        "top_category",
        "top_two_categories",
        "top_three_categories",
        "second_top_category",
        "all_categories",
      ],
      cap_unit: ["spend", "rewards"],
      card_charge_type: ["credit", "charge", "debit"],
      card_product_type: ["personal", "business"],
      credit_account_status: ["open", "closed", "paid", "unknown"],
      credit_account_type: [
        "revolving",
        "installment",
        "mortgage",
        "collection",
        "other",
      ],
      credit_bureau: ["equifax", "experian", "transunion"],
      credit_report_source: [
        "myfico",
        "equifax",
        "experian",
        "transunion",
        "credit_karma",
        "annual_credit_report",
      ],
      credit_loan_type: [
        "credit_card",
        "flexible_credit_card",
        "charge_card",
        "auto_loan",
        "mortgage",
        "student_loan",
        "personal_loan",
        "home_equity",
        "retail",
        "other",
      ],
      credit_reset_cycle: [
        "monthly",
        "quarterly",
        "semiannual",
        "annual",
        "cardmember_year",
        "usage_based",
      ],
      credit_responsibility: [
        "individual",
        "joint",
        "authorized_user",
        "cosigner",
        "unknown",
      ],
      credit_score_type: [
        "fico_8",
        "fico_9",
        "vantage_3",
        "vantage_4",
        "other",
        "fico_bankcard_8",
        "fico_2",
        "fico_4",
        "fico_5",
        "fico_10",
        "fico_10t",
        "fico_auto_2",
        "fico_auto_4",
        "fico_auto_5",
        "fico_auto_8",
        "fico_auto_9",
        "fico_auto_10",
        "fico_bankcard_2",
        "fico_bankcard_3",
        "fico_bankcard_4",
        "fico_bankcard_5",
        "fico_bankcard_9",
        "fico_bankcard_10",
      ],
      inventory_tracking_type: ["quantity", "dollar_value", "single_use"],
      reward_currency_type: [
        "points",
        "cash",
        "miles",
        "other",
        "airline_miles",
        "hotel_points",
        "transferable_points",
        "non_transferable_points",
        "cash_back",
        "crypto",
      ],
      travel_preference_type: ["direct", "brand", "portal"],
    },
  },
} as const
