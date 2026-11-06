/**
 * Блоки оформления PlantUML, которые пошаговый редактор не разбирает
 * по элементам: skinparam и <style>. Их нужно вернуть в исходник как есть,
 * иначе после «По шагам» пропадают цвета диаграммы.
 */

export function extractPlantUmlStyleDirectives(source: string): string[] {
  const kept: string[] = [];
  let mode: "none" | "skin" | "style" = "none";
  let depth = 0;

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      continue;
    }

    if (mode === "none") {
      if (/^skinparam\b/i.test(line)) {
        kept.push(line);
        if (line.includes("{") && !line.includes("}")) {
          mode = "skin";
          depth = 1;
        }
        continue;
      }
      if (/^<style\b/i.test(line)) {
        kept.push(line);
        if (!/<\/style>/i.test(line)) {
          mode = "style";
        }
      }
      continue;
    }

    kept.push(line);
    if (mode === "skin") {
      if (line.includes("{")) {
        depth += 1;
      }
      if (line === "}" || /}\s*$/.test(line)) {
        depth -= 1;
        if (depth <= 0) {
          mode = "none";
          depth = 0;
        }
      }
      continue;
    }
    if (/<\/style>/i.test(line)) {
      mode = "none";
    }
  }

  return kept;
}

export function plantUmlColorToken(color: string | undefined): string {
  const raw = color?.trim() ?? "";
  if (!raw) {
    return "";
  }
  return raw.startsWith("#") ? raw : `#${raw}`;
}
