import type { Metadata } from "next";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, PageHeader } from "@veyra/ui";
import { requireSession } from "@/lib/session";
import { PasswordForm } from "@/components/forms/password-form";

export const metadata: Metadata = { title: "Change password" };

export default async function PasswordPage() {
  const session = await requireSession();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Your account"
        title="Change password"
        description={`Signed in as ${session.actor.email}.`}
      />

      {session.mustChangePassword ? (
        <div
          role="alert"
          className="rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-3 text-xs leading-relaxed text-warning"
        >
          <p className="font-medium">Replace your temporary password to continue.</p>
          <p className="mt-1">
            You were issued a one-time password. The rest of the firm is locked until you set your own
            password.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <KeyRound className="size-4 text-teal-600" aria-hidden />
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-2.5 pt-4 text-[11.5px] leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />
          <div>
            <p className="font-medium text-ink">Session security</p>
            <p className="mt-1">
              Changing your password revokes every other session. Passwords are hashed with scrypt and a
              per-user salt; no plaintext password is ever stored or logged.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
