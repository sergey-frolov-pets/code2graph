#!/usr/bin/env python3
"""Заменяет `r.value as any` в тестах движков Mermaid Ext на типизированные
приведения к моделям движков (lint: @typescript-eslint/no-explicit-any).

Идемпотентен: повторный запуск ничего не меняет.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TESTS = ROOT / "src/services/mermaid/ext/__tests__"

MODEL_BY_ENGINE = {
    "bubble": "BubbleModel",
    "ev": "EvModel",
    "heatmap": "HeatmapModel",
    "orgchart": "OrgModel",
    "waterfall": "WaterfallModel",
}


def fix(path: Path, model: str) -> bool:
    text = path.read_text(encoding="utf-8")
    original = text

    text = text.replace("r.value as any", f"r.value as {model}")
    text = text.replace("withGrid.value as any", f"withGrid.value as {model}")
    text = text.replace("withoutGrid.value as any", f"withoutGrid.value as {model}")

    if text == original:
        return False

    # добавляем импорт типа модели, если его ещё нет
    engine_name = path.stem
    if f"type {model}" not in text:
        pattern = re.compile(
            rf'import \{{ {engine_name}Engine \}} from "\.\./engines/{engine_name}";'
        )
        replacement = (
            f'import {{ {engine_name}Engine, type {model} }} '
            f'from "../engines/{engine_name}";'
        )
        text, n = pattern.subn(replacement, text)
        if n == 0:
            print(f"  ! не нашёл строку импорта движка в {path.name}", file=sys.stderr)

    path.write_text(text, encoding="utf-8")
    return True


def main() -> int:
    changed = 0
    for engine, model in MODEL_BY_ENGINE.items():
        path = TESTS / f"{engine}.test.ts"
        if not path.exists():
            print(f"  ! нет файла {path}", file=sys.stderr)
            continue
        if fix(path, model):
            changed += 1
            print(f"  ~ {path.name} → {model}")
    print(f"изменено файлов: {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
