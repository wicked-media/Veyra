import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader } from "@veyra/ui";
import { ShieldCheck } from "lucide-react";

export function PlannedModule({
  eyebrow,
  title,
  description,
  stage,
  icon,
  points,
  note,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  stage: string;
  icon: ReactNode;
  points: string[];
  note?: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <EmptyState
        icon={icon}
        title={`${title} is scheduled for ${stage}`}
        description="This page is deliberately explicit about what is not yet built. No placeholder controls are presented as working functionality."
        stage={stage}
      />
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>What this module will deliver</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-muted">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-teal-500" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Guardrails already in place</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-[12px] leading-relaxed text-muted">
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
              Firm isolation, role permissions and ethical walls already apply to every existing record.
            </p>
            <p className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
              Every consequential change will write to the append-only audit trail.
            </p>
            {note ? <p className="rounded-md border border-dashed border-line px-2.5 py-2 text-[11px] text-faint">{note}</p> : null}
          </CardContent>
        </Card>
      </div>
      {children}
    </div>
  );
}
