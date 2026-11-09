export interface ActionState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
  temporaryPassword?: string;
}

export const emptyActionState: ActionState = {};

interface ValidationIssue {
  path: readonly PropertyKey[];
  message: string;
}

export function issuesToFieldErrors(issues: readonly ValidationIssue[]): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_form";
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fieldErrors;
}

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
