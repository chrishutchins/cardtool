import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import logger from "@/lib/logger";

interface HealthCheck {
  timestamp: string;
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  checks: {
    database: "healthy" | "unhealthy" | "unknown";
  };
}

export async function GET() {
  const checks: HealthCheck = {
    timestamp: new Date().toISOString(),
    status: "healthy",
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
    checks: {
      database: "unknown",
    },
  };

  try {
    // Test DB connectivity with a simple query
    const supabase = await createClient();
    const { error } = await supabase.from("cards").select("id").limit(1);

    if (error) {
      checks.checks.database = "unhealthy";
      checks.status = "degraded";
      logger.error({ err: error }, "Health check: Database query failed");
      return NextResponse.json(checks, { status: 503 });
    }

    checks.checks.database = "healthy";
    return NextResponse.json(checks, { status: 200 });
  } catch (error) {
    checks.status = "unhealthy";
    checks.checks.database = "unhealthy";
    logger.error({ err: error }, "Health check: Critical failure");
    return NextResponse.json(checks, { status: 503 });
  }
}

