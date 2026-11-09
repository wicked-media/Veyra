import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { resolveAuthMode, resolveOidcConfiguration, safeReturnTo } from "@veyra/auth";
import { BrandMark } from "@/components/brand";
import { SignInForm } from "@/components/forms/sign-in-form";
import { LinkButton } from "@/components/link-button";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

const proofPoints = [
  "One firm-scoped record for every client, matter and team.",
  "Server-enforced access with ethical walls and restricted matters.",
  "An append-only audit trail that cannot be rewritten."
];

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(session.mustChangePassword ? "/account/password" : "/dashboard");

  const query = await searchParams;
  const authMode = resolveAuthMode();
  const oidc = resolveOidcConfiguration();
  const returnTo = safeReturnTo(query.returnTo);
  const showLocal = authMode === "local";
  const showDemo = showLocal && !process.env.DATABASE_URL;
  const oidcStartHref = `/api/auth/oidc/start?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar px-12 py-10 text-sidebar-ink lg:flex">
        <div className="pointer-events-none absolute inset-0 grid-texture opacity-[0.18]" aria-hidden />
        <div className="relative flex items-center gap-2.5">
          <BrandMark className="size-9 text-teal-500" />
          <div className="leading-none">
            <p className="font-display text-lg font-semibold tracking-[0.22em]">VEYRA</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.24em] text-sidebar-muted">
              Legal operating system
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-500">
            One platform · every practice
          </p>
          <h1 className="mt-4 font-display text-[38px] leading-[1.12] font-medium tracking-tight">
            The operating system for the modern Australian law firm.
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-sidebar-muted">
            Matters, clients, documents, deadlines, billing and matter-aware AI — built on one
            secure record, with the controls a legal practice actually needs.
          </p>
          <ul className="mt-8 space-y-3.5">
            {proofPoints.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[13px] leading-relaxed text-sidebar-muted">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-teal-500" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between border-t border-sidebar-line pt-5 text-[10px] uppercase tracking-[0.16em] text-sidebar-muted">
          <span>Designed in Australia</span>
          <span>NSW foundations · 2026</span>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <BrandMark className="size-9 text-teal-500" />
            <div>
              <p className="font-display text-base font-semibold tracking-[0.2em] text-ink">VEYRA</p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-faint">Legal operating system</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-[26px] font-semibold tracking-tight text-ink">
              Sign in to your firm
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              {authMode === "oidc"
                ? "Continue with your firm identity provider. Multi-factor authentication is enforced before a session is created."
                : "Use the email address your firm administrator set up for you."}
            </p>
          </div>

          {query.error ? (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs leading-relaxed text-danger"
            >
              {query.error}
            </div>
          ) : null}

          <div className="mt-7 space-y-4">
            {oidc.configured ? (
              <div className="space-y-2.5">
                <LinkButton href={oidcStartHref} variant="primary" className="w-full">
                  <ShieldCheck className="size-4" aria-hidden />
                  Continue with {oidc.providerLabel}
                </LinkButton>
                <p className="text-center text-[11px] leading-relaxed text-faint">
                  You will be redirected to your organisation&apos;s identity provider.
                  {oidc.mfaRequired ? " MFA is required." : " MFA is not enforced by this deployment."}
                </p>
              </div>
            ) : null}

            {authMode === "oidc" && !oidc.configured ? (
              <div className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs leading-relaxed text-danger">
                <p className="font-semibold">Identity sign-in is not configured.</p>
                <p className="mt-1">
                  Production requires a managed OIDC issuer and client. Missing:{" "}
                  {oidc.missing.join(", ")}. Local password sign-in is disabled in production.
                </p>
              </div>
            ) : null}

            {showLocal && oidc.configured ? (
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                  Development only
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>
            ) : null}

            {showLocal ? <SignInForm /> : null}
          </div>

          {showDemo ? (
            <div className="mt-8 rounded-xl border border-line bg-surface p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-600">
                Local development
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                The seeded demonstration firm is <span className="font-medium text-ink">Marlow &amp; Finch Legal</span>.
              </p>
              <dl className="mt-2 space-y-1 font-mono text-[11.5px] text-ink">
                <div className="flex justify-between gap-3">
                  <dt className="text-faint">Email</dt>
                  <dd>eleanor@marlowfinch.demo</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-faint">Password</dt>
                  <dd>Veyra!Demo2026</dd>
                </div>
              </dl>
              <p className="mt-2 text-[10.5px] leading-relaxed text-faint">
                Demonstration data only. Never enable local seeding against production records.
              </p>
            </div>
          ) : null}

          <p className="mt-8 text-[11px] leading-relaxed text-faint">
            Veyra is practice management software, not a source of legal advice. Access is logged and
            subject to your firm&apos;s professional obligations.
          </p>
        </div>
      </section>
    </main>
  );
}
