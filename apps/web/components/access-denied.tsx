import { Lock } from "lucide-react";
import { EmptyState } from "@veyra/ui";

export function AccessDenied({
  title = "Access restricted",
  description = "Your role does not include access to this area. If you need it for your work, ask your firm administrator to review your permissions."
}: {
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon={<Lock className="size-5" aria-hidden />}
      title={title}
      description={description}
    />
  );
}
