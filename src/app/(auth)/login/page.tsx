"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { MessageSquare, UsersRound, Eye, EyeOff } from "lucide-react";
import { RasaLogo } from "@/components/brand/rasa-logo";

// `useSearchParams` opts the component out of static prerendering
// unless it sits under a Suspense boundary. We split the form into
// a child component so the outer page can prerender the chrome
// (background, card frame) while the form hydrates with the query
// string on the client.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  // Forwarded from `/join/<token>` when the visitor already has an
  // account. After a successful sign-in we send them to the join
  // page to accept rather than to /dashboard.
  const inviteToken = searchParams.get("invite");
  const t = useTranslations("LoginPage");
  // Set by /auth/callback when an emailed link (confirmation, password
  // reset) could not be turned into a session — see src/lib/auth/callback.ts.
  const linkError = searchParams.get("error");
  const linkErrorMessage =
    linkError === "link_expired"
      ? t("linkExpired")
      : linkError === "link_invalid"
        ? t("linkInvalid")
        : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
    } catch {
      // Fallback to client-side Supabase if route unreachable
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    // Full-page navigation (not router.push) so the browser issues a
    // fresh top-level request that carries the just-written Supabase
    // auth cookies to the middleware gating /dashboard. A soft
    // client-side navigation can reach the protected route before the
    // server observes the new session, so the middleware bounces it
    // back to /login — which looks like the page "just refreshing"
    // instead of signing in (issue #365). Mirrors the deliberate full
    // reload the invite-accept flow already uses in join/[token].
    const destination = inviteToken
      ? `/join/${encodeURIComponent(inviteToken)}`
      : "/dashboard";
    window.location.href = destination;
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#050508] px-4 overflow-hidden">
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
            {inviteToken ? t('titleAccept') : t('titleWelcome')}
          </CardTitle>
          <CardDescription className="text-sm text-gray-400 max-w-xs mt-1">
            {inviteToken
              ? t('descAccept')
              : t('descWelcome')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {linkErrorMessage && !error && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                {linkErrorMessage}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-gray-400 font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                {t('emailLabel')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-white/10 bg-[#130f21]/90 text-white placeholder:text-gray-500 focus-visible:border-[#d4a017] focus-visible:ring-[#d4a017]/25 rounded-xl h-11"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-gray-400 font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                  {t('passwordLabel')}
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#00f0ff] hover:text-[#00f0ff]/80 transition-colors font-medium"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('passwordPlaceholder')}
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

            <Button
              type="submit"
              disabled={loading}
              className="mt-3 h-11 w-full bg-gradient-to-r from-[#d4a017] via-[#f59e0b] to-[#d4a017] text-black font-bold uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(212,160,23,0.35)] hover:shadow-[0_0_35px_rgba(212,160,23,0.55)] hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {loading ? t('signingIn') : t('signIn')}
            </Button>
          </form>

          {inviteToken && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t('noAccount')}{" "}
              <Link
                href={`/signup?invite=${encodeURIComponent(inviteToken)}`}
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {t('createAccount')}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
