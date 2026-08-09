import { describe, expect, it } from "vitest";
import { useAppModals } from "@/composables/useAppModals";
import { APP_MODAL_IDS, APP_MODAL_OPEN_REF } from "./app-modal-registry";

describe("app-modal-registry", () => {
  it("covers every useAppModals open ref", () => {
    const modals = useAppModals();
    const modalOpenRefs = Object.keys(modals)
      .filter((key) => key.startsWith("is") && key.endsWith("Open"))
      .sort();

    const registryOpenRefs = Object.values(APP_MODAL_OPEN_REF).sort();

    expect(registryOpenRefs).toEqual(modalOpenRefs);
  });

  it("has a component entry for every modal id", () => {
    expect(APP_MODAL_IDS).toHaveLength(Object.keys(APP_MODAL_OPEN_REF).length);
  });
});
