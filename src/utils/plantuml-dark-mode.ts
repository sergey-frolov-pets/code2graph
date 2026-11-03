const DARK_MODE_SKINPARAMS = [
  "skinparam backgroundColor #171d24",
  "skinparam defaultFontColor #e8ecf0",
  "skinparam shadowing false",
] as const;

export function applyDarkModeSkinparams(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) {
    return `@startuml\n${DARK_MODE_SKINPARAMS.join("\n")}\n@enduml`;
  }

  const skinparamBlock = DARK_MODE_SKINPARAMS.join("\n");

  if (trimmed.startsWith("@startuml")) {
    return trimmed.replace("@startuml", `@startuml\n${skinparamBlock}`);
  }

  return `@startuml\n${skinparamBlock}\n\n${trimmed}\n@enduml`;
}
