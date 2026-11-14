import type { DashboardCell, DashboardModel } from "@/services/mermaid/ext/engines/dashboard";

export const DASHBOARD_MIN_TRACK = 0.08;

export interface DashboardDivider {
  axis: "col" | "row";
  /** Граница после этой доли: между `index` и `index + 1`. */
  index: number;
}

function tracksOf(model: DashboardModel, axis: "col" | "row"): number[] {
  return axis === "col" ? model.cols : model.rows;
}

function withTracks(model: DashboardModel, axis: "col" | "row", tracks: number[]): DashboardModel {
  return axis === "col" ? { ...model, cols: tracks } : { ...model, rows: tracks };
}

function widestIndex(tracks: number[]): number {
  let best = 0;
  for (let index = 1; index < tracks.length; index += 1) {
    if (tracks[index] > tracks[best]) best = index;
  }
  return best;
}

/** Режет выбранную или самую широкую долю пополам. `null`, если половина меньше минимума. */
export function insertDashboardLine(
  model: DashboardModel,
  axis: "col" | "row",
  selectedIndex: number | null,
): DashboardModel | null {
  const tracks = tracksOf(model, axis);
  const index = selectedIndex !== null && selectedIndex >= 0 && selectedIndex < tracks.length
    ? selectedIndex
    : widestIndex(tracks);
  const size = tracks[index];
  if (size / 2 < DASHBOARD_MIN_TRACK - 1e-6) return null;
  const left = size / 2;
  const next = [
    ...tracks.slice(0, index),
    left,
    size - left,
    ...tracks.slice(index + 1),
  ];
  const cells = model.cells.map((cell) => {
    const at = axis === "col" ? cell.col : cell.row;
    if (at <= index) return cell;
    return axis === "col" ? { ...cell, col: cell.col + 1 } : { ...cell, row: cell.row + 1 };
  });
  return { ...withTracks(model, axis, next), cells };
}

/** Сдвигает границу, не опуская соседние доли ниже минимума. */
export function moveDashboardDivider(
  tracks: readonly number[],
  index: number,
  nextStart: number,
): number[] {
  if (index < 0 || index >= tracks.length - 1) return [...tracks];
  const before = tracks.slice(0, index).reduce((sum, value) => sum + value, 0);
  const pair = tracks[index] + tracks[index + 1];
  const min = DASHBOARD_MIN_TRACK;
  const local = Math.min(pair - min, Math.max(min, nextStart - before));
  const next = [...tracks];
  next[index] = local;
  next[index + 1] = pair - local;
  return next;
}

export interface DashboardLineRemoval {
  model: DashboardModel;
  dropped: DashboardCell[];
}

/** Сливает две доли. При двух привязках в одной строке или колонке остаётся левая или верхняя. */
export function removeDashboardLine(model: DashboardModel, divider: DashboardDivider): DashboardLineRemoval | null {
  const tracks = tracksOf(model, divider.axis);
  if (divider.index < 0 || divider.index >= tracks.length - 1) return null;
  const nextTracks = [
    ...tracks.slice(0, divider.index),
    tracks[divider.index] + tracks[divider.index + 1],
    ...tracks.slice(divider.index + 2),
  ];
  const dropped: DashboardCell[] = [];
  const kept: DashboardCell[] = [];
  const groups = new Map<number, DashboardCell[]>();
  for (const cell of model.cells) {
    const along = divider.axis === "col" ? cell.col : cell.row;
    const across = divider.axis === "col" ? cell.row : cell.col;
    if (along !== divider.index && along !== divider.index + 1) {
      const shifted = along > divider.index + 1 ? along - 1 : along;
      kept.push(divider.axis === "col" ? { ...cell, col: shifted } : { ...cell, row: shifted });
      continue;
    }
    const list = groups.get(across) ?? [];
    list.push(cell);
    groups.set(across, list);
  }
  for (const list of groups.values()) {
    const lower = list.find((cell) => (divider.axis === "col" ? cell.col : cell.row) === divider.index);
    const upper = list.find((cell) => (divider.axis === "col" ? cell.col : cell.row) === divider.index + 1);
    if (lower && upper) dropped.push(upper);
    const winner = lower ?? upper;
    if (!winner) continue;
    kept.push(divider.axis === "col"
      ? { ...winner, col: divider.index }
      : { ...winner, row: divider.index });
  }
  return { model: { ...withTracks(model, divider.axis, nextTracks), cells: kept }, dropped };
}

export function bindDashboardCell(
  model: DashboardModel,
  col: number,
  row: number,
  kind: DashboardCell["kind"],
  ref: string,
): DashboardModel {
  const cells = model.cells.filter((cell) => cell.col !== col || cell.row !== row);
  cells.push({ col, row, kind, ref });
  return { ...model, cells };
}

export function clearDashboardCell(model: DashboardModel, col: number, row: number): DashboardModel {
  return {
    ...model,
    cells: model.cells.filter((cell) => cell.col !== col || cell.row !== row),
  };
}
