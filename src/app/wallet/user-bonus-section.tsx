// Types for user-defined bonuses (kept for backward compatibility)
// The actual bonus management UI has been moved to the CardSettingsModal

export interface UserWelcomeBonus {
  id: string;
  wallet_card_id: string;
  is_active: boolean;
  component_type: "points" | "cash" | "benefit";
  spend_requirement_cents: number;
  time_period_months: number;
  points_amount: number | null;
  currency_id: string | null;
  cash_amount_cents: number | null;
  benefit_description: string | null;
  value_cents: number | null;
  currency_name?: string | null;
}

export interface UserSpendBonus {
  id: string;
  wallet_card_id: string;
  is_active: boolean;
  name: string;
  bonus_type: "threshold" | "elite_earning";
  // Threshold fields
  spend_threshold_cents: number | null;
  reward_type: "points" | "cash" | "benefit" | null;
  points_amount: number | null;
  currency_id: string | null;
  cash_amount_cents: number | null;
  benefit_description: string | null;
  value_cents: number | null;
  period: "year" | "calendar_year" | "lifetime" | null;
  // Elite earning fields
  per_spend_cents: number | null;
  elite_unit_name: string | null;
  unit_value_cents: number | null;
  cap_amount: number | null;
  cap_period: "year" | "calendar_year" | null;
  currency_name?: string | null;
}
