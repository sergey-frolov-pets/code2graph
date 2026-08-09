import { onUnmounted, watch, type Ref } from "vue";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
  );
}

export function useModalA11y(
  open: Ref<boolean>,
  dialogRef: Ref<HTMLElement | null>,
): void {
  let previousFocus: HTMLElement | null = null;

  function onFocusTrap(event: KeyboardEvent): void {
    if (!open.value || event.key !== "Tab" || !dialogRef.value) {
      return;
    }

    const focusable = getFocusableElements(dialogRef.value);
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.value.focus();
      return;
    }

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  watch(
    open,
    (isOpen) => {
      if (isOpen) {
        previousFocus = document.activeElement as HTMLElement | null;
        document.addEventListener("keydown", onFocusTrap);

        requestAnimationFrame(() => {
          const root = dialogRef.value;
          if (!root) {
            return;
          }

          const focusable = getFocusableElements(root);
          if (focusable.length > 0) {
            focusable[0]!.focus();
            return;
          }

          root.focus();
        });
        return;
      }

      document.removeEventListener("keydown", onFocusTrap);
      previousFocus?.focus();
      previousFocus = null;
    },
    { flush: "post" },
  );

  onUnmounted(() => {
    document.removeEventListener("keydown", onFocusTrap);
  });
}
