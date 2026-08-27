import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/auth";

/**
 * POST /api/admin/logout
 *
 * Clears the admin session cookie.
 */
export async function POST() {
  try {
    await clearAdminSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
