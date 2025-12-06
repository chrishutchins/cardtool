export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      cards: {
        Row: {
          annual_fee: number
          created_at: string | null
          default_earn_rate: number
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
          source: string | null
          updated_at: string | null
        }
        Insert: {
          annual_spend_cents?: number
          category_id: number
          created_at?: string | null
          id?: number
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          annual_spend_cents?: number
          category_id?: number
          created_at?: string | null
          id?: number
          source?: string | null
          updated_at?: string | null
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      user_category_spend: {
        Row: {
          annual_spend_cents: number
          category_id: number
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          annual_spend_cents: number
          category_id: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          annual_spend_cents?: number
          category_id?: number
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
        Relationships: []
      }
      user_feature_flags: {
        Row: {
          created_at: string | null
          debit_pay_enabled: boolean | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          debit_pay_enabled?: boolean | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          debit_pay_enabled?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      user_wallets: {
        Row: {
          added_at: string | null
          card_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          card_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          card_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      card_with_currency: {
        Row: {
          annual_fee: number | null
          default_earn_rate: number | null
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
          currency_type: Database["public"]["Enums"]["reward_currency_type"] | null
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
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
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
