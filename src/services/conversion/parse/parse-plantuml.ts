import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  classifyDiagramKind,
  detectDiagramDirection,
} from "@/services/conversion/classify-diagram-kind";
import {
  createEmptyDiagramIR,
  type DiagramClassMember,
  type DiagramGroup,
  type DiagramIR,
  type DiagramNode,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";

function registerAlias(
  aliasToId: Map<string, string>,
  alias: string,
  id: string,
): void {
  const cleaned = alias.replace(/^["']|["']$/g, "").trim();
  if (!cleaned) {
    return;
  }
  aliasToId.set(cleaned, id);
  aliasToId.set(cleaned.toLowerCase(), id);
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').trim();
  }
  return trimmed;
}

export function parseComponentPlantUml(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("graph");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const aliasToId = new Map<string, string>();
  const groups: DiagramGroup[] = [];
  const groupStack: string[] = [];

  function ensureNode(
    rawAliasOrLabel: string,
    explicitLabel?: string,
    kind: DiagramNode["kind"] = "default",
    groupId?: string,
  ): string {
    const key = unquote(rawAliasOrLabel.replace(/^\[|\]$/g, "").replace(/^\(|\)$/g, ""));
    if (!key) {
      return "";
    }
    const existing =
      aliasToId.get(key) ??
      aliasToId.get(key.toLowerCase()) ??
      ir.nodes.find((node) => node.label === key)?.id;
    if (existing) {
      const node = ir.nodes.find((entry) => entry.id === existing);
      if (node) {
        if (explicitLabel && node.label === node.id) {
          node.label = explicitLabel;
        }
        if (groupId && !node.groupId) {
          node.groupId = groupId;
        }
      }
      return existing;
    }

    const id = uniqueDiagramId(key, usedIds);
    const label = explicitLabel || key;
    registerAlias(aliasToId, key, id);
    registerAlias(aliasToId, label, id);
    ir.nodes.push({
      id,
      label,
      kind,
      groupId,
      matchConfidence: 1,
    });
    return id;
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (
      !line ||
      /^@start/i.test(line) ||
      /^@end/i.test(line) ||
      /^!pragma\b/i.test(line) ||
      /^!include\b/i.test(line) ||
      /^skinparam\b/i.test(line) ||
      /^(?:left\s+to\s+right|top\s+to\s+bottom)\s+direction\b/i.test(line) ||
      /^title\s+/i.test(line) ||
      /^note\b/i.test(line) ||
      /^end\s+note\b/i.test(line)
    ) {
      if (/^title\s+/i.test(line)) {
        ir.extras = { ...ir.extras, title: unquote(line.replace(/^title\s+/i, "")) };
      }
      continue;
    }

    if (line === "}") {
      groupStack.pop();
      continue;
    }

    const groupMatch = line.match(
      /^(?:package|frame|folder|cloud|node|rectangle|database|storage)\s+(?:"([^"]+)"|([\p{L}\p{N}_.-]+))(?:\s+as\s+([\p{L}\p{N}_-]+))?(?:\s*<<[^>]+>>)?(?:\s*#[\w]+)?\s*\{$/iu,
    );
    if (groupMatch) {
      const label = (groupMatch[1] || groupMatch[2] || "").trim();
      const alias = (groupMatch[3] || label).trim();
      const id = uniqueDiagramId(alias, usedIds);
      const parentId = groupStack[groupStack.length - 1];
      groups.push({ id, label, parentId });
      registerAlias(aliasToId, alias, id);
      registerAlias(aliasToId, label, id);
      groupStack.push(id);
      continue;
    }

    const currentGroup = groupStack[groupStack.length - 1];

    const bracketDecl = line.match(
      /^\[([^\]]+)\](?:\s+as\s+([\p{L}\p{N}_-]+))?(?:\s*<<[^>]+>>)?(?:\s*#[\w]+)?$/u,
    );
    if (bracketDecl) {
      const label = bracketDecl[1].trim();
      if (!label.includes("lasts")) {
        const alias = bracketDecl[2]?.trim() || label;
        const id = ensureNode(alias, label, "default", currentGroup);
        registerAlias(aliasToId, label, id);
      }
      continue;
    }

    const namedDecl = line.match(
      /^(component|rectangle|node|database|queue|cloud|storage|artifact|interface|actor|usecase)\s+(?:"([^"]+)"|\[([^\]]+)\]|([\p{L}\p{N}_.-]+))(?:\s+as\s+(?:"([^"]+)"|([\p{L}\p{N}_-]+)))?(?:\s*<<[^>]+>>)?(?:\s*#[\w]+)?$/iu,
    );
    if (namedDecl) {
      const kw = namedDecl[1].toLowerCase();
      const firstText = (namedDecl[2] || namedDecl[3] || namedDecl[4] || "").trim();
      const secondText = (namedDecl[5] || namedDecl[6] || "").trim();
      const hasQuotedSecond = Boolean(namedDecl[5]);
      const label = hasQuotedSecond ? secondText : firstText;
      const alias = hasQuotedSecond ? firstText : secondText || firstText;
      const kind: DiagramNode["kind"] =
        kw === "actor"
          ? "actor"
          : kw === "database"
            ? "system"
            : kw === "usecase"
              ? "usecase"
              : kw === "artifact"
                ? "artifact"
                : "default";
      const id = ensureNode(alias, label, kind, currentGroup);
      registerAlias(aliasToId, firstText, id);
      if (secondText) {
        registerAlias(aliasToId, secondText, id);
      }
      continue;
    }

    const lollipopDecl = line.match(
      /^\(\)\s*(?:"([^"]+)"|([\p{L}\p{N}_.-]+))(?:\s+as\s+([\p{L}\p{N}_-]+))?$/u,
    );
    if (lollipopDecl) {
      const label = (lollipopDecl[1] || lollipopDecl[2] || "").trim();
      const alias = lollipopDecl[3]?.trim() || label;
      const id = ensureNode(alias, label, "default", currentGroup);
      registerAlias(aliasToId, label, id);
      continue;
    }

    const edgeMatch = line.match(
      /^(?:\[([^\]]+)\]|"([^"]+)"|([\p{L}\p{N}_.-]+))\s*(<\|--|--\|>|<\|\.\.|\.\.\|>|\*--|o--|--\*|--o|\.\.>|<-\.+|-[-\w]*>+|<+[-\w]*-|--|\.\.)\s*(?:\|([^|]+)\|\s*)?(?:\[([^\]]+)\]|"([^"]+)"|([\p{L}\p{N}_.-]+))(?:\s*:\s*(.+))?$/u,
    );
    if (edgeMatch) {
      const fromRaw = (edgeMatch[1] || edgeMatch[2] || edgeMatch[3] || "").trim();
      const arrow = edgeMatch[4];
      const pipeLabel = edgeMatch[5]?.trim();
      const toRaw = (edgeMatch[6] || edgeMatch[7] || edgeMatch[8] || "").trim();
      const colonLabel = edgeMatch[9]?.trim();
      const label = colonLabel || pipeLabel;

      const sourceId = ensureNode(fromRaw, fromRaw, "default", currentGroup);
      const targetId = ensureNode(toRaw, toRaw, "default", currentGroup);
      if (sourceId && targetId) {
        ir.edges.push({
          id: `e${ir.edges.length + 1}`,
          source: sourceId,
          target: targetId,
          label: label ? unquote(label) : undefined,
          kind: arrow.includes(".") ? "dashed" : "arrow",
          matchConfidence: 1,
        });
      }
    }
  }

  if (groups.length > 0) {
    ir.groups = groups;
  }

  return ir;
}

export function parseClassPlantUml(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("class");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const idByName = new Map<string, string>();
  const classMembers: Record<string, DiagramClassMember[]> = {};
  const groups: DiagramGroup[] = [];

  function ensureClass(
    rawName: string,
    stereotype?: string,
    groupId?: string,
  ): string {
    const clean = unquote(rawName);
    const existing = idByName.get(clean);
    if (existing) {
      const node = ir.nodes.find((entry) => entry.id === existing);
      if (node) {
        if (stereotype && !node.semantic?.stereotype) {
          node.semantic = { ...node.semantic, stereotype };
        }
        if (groupId && !node.groupId) {
          node.groupId = groupId;
        }
      }
      return existing;
    }

    const id = uniqueDiagramId(clean, usedIds);
    idByName.set(clean, id);
    idByName.set(id, id);
    ir.nodes.push({
      id,
      label: clean,
      kind: "class",
      groupId,
      semantic: stereotype ? { stereotype } : undefined,
      matchConfidence: 1,
    });
    classMembers[id] = classMembers[id] ?? [];
    return id;
  }

  let currentClassId: string | null = null;
  let currentGroupId: string | undefined;
  let inSkinparamOrNote = false;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^@start/i.test(line) || /^@end/i.test(line) || /^!pragma/i.test(line)) {
      continue;
    }

    if (/^title\s+/i.test(line)) {
      ir.extras = { ...ir.extras, title: unquote(line.replace(/^title\s+/i, "")) };
      continue;
    }

    if (/^skinparam\b/i.test(line)) {
      if (line.endsWith("{")) {
        inSkinparamOrNote = true;
      }
      continue;
    }
    if (/^note\b/i.test(line) && !line.includes(":")) {
      inSkinparamOrNote = true;
      continue;
    }
    if (/^end\s*note\b/i.test(line)) {
      inSkinparamOrNote = false;
      continue;
    }
    if (inSkinparamOrNote) {
      if (line === "}") {
        inSkinparamOrNote = false;
      }
      continue;
    }

    if (line === "}") {
      if (currentClassId) {
        currentClassId = null;
      } else if (currentGroupId) {
        currentGroupId = undefined;
      }
      continue;
    }

    const pkgMatch = line.match(
      /^(?:package|namespace)\s+(?:"([^"]+)"|([\p{L}\p{N}_.-]+))(?:\s*<<[^>]+>>)?(?:\s*#[\w]+)?\s*\{$/iu,
    );
    if (pkgMatch) {
      const pkgLabel = (pkgMatch[1] || pkgMatch[2] || "").trim();
      const pkgId = uniqueDiagramId(pkgLabel, usedIds);
      groups.push({ id: pkgId, label: pkgLabel });
      currentGroupId = pkgId;
      continue;
    }

    const classDecl = line.match(
      /^(?:(abstract)\s+)?(class|interface|enum)\s+(?:"([^"]+)"|([\p{L}\p{N}_]+))(?:\s+as\s+([\p{L}\p{N}_]+))?(?:\s*<<\s*(?:\([^)]*\)\s*)?([^>]+?)>>)?(?:\s+extends\s+([\p{L}\p{N}_]+))?(?:\s+implements\s+([\p{L}\p{N}_,\s]+))?\s*(\{)?$/iu,
    );
    if (classDecl) {
      const isAbstract = Boolean(classDecl[1]);
      const kw = classDecl[2].toLowerCase();
      const name = (classDecl[3] || classDecl[4] || "").trim();
      const alias = classDecl[5]?.trim();
      const explicitStereo = classDecl[6]?.trim();
      const extendsTarget = classDecl[7]?.trim();
      const implementsTargets = classDecl[8]?.trim();
      const hasBrace = Boolean(classDecl[9]);

      const stereotype =
        explicitStereo ??
        (kw === "interface"
          ? "interface"
          : kw === "enum"
            ? "enumeration"
            : isAbstract
              ? "abstract"
              : undefined);

      const id = ensureClass(alias || name, stereotype, currentGroupId);
      if (alias && name !== alias) {
        idByName.set(name, id);
        const node = ir.nodes.find((entry) => entry.id === id);
        if (node) {
          node.label = name;
        }
      }

      if (extendsTarget) {
        const parentId = ensureClass(extendsTarget, undefined, currentGroupId);
        ir.edges.push({
          id: `e${ir.edges.length + 1}`,
          source: id,
          target: parentId,
          kind: "inherit",
          semantic: { relationType: "inheritance" },
          matchConfidence: 1,
        });
      }

      if (implementsTargets) {
        for (const impl of implementsTargets.split(",")) {
          const implName = impl.trim();
          if (!implName) {
            continue;
          }
          const ifaceId = ensureClass(implName, "interface", currentGroupId);
          ir.edges.push({
            id: `e${ir.edges.length + 1}`,
            source: id,
            target: ifaceId,
            kind: "inherit",
            semantic: { relationType: "realization" },
            matchConfidence: 1,
          });
        }
      }

      if (hasBrace) {
        currentClassId = id;
      }
      continue;
    }

    if (currentClassId) {
      const memberMatch = line.match(
        /^(?:\{(abstract|static)\}\s*)?([+#~-])?\s*(?:\{(abstract|static)\}\s*)?([\p{L}\p{N}_]+(?:\([^)]*\))?)\s*(?::\s*(.+))?$/u,
      );
      if (memberMatch) {
        const mod = (memberMatch[1] || memberMatch[3] || "").toLowerCase();
        const visibility = (memberMatch[2] as "+" | "-" | "#" | "~" | undefined) ?? "+";
        const rawMember = memberMatch[4].trim();
        const memberType = memberMatch[5]?.trim();
        classMembers[currentClassId] = classMembers[currentClassId] ?? [];
        classMembers[currentClassId].push({
          visibility,
          name: rawMember,
          type: memberType,
          isMethod: rawMember.includes("("),
          isAbstract: mod === "abstract",
          isStatic: mod === "static",
        });
      }
      continue;
    }

    const relMatch = line.match(
      /^([\p{L}\p{N}_"]+)\s*(?:"([^"]*)"\s*)?(<\|--|--\|>|<\|\.\.|\.\.\|>|\*--|--\*|o--|--o|<--|\.\.>|<-\.+|-->|--|\.\.)\s*(?:"([^"]*)"\s*)?([\p{L}\p{N}_"]+)(?:\s*:\s*(.+))?$/u,
    );
    if (relMatch) {
      const rawLeft = unquote(relMatch[1]);
      const sourceCard = relMatch[2]?.trim();
      const arrow = relMatch[3];
      const targetCard = relMatch[4]?.trim();
      const rawRight = unquote(relMatch[5]);
      const label = relMatch[6]?.trim();

      const leftId = ensureClass(rawLeft, undefined, currentGroupId);
      const rightId = ensureClass(rawRight, undefined, currentGroupId);

      const isReverseInherit = arrow === "<|--" || arrow === "<|..";
      const source = isReverseInherit ? rightId : leftId;
      const target = isReverseInherit ? leftId : rightId;
      const kind =
        arrow.includes("|>") || arrow.includes("<|")
          ? "inherit"
          : arrow.includes(".")
            ? "dashed"
            : "relation";

      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source,
        target,
        label: label ? unquote(label) : undefined,
        kind,
        semantic: {
          arrow,
          sourceCardinality: sourceCard,
          targetCardinality: targetCard,
        },
        matchConfidence: 1,
      });
    }
  }

  if (groups.length > 0) {
    ir.groups = groups;
  }

  ir.extras = { ...ir.extras, classMembers };
  return ir;
}

export function parseStatePlantUml(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("state");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const aliasToId = new Map<string, string>();

  function ensureState(
    rawRef: string,
    explicitLabel?: string,
    stereo?: string,
  ): string {
    const clean = unquote(rawRef);
    if (!clean || clean === "[*]") {
      return "";
    }
    const existing = aliasToId.get(clean) ?? aliasToId.get(clean.toLowerCase());
    if (existing) {
      const node = ir.nodes.find((entry) => entry.id === existing);
      if (node) {
        if (explicitLabel && node.label === node.id) {
          node.label = explicitLabel;
        }
        if (stereo) {
          node.kind = stereo === "choice" ? "decision" : node.kind;
          node.semantic = { ...node.semantic, stereotype: stereo };
        }
      }
      return existing;
    }

    const id = uniqueDiagramId(clean, usedIds);
    const label = explicitLabel || clean;
    registerAlias(aliasToId, clean, id);
    registerAlias(aliasToId, label, id);
    ir.nodes.push({
      id,
      label,
      kind: stereo === "choice" ? "decision" : "default",
      semantic: stereo ? { stereotype: stereo } : undefined,
      matchConfidence: 1,
    });
    return id;
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^@start/i.test(line) || /^@end/i.test(line) || /^!pragma/i.test(line)) {
      continue;
    }

    const stateDecl = line.match(
      /^state\s+(?:"([^"]+)"|([\p{L}\p{N}_]+))(?:\s+as\s+([\p{L}\p{N}_]+))?(?:\s*<<\s*([^>]+?)\s*>>)?(?:\s*\{)?$/iu,
    );
    if (stateDecl) {
      const first = (stateDecl[1] || stateDecl[2] || "").trim();
      const alias = stateDecl[3]?.trim() || first;
      const stereo = stateDecl[4]?.trim().toLowerCase();
      const id = ensureState(alias, first, stereo);
      registerAlias(aliasToId, first, id);
      continue;
    }

    const transMatch = line.match(
      /^(\[\*\]|"[^"]+"|[\p{L}\p{N}_]+)\s*-[-\w]*>\s*(\[\*\]|"[^"]+"|[\p{L}\p{N}_]+)(?:\s*:\s*(.+))?$/u,
    );
    if (transMatch) {
      const fromRaw = unquote(transMatch[1]);
      const toRaw = unquote(transMatch[2]);
      const label = transMatch[3]?.trim();

      if (fromRaw === "[*]" && toRaw !== "[*]") {
        const toId = ensureState(toRaw);
        const node = ir.nodes.find((entry) => entry.id === toId);
        if (node) {
          node.semantic = { ...node.semantic, isInitial: true };
        }
        continue;
      }

      if (toRaw === "[*]" && fromRaw !== "[*]") {
        const fromId = ensureState(fromRaw);
        const node = ir.nodes.find((entry) => entry.id === fromId);
        if (node) {
          node.semantic = { ...node.semantic, isFinal: true };
        }
        continue;
      }

      if (fromRaw === "[*]" || toRaw === "[*]") {
        continue;
      }

      const sourceId = ensureState(fromRaw);
      const targetId = ensureState(toRaw);
      if (sourceId && targetId) {
        ir.edges.push({
          id: `e${ir.edges.length + 1}`,
          source: sourceId,
          target: targetId,
          label,
          matchConfidence: 1,
        });
      }
      continue;
    }

    const descMatch = line.match(/^([\p{L}\p{N}_]+)\s*:\s*(.+)$/u);
    if (descMatch && !/^skinparam/i.test(line) && !/^note/i.test(line)) {
      const stateId = ensureState(descMatch[1]);
      const node = ir.nodes.find((entry) => entry.id === stateId);
      if (node) {
        const prevDesc = (node.semantic?.descriptions as string[] | undefined) ?? [];
        node.semantic = {
          ...node.semantic,
          descriptions: [...prevDesc, descMatch[2].trim()],
        };
      }
    }
  }

  return ir;
}

export function parseSequencePlantUml(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("sequence");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const aliasToId = new Map<string, string>();

  function ensureParticipant(
    rawKey: string,
    explicitLabel?: string,
    participantType = "participant",
  ): string {
    const cleanKey = unquote(rawKey);
    if (!cleanKey) {
      return "";
    }
    const existing =
      aliasToId.get(cleanKey) ?? aliasToId.get(cleanKey.toLowerCase());
    if (existing) {
      const node = ir.nodes.find((entry) => entry.id === existing);
      if (node && explicitLabel && node.label === node.id) {
        node.label = explicitLabel;
      }
      return existing;
    }

    const id = uniqueDiagramId(cleanKey, usedIds);
    const label = explicitLabel || cleanKey;
    registerAlias(aliasToId, cleanKey, id);
    registerAlias(aliasToId, label, id);
    ir.nodes.push({
      id,
      label,
      kind: "actor",
      semantic: { participantType: participantType.toLowerCase() },
      matchConfidence: 1,
    });
    return id;
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^@start/i.test(line) || /^@end/i.test(line) || /^!pragma/i.test(line)) {
      continue;
    }

    if (/^title\s+/i.test(line)) {
      ir.extras = { ...ir.extras, title: unquote(line.replace(/^title\s+/i, "")) };
      continue;
    }

    const declMatch = line.match(
      /^(actor|participant|boundary|control|entity|database|queue|collections)\s+(?:"([^"]+)"|([\p{L}\p{N}_.-]+))(?:\s+as\s+(?:"([^"]+)"|([\p{L}\p{N}_.-]+)))?(?:\s+#\w+)?$/iu,
    );
    if (declMatch) {
      const pType = declMatch[1];
      const first = (declMatch[2] || declMatch[3] || "").trim();
      const second = (declMatch[4] || declMatch[5] || "").trim();
      const quotedSecond = Boolean(declMatch[4]);
      const label = quotedSecond ? second : first;
      const alias = quotedSecond ? first : second || first;
      const id = ensureParticipant(alias, label, pType);
      registerAlias(aliasToId, first, id);
      if (second) {
        registerAlias(aliasToId, second, id);
      }
      continue;
    }

    const msgMatch = line.match(
      /^(?:"([^"]+)"|([\p{L}\p{N}_.-]+))\s*(-->>|->>|-->|->|<<--|<-|<--)\s*(?:"([^"]+)"|([\p{L}\p{N}_.-]+))\s*:\s*(.+)$/u,
    );
    if (msgMatch) {
      const leftRaw = (msgMatch[1] || msgMatch[2] || "").trim();
      const arrow = msgMatch[3];
      const rightRaw = (msgMatch[4] || msgMatch[5] || "").trim();
      const message = msgMatch[6].trim();

      const isLeftArrow = arrow.startsWith("<");
      const fromKey = isLeftArrow ? rightRaw : leftRaw;
      const toKey = isLeftArrow ? leftRaw : rightRaw;

      const sourceId = ensureParticipant(fromKey);
      const targetId = ensureParticipant(toKey);
      if (!sourceId || !targetId) {
        continue;
      }
      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source: sourceId,
        target: targetId,
        label: message,
        kind: "message",
        semantic: { dashed: arrow.includes("--") },
        matchConfidence: 1,
      });
    }
  }

  return ir;
}

export function parseActivityPlantUml(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("activity");
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const groups: DiagramGroup[] = [];
  let currentGroupId: string | undefined;
  let previousId: string | null = null;
  let pendingEdgeLabel: string | undefined;

  function addStepNode(
    label: string,
    kind: DiagramNode["kind"] = "default",
  ): string {
    const id = uniqueDiagramId(label, usedIds);
    ir.nodes.push({
      id,
      label,
      kind,
      groupId: currentGroupId,
      matchConfidence: 1,
    });
    if (previousId) {
      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source: previousId,
        target: id,
        label: pendingEdgeLabel,
        matchConfidence: 1,
      });
      pendingEdgeLabel = undefined;
    }
    previousId = id;
    return id;
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^@start/i.test(line) || /^@end/i.test(line)) {
      continue;
    }

    const swimlaneMatch = line.match(/^\|(?:#[\w]+\|)?([^|]+)\|$/);
    if (swimlaneMatch) {
      const laneName = swimlaneMatch[1].trim();
      let grp = groups.find((entry) => entry.label === laneName);
      if (!grp) {
        grp = { id: uniqueDiagramId(laneName, usedIds), label: laneName };
        groups.push(grp);
      }
      currentGroupId = grp.id;
      continue;
    }

    const ifMatch = line.match(
      /^if\s*\(([^)]+)\)\s*(?:then\s*(?:\(([^)]+)\))?)?/i,
    );
    if (ifMatch) {
      addStepNode(ifMatch[1].trim(), "decision");
      pendingEdgeLabel = ifMatch[2]?.trim();
      continue;
    }

    const elseMatch = line.match(/^else\s*(?:\(([^)]+)\))?/i);
    if (elseMatch) {
      const decisionNode = [...ir.nodes]
        .reverse()
        .find((node) => node.kind === "decision");
      if (decisionNode) {
        previousId = decisionNode.id;
      }
      pendingEdgeLabel = elseMatch[1]?.trim() || "else";
      continue;
    }

    const stepMatch = line.match(/^:\s*([^;]+);/);
    if (stepMatch) {
      addStepNode(stepMatch[1].trim(), "default");
    }
  }

  if (groups.length > 0) {
    ir.groups = groups;
  }

  return ir;
}

export function parseC4PlantUml(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const kind = classifyDiagramKind(source, format);
  const ir = createEmptyDiagramIR(
    kind === "c4_container" ? "c4_container" : "c4_context",
  );
  ir.direction = detectDiagramDirection(source, format);
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const aliasToId = new Map<string, string>();
  const groups: DiagramGroup[] = [];
  const boundaryStack: string[] = [];

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (/^title\s+/i.test(line)) {
      ir.extras = { ...ir.extras, title: unquote(line.replace(/^title\s+/i, "")) };
      continue;
    }

    if (line === "}") {
      boundaryStack.pop();
      continue;
    }

    const boundaryMatch = line.match(
      /^(?:System_Boundary|Container_Boundary|Enterprise_Boundary|Boundary)\s*\(\s*([^,]+)\s*,\s*"([^"]*)"/i,
    );
    if (boundaryMatch) {
      const alias = boundaryMatch[1].trim();
      const label = boundaryMatch[2].trim() || alias;
      const groupId = uniqueDiagramId(alias, usedIds);
      groups.push({
        id: groupId,
        label,
        parentId: boundaryStack[boundaryStack.length - 1],
      });
      registerAlias(aliasToId, alias, groupId);
      boundaryStack.push(groupId);
      if (!ir.extras?.systemBoundary) {
        ir.extras = { ...ir.extras, systemBoundary: label };
      }
      continue;
    }

    const elementMatch = line.match(
      /^(Person(?:_Ext)?|System(?:_Ext|Db|Queue)?|Container(?:Db|Queue|_Ext|Db_Ext|Queue_Ext)?|Component(?:Db|Queue|_Ext)?)\s*\(\s*([^,]+)\s*,\s*"([^"]*)"(?:\s*,\s*"([^"]*)")?(?:\s*,\s*"([^"]*)")?/i,
    );
    if (elementMatch) {
      const c4Type = elementMatch[1];
      const alias = elementMatch[2].trim();
      const label = elementMatch[3].trim() || alias;
      const thirdArg = elementMatch[4]?.trim() || "";
      const fourthArg = elementMatch[5]?.trim() || "";
      const hasTech =
        c4Type.toLowerCase().startsWith("container") ||
        c4Type.toLowerCase().startsWith("component");

      const id = uniqueDiagramId(alias, usedIds);
      registerAlias(aliasToId, alias, id);
      registerAlias(aliasToId, label, id);
      ir.nodes.push({
        id,
        label,
        kind: c4Type.toLowerCase().startsWith("person")
          ? "actor"
          : hasTech
            ? "container"
            : "system",
        groupId: boundaryStack[boundaryStack.length - 1],
        semantic: {
          c4Type,
          technology: hasTech ? thirdArg || undefined : undefined,
          description: hasTech ? fourthArg || undefined : thirdArg || undefined,
        },
        matchConfidence: 1,
      });
      continue;
    }

    const relMatch = line.match(
      /^Rel(?:_Back|_Neighbor|_Down|_Up|_Left|_Right|_D|_U|_L|_R)?\s*\(\s*([^,]+)\s*,\s*([^,]+)(?:\s*,\s*"([^"]*)")?(?:\s*,\s*"([^"]*)")?/i,
    );
    if (relMatch) {
      const fromKey = relMatch[1].trim();
      const toKey = relMatch[2].trim();
      const label = relMatch[3]?.trim();
      const technology = relMatch[4]?.trim();
      const isBack = /^Rel_Back\b/i.test(line);

      const leftId = aliasToId.get(fromKey) ?? aliasToId.get(fromKey.toLowerCase());
      const rightId = aliasToId.get(toKey) ?? aliasToId.get(toKey.toLowerCase());
      if (!leftId || !rightId) {
        continue;
      }

      ir.edges.push({
        id: `e${ir.edges.length + 1}`,
        source: isBack ? rightId : leftId,
        target: isBack ? leftId : rightId,
        label: label || undefined,
        semantic: technology ? { technology } : undefined,
        matchConfidence: 1,
      });
    }
  }

  if (groups.length > 0) {
    ir.groups = groups;
  }

  return ir;
}

export function parseGanttPlantUml(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const ir = createEmptyDiagramIR("gantt");
  ir.metadata = { sourceFormat: format };
  const usedIds = new Set<string>();
  const idByLabel = new Map<string, string>();
  let previousId: string | null = null;

  const titleMatch = source.match(/^\s*title\s+(.+)$/im);
  if (titleMatch) {
    ir.extras = { ...ir.extras, title: unquote(titleMatch[1]) };
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    const lastsMatch = line.match(
      /^\[([^\]]+)\]\s+lasts\s+(\d+\s*\w+)(?:.*?starts\s+at\s+\[([^\]]+)\]'s\s+end)?/i,
    );
    if (lastsMatch) {
      const label = lastsMatch[1].trim();
      const duration = lastsMatch[2].trim();
      const depLabel = lastsMatch[3]?.trim();
      const id = uniqueDiagramId(label, usedIds);
      idByLabel.set(label, id);
      ir.nodes.push({
        id,
        label,
        kind: "task",
        semantic: { duration },
        matchConfidence: 1,
      });
      const fromId: string | null =
        (depLabel ? idByLabel.get(depLabel) ?? null : null) || previousId;
      if (fromId && fromId !== id) {
        ir.edges.push({
          id: `e${ir.edges.length + 1}`,
          source: fromId,
          target: id,
          matchConfidence: 1,
        });
      }
      previousId = id;
      continue;
    }

    const happensMatch = line.match(
      /^\[([^\]]+)\]\s+happens\s+at\s+(?:\[([^\]]+)\]'s\s+end|(\S+))/i,
    );
    if (happensMatch) {
      const label = happensMatch[1].trim();
      const depLabel = happensMatch[2]?.trim();
      const startDate = happensMatch[3]?.trim();
      const id = uniqueDiagramId(label, usedIds);
      idByLabel.set(label, id);
      ir.nodes.push({
        id,
        label,
        kind: "task",
        semantic: { duration: "0d", startDate, milestone: true },
        matchConfidence: 1,
      });
      const fromId: string | null =
        (depLabel ? idByLabel.get(depLabel) ?? null : null) || previousId;
      if (fromId && fromId !== id) {
        ir.edges.push({
          id: `e${ir.edges.length + 1}`,
          source: fromId,
          target: id,
          matchConfidence: 1,
        });
      }
      previousId = id;
    }
  }

  return ir;
}
