import { appMessages } from "./app";
import { editorMessages } from "./editor";
import { snippetsMessages } from "./snippets";
import { libraryMessages } from "./library";
import { llmMessages } from "./llm";
import { settingsMessages } from "./settings";
import { miscMessages } from "./misc";
import { conversionMessages } from "./conversion";
import { siteMessages } from "./site";
import { wiremarkGuideMessages } from "./wiremark-guide";

export const ruMessages = {
  ...appMessages,
  ...editorMessages,
  ...snippetsMessages,
  ...libraryMessages,
  ...llmMessages,
  ...settingsMessages,
  ...miscMessages,
  ...conversionMessages,
  ...siteMessages,
  ...wiremarkGuideMessages,
} as const;
