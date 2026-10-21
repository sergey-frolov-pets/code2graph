import { describe, expect, it } from "vitest";
import {
  STRUCTURIZR_SAMPLE_IDS,
  getStructurizrSampleSource,
} from "@/constants/structurizr-sample-diagrams";
import {
  parseStructurizr,
  StructurizrParseError,
} from "@/services/structurizr/parse-dsl";
import { stackDiagramSvgs } from "@/services/structurizr/structurizr-engine";
import { validateStructurizrSyntax } from "@/services/structurizr/syntax-validation";
import { structurizrToPlantUml } from "@/services/structurizr/to-plantuml";

function plantUmlFor(source: string): string {
  return structurizrToPlantUml(parseStructurizr(source)).join("\n");
}

describe("structurizr samples", () => {
  it("renders every sample to C4 PlantUML", () => {
    for (const locale of ["ru", "en"] as const) {
      const context = plantUmlFor(getStructurizrSampleSource("context", locale));
      expect(context).toContain("!include ./plantuml-lib/C4/C4_Context.puml");
      expect(context).toContain("Person(customer,");
      expect(context).toContain("System(shop,");
      expect(context).toContain("System_Ext(mail,");
      expect(context).toContain("LAYOUT_LEFT_RIGHT()");
      expect(context).toContain("Rel(customer, shop,");

      const containers = plantUmlFor(
        getStructurizrSampleSource("containers", locale),
      );
      expect(containers).toContain("!include ./plantuml-lib/C4/C4_Container.puml");
      expect(containers).toContain("System_Boundary(shop,");
      expect(containers).toContain("Container(web,");
      expect(containers).toContain("ContainerDb(db,");
      expect(containers).toContain("Rel(customer, web,");

      const components = plantUmlFor(
        getStructurizrSampleSource("components", locale),
      );
      expect(components).toContain("!include ./plantuml-lib/C4/C4_Component.puml");
      expect(components).toContain("Container_Boundary(api,");
      expect(components).toContain("Component(orders,");
      expect(components).toContain("Component(catalog,");
      expect(components).toContain("ContainerDb_Ext(db,");
      expect(components).toContain("Rel(orders, catalog,");
      expect(components).toContain("Rel(orders, db,");

      const deployment = plantUmlFor(
        getStructurizrSampleSource("deployment", locale),
      );
      expect(deployment).toContain("!include ./plantuml-lib/C4/C4_Deployment.puml");
      expect(deployment).toContain("Deployment_Node(cluster,");
      expect(deployment).toContain("Deployment_Node(dbNode,");
      expect(deployment).toContain("Container(webInstance,");
      expect(deployment).toContain("ContainerDb(dbInstance,");
    }

    expect(STRUCTURIZR_SAMPLE_IDS).toHaveLength(4);
  });
});

describe("structurizr parser", () => {
  it("leaves an unrelated person out of the system context", () => {
    const diagram = plantUmlFor(`workspace {
      model {
        customer = person "Customer" "Places orders."
        admin = person "Admin" "Unused."
        shop = softwareSystem "Shop" "The shop."
        customer -> shop "Uses"
      }
      views {
        systemContext shop "Context" {
          include *
        }
      }
    }`);

    expect(diagram).toContain("Person(customer,");
    expect(diagram).not.toContain("Admin");
  });

  it("promotes a child relationship when implied relationships are enabled", () => {
    const diagram = plantUmlFor(`workspace {
      model {
        !impliedRelationships true
        user = person "User" "A user."
        shop = softwareSystem "Shop" "The shop." {
          api = container "API" "Backend." "Java" {
            orders = component "Orders" "Creates orders." "Java"
          }
        }
        user -> orders "Creates"
      }
      views {
        container shop "Containers" {
          include *
          autolayout lr
        }
      }
    }`);

    expect(diagram).toContain("Rel(user, api,");
  });

  it("draws a group as a C4 boundary", () => {
    const diagram = plantUmlFor(`workspace {
      model {
        shop = softwareSystem "Shop" "The shop." {
          group "Apps" {
            web = container "Web" "UI." "React"
          }
        }
      }
      views {
        container shop "Containers" {
          include *
        }
      }
    }`);

    expect(diagram).toContain('Boundary(group, "Apps", "group")');
    expect(diagram).toContain("Container(web,");
  });

  it("resolves hierarchical identifiers", () => {
    const diagram = plantUmlFor(`workspace {
      !identifiers hierarchical
      model {
        shop = softwareSystem "Shop" "The shop." {
          api = container "API" "Backend." "Java" {
            orders = component "Orders" "Orders." "Java"
          }
        }
      }
      views {
        component shop.api "Components" {
          include *
          autolayout tb
        }
      }
    }`);

    expect(diagram).toContain("Component(orders,");
    expect(diagram).toContain("Container_Boundary(api,");
  });

  it("synthesizes a system context when the workspace has no views", () => {
    const diagram = plantUmlFor(`workspace {
      model {
        user = person "User" "A user."
        app = softwareSystem "App" "The app."
        user -> app "Uses"
      }
    }`);

    expect(diagram).toContain("!include ./plantuml-lib/C4/C4_Context.puml");
    expect(diagram).toContain("Rel(user, app,");
  });

  it("reports the line of an unknown identifier", async () => {
    const source = `workspace {
  model {
    a = person "A" "User"
    a -> missing "Uses"
  }
}`;
    const result = await validateStructurizrSyntax(source);
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.messageKey).toBe("structurizr.unknownIdentifier");
    expect(result.issues[0]?.line).toBe(4);
  });

  it("reports a duplicate identifier", () => {
    expect(() =>
      parseStructurizr(`workspace {
        model {
          a = person "A" "One"
          a = person "B" "Two"
        }
      }`),
    ).toThrow(StructurizrParseError);
  });
});

describe("stackDiagramSvgs", () => {
  it("keeps a single diagram unchanged and stacks the rest", () => {
    const only = '<svg width="10px" height="10px"></svg>';
    expect(stackDiagramSvgs([only])).toBe(only);

    const stacked = stackDiagramSvgs([
      '<svg xmlns="http://www.w3.org/2000/svg" width="100px" height="40px"></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="80px" height="20px"></svg>',
    ]);
    expect(stacked).toContain('width="100px"');
    expect(stacked).toContain('height="92px"');
    expect(stacked).toContain('y="72"');
  });
});
