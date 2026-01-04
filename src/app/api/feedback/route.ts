import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import sgMail from "@sendgrid/mail";
import { createUntypedClient } from "@/lib/supabase/server";
import { checkRateLimit, feedbackRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FEEDBACK_NOTIFY_EMAIL = process.env.FEEDBACK_NOTIFY_EMAIL || "";
const FEEDBACK_FROM_EMAIL = process.env.FEEDBACK_FROM_EMAIL || "noreply@cardtool.chrishutchins.com";

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

    const pageUrl = request.headers.get("referer") ?? "Unknown";
    const userEmail = user.emailAddresses[0]?.emailAddress ?? "Unknown";

    // Use untyped client since user_feedback isn't in generated types yet
    const supabase = createUntypedClient();
    const { error } = await supabase.from("user_feedback").insert({
      user_id: user.id,
      feedback_type: type,
      message,
      page_url: pageUrl,
      user_agent: request.headers.get("user-agent") ?? null,
    });

    if (error) {
      logger.error({ err: error, userId: user.id }, "Failed to save feedback");
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 }
      );
    }

    // Send email notification (don't fail request if email fails)
    if (process.env.SENDGRID_API_KEY && FEEDBACK_NOTIFY_EMAIL) {
      try {
        const typeEmoji = type === "bug" ? "🐛" : type === "feature" ? "💡" : "💬";
        const typeLabel = type === "bug" ? "Bug Report" : type === "feature" ? "Feature Request" : "General Feedback";
        
        await sgMail.send({
          to: FEEDBACK_NOTIFY_EMAIL,
          from: FEEDBACK_FROM_EMAIL,
          replyTo: userEmail,
          subject: `${typeEmoji} New ${typeLabel} from ${userEmail}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3b82f6;">${typeEmoji} New ${typeLabel}</h2>
              <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0; white-space: pre-wrap;">${message}</p>
              </div>
              <table style="font-size: 14px; color: #71717a;">
                <tr>
                  <td style="padding-right: 12px;"><strong>From:</strong></td>
                  <td>${userEmail}</td>
                </tr>
                <tr>
                  <td style="padding-right: 12px;"><strong>Page:</strong></td>
                  <td>${pageUrl}</td>
                </tr>
                <tr>
                  <td style="padding-right: 12px;"><strong>Time:</strong></td>
                  <td>${new Date().toISOString()}</td>
                </tr>
              </table>
            </div>
          `,
        });
        logger.info({ userId: user.id, type }, "Feedback email notification sent");
      } catch (emailError) {
        // Log but don't fail the request
        logger.error({ err: emailError }, "Failed to send feedback email notification");
      }
    }

    logger.info({ userId: user.id, type }, "Feedback submitted");
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Feedback submission error");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
