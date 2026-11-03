**English** | [Русский](README.ru.md)

# Code2Graph

A text-diagram editor with an MCP server for AI agents.

**Site:** [code2graph.ru](https://code2graph.ru)

[![License: Prosperity Public 3.0.0](https://img.shields.io/badge/license-Prosperity%20Public%203.0.0-blue)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/sergey-frolov-pets/code2graph)](https://github.com/sergey-frolov-pets/code2graph/stargazers)
[![GitHub Discussions](https://img.shields.io/github/discussions/sergey-frolov-pets/code2graph)](https://github.com/sergey-frolov-pets/code2graph/discussions)
[![Latest release](https://img.shields.io/github/v/release/sergey-frolov-pets/code2graph)](https://github.com/sergey-frolov-pets/code2graph/releases/latest)

## Features

- Editor for PlantUML, Mermaid, GraphML, WireMark, D2, and Structurizr.
- Live preview of the diagram while you edit.
- Export to SVG and PNG.
- Diagram library in the browser, and a REST library on the server edition.
- MCP server for Cursor and other agents: it returns diagram source and a rendered image.
- AI wizard and AI edits of a selection, with your own API key or the server proxy.
- Static site on GitHub Pages, plus a self-hosted server edition.
- Offline editing and installable PWA.

## Demo

<!-- TODO: replace docs/demo.gif with a short recording of the editor. The file is not in the repository yet. -->

![Code2Graph editor](docs/demo.gif)

## Quick start

### Run from source

```bash
npm ci
npm run dev
```

The editor is at the URL Vite prints (port 5173). `npm run dev:all` also starts the library API from `server/`.

Checks used before a commit:

```bash
npm run typecheck:all
npm run test
npm run check:i18n
```

A static build (no database) is `npm run build`. Details: [docs/DEPLOY.md](docs/DEPLOY.md).

A single HTML file for a release is `npm run build:release`. The artifact is `release/code2graph.html`. Published files are on the [latest release](https://github.com/sergey-frolov-pets/code2graph/releases/latest).

### Self-hosted

This repository has no Dockerfile. The server edition (accounts, cloud library, LLM proxy) is installed with the scripts in `scripts/deploy/`:

```bash
sudo bash scripts/deploy/vdsina-install.sh
sudo bash scripts/deploy/vdsina-update.sh
```

See [docs/DEPLOY_VDSINA.md](docs/DEPLOY_VDSINA.md) and [server/README.md](server/README.md).

### MCP server in Cursor

Run the server from a checkout of this repository. Replace the path. `CODE2GRAPH_API_URL` points at the server edition; leave the token empty when the server does not require one.

```json
{
  "mcpServers": {
    "code2graph": {
      "command": "node",
      "args": ["/ABS/PATH/code2graph/packages/mcp/bin/code2graph-mcp.js"],
      "env": {
        "CODE2GRAPH_API_URL": "https://www.code2graph.ru",
        "CODE2GRAPH_API_TOKEN": "same-value-as-AGENT_API_TOKEN"
      }
    }
  }
}
```

The same shape works for other MCP clients that read a server command. Tools: `list_diagram_formats`, `plan_diagram`, `generate_diagram`. Package: [packages/mcp](packages/mcp).

## Use cases

- Draw an architecture diagram (C4, deployment, ArchiMate) in the browser and export SVG.
- Sketch a sequence diagram while reviewing a change, with live preview.
- Ask an agent in Cursor to generate a diagram. MCP returns source you can open in the editor and an image of the result.

## License

This project is source-available under the Prosperity Public License 3.0.0.

Non-commercial use is free and unrestricted.

Commercial use is free for a 30-day trial. After that, a paid license is required.

Contact: [admin@code2graph.ru](mailto:admin@code2graph.ru)

- [LICENSE](LICENSE)
- [Prosperity Public License 3.0.0](https://prosperitylicense.com/versions/3.0.0)

Earlier versions of this project (tagged or released before 29 October 2026) were licensed under the MIT License. Those grants are irrevocable. The Prosperity Public License 3.0.0 applies to all versions from commit `b15950ac4cb3e5b6264832dff7e3698da942b2a6` onward.

## Community

- [Discussions](https://github.com/sergey-frolov-pets/code2graph/discussions)
- [Issues](https://github.com/sergey-frolov-pets/code2graph/issues)
- [Contributing](CONTRIBUTING.md)
- Commercial licensing: [admin@code2graph.ru](mailto:admin@code2graph.ru)

If this project is useful, leave a ⭐. It helps the project.

**Site:** [code2graph.ru](https://code2graph.ru)
