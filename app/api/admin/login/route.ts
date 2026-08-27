import { NextResponse } from "next/server";
import { checkAdminPassword, createAdminSession } from "@/lib/auth";
import { validatePassword } from "@/lib/validation";

/**
 * POST /api/admin/login
 *
 * Verifies admin password and sets an HTTP-only session cookie.
 * The password is never stored in or sent to the client.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (!checkAdminPassword(password)) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    await createAdminSession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
