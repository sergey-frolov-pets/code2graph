// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ref } from "vue";
import { useEditorAutocomplete } from "@/composables/useEditorAutocomplete";

describe("useEditorAutocomplete", () => {
  let textarea: HTMLTextAreaElement;

  beforeEach(() => {
    textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
  });

  afterEach(() => {
    textarea.remove();
  });

  it("does not open suggestions before two typed characters", () => {
    const source = ref("@startuml\ni");
    textarea.value = source.value;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    const autocomplete = useEditorAutocomplete({
      source,
      diagramFormat: ref("plantuml"),
      folds: ref([]),
      textareaRef: ref(textarea),
      editorFontSize: ref("14px"),
      enabled: ref(true),
    });

    autocomplete.refresh();

    expect(autocomplete.isOpen.value).toBe(false);
    expect(autocomplete.hasSuggestions.value).toBe(false);
  });

  it("opens suggestions after two typed characters", () => {
    const source = ref("@startuml\nif");
    textarea.value = source.value;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    const autocomplete = useEditorAutocomplete({
      source,
      diagramFormat: ref("plantuml"),
      folds: ref([]),
      textareaRef: ref(textarea),
      editorFontSize: ref("14px"),
      enabled: ref(true),
    });

    autocomplete.refresh();

    expect(autocomplete.isOpen.value).toBe(true);
    expect(autocomplete.hasSuggestions.value).toBe(true);
  });

  it("opens D2 keyword suggestions from the shared engine", () => {
    const source = ref("dire");
    textarea.value = source.value;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    const autocomplete = useEditorAutocomplete({
      source,
      diagramFormat: ref("d2"),
      folds: ref([]),
      textareaRef: ref(textarea),
      editorFontSize: ref("14px"),
      enabled: ref(true),
    });

    autocomplete.refresh();

    expect(autocomplete.isOpen.value).toBe(true);
    expect(
      autocomplete.suggestions.value.some((item) => item.label === "direction"),
    ).toBe(true);
  });

  it("does not block Enter when prefix is shorter than two characters", () => {
    const source = ref("@startuml\ni");
    textarea.value = source.value;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    const autocomplete = useEditorAutocomplete({
      source,
      diagramFormat: ref("plantuml"),
      folds: ref([]),
      textareaRef: ref(textarea),
      editorFontSize: ref("14px"),
      enabled: ref(true),
    });

    autocomplete.refresh();

    const enterEvent = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    const prevented = autocomplete.handleKeydown(enterEvent);

    expect(prevented).toBe(false);
    expect(enterEvent.defaultPrevented).toBe(false);
  });

  it("accepts the active suggestion on Tab", () => {
    const source = ref("@startuml\nif");
    textarea.value = source.value;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    const autocomplete = useEditorAutocomplete({
      source,
      diagramFormat: ref("plantuml"),
      folds: ref([]),
      textareaRef: ref(textarea),
      editorFontSize: ref("14px"),
      enabled: ref(true),
    });

    autocomplete.refresh();

    const tabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    const handled = autocomplete.handleKeydown(tabEvent);

    expect(autocomplete.isOpen.value).toBe(false);
    expect(handled).toBe(true);
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(source.value.startsWith("@startuml\n")).toBe(true);
    expect(source.value).not.toBe("@startuml\nif");
  });

  it("leaves Tab to the editor when suggestions are closed", () => {
    const source = ref("@startuml\nAlice -> Bob");
    textarea.value = source.value;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    const autocomplete = useEditorAutocomplete({
      source,
      diagramFormat: ref("plantuml"),
      folds: ref([]),
      textareaRef: ref(textarea),
      editorFontSize: ref("14px"),
      enabled: ref(true),
    });

    const tabEvent = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
    const handled = autocomplete.handleKeydown(tabEvent);

    expect(handled).toBe(false);
    expect(tabEvent.defaultPrevented).toBe(false);
    expect(source.value).toBe("@startuml\nAlice -> Bob");
  });
});
