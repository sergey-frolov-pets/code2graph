/** Текст ответа без разметки: озвучивается смысл, а не символы Markdown. */
export function stripReplySpeechMarkup(text: string): string {
  return text
    .replace(/```[^\n]*\n?([\s\S]*?)```/g, " $1 ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, " $1 ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/[*_~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
