import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

// GET - Fetch all active site configs (for user script)
export async function GET() {
  const supabase = createClient();

  const { data: configs, error } = await supabase
    .from("site_configs")
    .select("name, currency_code, url_pattern, balance_page_url, selector, parse_regex")
    .eq("is_active", true)
    .order("name");

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch site configs" },
      { status: 500 }
    );
  }

  // Return with cache headers (configs change rarely)
  return NextResponse.json(
    { configs },
    {
      headers: {
        "Cache-Control": "public, max-age=300", // 5 minutes
      },
    }
  );
}

// POST - Create a new site config (admin only)
export async function POST(request: Request) {
  // Check for admin API key (for Tampermonkey scripts on external sites)
  const adminKey = request.headers.get("x-admin-key");
  const validAdminKey = process.env.ADMIN_API_KEY;
  
  let isAuthorized = false;
  let createdBy: string | null = null;

  if (adminKey && validAdminKey && adminKey === validAdminKey) {
    // Authorized via API key
    isAuthorized = true;
    createdBy = "admin-api-key";
  } else {
    // Try Clerk auth (for requests from CardTool itself)
    const user = await currentUser();
    if (user) {
      const email = user.emailAddresses?.[0]?.emailAddress;
      if (isAdminEmail(email)) {
        isAuthorized = true;
        createdBy = user.id;
      }
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, currencyCode, urlPattern, balancePageUrl, selector, parseRegex } = body;

    // Validate required fields
    if (!name || !currencyCode || !urlPattern || !selector) {
      return NextResponse.json(
        { error: "Missing required fields: name, currencyCode, urlPattern, selector" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Upsert - update if exists, insert if not
    const { data, error } = await supabase
      .from("site_configs")
      .upsert(
        {
          name,
          currency_code: currencyCode,
          url_pattern: urlPattern,
          balance_page_url: balancePageUrl || null,
          selector,
          parse_regex: parseRegex || "[\\d,]+",
          is_active: true,
          updated_at: new Date().toISOString(),
          created_by: createdBy,
        },
        {
          onConflict: "currency_code,url_pattern",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error saving site config:", error);
      return NextResponse.json(
        { error: "Failed to save config" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      config: data,
    });
  } catch (error) {
    console.error("Site config error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
