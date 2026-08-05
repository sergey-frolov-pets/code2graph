export interface PlantUmlColorOption {
  label: string;
  value: string;
  detailKey?: string;
}

export const PLANTUML_NAMED_COLORS: PlantUmlColorOption[] = [
  { label: "LightBlue", value: "LightBlue", detailKey: "editor.completion.colorNamed" },
  { label: "LightYellow", value: "LightYellow", detailKey: "editor.completion.colorNamed" },
  { label: "LightGreen", value: "LightGreen", detailKey: "editor.completion.colorNamed" },
  { label: "LightGray", value: "LightGray", detailKey: "editor.completion.colorNamed" },
  { label: "Pink", value: "Pink", detailKey: "editor.completion.colorNamed" },
  { label: "Orange", value: "Orange", detailKey: "editor.completion.colorNamed" },
  { label: "Red", value: "Red", detailKey: "editor.completion.colorNamed" },
  { label: "Green", value: "Green", detailKey: "editor.completion.colorNamed" },
  { label: "Blue", value: "Blue", detailKey: "editor.completion.colorNamed" },
  { label: "Yellow", value: "Yellow", detailKey: "editor.completion.colorNamed" },
  { label: "Gray", value: "Gray", detailKey: "editor.completion.colorNamed" },
  { label: "Grey", value: "Grey", detailKey: "editor.completion.colorNamed" },
  { label: "Black", value: "Black", detailKey: "editor.completion.colorNamed" },
  { label: "White", value: "White", detailKey: "editor.completion.colorNamed" },
  { label: "Cyan", value: "Cyan", detailKey: "editor.completion.colorNamed" },
  { label: "Magenta", value: "Magenta", detailKey: "editor.completion.colorNamed" },
  { label: "Gold", value: "Gold", detailKey: "editor.completion.colorNamed" },
  { label: "Coral", value: "Coral", detailKey: "editor.completion.colorNamed" },
  { label: "Tomato", value: "Tomato", detailKey: "editor.completion.colorNamed" },
  { label: "Lavender", value: "Lavender", detailKey: "editor.completion.colorNamed" },
];

export const PLANTUML_HEX_COLORS: PlantUmlColorOption[] = [
  { label: "#E3F2FD", value: "E3F2FD", detailKey: "editor.completion.colorHex" },
  { label: "#E8F5E9", value: "E8F5E9", detailKey: "editor.completion.colorHex" },
  { label: "#FFF3E0", value: "FFF3E0", detailKey: "editor.completion.colorHex" },
  { label: "#FCE4EC", value: "FCE4EC", detailKey: "editor.completion.colorHex" },
  { label: "#E1F5FE", value: "E1F5FE", detailKey: "editor.completion.colorHex" },
  { label: "#F3E5F5", value: "F3E5F5", detailKey: "editor.completion.colorHex" },
  { label: "#1565C0", value: "1565C0", detailKey: "editor.completion.colorHex" },
  { label: "#2E7D32", value: "2E7D32", detailKey: "editor.completion.colorHex" },
  { label: "#E65100", value: "E65100", detailKey: "editor.completion.colorHex" },
  { label: "#335DA5", value: "335DA5", detailKey: "editor.completion.colorHex" },
  { label: "#FF7700", value: "FF7700", detailKey: "editor.completion.colorHex" },
  { label: "#FFFFFF", value: "FFFFFF", detailKey: "editor.completion.colorHex" },
  { label: "#171D24", value: "171D24", detailKey: "editor.completion.colorHex" },
];

export const COLOR_WORD_PREFIXES = ["co", "col", "colo", "color"] as const;
