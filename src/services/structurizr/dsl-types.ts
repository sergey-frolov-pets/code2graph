import type { LocaleKey } from "@/locales/types";
import { LocalizedAppError } from "@/utils/localized-app-error";

export const IDENT_START = /[A-Za-z_\u0400-\u04FF!]/;
export const IDENT_PART = /[A-Za-z0-9_\u0400-\u04FF]/;
export const DATABASE_STYLE = "cylinder";

export const PERSON_FIELDS = 3;
export const SOFTWARE_SYSTEM_FIELDS = 3;
export const CONTAINER_FIELDS = 4;
export const COMPONENT_FIELDS = 4;
export const DEPLOYMENT_NODE_FIELDS = 4;
export const DEPLOYMENT_ENVIRONMENT_FIELDS = 2;

export type TokenKind =
  | "ident"
  | "string"
  | "number"
  | "color"
  | "arrow"
  | "lbrace"
  | "rbrace"
  | "equals"
  | "star"
  | "dot"
  | "eof";

export interface Token {
  kind: TokenKind;
  text: string;
  line: number;
}

export type StructurizrElementKind =
  | "person"
  | "softwareSystem"
  | "container"
  | "component"
  | "deploymentNode"
  | "deploymentEnvironment";

export type StructurizrViewType =
  | "systemLandscape"
  | "systemContext"
  | "container"
  | "component"
  | "deployment";

export type StructurizrDirection = "tb" | "bt" | "lr" | "rl";

export interface StructurizrElement {
  kind: StructurizrElementKind;
  name: string;
  description: string;
  technology: string;
  tags: string[];
  localId: string;
  canonicalId: string;
  parent: StructurizrElement | null;
  children: StructurizrElement[];
  group: string | null;
  instanceOf: StructurizrElement | null;
  line: number;
}

export interface StructurizrRelationship {
  source: StructurizrElement;
  destination: StructurizrElement;
  description: string;
  technology: string;
  line: number;
}

export interface StructurizrView {
  type: StructurizrViewType;
  key: string;
  description: string;
  scope: StructurizrElement | null;
  environment: StructurizrElement | null;
  includeAll: boolean;
  includes: StructurizrElement[];
  excludes: StructurizrElement[];
  direction: StructurizrDirection;
  line: number;
}

export interface StructurizrWorkspace {
  name: string;
  description: string;
  impliedRelationships: boolean;
  elements: StructurizrElement[];
  relationships: StructurizrRelationship[];
  views: StructurizrView[];
  cylinderTags: ReadonlySet<string>;
}

export class StructurizrParseError extends LocalizedAppError {
  readonly line: number;

  constructor(
    line: number,
    messageKey: LocaleKey,
    messageParams?: Record<string, string | number>,
  ) {
    super(messageKey, { line, ...messageParams });
    this.name = "StructurizrParseError";
    this.line = line;
  }
}

export interface PendingRelationship {
  sourceRef: string;
  destinationRef: string;
  description: string;
  technology: string;
  line: number;
}

export interface PendingInstance {
  assignedId: string | null;
  targetRef: string;
  parent: StructurizrElement | null;
  group: string | null;
  line: number;
  kind: "container" | "softwareSystem";
}

export interface PendingView {
  type: StructurizrViewType;
  key: string;
  description: string;
  scopeRef: string | null;
  environmentRef: string;
  includeAll: boolean;
  includeRefs: string[];
  excludeRefs: string[];
  direction: StructurizrDirection;
  line: number;
}

export const VIEW_TYPES: Record<string, StructurizrViewType> = {
  systemlandscape: "systemLandscape",
  systemcontext: "systemContext",
  container: "container",
  component: "component",
  deployment: "deployment",
};

export const ELEMENT_FIELDS: Record<string, number> = {
  person: PERSON_FIELDS,
  softwaresystem: SOFTWARE_SYSTEM_FIELDS,
  container: CONTAINER_FIELDS,
  component: COMPONENT_FIELDS,
  deploymentnode: DEPLOYMENT_NODE_FIELDS,
  infrastructurenode: DEPLOYMENT_NODE_FIELDS,
  deploymentenvironment: DEPLOYMENT_ENVIRONMENT_FIELDS,
};

export const ELEMENT_KINDS: Record<string, StructurizrElementKind> = {
  person: "person",
  softwaresystem: "softwareSystem",
  container: "container",
  component: "component",
  deploymentnode: "deploymentNode",
  infrastructurenode: "deploymentNode",
  deploymentenvironment: "deploymentEnvironment",
};

export const DEFAULT_TAGS: Record<StructurizrElementKind, readonly string[]> = {
  person: ["Element", "Person"],
  softwareSystem: ["Element", "Software System"],
  container: ["Element", "Container"],
  component: ["Element", "Component"],
  deploymentNode: ["Element", "Deployment Node"],
  deploymentEnvironment: ["Deployment Environment"],
};

export const DEFAULT_DIRECTION: StructurizrDirection = "tb";
