import { clerkMiddleware, clerkClient, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define protected routes - user pages require auth
const isProtectedRoute = createRouteMatcher(["/wallet(.*)", "/returns(.*)", "/compare(.*)", "/spending(.*)", "/point-values(.*)", "/settings(.*)"]);

// Admin routes require auth + admin role
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

// Check if email is in admin list
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  // Remove any surrounding quotes from env var and split by comma
  const rawEmails = process.env.ADMIN_EMAILS?.replace(/^["']|["']$/g, "") ?? "";
  const adminEmails = rawEmails.split(",").map(e => e.trim().toLowerCase()).filter(e => e.length > 0);
  return adminEmails.includes(email.toLowerCase());
}

export default clerkMiddleware(async (auth, req) => {
  // Check admin routes first
  if (isAdminRoute(req)) {
    const { userId } = await auth.protect();
    
    // Fetch user's email from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress;
    
    if (!isAdminEmail(email)) {
      // Non-admin trying to access admin route - redirect to home
      return NextResponse.redirect(new URL("/", req.url));
    }
  } else if (isProtectedRoute(req)) {
    await auth.protect();
  }
}, {
  authorizedParties: [
    'http://localhost:3000',
    'http://Chriss-Mac-Studio.local:3000',
    'https://cardtool.chrishutchins.com',
    'https://cardtool-staging.chrishutchins.com',
  ],
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
