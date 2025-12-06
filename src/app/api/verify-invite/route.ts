import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    // Get valid invite codes from environment variable
    // Format: INVITE_CODES=CODE1,CODE2,CODE3
    const rawCodes = process.env.INVITE_CODES?.replace(/^["']|["']$/g, "") ?? "";
    const validCodes = rawCodes
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length > 0);

    // Check if the provided code matches any valid code
    const isValid = validCodes.includes(code.trim().toUpperCase());

    return NextResponse.json({ valid: isValid });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}

