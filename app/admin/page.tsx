"use client";

import { useState, useEffect } from "react";
import StarField from "@/components/effects/StarField";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";

/**
 * Admin page — client component that handles auth state.
 *
 * Checks if admin session exists by attempting to fetch protected data.
 * Shows login form or dashboard based on auth state.
 */
export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid session by hitting a protected endpoint
    fetch("/api/admin/participants")
      .then((res) => {
        setAuthenticated(res.ok);
      })
      .catch(() => {
        setAuthenticated(false);
      });
  }, []);

  // Loading state
  if (authenticated === null) {
    return (
      <div className="relative z-1 min-h-dvh">
        <StarField />
        <div className="flex items-center justify-center min-h-dvh">
          <p className="text-parchment-dim text-sm opacity-60">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — show login
  if (!authenticated) {
    return (
      <div className="relative z-1 min-h-dvh">
        <StarField />
        <AdminLogin onLogin={() => setAuthenticated(true)} />
      </div>
    );
  }

  // Authenticated — show dashboard
  return (
    <div className="relative z-1 min-h-dvh">
      <StarField />
      <AdminDashboard />
    </div>
  );
}
