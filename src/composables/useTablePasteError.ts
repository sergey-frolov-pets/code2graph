import { ref } from "vue";
import type { TablePasteErrorInfo } from "@/services/table-paste";

const pasteErrorOpen = ref(false);
const pasteError = ref<TablePasteErrorInfo | null>(null);

export function reportTablePasteError(error: TablePasteErrorInfo): void {
  pasteError.value = error;
  pasteErrorOpen.value = true;
}

export function useTablePasteErrorHost() {
  function closeTablePasteError(): void {
    pasteErrorOpen.value = false;
  }

  return {
    pasteErrorOpen,
    pasteError,
    closeTablePasteError,
  };
}
