import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();

  const { data: currencies, error } = await supabase
    .from("reward_currencies")
    .select("id, code, name, currency_type, program_name")
    .order("name");

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch currencies" },
      { status: 500 }
    );
  }

  // Return with cache headers (currencies rarely change)
  return NextResponse.json(
    { currencies },
    {
      headers: {
        "Cache-Control": "private, max-age=300", // 5 minutes
      },
    }
  );
}
