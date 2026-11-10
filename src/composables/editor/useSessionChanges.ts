import { computed, ref } from "vue";
import {
  diffSessionHunks,
  splitSourceLines,
} from "@/services/editor/session-changes";

interface DocumentSession {
  baseline: string | null;
  fileShowsBaseline: boolean;
  flippedHunkIds: string[];
}

const activeDocumentId = ref("");
const sessions = ref<Record<string, DocumentSession>>({});

function emptySession(): DocumentSession {
  return {
    baseline: null,
    fileShowsBaseline: false,
    flippedHunkIds: [],
  };
}

function writeSession(documentId: string, session: DocumentSession): void {
  sessions.value = {
    ...sessions.value,
    [documentId]: session,
  };
}

function readSession(documentId: string): DocumentSession {
  return sessions.value[documentId] ?? emptySession();
}

export function useSessionChanges() {
  const activeSession = computed(
    () => sessions.value[activeDocumentId.value] ?? emptySession(),
  );
  const baseline = computed(() => activeSession.value.baseline);
  const fileShowsBaseline = computed(
    () => activeSession.value.fileShowsBaseline,
  );
  const flippedHunkIds = computed(
    () => activeSession.value.flippedHunkIds,
  );

  function setActiveDocument(documentId: string): void {
    activeDocumentId.value = documentId;
  }

  function forgetDocument(documentId: string): void {
    if (!sessions.value[documentId]) {
      return;
    }

    const next = { ...sessions.value };
    delete next[documentId];
    sessions.value = next;
  }

  function ensureBaseline(text: string, documentId: string): void {
    const current = sessions.value[documentId];
    if (current && current.baseline !== null) {
      return;
    }

    writeSession(documentId, {
      baseline: text,
      fileShowsBaseline: false,
      flippedHunkIds: [],
    });
  }

  function resetBaseline(text: string, documentId = activeDocumentId.value): void {
    if (!documentId) {
      return;
    }

    writeSession(documentId, {
      baseline: text,
      fileShowsBaseline: false,
      flippedHunkIds: [],
    });
  }

  function toggleFileVersion(): void {
    const documentId = activeDocumentId.value;
    if (!documentId) {
      return;
    }

    const current = readSession(documentId);
    writeSession(documentId, {
      ...current,
      fileShowsBaseline: !current.fileShowsBaseline,
      flippedHunkIds: [],
    });
  }

  function toggleHunk(hunkId: string): void {
    const documentId = activeDocumentId.value;
    if (!documentId || !hunkId) {
      return;
    }

    const current = readSession(documentId);
    const next = new Set(current.flippedHunkIds);
    if (next.has(hunkId)) {
      next.delete(hunkId);
    } else {
      next.add(hunkId);
    }

    writeSession(documentId, {
      ...current,
      flippedHunkIds: [...next],
    });
  }

  function showEditedLinesAsCurrent(
    currentText: string,
    editedStart: number,
    editedCount: number,
  ): void {
    const documentId = activeDocumentId.value;
    const current = readSession(documentId);
    if (!documentId || current.baseline === null || editedCount <= 0) {
      return;
    }

    const hunks = diffSessionHunks(
      splitSourceLines(current.baseline),
      splitSourceLines(currentText),
    );
    const editedEnd = editedStart + editedCount - 1;
    const next = new Set(current.flippedHunkIds);

    for (const hunk of hunks) {
      const overlaps =
        hunk.currentCount === 0
          ? hunk.currentStart >= editedStart &&
            hunk.currentStart <= editedStart + editedCount
          : hunk.currentStart <= editedEnd &&
            hunk.currentStart + hunk.currentCount - 1 >= editedStart;
      if (!overlaps) {
        continue;
      }

      if (current.fileShowsBaseline) {
        next.add(hunk.id);
      } else {
        next.delete(hunk.id);
      }
    }

    writeSession(documentId, {
      ...current,
      flippedHunkIds: [...next],
    });
  }

  return {
    baseline,
    fileShowsBaseline,
    flippedHunkIds,
    setActiveDocument,
    forgetDocument,
    ensureBaseline,
    resetBaseline,
    toggleFileVersion,
    toggleHunk,
    showEditedLinesAsCurrent,
  };
}
