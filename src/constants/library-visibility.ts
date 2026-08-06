import type { DiagramVisibility } from "@/constants/diagram-library";

export const VISIBILITY_OPTION_KEYS: Record<
  DiagramVisibility,
  { labelKey: string; descriptionKey: string }
> = {
  all: {
    labelKey: "library.visibility.all",
    descriptionKey: "library.visibility.allDesc",
  },
  personal: {
    labelKey: "library.visibility.personal",
    descriptionKey: "library.visibility.personalDesc",
  },
  subscription: {
    labelKey: "library.visibility.subscription",
    descriptionKey: "library.visibility.subscriptionDesc",
  },
};

export const VISIBILITY_OPTIONS: DiagramVisibility[] = [
  "all",
  "personal",
  "subscription",
];
