import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createUntypedClient } from "@/lib/supabase/server";
import { checkRateLimit, feedbackRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

export async function POST(request: Request) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 3 submissions per hour per user
  const { success } = await checkRateLimit(feedbackRateLimit, user.id);
  if (!success) {
    logger.warn({ userId: user.id }, "Feedback submission rate limited");
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const { type, message } = await request.json();

    if (!type || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["bug", "feature", "general"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid feedback type" },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "Message too long" },
        { status: 400 }
      );
    }

    // Use untyped client since user_feedback isn't in generated types yet
    const supabase = createUntypedClient();
    const { error } = await supabase.from("user_feedback").insert({
      user_id: user.id,
      feedback_type: type,
      message,
      page_url: request.headers.get("referer") ?? null,
      user_agent: request.headers.get("user-agent") ?? null,
    });

    if (error) {
      logger.error({ err: error, userId: user.id }, "Failed to save feedback");
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 }
      );
    }

    logger.info({ userId: user.id, type }, "Feedback submitted");
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Feedback submission error");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
