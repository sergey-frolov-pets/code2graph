import re
from pathlib import Path

BASE = Path("src/services/mermaid/ext/__tests__")
PAIRS = {
    "bubble": "BubbleModel",
    "ev": "EvModel",
    "heatmap": "HeatmapModel",
    "orgchart": "OrgModel",
    "waterfall": "WaterfallModel",
}

for engine, model in PAIRS.items():
    path = BASE / f"{engine}.test.ts"
    text = path.read_text(encoding="utf-8")
    old = f'import {{ {engine}Engine }} from "../engines/{engine}";'
    new = f'import {{ {engine}Engine, type {model} }} from "../engines/{engine}";'
    if old in text:
        path.write_text(text.replace(old, new, 1), encoding="utf-8")
        print("ok", path.name)
    else:
        print("MISS", path.name)
