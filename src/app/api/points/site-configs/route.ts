import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

// GET - Fetch all active site configs (for user script)
export async function GET() {
  const supabase = createClient();

  const { data: configs, error } = await supabase
    .from("site_configs")
    .select("id, name, currency_code, domain, balance_page_url, selector, parse_regex, is_active")
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

// Helper to check admin auth
async function checkAdminAuth(request: Request): Promise<{ isAuthorized: boolean; createdBy: string | null }> {
  // Check for admin API key (for Tampermonkey scripts on external sites)
  const adminKey = request.headers.get("x-admin-key");
  const validAdminKey = process.env.ADMIN_API_KEY;
  
  if (adminKey && validAdminKey && adminKey === validAdminKey) {
    return { isAuthorized: true, createdBy: "admin-api-key" };
  }
  
  // Try Clerk auth (for requests from CardTool itself)
  const user = await currentUser();
  if (user) {
    const email = user.emailAddresses?.[0]?.emailAddress;
    if (isAdminEmail(email)) {
      return { isAuthorized: true, createdBy: user.id };
    }
  }
  
  return { isAuthorized: false, createdBy: null };
}

// POST - Create a new site config (admin only)
export async function POST(request: Request) {
  const { isAuthorized, createdBy } = await checkAdminAuth(request);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, currencyCode, domain, balancePageUrl, selector, parseRegex } = body;

    // Validate required fields
    if (!name || !currencyCode || !domain || !selector) {
      return NextResponse.json(
        { error: "Missing required fields: name, currencyCode, domain, selector" },
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
          domain,
          balance_page_url: balancePageUrl || null,
          selector,
          parse_regex: parseRegex || "[\\d,]+",
          is_active: true,
          updated_at: new Date().toISOString(),
          created_by: createdBy,
        },
        {
          onConflict: "currency_code,domain",
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

// PUT - Update an existing site config (admin only)
export async function PUT(request: Request) {
  const { isAuthorized } = await checkAdminAuth(request);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, currencyCode, domain, balancePageUrl, selector, parseRegex, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing required field: id" }, { status: 400 });
    }

    const supabase = createClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (currencyCode !== undefined) updateData.currency_code = currencyCode;
    if (domain !== undefined) updateData.domain = domain;
    if (balancePageUrl !== undefined) updateData.balance_page_url = balancePageUrl || null;
    if (selector !== undefined) updateData.selector = selector;
    if (parseRegex !== undefined) updateData.parse_regex = parseRegex;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data, error } = await supabase
      .from("site_configs")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating site config:", error);
      return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
    }

    return NextResponse.json({ success: true, config: data });
  } catch (error) {
    console.error("Site config update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE - Delete a site config (admin only)
export async function DELETE(request: Request) {
  const { isAuthorized } = await checkAdminAuth(request);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing required parameter: id" }, { status: 400 });
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("site_configs")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting site config:", error);
      return NextResponse.json({ error: "Failed to delete config" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Site config delete error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
