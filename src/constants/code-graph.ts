export const CODE_GRAPH_MAX_ZIP_BYTES = 5 * 1024 * 1024;

export const CODE_GRAPH_SUPPORTED_EXTENSIONS = [
  ".py",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".html",
  ".htm",
] as const;

export type CodeGraphSupportedExtension =
  (typeof CODE_GRAPH_SUPPORTED_EXTENSIONS)[number];

export const CODE_GRAPH_DIAGRAM_TYPES = [
  "folder",
  "class",
  "package",
  "flow",
  "dependency",
] as const;

export type CodeGraphDiagramType = (typeof CODE_GRAPH_DIAGRAM_TYPES)[number];

export const CODE_GRAPH_SOURCE_KINDS = ["zip", "folder", "github"] as const;

export type CodeGraphSourceKind = (typeof CODE_GRAPH_SOURCE_KINDS)[number];

export const CODE_GRAPH_WIZARD_STEP_IDS = [
  "codeSource",
  "codeTree",
  "codeDiagramType",
  "codeIrReview",
  "codeBatch",
] as const;

export type CodeGraphWizardStepId = (typeof CODE_GRAPH_WIZARD_STEP_IDS)[number];

export const CODE_GRAPH_DEFAULT_EXCLUDE_DIRS = [
  "node_modules",
  ".git",
  "venv",
  ".venv",
  "__pycache__",
  "dist",
  "build",
  "bin",
  "obj",
  ".next",
  "coverage",
  ".idea",
  ".vscode",
  "target",
] as const;

export const CODE_GRAPH_DEFAULT_EXCLUDE_FILES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
] as const;

export const CODE_GRAPH_FREE_MAX_FILES = 1;

export const CODE_GRAPH_PRO_MAX_FILES = 500;

export const CODE_GRAPH_PRO_SKU = "code2graph-pro";

export const CODE_GRAPH_GITHUB_TOKEN_STORAGE_KEY = "code2graph.githubToken";

export const CODE_GRAPH_SUBSCRIPTION_STORAGE_KEY = "code2graph.proSubscription";
