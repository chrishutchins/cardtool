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
          created_at: string | null
          default_earn_rate: number
          default_perks_value: number | null
          exclude_from_recommendations: boolean
          id: string
          is_active: boolean
          issuer_id: string
          name: string
          primary_currency_id: string
          product_type: Database["public"]["Enums"]["card_product_type"]
          secondary_currency_id: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          annual_fee?: number
          created_at?: string | null
          default_earn_rate?: number
          default_perks_value?: number | null
          exclude_from_recommendations?: boolean
          id?: string
          is_active?: boolean
          issuer_id: string
          name: string
          primary_currency_id: string
          product_type: Database["public"]["Enums"]["card_product_type"]
          secondary_currency_id?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          annual_fee?: number
          created_at?: string | null
          default_earn_rate?: number
          default_perks_value?: number | null
          exclude_from_recommendations?: boolean
          id?: string
          is_active?: boolean
          issuer_id?: string
          name?: string
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
      issuers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
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
          base_value_cents: number | null
          cash_out_value_cents: number | null
          code: string
          created_at: string | null
          currency_type: Database["public"]["Enums"]["reward_currency_type"]
          id: string
          name: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          base_value_cents?: number | null
          cash_out_value_cents?: number | null
          code: string
          created_at?: string | null
          currency_type: Database["public"]["Enums"]["reward_currency_type"]
          id?: string
          name: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          base_value_cents?: number | null
          cash_out_value_cents?: number | null
          code?: string
          created_at?: string | null
          currency_type?: Database["public"]["Enums"]["reward_currency_type"]
          id?: string
          name?: string
          notes?: string | null
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
      user_bonus_display_settings: {
        Row: {
          created_at: string | null
          id: string
          include_spend_bonuses: boolean
          include_welcome_bonuses: boolean
          show_available_credit: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          include_spend_bonuses?: boolean
          include_welcome_bonuses?: boolean
          show_available_credit?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
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
          card_id: string
          created_at: string | null
          debit_pay_percent: number | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          debit_pay_percent?: number | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          debit_pay_percent?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_card_debit_pay_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_card_debit_pay_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_card_perks_values: {
        Row: {
          card_id: string
          created_at: string | null
          id: string
          perks_value: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          perks_value?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          perks_value?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_card_perks_values_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_card_perks_values_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
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
          debit_pay_enabled: boolean | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_linking_enabled?: boolean | null
          created_at?: string | null
          debit_pay_enabled?: boolean | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_linking_enabled?: boolean | null
          created_at?: string | null
          debit_pay_enabled?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "card_with_currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_linked_accounts_wallet_card_id_fkey"
            columns: ["wallet_card_id"]
            isOneToOne: false
            referencedRelation: "cards"
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
          id: string
          institution_id: string | null
          institution_name: string | null
          item_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          item_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          institution_id?: string | null
          institution_name?: string | null
          item_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          card_id: string
          custom_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          card_id: string
          custom_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          card_id?: string
          custom_name?: string | null
          id?: string
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
      card_product_type: "personal" | "business"
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
      card_product_type: ["personal", "business"],
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
