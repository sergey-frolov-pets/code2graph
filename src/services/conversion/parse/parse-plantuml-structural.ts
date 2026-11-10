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
  type DiagramNote,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";

export function registerAlias(
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

export function unquote(value: string): string {
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
  const notes: DiagramNote[] = [];
  let inNote = false;
  let inNoteTarget: string | undefined;
  let inNoteLines: string[] = [];
  let inSkinBlock = false;

  function ensureNode(
    rawAliasOrLabel: string,
    explicitLabel?: string,
    kind: DiagramNode["kind"] = "default",
    groupId?: string,
    fill?: string,
    stereo?: string,
  ): string {
    const key = unquote(
      rawAliasOrLabel.replace(/^\[|\]$/g, "").replace(/^\(|\)$/g, ""),
    );
    if (!key) {
      return "";
    }
      const existing =
        aliasToId.get(key) ??
        aliasToId.get(key.toLowerCase()) ??
        ir.nodes.find((node) => node.label === key)?.id;
      if (existing && ir.nodes.some((entry) => entry.id === existing)) {
        const node = ir.nodes.find((entry) => entry.id === existing);
      if (node) {
        if (explicitLabel && node.label === node.id) {
          node.label = explicitLabel;
        }
        if (groupId && !node.groupId) {
          node.groupId = groupId;
        }
        if (fill && !node.visual?.fill) {
          node.visual = { ...node.visual, fill };
        }
        if (stereo && !node.semantic?.stereotype) {
          node.semantic = { ...node.semantic, stereotype: stereo };
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
      semantic: stereo ? { stereotype: stereo } : undefined,
      visual: fill ? { fill } : undefined,
      matchConfidence: 1,
    });
    return id;
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (inNote) {
      if (/^end\s*note\b/i.test(line)) {
        if (inNoteLines.length > 0) {
          notes.push({
            targetId: inNoteTarget,
            text: inNoteLines.join("\n"),
          });
        }
        inNote = false;
        inNoteTarget = undefined;
        inNoteLines = [];
      } else {
        inNoteLines.push(line);
      }
      continue;
    }

    if (inSkinBlock) {
      if (line === "}" || /<\/style>/i.test(line)) {
        inSkinBlock = false;
      }
      continue;
    }

    if (/^(?:skinparam|<style)\b/i.test(line)) {
      if (line.endsWith("{") || (/^<style\b/i.test(line) && !/<\/style>/i.test(line))) {
        inSkinBlock = true;
      }
      continue;
    }

    const inlineNoteMatch = line.match(
      /^note\s+(?:left|right|top|bottom)(?:\s+of\s+([\p{L}\p{N}_"-]+))?\s*:\s*(.+)$/iu,
    );
    if (inlineNoteMatch) {
      notes.push({
        targetId: inlineNoteMatch[1] ? unquote(inlineNoteMatch[1]) : undefined,
        text: inlineNoteMatch[2].replace(/\\n/g, "\n").trim(),
      });
      continue;
    }

    const blockNoteMatch = line.match(
      /^note\s+(?:left|right|top|bottom)(?:\s+of\s+([\p{L}\p{N}_"-]+))?\s*$/iu,
    );
    if (blockNoteMatch) {
      inNote = true;
      inNoteTarget = blockNoteMatch[1] ? unquote(blockNoteMatch[1]) : undefined;
      inNoteLines = [];
      continue;
    }

    if (
      /^@start/i.test(line) ||
      /^@end/i.test(line) ||
      /^!pragma\b/i.test(line) ||
      /^!include\b/i.test(line) ||
      /^(?:left\s+to\s+right|top\s+to\s+bottom)\s+direction\b/i.test(line) ||
      /^title\s+/i.test(line) ||
      /^together\s*\{$/i.test(line)
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
      /^(?:package|frame|folder|cloud|node|rectangle|database|storage)\s+(?:"([^"]+)"|([\p{L}\p{N}_.-]+))(?:\s+as\s+([\p{L}\p{N}_-]+))?(?:\s*<<[^>]+>>)?(?:\s*#([A-Za-z0-9]+))?\s*\{$/iu,
    );
    if (groupMatch) {
      const label = (groupMatch[1] || groupMatch[2] || "").trim();
      const alias = (groupMatch[3] || label).trim();
      const id = uniqueDiagramId(alias, usedIds);
      const parentId = groupStack[groupStack.length - 1];
      const fill = groupMatch[4] ? `#${groupMatch[4]}` : undefined;
      groups.push({ id, label, parentId, fill, kind: "package" });
      registerAlias(aliasToId, alias, id);
      registerAlias(aliasToId, label, id);
      groupStack.push(id);
      continue;
    }

    const currentGroup = groupStack[groupStack.length - 1];

    const bracketDecl = line.match(
      /^\[([^\]]+)\](?:\s*<<\s*([^>]+?)\s*>>)?(?:\s+as\s+([\p{L}\p{N}_-]+))?(?:\s*<<\s*([^>]+?)\s*>>)?(?:\s*#([A-Za-z0-9]+))?$/u,
    );
    if (bracketDecl) {
      const label = bracketDecl[1].trim();
      if (!label.includes("lasts")) {
        const alias = bracketDecl[3]?.trim() || label;
        const stereo = (bracketDecl[2] || bracketDecl[4])?.trim();
        const fill = bracketDecl[5] ? `#${bracketDecl[5]}` : undefined;
        const id = ensureNode(alias, label, "default", currentGroup, fill, stereo);
        registerAlias(aliasToId, label, id);
      }
      continue;
    }

    const namedDecl = line.match(
      /^(component|rectangle|node|database|queue|cloud|storage|artifact|interface|actor|usecase|port|portin|portout)\s+(?:"([^"]+)"|\[([^\]]+)\]|([\p{L}\p{N}_.-]+))(?:\s*<<\s*([^>]+?)\s*>>)?(?:\s+as\s+(?:"([^"]+)"|([\p{L}\p{N}_-]+)))?(?:\s*<<\s*([^>]+?)\s*>>)?(?:\s*#([A-Za-z0-9]+))?$/iu,
    );
    if (namedDecl) {
      const kw = namedDecl[1].toLowerCase();
      const firstText = (namedDecl[2] || namedDecl[3] || namedDecl[4] || "").trim();
      const secondText = (namedDecl[6] || namedDecl[7] || "").trim();
      const hasQuotedSecond = Boolean(namedDecl[6]);
      const label = hasQuotedSecond ? secondText : firstText;
      const alias = hasQuotedSecond ? firstText : secondText || firstText;
      const stereo = (namedDecl[5] || namedDecl[8])?.trim();
      const kind: DiagramNode["kind"] =
        kw === "actor"
          ? "actor"
          : kw === "database" || kw === "storage"
            ? "system"
            : kw === "usecase"
              ? "usecase"
              : kw === "artifact"
                ? "artifact"
                : kw === "queue" || kw === "cloud"
                  ? "container"
                  : "default";
      const fill = namedDecl[9] ? `#${namedDecl[9]}` : undefined;
      const id = ensureNode(alias, label, kind, currentGroup, fill, stereo);
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
      /^(?:\[([^\]]+)\]|"([^"]+)"|([\p{L}\p{N}_.-]+))\s*(<\|--|--\|>|<\|\.\.|\.\.\|>|\*--|o--|--\*|--o|\.\.>|<-\.+|-[-\w#[\]]*>+|<+[-\w#[\]]*-|\.[.\w#[\]]*>+|--|\.\.)\s*(?:\|([^|]+)\|\s*)?(?:\[([^\]]+)\]|"([^"]+)"|([\p{L}\p{N}_.-]+))(?:\s*:\s*(.+))?$/u,
    );
    if (edgeMatch) {
      const fromRaw = (edgeMatch[1] || edgeMatch[2] || edgeMatch[3] || "").trim();
      const arrow = edgeMatch[4];
      const pipeLabel = edgeMatch[5]?.trim();
      const toRaw = (edgeMatch[6] || edgeMatch[7] || edgeMatch[8] || "").trim();
      const colonLabel = edgeMatch[9]?.trim();
      const label = colonLabel || pipeLabel;
      const colorMatch = arrow.match(/#([0-9a-fA-F]{3,6})\b/);
      const edgeColor = colorMatch ? `#${colorMatch[1]}` : undefined;

      const resolveEndpointId = (rawRef: string): string => {
        const cleanRef = unquote(rawRef.replace(/^\[|\]$/g, ""));
        const mapped =
          aliasToId.get(cleanRef) ?? aliasToId.get(cleanRef.toLowerCase());
        if (mapped && ir.nodes.some((n) => n.id === mapped)) {
          return mapped;
        }
        if (mapped && groups.some((g) => g.id === mapped)) {
          const grpIndex = groups.findIndex((g) => g.id === mapped);
          const grp = groups[grpIndex]!;
          const hasChildren =
            ir.nodes.some((n) => n.groupId === grp.id) ||
            groups.some((g) => g.parentId === grp.id);
          if (!hasChildren) {
            groups.splice(grpIndex, 1);
          }
          return ensureNode(
            grp.id,
            grp.label ?? grp.id,
            "container",
            grp.parentId,
            grp.fill,
          );
        }
        return ensureNode(rawRef, rawRef, "default", currentGroup);
      };

      const sourceId = resolveEndpointId(fromRaw);
      const targetId = resolveEndpointId(toRaw);
      if (sourceId && targetId) {
        const isReverse = arrow.startsWith("<") && !arrow.endsWith(">");
        ir.edges.push({
          id: `e${ir.edges.length + 1}`,
          source: isReverse ? targetId : sourceId,
          target: isReverse ? sourceId : targetId,
          label: label ? unquote(label) : undefined,
          kind: arrow.includes(".") ? "dashed" : "arrow",
          directed: arrow !== "--" && arrow !== "..",
          color: edgeColor,
          matchConfidence: 1,
        });
      }
    }
  }

  const populatedGroups = groups.filter(
    (grp) =>
      ir.nodes.some((n) => n.groupId === grp.id && n.id !== grp.id) ||
      groups.some((child) => child.parentId === grp.id),
  );
  if (populatedGroups.length > 0) {
    ir.groups = populatedGroups;
  }
  if (notes.length > 0) {
    ir.extras = { ...ir.extras, notes };
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
  const groupStack: string[] = [];
  const notes: DiagramNote[] = [];

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
  let inSkinparamOrNote = false;
  let inNoteTarget: string | undefined;
  let inNoteLines: string[] = [];

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

    const inlineNoteMatch = line.match(
      /^note\s+(?:left|right|top|bottom)\s+of\s+([\p{L}\p{N}_"]+)\s*:\s*(.+)$/iu,
    );
    if (inlineNoteMatch) {
      notes.push({
        targetId: unquote(inlineNoteMatch[1]),
        text: inlineNoteMatch[2].replace(/\\n/g, "\n").trim(),
      });
      continue;
    }

    const multiNoteStart = line.match(
      /^note\s+(?:left|right|top|bottom)\s+of\s+([\p{L}\p{N}_"]+)\s*$/iu,
    );
    if (multiNoteStart) {
      inSkinparamOrNote = true;
      inNoteTarget = unquote(multiNoteStart[1]);
      inNoteLines = [];
      continue;
    }

    if (/^note\b/i.test(line) && !line.includes(":")) {
      inSkinparamOrNote = true;
      inNoteTarget = undefined;
      inNoteLines = [];
      continue;
    }
    if (/^end\s*note\b/i.test(line)) {
      if (inNoteLines.length > 0) {
        notes.push({
          targetId: inNoteTarget,
          text: inNoteLines.join("\n"),
        });
      }
      inSkinparamOrNote = false;
      inNoteTarget = undefined;
      inNoteLines = [];
      continue;
    }
    if (inSkinparamOrNote) {
      if (line === "}") {
        inSkinparamOrNote = false;
      } else if (inNoteTarget !== undefined) {
        inNoteLines.push(line);
      }
      continue;
    }

    if (line === "}") {
      if (currentClassId) {
        currentClassId = null;
      } else if (groupStack.length > 0) {
        groupStack.pop();
      }
      continue;
    }

    const currentGroupId = groupStack[groupStack.length - 1];

    const pkgMatch = line.match(
      /^(?:package|namespace)\s+(?:"([^"]+)"|([\p{L}\p{N}_.-]+))(?:\s*<<[^>]+>>)?(?:\s*#([A-Za-z0-9]+))?\s*\{$/iu,
    );
    if (pkgMatch) {
      const pkgLabel = (pkgMatch[1] || pkgMatch[2] || "").trim();
      const pkgId = uniqueDiagramId(pkgLabel, usedIds);
      const fill = pkgMatch[3] ? `#${pkgMatch[3]}` : undefined;
      groups.push({
        id: pkgId,
        label: pkgLabel,
        parentId: currentGroupId,
        fill,
        kind: "package",
      });
      groupStack.push(pkgId);
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
      const currentNode = ir.nodes.find((entry) => entry.id === currentClassId);
      const isEnumNode = currentNode?.semantic?.stereotype === "enumeration";
      const memberMatch = line.match(
        /^(?:\{(abstract|static)\}\s*)?([+#~-])?\s*(?:\{(abstract|static)\}\s*)?([\p{L}\p{N}_]+(?:\([^)]*\))?)\s*(?::\s*(.+))?$/u,
      );
      if (memberMatch) {
        const mod = (memberMatch[1] || memberMatch[3] || "").toLowerCase();
        const visibility =
          (memberMatch[2] as "+" | "-" | "#" | "~" | undefined) ??
          (isEnumNode ? undefined : "+");
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
      /^([\p{L}\p{N}_"]+)\s*(?:"([^"]*)"\s*)?(<\|--|--\|>|<\|\.\.|\.\.\|>|\*--|--\*|o--|--o|<--|\.\.>|<-\.+|-->|--|\.\.|-[-\w]*>+|-[-\w]*\|>|\.[.\w]*>+|\.[.\w]*\|>)\s*(?:"([^"]*)"\s*)?([\p{L}\p{N}_"]+)(?:\s*:\s*(.+))?$/u,
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
        directed: arrow !== "--" && arrow !== "..",
        sourceLabel: isReverseInherit ? targetCard : sourceCard,
        targetLabel: isReverseInherit ? sourceCard : targetCard,
        semantic: {
          arrow,
          relationType:
            arrow.includes(".") && (arrow.includes("|>") || arrow.includes("<|"))
              ? "realization"
              : undefined,
          sourceCardinality: isReverseInherit ? targetCard : sourceCard,
          targetCardinality: isReverseInherit ? sourceCard : targetCard,
        },
        matchConfidence: 1,
      });
    }
  }

  if (groups.length > 0) {
    ir.groups = groups;
  }

  ir.extras = {
    ...ir.extras,
    classMembers,
    notes: notes.length > 0 ? notes : undefined,
  };
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
        kind: "boundary",
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
