export const SNIPPETS_PANEL_WIDTH = 420;
export const SNIPPETS_PANEL_DEFAULT_TOP = 72;
export const SNIPPETS_PANEL_MARGIN = 16;

export const SNIPPETS_KEYBOARD_SHORTCUT = "Ctrl+Shift+S";

export function isSnippetsHotkey(event: KeyboardEvent): boolean {
  return event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "s";
}
