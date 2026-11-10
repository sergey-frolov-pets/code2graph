import { computed, ref } from "vue";
import type { FeatureId, FeatureMap } from "@shared/features";

const documentFeatures = ref<FeatureMap | null>(null);
const accountFeatures = ref<FeatureMap | null>(null);

export function setDocumentFeatureSnapshot(features: FeatureMap | null): void {
  documentFeatures.value = features;
}

export function setAccountFeatures(features: FeatureMap | null): void {
  accountFeatures.value = features;
}

export function isFeatureAllowed(featureId: FeatureId): boolean {
  if (documentFeatures.value && documentFeatures.value[featureId] === false) {
    return false;
  }

  if (accountFeatures.value && accountFeatures.value[featureId] === false) {
    return false;
  }

  return true;
}

export function useFeatureGate(featureId: FeatureId) {
  return computed(() => {
    void documentFeatures.value;
    void accountFeatures.value;
    return isFeatureAllowed(featureId);
  });
}
