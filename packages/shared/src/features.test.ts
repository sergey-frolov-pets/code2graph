import { describe, expect, it } from "vitest";
import {
  defaultFeaturesForPermission,
  featureMapAllowsSource,
  mergeFeatureDefaults,
  restrictFeatureMaps,
} from "./features.js";

describe("defaultFeaturesForPermission", () => {
  it("blocks opening and export for view subscriptions", () => {
    const features = defaultFeaturesForPermission("view");
    expect(features["editor.open"]).toBe(false);
    expect(features["editor.copySource"]).toBe(false);
    expect(features["editor.export"]).toBe(false);
    expect(features["library.write"]).toBe(false);
    expect(features["editor.ai"]).toBe(true);
    expect(featureMapAllowsSource(features)).toBe(false);
  });

  it("allows client actions for download without write", () => {
    const features = defaultFeaturesForPermission("download");
    expect(features["editor.export"]).toBe(true);
    expect(features["library.download"]).toBe(true);
    expect(features["library.write"]).toBe(false);
  });

  it("allows write only for contribute", () => {
    expect(defaultFeaturesForPermission("contribute")["library.write"]).toBe(true);
  });
});

describe("mergeFeatureDefaults", () => {
  it("lets a stored row turn off a feature the permission would allow", () => {
    const features = mergeFeatureDefaults("download", { "editor.export": false });
    expect(features["editor.export"]).toBe(false);
    expect(features["editor.open"]).toBe(true);
  });
});

describe("restrictFeatureMaps", () => {
  it("keeps a feature only when every map allows it", () => {
    const restricted = restrictFeatureMaps([
      defaultFeaturesForPermission("contribute"),
      defaultFeaturesForPermission("view"),
    ]);
    expect(restricted["editor.open"]).toBe(false);
    expect(restricted["library.write"]).toBe(false);
    expect(restricted["editor.ai"]).toBe(true);
  });
});
