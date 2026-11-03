import { LocalizedAppError } from "@/utils/localized-app-error";
import type { LocaleKey } from "@/locales/types";

const IDENT_START = /[A-Za-z_\u0400-\u04FF!]/;
const IDENT_PART = /[A-Za-z0-9_\u0400-\u04FF]/;
const DATABASE_STYLE = "cylinder";

const PERSON_FIELDS = 3;
const SOFTWARE_SYSTEM_FIELDS = 3;
const CONTAINER_FIELDS = 4;
const COMPONENT_FIELDS = 4;
const DEPLOYMENT_NODE_FIELDS = 4;
const DEPLOYMENT_ENVIRONMENT_FIELDS = 2;

type TokenKind =
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

interface Token {
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

interface PendingRelationship {
  sourceRef: string;
  destinationRef: string;
  description: string;
  technology: string;
  line: number;
}

interface PendingInstance {
  assignedId: string | null;
  targetRef: string;
  parent: StructurizrElement | null;
  group: string | null;
  line: number;
  kind: "container" | "softwareSystem";
}

interface PendingView {
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

const VIEW_TYPES: Record<string, StructurizrViewType> = {
  systemlandscape: "systemLandscape",
  systemcontext: "systemContext",
  container: "container",
  component: "component",
  deployment: "deployment",
};

const ELEMENT_FIELDS: Record<string, number> = {
  person: PERSON_FIELDS,
  softwaresystem: SOFTWARE_SYSTEM_FIELDS,
  container: CONTAINER_FIELDS,
  component: COMPONENT_FIELDS,
  deploymentnode: DEPLOYMENT_NODE_FIELDS,
  infrastructurenode: DEPLOYMENT_NODE_FIELDS,
  deploymentenvironment: DEPLOYMENT_ENVIRONMENT_FIELDS,
};

const ELEMENT_KINDS: Record<string, StructurizrElementKind> = {
  person: "person",
  softwaresystem: "softwareSystem",
  container: "container",
  component: "component",
  deploymentnode: "deploymentNode",
  infrastructurenode: "deploymentNode",
  deploymentenvironment: "deploymentEnvironment",
};

const DEFAULT_TAGS: Record<StructurizrElementKind, readonly string[]> = {
  person: ["Element", "Person"],
  softwareSystem: ["Element", "Software System"],
  container: ["Element", "Container"],
  component: ["Element", "Component"],
  deploymentNode: ["Element", "Deployment Node"],
  deploymentEnvironment: ["Deployment Environment"],
};

const DEFAULT_DIRECTION: StructurizrDirection = "tb";

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = source.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;

  const push = (kind: TokenKind, text: string, tokenLine: number) => {
    tokens.push({ kind, text, line: tokenLine });
  };

  while (index < source.length) {
    const current = source[index];

    if (current === "\n") {
      line += 1;
      index += 1;
      continue;
    }

    if (current === "\r" || current === " " || current === "\t") {
      index += 1;
      continue;
    }

    if (current === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      continue;
    }

    if (current === "/" && source[index + 1] === "*") {
      const startLine = line;
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        if (source[index] === "\n") {
          line += 1;
        }
        index += 1;
      }
      if (index >= source.length) {
        throw new StructurizrParseError(startLine, "structurizr.unclosedBlock");
      }
      index += 2;
      continue;
    }

    if (current === '"') {
      const startLine = line;
      index += 1;
      let value = "";
      while (index < source.length && source[index] !== '"') {
        if (source[index] === "\\" && index + 1 < source.length) {
          value += source[index + 1];
          index += 2;
          continue;
        }
        if (source[index] === "\n") {
          line += 1;
        }
        value += source[index];
        index += 1;
      }
      if (source[index] !== '"') {
        throw new StructurizrParseError(startLine, "structurizr.unclosedString");
      }
      index += 1;
      push("string", value, startLine);
      continue;
    }

    if (current === "{") {
      push("lbrace", "{", line);
      index += 1;
      continue;
    }

    if (current === "}") {
      push("rbrace", "}", line);
      index += 1;
      continue;
    }

    if (current === "=") {
      push("equals", "=", line);
      index += 1;
      continue;
    }

    if (current === "-" && source[index + 1] === ">") {
      push("arrow", "->", line);
      index += 2;
      continue;
    }

    if (current === "*") {
      push("star", "*", line);
      index += 1;
      continue;
    }

    if (current === ".") {
      push("dot", ".", line);
      index += 1;
      continue;
    }

    if (current === "#") {
      const start = index;
      index += 1;
      while (index < source.length && /[0-9A-Fa-f]/.test(source[index])) {
        index += 1;
      }
      push("color", source.slice(start, index), line);
      continue;
    }

    if (/\d/.test(current)) {
      const start = index;
      while (index < source.length && /[\d.]/.test(source[index])) {
        index += 1;
      }
      push("number", source.slice(start, index), line);
      continue;
    }

    if (IDENT_START.test(current)) {
      const start = index;
      index += 1;
      while (index < source.length && IDENT_PART.test(source[index])) {
        index += 1;
      }
      push("ident", source.slice(start, index), line);
      continue;
    }

    throw new StructurizrParseError(line, "structurizr.unexpected", {
      token: current,
    });
  }

  push("eof", "", line);
  return tokens;
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function identifierFromName(name: string): string {
  const parts = name.match(/[A-Za-z0-9]+/g) ?? [];
  const camel = parts
    .map((part, partIndex) => {
      const lower = part.toLowerCase();
      if (partIndex === 0) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");

  return /^[A-Za-z]/.test(camel) ? camel : "element";
}

class Parser {
  private index = 0;
  private hierarchical = false;
  private impliedRelationships = false;
  private readonly elements: StructurizrElement[] = [];
  private readonly relationships: PendingRelationship[] = [];
  private readonly instances: PendingInstance[] = [];
  private readonly views: PendingView[] = [];
  private readonly byAlias = new Map<string, StructurizrElement>();
  private readonly cylinderTags = new Set<string>();
  private name = "";
  private description = "";

  constructor(private readonly tokens: Token[]) {}

  parse(): StructurizrWorkspace {
    if (!this.isKeyword("workspace")) {
      throw new StructurizrParseError(
        this.peek().line,
        "structurizr.expectedWorkspace",
      );
    }

    this.advance();
    if (this.is("string")) {
      this.name = this.advance().text;
    }
    if (this.is("string")) {
      this.description = this.advance().text;
    }
    this.expectKind("lbrace", "structurizr.expectedBrace");
    while (!this.is("rbrace") && !this.is("eof")) {
      if (this.isKeyword("model")) {
        this.parseModel();
        continue;
      }
      if (this.isKeyword("views")) {
        this.parseViews();
        continue;
      }
      if (this.isKeyword("name")) {
        this.advance();
        this.name = this.expectString();
        continue;
      }
      if (this.isKeyword("description")) {
        this.advance();
        this.description = this.expectString();
        continue;
      }
      if (this.peek().text.startsWith("!")) {
        this.parseDirective();
        continue;
      }
      if (this.is("ident") && this.peek(1).kind === "lbrace") {
        this.advance();
        this.skipBlock();
        continue;
      }
      throw new StructurizrParseError(this.peek().line, "structurizr.unexpected", {
        token: this.peek().text || "end",
      });
    }
    this.expectKind("rbrace", "structurizr.unclosedBlock");
    this.materializeInstances();
    const relationships = this.relationships.map((relationship) => ({
      source: this.resolveRef(relationship.sourceRef, relationship.line),
      destination: this.resolveRef(relationship.destinationRef, relationship.line),
      description: relationship.description,
      technology: relationship.technology,
      line: relationship.line,
    }));
    const views = this.views.map((view) => this.finishView(view));
    if (views.length === 0) {
      views.push(this.synthesizedView());
    }

    return {
      name: this.name,
      description: this.description,
      impliedRelationships: this.impliedRelationships,
      elements: this.elements,
      relationships,
      views,
      cylinderTags: this.cylinderTags,
    };
  }

  private parseModel(): void {
    this.advance();
    this.expectKind("lbrace", "structurizr.expectedBrace");
    this.parseModelItems(null, null);
    this.expectKind("rbrace", "structurizr.unclosedBlock");
  }

  private parseModelItems(
    parent: StructurizrElement | null,
    group: string | null,
  ): void {
    while (!this.is("rbrace") && !this.is("eof")) {
      if (this.isKeyword("group")) {
        this.parseGroup(parent);
        continue;
      }
      if (
        this.isKeyword("properties") ||
        this.isKeyword("perspectives") ||
        this.isKeyword("documentation")
      ) {
        this.advance();
        this.skipBlock();
        continue;
      }
      if (this.isKeyword("description")) {
        this.advance();
        const text = this.expectString();
        if (parent && !parent.description) {
          parent.description = text;
        }
        continue;
      }
      if (this.isKeyword("technology")) {
        this.advance();
        const text = this.expectString();
        if (parent) {
          parent.technology = text;
        }
        continue;
      }
      if (this.isKeyword("tags")) {
        this.advance();
        const tags = splitTags(this.expectString());
        parent?.tags.push(...tags);
        continue;
      }
      if (this.isKeyword("url")) {
        this.advance();
        this.expectString();
        continue;
      }
      if (this.peek().text.startsWith("!")) {
        this.parseDirective();
        continue;
      }
      if (this.is("ident") && this.peek(1).kind === "equals") {
        const assignedId = this.advance().text;
        this.advance();
        this.parseElement(assignedId, parent, group);
        continue;
      }
      if (this.is("ident") && this.peek(1).kind === "arrow") {
        const line = this.peek().line;
        const sourceRef = this.readRef();
        this.expectKind("arrow", "structurizr.unexpected");
        const destinationRef = this.readRef();
        this.parseRelationship(sourceRef, destinationRef, line);
        continue;
      }
      if (this.isElementStart()) {
        this.parseElement(null, parent, group);
        continue;
      }
      throw new StructurizrParseError(this.peek().line, "structurizr.unexpected", {
        token: this.peek().text || "end",
      });
    }
  }

  private parseGroup(parent: StructurizrElement | null): void {
    this.advance();
    const name = this.expectString();
    this.expectKind("lbrace", "structurizr.expectedBrace");
    this.parseModelItems(parent, name);
    this.expectKind("rbrace", "structurizr.unclosedBlock");
  }

  private parseElement(
    assignedId: string | null,
    parent: StructurizrElement | null,
    group: string | null,
  ): void {
    const keyword = this.expectIdent();
    const normalized = keyword.text.toLowerCase();
    if (
      normalized === "containerinstance" ||
      normalized === "softwaresysteminstance"
    ) {
      const targetRef = this.readRef();
      this.instances.push({
        assignedId,
        targetRef,
        parent,
        group,
        line: keyword.line,
        kind: normalized === "softwaresysteminstance" ? "softwareSystem" : "container",
      });
      if (this.is("lbrace")) {
        this.skipBlock();
      }
      return;
    }

    const kind = ELEMENT_KINDS[normalized];
    const fieldCount = ELEMENT_FIELDS[normalized];
    if (!kind || !fieldCount) {
      throw new StructurizrParseError(keyword.line, "structurizr.unexpected", {
        token: keyword.text,
      });
    }

    const fields: string[] = [];
    while (fields.length < fieldCount && this.is("string")) {
      fields.push(this.advance().text);
    }
    const name = fields[0];
    if (!name) {
      throw new StructurizrParseError(keyword.line, "structurizr.missingName");
    }

    const description = fields[1] ?? "";
    const technology =
      kind === "container" || kind === "component" || kind === "deploymentNode"
        ? fields[2] ?? ""
        : "";
    const tags = splitTags(fields[kind === "person" || kind === "softwareSystem" || kind === "deploymentEnvironment" ? 2 : 3] ?? "");
    const localId = assignedId ?? this.uniqueLocalId(identifierFromName(name));
    const element = this.createElement({
      kind,
      name,
      description,
      technology,
      tags,
      parent,
      group,
      line: keyword.line,
      localId,
      instanceOf: null,
      addDefaultTags: true,
    });

    if (this.is("lbrace")) {
      this.advance();
      this.parseModelItems(element, null);
      this.expectKind("rbrace", "structurizr.unclosedBlock");
    }
  }

  private parseRelationship(
    sourceRef: string,
    destinationRef: string,
    line: number,
  ): void {
    const description = this.is("string") ? this.advance().text : "";
    const technology = this.is("string") ? this.advance().text : "";
    if (this.is("string")) {
      this.advance();
    }
    if (this.is("lbrace")) {
      this.skipBlock();
    }
    this.relationships.push({
      sourceRef,
      destinationRef,
      description,
      technology,
      line,
    });
  }

  private parseViews(): void {
    this.advance();
    this.expectKind("lbrace", "structurizr.expectedBrace");
    while (!this.is("rbrace") && !this.is("eof")) {
      if (this.isKeyword("styles")) {
        this.parseStyles();
        continue;
      }
      if (this.isKeyword("theme")) {
        this.advance();
        if (this.is("string") || this.is("ident")) {
          this.advance();
        }
        continue;
      }
      if (this.is("ident") && this.peek(1).kind === "lbrace" && !VIEW_TYPES[this.peek().text.toLowerCase()]) {
        this.advance();
        this.skipBlock();
        continue;
      }
      if (VIEW_TYPES[this.peek().text.toLowerCase()]) {
        this.parseView();
        continue;
      }
      if (this.isSkippedView()) {
        while (!this.is("lbrace") && !this.is("rbrace") && !this.is("eof")) {
          this.advance();
        }
        if (this.is("lbrace")) {
          this.skipBlock();
        }
        continue;
      }
      throw new StructurizrParseError(this.peek().line, "structurizr.unexpected", {
        token: this.peek().text || "end",
      });
    }
    this.expectKind("rbrace", "structurizr.unclosedBlock");
  }

  private isSkippedView(): boolean {
    const name = this.peek().text.toLowerCase();
    return name === "dynamic" || name === "filtered" || name === "image" || name === "custom";
  }

  private parseView(): void {
    const keyword = this.expectIdent();
    const type = VIEW_TYPES[keyword.text.toLowerCase()];
    const view: PendingView = {
      type,
      key: "",
      description: "",
      scopeRef: null,
      environmentRef: "",
      includeAll: false,
      includeRefs: [],
      excludeRefs: [],
      direction: DEFAULT_DIRECTION,
      line: keyword.line,
    };

    if (type === "deployment") {
      if (this.is("star")) {
        this.advance();
      } else {
        view.scopeRef = this.readRef();
      }
      if (this.is("ident")) {
        view.environmentRef = this.readRef();
      } else if (this.is("string")) {
        view.environmentRef = this.advance().text;
      }
    } else if (type !== "systemLandscape") {
      view.scopeRef = this.readRef();
    }

    if (this.is("string")) {
      view.key = this.advance().text;
    }
    if (this.is("string")) {
      view.description = this.advance().text;
    }
    this.expectKind("lbrace", "structurizr.expectedBrace");
    this.parseViewStatements(view);
    this.expectKind("rbrace", "structurizr.unclosedBlock");
    this.views.push(view);
  }

  private parseViewStatements(view: PendingView): void {
    while (!this.is("rbrace") && !this.is("eof")) {
      const name = this.peek().text.toLowerCase();
      if (name === "include" || name === "exclude") {
        const excluding = name === "exclude";
        this.advance();
        if (this.is("star")) {
          this.advance();
          if (excluding) {
            view.includeAll = false;
            view.includeRefs = [];
          } else {
            view.includeAll = true;
          }
        } else {
          const ref = this.readRef();
          if (excluding) {
            view.excludeRefs.push(ref);
          } else {
            view.includeRefs.push(ref);
          }
        }
        continue;
      }
      if (name === "autolayout") {
        this.advance();
        const direction = this.peek().text.toLowerCase();
        if (
          this.is("ident") &&
          (direction === "tb" || direction === "bt" || direction === "lr" || direction === "rl")
        ) {
          view.direction = direction;
          this.advance();
        }
        continue;
      }
      if (name === "description" || name === "title") {
        this.advance();
        view.description = this.expectString();
        continue;
      }
      if (this.is("ident") && this.peek(1).kind === "lbrace") {
        this.advance();
        this.skipBlock();
        continue;
      }
      throw new StructurizrParseError(this.peek().line, "structurizr.unexpected", {
        token: this.peek().text || "end",
      });
    }
  }

  private parseStyles(): void {
    this.advance();
    this.expectKind("lbrace", "structurizr.expectedBrace");
    while (!this.is("rbrace") && !this.is("eof")) {
      const target = this.expectIdent().text.toLowerCase();
      const tag = this.expectString();
      this.expectKind("lbrace", "structurizr.expectedBrace");
      while (!this.is("rbrace") && !this.is("eof")) {
        const property = this.expectIdent().text.toLowerCase();
        const value = this.readStyleValue();
        if (
          target === "element" &&
          property === "shape" &&
          value.toLowerCase() === DATABASE_STYLE
        ) {
          this.cylinderTags.add(tag.toLowerCase());
        }
      }
      this.expectKind("rbrace", "structurizr.unclosedBlock");
    }
    this.expectKind("rbrace", "structurizr.unclosedBlock");
  }

  private parseDirective(): void {
    const name = this.expectIdent().text.toLowerCase();
    if (name === "!identifiers") {
      const mode = this.expectIdent().text.toLowerCase();
      this.hierarchical = mode === "hierarchical";
      return;
    }
    if (name === "!impliedrelationships") {
      const flag = this.expectIdent().text.toLowerCase();
      this.impliedRelationships = flag === "true";
      return;
    }
    if (this.is("lbrace")) {
      this.skipBlock();
      return;
    }
    if (this.is("string") || this.is("ident")) {
      this.advance();
    }
  }

  private createElement(input: {
    kind: StructurizrElementKind;
    name: string;
    description: string;
    technology: string;
    tags: string[];
    parent: StructurizrElement | null;
    group: string | null;
    line: number;
    localId: string;
    instanceOf: StructurizrElement | null;
    addDefaultTags: boolean;
  }): StructurizrElement {
    const fullId = input.parent
      ? `${input.parent.canonicalId}.${input.localId}`
      : input.localId;
    const element: StructurizrElement = {
      kind: input.kind,
      name: input.name,
      description: input.description,
      technology: input.technology,
      tags: input.addDefaultTags
        ? [...DEFAULT_TAGS[input.kind], ...input.tags]
        : [...input.tags],
      localId: input.localId,
      canonicalId: this.hierarchical && input.parent ? fullId : input.localId,
      parent: input.parent,
      children: [],
      group: input.group,
      instanceOf: input.instanceOf,
      line: input.line,
    };
    this.bindAlias(input.localId, element, input.line, !this.hierarchical);
    if (fullId !== input.localId) {
      this.bindAlias(fullId, element, input.line, true);
    }
    input.parent?.children.push(element);
    this.elements.push(element);
    return element;
  }

  private materializeInstances(): void {
    for (const request of this.instances) {
      const target = this.resolveRef(request.targetRef, request.line);
      const localId = request.assignedId ?? this.uniqueLocalId(`${target.localId}Instance`);
      this.createElement({
        kind: request.kind,
        name: target.name,
        description: target.description,
        technology: target.technology,
        tags: [...target.tags],
        parent: request.parent,
        group: request.group,
        line: request.line,
        localId,
        instanceOf: target,
        addDefaultTags: false,
      });
    }
  }

  private finishView(view: PendingView): StructurizrView {
    const scope = view.scopeRef
      ? this.resolveRef(view.scopeRef, view.line)
      : null;
    this.assertScope(view, scope);
    const environment = view.environmentRef
      ? this.findEnvironment(view.environmentRef, view.line)
      : null;

    return {
      type: view.type,
      key: view.key,
      description: view.description,
      scope,
      environment,
      includeAll: view.includeAll,
      includes: view.includeRefs.map((ref) => this.resolveRef(ref, view.line)),
      excludes: view.excludeRefs.map((ref) => this.resolveRef(ref, view.line)),
      direction: view.direction,
      line: view.line,
    };
  }

  private assertScope(view: PendingView, scope: StructurizrElement | null): void {
    if (view.type === "systemLandscape") {
      return;
    }
    if (!scope && view.type !== "deployment") {
      throw new StructurizrParseError(view.line, "structurizr.expectedIdentifier");
    }
    if (!scope) {
      return;
    }
    const expected =
      view.type === "component" ? "container" : "softwareSystem";
    if (scope.kind !== expected) {
      throw new StructurizrParseError(view.line, "structurizr.unexpectedScope", {
        name: scope.name,
      });
    }
  }

  private findEnvironment(ref: string, line: number): StructurizrElement {
    const found = this.elements.find(
      (element) =>
        element.kind === "deploymentEnvironment" &&
        (element.localId === ref ||
          element.canonicalId === ref ||
          element.name === ref),
    );
    if (!found) {
      throw new StructurizrParseError(line, "structurizr.unknownIdentifier", {
        name: ref,
      });
    }
    return found;
  }

  private synthesizedView(): StructurizrView {
    const system = this.elements.find(
      (element) =>
        element.kind === "softwareSystem" &&
        !element.parent &&
        !element.instanceOf,
    );
    return {
      type: system ? "systemContext" : "systemLandscape",
      key: "",
      description: "",
      scope: system ?? null,
      environment: null,
      includeAll: true,
      includes: [],
      excludes: [],
      direction: DEFAULT_DIRECTION,
      line: 1,
    };
  }

  private bindAlias(
    alias: string,
    element: StructurizrElement,
    line: number,
    strict: boolean,
  ): void {
    const existing = this.byAlias.get(alias);
    if (!existing) {
      this.byAlias.set(alias, element);
      return;
    }
    if (existing === element || !strict) {
      return;
    }
    throw new StructurizrParseError(line, "structurizr.duplicateIdentifier", {
      name: alias,
    });
  }

  private uniqueLocalId(base: string): string {
    let candidate = base;
    let suffix = 2;
    while (this.byAlias.has(candidate)) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private resolveRef(ref: string, line: number): StructurizrElement {
    const found = this.byAlias.get(ref);
    if (!found) {
      throw new StructurizrParseError(line, "structurizr.unknownIdentifier", {
        name: ref,
      });
    }
    return found;
  }

  private readRef(): string {
    const first = this.expectIdent();
    const parts = [first.text];
    while (this.is("dot")) {
      this.advance();
      parts.push(this.expectIdent().text);
    }
    return parts.join(".");
  }

  private readStyleValue(): string {
    const token = this.peek();
    if (
      token.kind === "string" ||
      token.kind === "ident" ||
      token.kind === "color" ||
      token.kind === "number"
    ) {
      return this.advance().text;
    }
    throw new StructurizrParseError(token.line, "structurizr.unexpected", {
      token: token.text || "end",
    });
  }

  private skipBlock(): void {
    this.expectKind("lbrace", "structurizr.expectedBrace");
    let depth = 1;
    while (depth > 0) {
      const token = this.advance();
      if (token.kind === "eof") {
        throw new StructurizrParseError(token.line, "structurizr.unclosedBlock");
      }
      if (token.kind === "lbrace") {
        depth += 1;
      }
      if (token.kind === "rbrace") {
        depth -= 1;
      }
    }
  }

  private isElementStart(): boolean {
    if (!this.is("ident")) {
      return false;
    }

    const name = this.peek().text.toLowerCase();
    return (
      ELEMENT_KINDS[name] !== undefined ||
      name === "containerinstance" ||
      name === "softwaresysteminstance"
    );
  }

  private expectIdent(): Token {
    if (!this.is("ident")) {
      throw new StructurizrParseError(
        this.peek().line,
        "structurizr.expectedIdentifier",
      );
    }
    return this.advance();
  }

  private expectString(): string {
    if (!this.is("string")) {
      throw new StructurizrParseError(this.peek().line, "structurizr.expectedString");
    }
    return this.advance().text;
  }

  private expectKind(kind: TokenKind, messageKey: LocaleKey): Token {
    if (!this.is(kind)) {
      throw new StructurizrParseError(this.peek().line, messageKey);
    }
    return this.advance();
  }

  private is(kind: TokenKind): boolean {
    return this.peek().kind === kind;
  }

  private isKeyword(name: string): boolean {
    const token = this.peek();
    return token.kind === "ident" && token.text.toLowerCase() === name.toLowerCase();
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.index + offset, this.tokens.length - 1)];
  }

  private advance(): Token {
    const token = this.peek();
    if (token.kind !== "eof") {
      this.index += 1;
    }
    return token;
  }
}

export function parseStructurizr(source: string): StructurizrWorkspace {
  return new Parser(tokenize(source)).parse();
}
