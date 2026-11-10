import type Database from "better-sqlite3";
import {
  featureMapAllowsSource,
  mergeFeatureDefaults,
  type FeatureId,
  type FeatureMap,
  type SectionPermissionLevel,
} from "../../../packages/shared/src/features.js";
import { isSectionAccessPermission } from "../types.js";

interface FeatureRow {
  feature_id: string;
  allowed: number;
}

export function readSubscriptionFeatureOverrides(
  database: Database.Database,
  subscriptionId: string,
): Partial<FeatureMap> {
  const rows = database
    .prepare(
      `SELECT feature_id, allowed
       FROM subscription_features
       WHERE subscription_id = ?`,
    )
    .all(subscriptionId) as FeatureRow[];

  const overrides: Partial<FeatureMap> = {};
  for (const row of rows) {
    overrides[row.feature_id as FeatureId] = row.allowed === 1;
  }

  return overrides;
}

export function replaceSubscriptionFeatures(
  database: Database.Database,
  subscriptionId: string,
  features: Partial<FeatureMap> | undefined,
): void {
  database
    .prepare("DELETE FROM subscription_features WHERE subscription_id = ?")
    .run(subscriptionId);

  if (!features) {
    return;
  }

  const insert = database.prepare(
    `INSERT INTO subscription_features (subscription_id, feature_id, allowed)
     VALUES (?, ?, ?)`,
  );

  for (const [featureId, allowed] of Object.entries(features)) {
    if (typeof allowed !== "boolean") {
      continue;
    }

    insert.run(subscriptionId, featureId, allowed ? 1 : 0);
  }
}

export function parseFeaturePayload(
  value: unknown,
): Partial<FeatureMap> | undefined | null {
  if (value === undefined) {
    return undefined;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const features: Partial<FeatureMap> = {};
  for (const [featureId, allowed] of Object.entries(value)) {
    if (typeof allowed !== "boolean") {
      return null;
    }

    features[featureId as FeatureId] = allowed;
  }

  return features;
}

export function featuresForSubscription(
  database: Database.Database,
  subscriptionId: string,
  permission: string,
): FeatureMap {
  const level: SectionPermissionLevel = isSectionAccessPermission(permission)
    ? permission
    : "view";

  return mergeFeatureDefaults(
    level,
    readSubscriptionFeatureOverrides(database, subscriptionId),
  );
}

export function shouldHideDiagramSource(features: FeatureMap): boolean {
  return !featureMapAllowsSource(features);
}
