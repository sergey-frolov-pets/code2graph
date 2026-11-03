import type { DiagramFormat } from "@/constants/diagram-formats";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";
import {
  createEmptyDiagramIR,
  type DiagramGroup,
  type DiagramIR,
  type DiagramWireframeControl,
  type DiagramWireframeScreen,
  uniqueDiagramId,
} from "@/services/conversion/diagram-ir";
import { unwrapWiremarkSource } from "@/utils/wiremark-source";

export function parseWiremarkToIr(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  const unwrapped = unwrapWiremarkSource(source);
  const ir = createEmptyDiagramIR("wireframe");
  ir.direction = detectDiagramDirection(unwrapped, format);
  ir.metadata = { sourceFormat: format };

  const usedIds = new Set<string>();
  const screenMap = new Map<string, string>();
  const screens: DiagramWireframeScreen[] = [];
  const groups: DiagramGroup[] = [];
  const pendingLinks: Array<{
    fromId: string;
    targetScreenKey: string;
    label?: string;
  }> = [];

  let currentScreen: DiagramWireframeScreen | null = null;
  let currentGroupId: string | undefined;
  let previousNodeInScreen: string | null = null;

  for (const rawLine of unwrapped.split(/\r?\n/)) {
    const withoutComment = rawLine.replace(/\s*\/\/.*$/, "").trim();
    if (!withoutComment) {
      continue;
    }

    if (/^Flow\b/i.test(withoutComment)) {
      if (/\bLR\b/i.test(withoutComment)) {
        ir.direction = "LR";
      }
      continue;
    }

    const wireframeMatch = withoutComment.match(
      /^Wireframe(?:\s+#([\w-]+))?(?:\s+(mobile|landscape))?/i,
    );
    if (wireframeMatch) {
      const rawScreenId = wireframeMatch[1] || `screen_${screens.length + 1}`;
      const layout = (wireframeMatch[2]?.toLowerCase() as "mobile" | "landscape" | undefined) ?? "default";
      const groupId = uniqueDiagramId(rawScreenId, usedIds);
      currentScreen = {
        id: rawScreenId,
        title: rawScreenId,
        layout,
        controls: [],
      };
      screens.push(currentScreen);
      groups.push({ id: groupId, label: rawScreenId });
      screenMap.set(rawScreenId, groupId);
      currentGroupId = groupId;
      previousNodeInScreen = null;
      continue;
    }

    if (!currentScreen) {
      const groupId = uniqueDiagramId("screen_1", usedIds);
      currentScreen = {
        id: "screen_1",
        title: "Screen",
        layout: "default",
        controls: [],
      };
      screens.push(currentScreen);
      groups.push({ id: groupId, label: "Screen" });
      screenMap.set("screen_1", groupId);
      currentGroupId = groupId;
    }

    const toMatch = withoutComment.match(/\bto=#([\w-]+)/i);
    const targetScreenKey = toMatch?.[1];
    const quotedMatch = withoutComment.match(/"([^"]+)"/);
    const label = quotedMatch?.[1]?.trim();

    const registerControl = (
      kind: DiagramWireframeControl["kind"],
      controlLabel: string,
      semanticKind: "default" | "start" | "end" | "task" | "field" = "default",
    ) => {
      currentScreen!.controls.push({
        kind,
        label: controlLabel,
        targetScreenId: targetScreenKey,
      });

      if (kind === "heading" && currentScreen!.title === currentScreen!.id) {
        currentScreen!.title = controlLabel;
        const grp = groups.find((entry) => entry.id === currentGroupId);
        if (grp) {
          grp.label = controlLabel;
        }
      }

      const nodeId = uniqueDiagramId(`${currentScreen!.id}_${controlLabel}`, usedIds);
      ir.nodes.push({
        id: nodeId,
        label: controlLabel,
        kind: semanticKind,
        groupId: currentGroupId,
        semantic: {
          wireframeKind: kind,
          screenId: currentScreen!.id,
          targetScreenId: targetScreenKey,
        },
        matchConfidence: 1,
      });

      if (previousNodeInScreen) {
        ir.edges.push({
          id: `e${ir.edges.length + 1}`,
          source: previousNodeInScreen,
          target: nodeId,
          kind: "flow",
          matchConfidence: 0.9,
        });
      }
      previousNodeInScreen = nodeId;

      if (targetScreenKey) {
        pendingLinks.push({
          fromId: nodeId,
          targetScreenKey,
          label: controlLabel,
        });
      }
    };

    if (/^Typography\b/i.test(withoutComment)) {
      if (label) {
        const isHeading = /\bh[1-6]\b/i.test(withoutComment);
        registerControl(
          isHeading ? "heading" : "text",
          label,
          isHeading ? "start" : "default",
        );
      }
      continue;
    }

    if (/^TextField\b/i.test(withoutComment)) {
      registerControl("input", label || "Input", "field");
      continue;
    }

    if (/^Button\b/i.test(withoutComment)) {
      registerControl("button", label || "Action", "task");
      continue;
    }

    if (/^Link\b/i.test(withoutComment)) {
      registerControl("link", label || "Link", "task");
      continue;
    }

    if (/^ListItem\b/i.test(withoutComment)) {
      registerControl("item", label || "Item", "default");
      continue;
    }

    if (/^Control\s+checkbox\b/i.test(withoutComment)) {
      registerControl("checkbox", label || "Checkbox", "field");
      continue;
    }
  }

  for (const link of pendingLinks) {
    const targetScreenNodes = ir.nodes.filter(
      (node) => node.semantic?.screenId === link.targetScreenKey,
    );
    let targetNodeId = targetScreenNodes[0]?.id;

    if (!targetNodeId) {
      targetNodeId = uniqueDiagramId(link.targetScreenKey, usedIds);
      ir.nodes.push({
        id: targetNodeId,
        label: link.targetScreenKey,
        kind: "end",
        semantic: { screenId: link.targetScreenKey },
        matchConfidence: 0.8,
      });
    }

    if (link.fromId !== targetNodeId) {
      const alreadyConnected = ir.edges.some(
        (edge) => edge.source === link.fromId && edge.target === targetNodeId,
      );
      if (!alreadyConnected) {
        ir.edges.push({
          id: `e${ir.edges.length + 1}`,
          source: link.fromId,
          target: targetNodeId,
          label: link.label,
          kind: "arrow",
          matchConfidence: 1,
        });
      }
    }
  }

  if (ir.nodes.length === 0 && screens.length > 0) {
    for (const screen of screens) {
      const nodeId = uniqueDiagramId(screen.id, usedIds);
      ir.nodes.push({
        id: nodeId,
        label: screen.title || screen.id,
        kind: "default",
        matchConfidence: 1,
      });
    }
  }

  if (groups.length > 0) {
    ir.groups = groups;
  }

  ir.extras = {
    ...ir.extras,
    wireframeScreens: screens,
    title: screens[0]?.title,
  };

  return ir;
}
