import type { SyntaxIssue } from "@/utils/plantuml-syntax";

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export function localizeSyntaxIssue(
  issue: SyntaxIssue,
  t: TranslateFn,
): string {
  if (issue.messageKey) {
    const params = issue.messageParams
      ? Object.fromEntries(
          Object.entries(issue.messageParams).map(([key, value]) => [
            key,
            typeof value === "string" && value.startsWith("syntax.")
              ? t(value)
              : value,
          ]),
        )
      : undefined;

    return t(issue.messageKey, params);
  }

  return issue.message ?? "";
}

export function formatLocalizedSyntaxIssues(
  issues: SyntaxIssue[],
  t: TranslateFn,
): string {
  if (issues.length === 0) {
    return t("syntax.titleValid");
  }

  return issues
    .map((issue) => {
      const prefix = issue.line
        ? `${t("syntax.severity." + issue.severity)}: ${t("syntax.line", { line: issue.line })} `
        : `${t("syntax.severity." + issue.severity)}: `;
      return `${prefix}${localizeSyntaxIssue(issue, t)}`;
    })
    .join("\n");
}
