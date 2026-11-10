import type Database from "better-sqlite3";
import {
  allFeaturesAllowed,
  restrictFeatureMaps,
  type FeatureMap,
} from "../../../packages/shared/src/features.js";
import { isAdmin } from "../authz.js";
import { listGrantedSubscriptions, subscriptionIncludesDiagram } from "../subscriptions.js";
import type { UserDto } from "../types.js";
import { featuresForSubscription } from "./subscription-features.js";

export function featuresForDiagramUser(
  database: Database.Database,
  user: UserDto,
  diagramId: string,
): FeatureMap {
  if (isAdmin(user)) {
    return allFeaturesAllowed();
  }

  const grants = listGrantedSubscriptions(database, user.id).filter((grant) =>
    subscriptionIncludesDiagram(database, grant.id, diagramId),
  );

  if (grants.length === 0) {
    return allFeaturesAllowed();
  }

  return restrictFeatureMaps(
    grants.map((grant) =>
      featuresForSubscription(database, grant.id, grant.permission),
    ),
  );
}

export function userAllowsLlmProxy(
  database: Database.Database,
  user: UserDto,
): boolean {
  if (isAdmin(user)) {
    return true;
  }

  const grants = listGrantedSubscriptions(database, user.id);
  if (grants.length === 0) {
    return true;
  }

  return grants.some(
    (grant) =>
      featuresForSubscription(database, grant.id, grant.permission)["llm.proxy"],
  );
}

export function accountFeatureMap(
  database: Database.Database,
  user: UserDto,
): FeatureMap {
  const features = allFeaturesAllowed();
  features["llm.proxy"] = userAllowsLlmProxy(database, user);
  return features;
}
