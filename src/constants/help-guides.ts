import { DIAGRAM_LANGUAGE_MODULES } from "@/languages/registry";

export const FORMAT_GUIDE_LINKS = DIAGRAM_LANGUAGE_MODULES.flatMap((module) =>
  module.guide
    ? [
        {
          id: module.id,
          href: module.guide.href,
          labelKey: module.guide.labelKey,
        },
      ]
    : [],
);
