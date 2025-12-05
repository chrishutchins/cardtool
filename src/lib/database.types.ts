export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
          primary_currency_type: Database["public"]["Enums"]["reward_currency_type"] | null
          primary_currency_value: number | null
          product_type: Database["public"]["Enums"]["card_product_type"] | null
          secondary_currency_code: string | null
          secondary_currency_id: string | null
          secondary_currency_name: string | null
          secondary_currency_type: Database["public"]["Enums"]["reward_currency_type"] | null
          secondary_currency_value: number | null
          slug: string | null
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: {
      cap_period: "none" | "month" | "quarter" | "year" | "lifetime"
      cap_unit: "spend" | "rewards"
      card_product_type: "personal" | "business"
      reward_currency_type: "points" | "cash" | "miles" | "other"
    }
    CompositeTypes: Record<string, never>
  }
}

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"]

