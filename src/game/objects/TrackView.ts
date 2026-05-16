import type { TrackConfig } from "../../core/raceTypes";

export function getTrackCellLabel(track: TrackConfig, index: number): string {
  return track.cells.find((cell) => cell.index === index)?.type ?? "NORMAL";
}
