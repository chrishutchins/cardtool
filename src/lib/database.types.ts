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
      card_currency_enablers: {
        Row: {
          card_id: string
          enabler_card_id: string
        }
        Insert: {
          card_id: string
          enabler_card_id: string
        }
        Update: {
          card_id?: string
          enabler_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_currency_enablers_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_currency_enablers_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_currency_enablers_enabler_card_id_fkey"
            columns: ["enabler_card_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_currency_enablers_enabler_card_id_fkey"
            columns: ["enabler_card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_earning_rules: {
        Row: {
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
      cards: {
        Row: {
          annual_fee_cents: number
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
          annual_fee_cents?: number
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
          annual_fee_cents?: number
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
        Relationships: [
          {
            foreignKeyName: "cards_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["issuer_id"]
          },
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
            referencedRelation: "card_with_currency"
            referencedColumns: ["primary_currency_id"]
          },
          {
            foreignKeyName: "cards_primary_currency_id_fkey"
            columns: ["primary_currency_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["secondary_currency_id"]
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
            referencedRelation: "card_with_currency"
            referencedColumns: ["primary_currency_id"]
          },
          {
            foreignKeyName: "cards_secondary_currency_id_fkey"
            columns: ["secondary_currency_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["secondary_currency_id"]
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
          id: number
          name: string
          slug: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          slug: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string | null
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
            referencedRelation: "card_with_currency"
            referencedColumns: ["primary_currency_id"]
          },
          {
            foreignKeyName: "user_currency_values_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "card_with_currency"
            referencedColumns: ["secondary_currency_id"]
          },
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
    }
    Views: {
      card_with_currency: {
        Row: {
          annual_fee_cents: number | null
          default_earn_rate: number | null
          id: string | null
          is_active: boolean | null
          issuer_id: string | null
          issuer_name: string | null
          issuer_slug: string | null
          name: string | null
          primary_currency_code: string | null
          primary_currency_id: string | null
          primary_currency_name: string | null
          primary_currency_type:
            | Database["public"]["Enums"]["reward_currency_type"]
            | null
          primary_currency_value: number | null
          product_type: Database["public"]["Enums"]["card_product_type"] | null
          secondary_currency_code: string | null
          secondary_currency_id: string | null
          secondary_currency_name: string | null
          secondary_currency_type:
            | Database["public"]["Enums"]["reward_currency_type"]
            | null
          secondary_currency_value: number | null
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
          sort_order: number | null
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
      cap_period: "none" | "month" | "quarter" | "year" | "lifetime"
      cap_unit: "spend" | "rewards"
      card_product_type: "personal" | "business"
      reward_currency_type: "points" | "cash" | "miles" | "other"
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
      cap_period: ["none", "month", "quarter", "year", "lifetime"],
      cap_unit: ["spend", "rewards"],
      card_product_type: ["personal", "business"],
      reward_currency_type: ["points", "cash", "miles", "other"],
    },
  },
} as const
