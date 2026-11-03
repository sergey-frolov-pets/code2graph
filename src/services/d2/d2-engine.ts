import { D2, type CompileOptions } from "@d2lang/d2";
import { unwrapD2Source } from "@shared/d2-source";
import { LocalizedAppError } from "@/utils/localized-app-error";

/** Neutral Default. See D2 theme ids. */
const D2_THEME_NEUTRAL = 0;

/** Dark Flagship Terrastruct. */
const D2_THEME_DARK_FLAGSHIP = 200;

const D2_RENDER_PAD_PX = 40;

/**
 * Natural pixel size. D2's default scale fits the SVG to the screen and omits
 * width/height, so an embedded preview stretches or collapses the diagram.
 */
const D2_RENDER_SCALE = 1;

const D2_LAYOUT_ENGINE = "dagre" satisfies CompileOptions["layout"];

let instance: D2 | null = null;
let ready = false;

async function getD2(): Promise<D2> {
  if (!instance) {
    instance = new D2();
  }

  return instance;
}

export function isD2Ready(): boolean {
  return ready;
}

export async function bootD2(): Promise<void> {
  const d2 = await getD2();
  await d2.compile("x -> y", { layout: D2_LAYOUT_ENGINE });
  ready = true;
}

export interface D2RenderOptions {
  dark?: boolean;
}

export async function renderD2ToSvg(
  source: string,
  options: D2RenderOptions = {},
): Promise<string> {
  const prepared = unwrapD2Source(source);
  if (!prepared) {
    throw new LocalizedAppError("syntax.issue.empty");
  }

  const d2 = await getD2();
  const compileOptions: CompileOptions = {
    layout: D2_LAYOUT_ENGINE,
    themeID: options.dark ? D2_THEME_DARK_FLAGSHIP : D2_THEME_NEUTRAL,
    pad: D2_RENDER_PAD_PX,
    scale: D2_RENDER_SCALE,
    noXMLTag: true,
  };
  const compiled = await d2.compile(prepared, compileOptions);
  const svg = await d2.render(compiled.diagram, {
    ...compiled.renderOptions,
    ...compileOptions,
  });
  ready = true;
  return svg;
}
