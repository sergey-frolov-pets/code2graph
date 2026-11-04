import { both, lines, same, type LanguagePrimer } from "@/languages/primers/shared";

export const GRAPHML_PRIMER: LanguagePrimer = {
  types: [
    {
      id: "directed",
      titleKey: "site.primer.graphml.type.directed.title",
      summaryKey: "site.primer.graphml.type.directed.summary",
      syntaxKey: "site.primer.graphml.syntax.directed",
      example: both(
        lines(
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
          '  <key id="label" for="node" attr.name="label" attr.type="string"/>',
          '  <graph edgedefault="directed">',
          '    <node id="user"><data key="label">Покупатель</data></node>',
          '    <node id="api"><data key="label">API</data></node>',
          '    <edge source="user" target="api"/>',
          "  </graph>",
          "</graphml>",
        ),
        lines(
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
          '  <key id="label" for="node" attr.name="label" attr.type="string"/>',
          '  <graph edgedefault="directed">',
          '    <node id="user"><data key="label">Customer</data></node>',
          '    <node id="api"><data key="label">API</data></node>',
          '    <edge source="user" target="api"/>',
          "  </graph>",
          "</graphml>",
        ),
      ),
    },
    {
      id: "undirected",
      titleKey: "site.primer.graphml.type.undirected.title",
      summaryKey: "site.primer.graphml.type.undirected.summary",
      syntaxKey: "site.primer.graphml.syntax.undirected",
      example: same(
        lines(
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
          '  <graph edgedefault="undirected">',
          '    <node id="a"/>',
          '    <node id="b"/>',
          '    <edge source="a" target="b"/>',
          "  </graph>",
          "</graphml>",
        ),
      ),
    },
  ],
  keywords: [
    {
      id: "graphml",
      token: "graphml",
      hintKey: "site.primer.graphml.kw.graphml",
      example: same(
        '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
      ),
    },
    {
      id: "graph",
      token: "graph",
      hintKey: "site.primer.graphml.kw.graph",
      example: same('<graph edgedefault="directed">'),
    },
    {
      id: "node",
      token: "node",
      hintKey: "site.primer.graphml.kw.node",
      example: same('<node id="api"/>'),
    },
    {
      id: "edge",
      token: "edge",
      hintKey: "site.primer.graphml.kw.edge",
      example: same('<edge source="user" target="api"/>'),
    },
    {
      id: "key",
      token: "key",
      hintKey: "site.primer.graphml.kw.key",
      example: same(
        '<key id="label" for="node" attr.name="label" attr.type="string"/>',
      ),
    },
    {
      id: "data",
      token: "data",
      hintKey: "site.primer.graphml.kw.data",
      example: both(
        '<data key="label">Покупатель</data>',
        '<data key="label">Customer</data>',
      ),
    },
  ],
};
