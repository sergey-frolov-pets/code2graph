import { describe, expect, it } from "vitest";
import {
  MERMAID_EXT_SAMPLES_EN,
  MERMAID_EXT_SAMPLES_RU,
} from "@/constants/samples/mermaid-ext-samples";
import {
  orgchartEngine,
  type OrgModel,
} from "@/services/mermaid/ext/engines/orgchart";
import {
  powermapEngine,
  type PowerModel,
} from "@/services/mermaid/ext/engines/powermap";

const locales = [
  {
    name: "ru",
    samples: MERMAID_EXT_SAMPLES_RU,
    orgHidden: "Помощник",
    orgLabel: "Анна Белова",
    powerHidden: "advisor",
    powerLabel: "Олег Белов",
  },
  {
    name: "en",
    samples: MERMAID_EXT_SAMPLES_EN,
    orgHidden: "Assistant",
    orgLabel: "Anna Bell",
    powerHidden: "advisor",
    powerLabel: "Olga Belova",
  },
] as const;

describe.each(locales)("образцы $name используют hide", (locale) => {
  it("orgchart: директива описана и применена", () => {
    const source = locale.samples.orgchart;
    expect(source).toContain("%% hide id1, id2");
    expect(source).toContain(`hide ${locale.orgHidden}`);

    const parsed = orgchartEngine.parse(source);
    expect(parsed.ok, parsed.errors[0]?.message).toBe(true);
    const model = parsed.value as OrgModel;
    expect(model.nodes.map((node) => node.id)).not.toContain(locale.orgHidden);
    expect(model.edges.some((edge) => edge.to === locale.orgHidden)).toBe(false);
    const svg = orgchartEngine.render(model, {});
    expect(svg).not.toContain(locale.orgLabel);
  });

  it("powermap: директива описана и применена", () => {
    const source = locale.samples.powermap;
    expect(source).toContain("%% hide id1, id2");
    expect(source).toContain(`hide ${locale.powerHidden}`);

    const parsed = powermapEngine.parse(source);
    expect(parsed.ok, parsed.errors[0]?.message).toBe(true);
    const model = parsed.value as PowerModel;
    expect(model.people.map((person) => person.id)).not.toContain(
      locale.powerHidden,
    );
    const svg = powermapEngine.render(model, {});
    expect(svg).not.toContain(locale.powerLabel);
  });
});
