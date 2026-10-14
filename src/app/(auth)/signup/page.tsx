"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageSquare, CheckCircle, UsersRound, Eye, EyeOff } from "lucide-react";
import { RasaLogo } from "@/components/brand/rasa-logo";

// `useSearchParams` opts the component out of static prerendering
// unless wrapped in Suspense — same pattern as /login.
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const searchParams = useSearchParams();
  // When the user lands here from `/join/<token>` we carry the
  // invite token in the query so it survives the signup → email
  // verification → redirect round-trip. `emailRedirectTo` below
  // sends the verified user to /join/<token> so they land on the
  // redeem step instead of being dropped on /dashboard.
  const inviteToken = searchParams.get("invite");
  const t = useTranslations("SignupPage");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t("passwordsMismatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    setLoading(true);

    // Always name our own origin as the place the confirmation link
    // returns to. Previously this was left unset unless an invite was
    // involved, so Supabase fell back to its Site URL — which on a
    // freshly-created or self-hosted project is `http://localhost:3000`
    // (issue #595) — and even when the Site URL was right the link
    // landed on `/` with an unexchanged `?code=`, so the user had to
    // sign in again after verifying. /auth/callback exchanges the link
    // for a session and forwards to `next` (issue #592). Supabase still
    // has to allow this origin under Authentication → URL Configuration
    // → Redirect URLs; see docs/auth-emails.md.
    const next = inviteToken
      ? `/join/${encodeURIComponent(inviteToken)}`
      : "/dashboard";
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, emailRedirectTo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }
    } catch {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    setSuccess(true);
    setLoading(false);
  };

  if (!inviteToken) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#050508] px-4 overflow-hidden">
        {/* Studio Radial Glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[radial-gradient(circle,_rgba(123,45,139,0.18)_0%,_rgba(0,0,0,0)_70%)] pointer-events-none blur-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[radial-gradient(circle,_rgba(0,240,255,0.12)_0%,_rgba(0,0,0,0)_70%)] pointer-events-none blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[radial-gradient(circle,_rgba(255,42,133,0.12)_0%,_rgba(0,0,0,0)_70%)] pointer-events-none blur-3xl" />

        <Card className="relative z-10 w-full max-w-md border border-white/10 bg-[#0b0914]/85 shadow-[0_0_60px_-10px_rgba(212,160,23,0.25)] backdrop-blur-2xl rounded-2xl overflow-hidden p-8 text-center">
          <div className="mb-4 flex justify-center">
            <RasaLogo size="lg" subtitle="PRODUCTIONS" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-wider uppercase text-white" style={{ fontFamily: "var(--font-heading)" }}>
            Invite-Only Registration
          </CardTitle>
          <CardDescription className="text-sm text-gray-400 mt-2 mb-6">
            Public self-registration is closed. Only users who have been invited by the account administrator can join Rasa Productions CRM.
          </CardDescription>
          <Link href="/login">
            <Button
              className="h-11 w-full bg-gradient-to-r from-[#d4a017] via-[#f59e0b] to-[#d4a017] text-black font-bold uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(212,160,23,0.35)] hover:brightness-110 active:scale-[0.99] transition-all"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Return to Sign In
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border bg-card">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">
              {t("checkEmailTitle")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t.rich("checkEmailDesc", {
                email,
                strong: (chunks) => (
                  <span className="text-foreground">{chunks}</span>
                ),
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
              }
            >
              <Button
                variant="outline"
                className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {t("backToSignIn")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#050508] px-4 py-8 overflow-hidden">
      {/* Studio Radial Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[radial-gradient(circle,_rgba(123,45,139,0.18)_0%,_rgba(0,0,0,0)_70%)] pointer-events-none blur-3xl" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[radial-gradient(circle,_rgba(0,240,255,0.12)_0%,_rgba(0,0,0,0)_70%)] pointer-events-none blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[radial-gradient(circle,_rgba(255,42,133,0.12)_0%,_rgba(0,0,0,0)_70%)] pointer-events-none blur-3xl" />

      {/* Luxury Studio Glass Card */}
      <Card className="relative z-10 w-full max-w-md border border-white/10 bg-[#0b0914]/85 shadow-[0_0_60px_-10px_rgba(212,160,23,0.25)] backdrop-blur-2xl rounded-2xl overflow-hidden">
        {/* Top neon shimmer line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff2a85] to-transparent opacity-90" />

        <CardHeader className="items-center text-center pt-8 pb-4">
          <div className="mb-4">
            <RasaLogo size="lg" subtitle="PRODUCTIONS" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-wider uppercase text-white" style={{ fontFamily: "var(--font-heading)" }}>
            {inviteToken ? t("titleJoin") : t("title")}
          </CardTitle>
          <CardDescription className="text-sm text-gray-400 max-w-xs mt-1">
            {inviteToken ? t("descJoin") : t("desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName" className="text-xs uppercase tracking-wider text-gray-400 font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                {t("fullNameLabel")}
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder={t("fullNamePlaceholder")}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="border-white/10 bg-[#130f21]/90 text-white placeholder:text-gray-500 focus-visible:border-[#d4a017] focus-visible:ring-[#d4a017]/25 rounded-xl h-11"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-gray-400 font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                {t("emailLabel")}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-white/10 bg-[#130f21]/90 text-white placeholder:text-gray-500 focus-visible:border-[#d4a017] focus-visible:ring-[#d4a017]/25 rounded-xl h-11"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-gray-400 font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                {t("passwordLabel")}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-white/10 bg-[#130f21]/90 text-white placeholder:text-gray-500 focus-visible:border-[#d4a017] focus-visible:ring-[#d4a017]/25 rounded-xl h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-wider text-gray-400 font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                {t("confirmPasswordLabel")}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("confirmPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="border-white/10 bg-[#130f21]/90 text-white placeholder:text-gray-500 focus-visible:border-[#d4a017] focus-visible:ring-[#d4a017]/25 rounded-xl h-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-3 h-11 w-full bg-gradient-to-r from-[#d4a017] via-[#f59e0b] to-[#d4a017] text-black font-bold uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(212,160,23,0.35)] hover:shadow-[0_0_35px_rgba(212,160,23,0.55)] hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {loading ? t("creating") : t("submit")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            {t("haveAccount")}{" "}
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
              }
              className="font-medium text-[#00f0ff] hover:text-[#00f0ff]/80 transition-colors"
            >
              {t("signIn")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
