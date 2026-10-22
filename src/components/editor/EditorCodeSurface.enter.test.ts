// @vitest-environment jsdom

import { createApp, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import EditorCodeSurface from "@/components/editor/EditorCodeSurface.vue";
import { useEditorAutocomplete } from "@/composables/useEditorAutocomplete";
import type { CodeFoldRegion } from "@/utils/code-folds";

function columnAt(text: string, offset: number): number {
  return offset - (text.lastIndexOf("\n", offset - 1) + 1);
}

function columnOfFirstGlyph(line: string): number {
  const match = /[^ \t]/.exec(line);
  return match ? match.index : 0;
}

function mountEditor(initialSource: string) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const source = ref(initialSource);

  const app = createApp({
    setup() {
      const folds = ref<CodeFoldRegion[]>([]);
      const autocomplete = useEditorAutocomplete({
        source,
        diagramFormat: ref("plantuml"),
        folds,
        textareaRef: ref(null),
        editorFontSize: ref("14px"),
        enabled: ref(false),
      });

      return () =>
        h(EditorCodeSurface, {
          source: source.value,
          folds: folds.value,
          displayText: source.value,
          visibleEditorLines: [],
          useLineVirtualization: false,
          syntaxHighlightEnabled: false,
          autocompleteEnabled: false,
          readOnly: false,
          errorLines: [],
          autocomplete,
          "onUpdate:source": (value: string) => {
            source.value = value;
          },
        });
    },
  });

  app.mount(host);

  return {
    source,
    host,
    unmount() {
      app.unmount();
      host.remove();
    },
  };
}

describe("EditorCodeSurface Enter at line end", () => {
  const mounted: Array<{ unmount: () => void }> = [];

  afterEach(() => {
    for (const editor of mounted.splice(0)) {
      editor.unmount();
    }
  });

  it("puts the caret under the first character of the line where Enter was pressed", async () => {
    const editor = mountEditor("    participant Alice\n    participant Bob");
    mounted.push(editor);
    await nextTick();

    const textarea = editor.host.querySelector("textarea");
    expect(textarea).not.toBeNull();

    const line = "    participant Alice";
    textarea!.focus();
    textarea!.setSelectionRange(line.length, line.length);
    textarea!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
    await nextTick();

    expect(editor.source.value).toBe(
      "    participant Alice\n    \n    participant Bob",
    );
    expect(textarea!.selectionStart).toBe(textarea!.selectionEnd);
    expect(columnAt(textarea!.value, textarea!.selectionStart)).toBe(
      columnOfFirstGlyph(line),
    );
  });

  it("leaves a caret in the middle of a line on the native path", async () => {
    const initial = "    participant Alice";
    const editor = mountEditor(initial);
    mounted.push(editor);
    await nextTick();

    const textarea = editor.host.querySelector("textarea");
    textarea!.focus();
    textarea!.setSelectionRange(6, 6);
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    textarea!.dispatchEvent(event);
    await nextTick();

    expect(event.defaultPrevented).toBe(false);
    expect(editor.source.value).toBe(initial);
  });
});
