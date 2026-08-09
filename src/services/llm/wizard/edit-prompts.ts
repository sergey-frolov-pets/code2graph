export function buildPatchPrompt(
  fullSource: string,
  selectedFragment: string,
  selectionStart: number,
  selectionEnd: number,
  userPrompt: string,
): string {
  const startLine = fullSource.slice(0, selectionStart).split(/\r?\n/).length;
  const endLine = fullSource.slice(0, selectionEnd).split(/\r?\n/).length;

  return [
    "Edit ONLY the selected PlantUML fragment according to the user request.",
    "Return JSON with field replacement containing the NEW text for the selected region (not the full file).",
    "You MUST apply the user request to the selection. Do not return text identical to the selected fragment.",
    "Keep syntax valid within the fragment; the app will merge replacement into the full source.",
    "",
    `Selection range: lines ${startLine}-${endLine}`,
    "",
    "=== FULL SOURCE (context, do not repeat unchanged parts in replacement) ===",
    fullSource,
    "",
    "=== SELECTED FRAGMENT (replace this) ===",
    selectedFragment,
    "",
    "=== USER REQUEST ===",
    userPrompt.trim(),
  ].join("\n");
}

function isActivitySwimlaneDiagram(source: string): boolean {
  return (
    /@startuml/i.test(source) &&
    (/swimlane/i.test(source) ||
      /\|[^|\n]+\|/.test(source) ||
      /:\s*[^;]+;\s*$/m.test(source))
  );
}

function buildActivitySwimlaneEditHints(): string {
  return [
    "Activity swimlane editing:",
    "- Add a lane: |#Color|Lane name| (example: |#LightPink|Clients| or |#LightCoral|Customer|).",
    "- Switch lanes with another |...| line before steps in that lane.",
    "- Artifacts: floating note right: Artifact label; or :Create artifact; <<artifact>>;",
    "- Keep @startuml/@enduml and existing skinparam blocks.",
  ].join("\n");
}

export function buildFullDiagramEditPrompt(
  fullSource: string,
  userPrompt: string,
): string {
  const lines = [
    "Edit the ENTIRE PlantUML diagram according to the user request.",
    "Return JSON with field plantuml containing the FULL updated source.",
    "You MUST apply the user request. Do not return text identical to the current source.",
    "Preserve parts of the diagram that the user did not ask to change unless the request implies a global rewrite.",
  ];

  if (isActivitySwimlaneDiagram(fullSource)) {
    lines.push("", buildActivitySwimlaneEditHints());
  }

  lines.push(
    "",
    "=== CURRENT DIAGRAM SOURCE ===",
    fullSource,
    "",
    "=== USER REQUEST ===",
    userPrompt.trim(),
  );

  return lines.join("\n");
}

export function buildFullDiagramNoChangeRetryPrompt(
  userPrompt: string,
  fullSource?: string,
): string {
  const lines = [
    "Your previous response did not change the diagram source.",
    `User request: ${userPrompt.trim()}`,
    "",
    "Return JSON with field plantuml containing a REVISED full diagram that satisfies the request.",
    "The plantuml field MUST differ from the current source.",
    "Do NOT echo the input diagram unchanged.",
  ];

  if (fullSource && isActivitySwimlaneDiagram(fullSource)) {
    lines.push("", buildActivitySwimlaneEditHints());
  }

  return lines.join("\n");
}

export function buildFullDiagramRevertRetryPrompt(
  userPrompt: string,
  validationIssues: string,
): string {
  return [
    "Do NOT return the original unchanged diagram.",
    "You already tried to apply the user request but the result failed validation or was reverted.",
    `User request: ${userPrompt.trim()}`,
    "",
    "Return JSON with field plantuml containing the FULL diagram that:",
    "1) Applies the user request (e.g. new swimlanes, artifacts, steps)",
    "2) Passes PlantUML syntax rules",
    "",
    "Fix these validation errors while keeping the intended changes:",
    validationIssues,
  ].join("\n");
}

export function requestsStructuralDiagramEdit(userPrompt: string): boolean {
  return /swimlane|swim\s*line|артефакт|artifact|дорожк|линию|клиент|customer|lane/i.test(
    userPrompt,
  );
}

export function buildPatchNoChangeRetryPrompt(
  userPrompt: string,
  selectedFragment: string,
  parsedMode: "replacement" | "full",
): string {
  const lines = [
    "Your previous response did not change the selected fragment.",
    `User request: ${userPrompt.trim()}`,
    "",
    "Return JSON with field replacement containing NEW text for the selected region.",
    "The replacement MUST differ from the selected fragment and MUST satisfy the user request.",
    "",
    "=== SELECTED FRAGMENT (must change) ===",
    selectedFragment,
  ];

  if (parsedMode === "full") {
    lines.push(
      "",
      "Do not return the full plantuml file. Use only the replacement field for the selected fragment.",
    );
  }

  return lines.join("\n");
}
