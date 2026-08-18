import { computed, ref, watch, type Ref } from "vue";
import type { DiagramFormat } from "@/constants/diagram-formats";
import { resolveDiagramFileName } from "@/utils/diagram-files";

export interface EditorDocument {
  id: string;
  label: string;
  source: string;
  format: DiagramFormat;
  fileName: string;
}

function createDocumentId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface UseEditorDocumentsOptions {
  source: Ref<string>;
  diagramFormat: Ref<DiagramFormat>;
  loadedFileName: Ref<string>;
  onPersist: () => void;
}

export function useEditorDocuments(options: UseEditorDocumentsOptions) {
  const documents = ref<EditorDocument[]>([]);
  const activeDocumentId = ref("");
  const syncingFromDocument = ref(false);
  const initialized = ref(false);

  const activeDocument = computed(() =>
    documents.value.find((doc) => doc.id === activeDocumentId.value) ??
    documents.value[0] ??
    null,
  );

  function initDocuments(): void {
    if (initialized.value) {
      return;
    }

    const id = createDocumentId();
    documents.value = [{
      id,
      label: options.loadedFileName.value.replace(/\.[^.]+$/, "") || "diagram",
      source: options.source.value,
      format: options.diagramFormat.value,
      fileName: options.loadedFileName.value,
    }];
    activeDocumentId.value = id;
    initialized.value = true;
  }

  function syncActiveDocumentToRefs(): void {
    const doc = activeDocument.value;
    if (!doc) {
      return;
    }

    syncingFromDocument.value = true;
    options.source.value = doc.source;
    options.diagramFormat.value = doc.format;
    options.loadedFileName.value = doc.fileName;
    syncingFromDocument.value = false;
  }

  watch(
    () => options.source.value,
    (nextSource) => {
      if (syncingFromDocument.value) {
        return;
      }

      const doc = activeDocument.value;
      if (doc && doc.source !== nextSource) {
        doc.source = nextSource;
        options.onPersist();
      }
    },
  );

  watch(
    () => options.diagramFormat.value,
    (nextFormat) => {
      if (syncingFromDocument.value) {
        return;
      }

      const doc = activeDocument.value;
      if (doc && doc.format !== nextFormat) {
        doc.format = nextFormat;
        doc.fileName = resolveDiagramFileName(doc.fileName, nextFormat);
        options.onPersist();
      }
    },
  );

  watch(
    () => options.loadedFileName.value,
    (nextFileName) => {
      if (syncingFromDocument.value) {
        return;
      }

      const doc = activeDocument.value;
      if (doc && doc.fileName !== nextFileName) {
        doc.fileName = nextFileName;
        doc.label = nextFileName.replace(/\.[^.]+$/, "") || doc.label;
      }
    },
  );

  function switchTab(documentId: string): void {
    if (documentId === activeDocumentId.value) {
      return;
    }

    const target = documents.value.find((doc) => doc.id === documentId);
    if (!target) {
      return;
    }

    activeDocumentId.value = documentId;
    syncActiveDocumentToRefs();
    options.onPersist();
  }

  function openNewTab(payload: {
    source: string;
    label: string;
    format?: DiagramFormat;
  }): string {
    initDocuments();

    const format = payload.format ?? "plantuml";
    const fileName = resolveDiagramFileName(
      `${payload.label}.puml`,
      format,
    );

    const document: EditorDocument = {
      id: createDocumentId(),
      label: payload.label,
      source: payload.source,
      format,
      fileName,
    };

    documents.value.push(document);
    activeDocumentId.value = document.id;
    syncActiveDocumentToRefs();
    options.onPersist();
    return document.id;
  }

  function closeTab(documentId: string): void {
    if (documents.value.length <= 1) {
      return;
    }

    const index = documents.value.findIndex((doc) => doc.id === documentId);
    if (index < 0) {
      return;
    }

    documents.value.splice(index, 1);

    if (activeDocumentId.value === documentId) {
      const fallback = documents.value[Math.max(0, index - 1)];
      activeDocumentId.value = fallback?.id ?? documents.value[0]?.id ?? "";
      syncActiveDocumentToRefs();
      options.onPersist();
    }
  }

  function updateActiveDocumentSource(source: string, label?: string): void {
    initDocuments();
    const doc = activeDocument.value;
    if (!doc) {
      return;
    }

    doc.source = source;
    if (label) {
      doc.label = label;
    }
    options.onPersist();
  }

  return {
    documents,
    activeDocumentId,
    activeDocument,
    initDocuments,
    switchTab,
    openNewTab,
    closeTab,
    updateActiveDocumentSource,
  };
}
