import { appMessages } from "./app";
import { editorMessages } from "./editor";
import { snippetsMessages } from "./snippets";
import { libraryMessages } from "./library";
import { llmMessages } from "./llm";
import { settingsMessages } from "./settings";
import { miscMessages } from "./misc";
import { conversionMessages } from "./conversion";

export const enMessages = {
  ...appMessages,
  ...editorMessages,
  ...snippetsMessages,
  ...libraryMessages,
  ...llmMessages,
  ...settingsMessages,
  ...miscMessages,
  ...conversionMessages,
} as const;
