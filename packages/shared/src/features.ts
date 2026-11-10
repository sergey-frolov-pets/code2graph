export const SERVER_FEATURE_IDS = [
  "library.read",
  "library.download",
  "library.write",
  "llm.proxy",
] as const;

export const CLIENT_FEATURE_IDS = [
  "editor.open",
  "editor.copySource",
  "editor.export",
  "editor.ai",
  "editor.wizard",
  "editor.presentation",
  "editor.snippets",
] as const;

export const FEATURE_IDS = [...SERVER_FEATURE_IDS, ...CLIENT_FEATURE_IDS] as const;

export type FeatureId = (typeof FEATURE_IDS)[number];

export type FeatureMap = Record<FeatureId, boolean>;

export type SectionPermissionLevel = "view" | "download" | "contribute";

/** Features an admin can toggle in the subscription form. */
export const EDITABLE_FEATURE_IDS = [
  ...CLIENT_FEATURE_IDS,
  "llm.proxy",
] as const satisfies readonly FeatureId[];

export type EditableFeatureId = (typeof EDITABLE_FEATURE_IDS)[number];

export function isFeatureId(value: string): value is FeatureId {
  return (FEATURE_IDS as readonly string[]).includes(value);
}

export function allFeaturesAllowed(): FeatureMap {
  return {
    "library.read": true,
    "library.download": true,
    "library.write": true,
    "llm.proxy": true,
    "editor.open": true,
    "editor.copySource": true,
    "editor.export": true,
    "editor.ai": true,
    "editor.wizard": true,
    "editor.presentation": true,
    "editor.snippets": true,
  };
}

/**
 * Subscriptions saved before feature rows existed keep the old permission rules.
 * View cannot open, copy, or export. Write stays on contribute.
 */
export function defaultFeaturesForPermission(
  permission: SectionPermissionLevel,
): FeatureMap {
  const canTakeSource = permission !== "view";
  return {
    "library.read": true,
    "library.download": canTakeSource,
    "library.write": permission === "contribute",
    "llm.proxy": true,
    "editor.open": canTakeSource,
    "editor.copySource": canTakeSource,
    "editor.export": canTakeSource,
    "editor.ai": true,
    "editor.wizard": true,
    "editor.presentation": true,
    "editor.snippets": true,
  };
}

export function mergeFeatureDefaults(
  permission: SectionPermissionLevel,
  overrides: Partial<FeatureMap> | null | undefined,
): FeatureMap {
  const features = defaultFeaturesForPermission(permission);
  if (!overrides) {
    return features;
  }

  for (const featureId of FEATURE_IDS) {
    const value = overrides[featureId];
    if (typeof value === "boolean") {
      features[featureId] = value;
    }
  }

  return features;
}

export function restrictFeatureMaps(maps: FeatureMap[]): FeatureMap {
  const features = allFeaturesAllowed();
  for (const map of maps) {
    for (const featureId of FEATURE_IDS) {
      if (!map[featureId]) {
        features[featureId] = false;
      }
    }
  }

  return features;
}

export function featureMapAllowsSource(features: FeatureMap): boolean {
  return features["library.download"] && features["editor.copySource"];
}
