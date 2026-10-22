// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import { useDiagramDocument } from "@/composables/useDiagramDocument";
import { useEditorAutocomplete } from "@/composables/useEditorAutocomplete";

vi.mock("@/composables/useAppDialog", () => ({
  useAppDialog: () => ({
    prompt: vi.fn(),
  }),
}));

vi.mock("@/composables/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

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

  it("keeps a space after a keyword accepted from suggestions", async () => {
    const source = ref("@startuml\nac");
    textarea.value = source.value;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    useDiagramDocument({
      source,
      diagramFormat: ref("plantuml"),
      error: ref(""),
      syntaxErrorLines: ref<number[]>([]),
      persistSettings: vi.fn(),
      scheduleRender: vi.fn(),
      clearHistory: vi.fn(),
    });

    const autocomplete = useEditorAutocomplete({
      source,
      diagramFormat: ref("plantuml"),
      folds: ref([]),
      textareaRef: ref(textarea),
      editorFontSize: ref("14px"),
      enabled: ref(true),
    });

    autocomplete.refresh();
    expect(autocomplete.applySelected()).toBe(true);
    await nextTick();

    expect(source.value).toBe("@startuml\nactivate ");

    const spaceEvent = new KeyboardEvent("keydown", { key: " ", bubbles: true });
    expect(autocomplete.handleKeydown(spaceEvent)).toBe(false);
    expect(spaceEvent.defaultPrevented).toBe(false);
  });
});
