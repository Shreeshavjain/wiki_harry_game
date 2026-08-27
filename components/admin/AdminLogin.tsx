"use client";

import { useState } from "react";

interface AdminLoginProps {
  onLogin: () => void;
}

/**
 * Admin login form — validates against the server-side password.
 * The password is never exposed to the client.
 */
export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!password.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      onLogin();
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[280px] mx-auto mt-20 text-center">
      <p className="eyebrow mb-1.5">Restricted</p>
      <h1 className="font-[family-name:var(--font-cinzel-decorative)] font-black text-[1.4rem] m-0 mb-5 [text-shadow:0_0_18px_rgba(201,162,39,0.25)]">
        Admin Access
      </h1>
      <input
        type="password"
        className="magic-input tracking-[0.3em] text-center"
        placeholder="Enter Password"
        maxLength={50}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        disabled={loading}
        id="adminPasswordInput"
      />
      <div className="mt-4">
        <button
          className="btn-magic"
          onClick={handleLogin}
          disabled={!password.trim() || loading}
          id="adminLoginBtn"
        >
          {loading ? "Verifying..." : "Enter"}
        </button>
      </div>
      {error && (
        <p className="text-[#ff8f8f] text-[0.82rem] mt-2.5">{error}</p>
      )}
    </div>
  );
}
