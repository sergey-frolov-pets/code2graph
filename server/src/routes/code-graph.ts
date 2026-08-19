import { Hono } from "hono";
import type { AuthVariables } from "../auth/context.js";

export const CODE_GRAPH_PRO_SKU = "code2graph-pro";

export const codeGraphRouter = new Hono<{ Variables: AuthVariables }>();

codeGraphRouter.get("/limits", (context) => {
  const user = context.get("user");
  const features = (user as { features?: string[] } | undefined)?.features ?? [];
  const isPro = features.includes(CODE_GRAPH_PRO_SKU);

  return context.json({
    sku: CODE_GRAPH_PRO_SKU,
    isPro,
    free: {
      maxFiles: 1,
      diagramTypes: ["folder", "class"],
      batchEnabled: false,
      githubEnabled: false,
      hybridLlmEnabled: false,
    },
    pro: {
      maxFiles: 500,
      diagramTypes: ["folder", "class", "package", "flow", "dependency"],
      batchEnabled: true,
      githubEnabled: true,
      hybridLlmEnabled: true,
    },
  });
});

codeGraphRouter.post("/activate-pro", (context) => {
  const user = context.get("user");
  if (!user) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  return context.json({
    sku: CODE_GRAPH_PRO_SKU,
    active: true,
    message: "Code2Graph Pro activated for current session",
  });
});
