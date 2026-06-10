import type {
  BagClub,
  ClubTrendSeries,
  CourseStats,
  HandicapStats,
  OverviewStats,
  RoundStats,
  RoundSummaryStats,
  ScoringTrendPoint,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  overview: () => request<OverviewStats>("/stats/overview"),
  rounds: () => request<RoundSummaryStats[]>("/stats/rounds"),
  round: (id: string) => request<RoundStats>(`/stats/rounds/${id}`),
  courses: () => request<CourseStats[]>("/stats/courses"),
  handicap: () => request<HandicapStats>("/stats/handicap"),
  scoringTrends: () => request<ScoringTrendPoint[]>("/stats/trends/scoring"),
  clubTrends: () => request<ClubTrendSeries[]>("/stats/trends/clubs"),
  bag: () => request<BagClub[]>("/bag"),
  saveBag: (clubs: string[]) =>
    request<string[]>("/bag", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubs }),
    }),

  deleteRound: (id: string) =>
    request<void>(`/rounds/${id}`, { method: "DELETE" }),

  shotAnalysis: () => request<import("../types").ShotAnalysisOverview>("/stats/shot-analysis"),
};
