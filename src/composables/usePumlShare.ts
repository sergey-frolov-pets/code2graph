import { loadPumlFromFile, PUML_MIME_TYPE } from "@/utils/puml-files";
import { registerAppServiceWorker } from "@/pwa/serviceWorkerRegistration";
import { translateForLocale, readInitialLocale } from "@/composables/useLocale";

const SHARED_QUERY_PARAM = "shared";

type ShareMessage = {
  type: "GET_SHARED_PUML";
};

export async function registerShareSupport(): Promise<void> {
  await registerAppServiceWorker();
}

async function readSharedPumlFromServiceWorker(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready.catch(() => null);
  const worker = registration?.active;
  if (!worker) {
    return null;
  }

  return new Promise<string | null>((resolve) => {
    const channel = new MessageChannel();
    const timeoutId = window.setTimeout(() => resolve(null), 3000);

    channel.port1.onmessage = (event: MessageEvent<string | null>) => {
      window.clearTimeout(timeoutId);
      resolve(typeof event.data === "string" ? event.data : null);
    };

    const message: ShareMessage = { type: "GET_SHARED_PUML" };
    worker.postMessage(message, [channel.port2]);
  });
}

export async function consumeSharedLaunch(): Promise<{
  content: string;
  fileName: string;
} | null> {
  const params = new URLSearchParams(window.location.search);
  if (!params.has(SHARED_QUERY_PARAM)) {
    return null;
  }

  const sharedText = await readSharedPumlFromServiceWorker();
  if (!sharedText?.trim()) {
    return null;
  }

  window.history.replaceState({}, "", window.location.pathname);
  return {
    content: sharedText,
    fileName: "shared.puml",
  };
}

export function setupLaunchQueue(
  onOpen: (payload: { content: string; fileName: string }) => void,
): void {
  const launchQueue = (
    window as Window & {
      launchQueue?: {
        setConsumer: (
          consumer: (params: { files: Array<{ getFile: () => Promise<File> }> }) => void,
        ) => void;
      };
    }
  ).launchQueue;

  if (!launchQueue) {
    return;
  }

  launchQueue.setConsumer(async (launchParams) => {
    const firstFile = launchParams.files[0];
    if (!firstFile) {
      return;
    }

    try {
      const file = await firstFile.getFile();
      const loaded = await loadPumlFromFile(file);
      onOpen(loaded);
    } catch {
      // ignore invalid launch file
    }
  });
}

export async function sharePumlSource(
  content: string,
  fileName: string,
): Promise<boolean> {
  if (!navigator.share) {
    return false;
  }

  const safeName = fileName.endsWith(".puml") ? fileName : `${fileName}.puml`;
  const file = new File([content], safeName, { type: PUML_MIME_TYPE });

  const shareTitle = translateForLocale(readInitialLocale(), "share.title");

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: shareTitle,
      files: [file],
    });
    return true;
  }

  await navigator.share({
    title: shareTitle,
    text: content,
  });
  return true;
}
