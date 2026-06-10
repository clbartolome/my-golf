import type {
  Hole,
  PenaltyCreateResponse,
  RoundDetail,
  RoundSummary,
  ShotCreateResponse,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const json = JSON.parse(text) as { detail?: string | { msg: string }[] };
      if (typeof json.detail === "string") detail = json.detail;
      else if (Array.isArray(json.detail)) detail = json.detail.map((d) => d.msg).join(", ");
    } catch {
      /* keep text */
    }
    throw new Error(detail || `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listRounds: (status?: string) =>
    request<RoundSummary[]>(`/rounds${status ? `?status=${status}` : ""}`),

  getRound: (id: string) => request<RoundDetail>(`/rounds/${id}`),

  createRound: (body: {
    course_name: string;
    tees?: string;
    wind?: string;
    planned_holes: number;
    course_rating?: number;
    slope_rating?: number;
  }) =>
    request<RoundSummary>("/rounds", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  completeRound: (id: string) =>
    request<RoundSummary>(`/rounds/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    }),

  startHole: (
    roundId: string,
    body: {
      hole_number: number;
      par: number;
      starting_distance: number;
      starting_unit: "m";
    },
  ) =>
    request<Hole>(`/rounds/${roundId}/holes`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getHole: (holeId: string) => request<Hole>(`/holes/${holeId}`),

  addShot: (
    holeId: string,
    body: {
      club: string;
      distance_after?: number | null;
      distance_carry?: number;
      distance_unit: "m";
      result: string;
      miss_line?: string;
      distance_before?: number;
    },
  ) =>
    request<ShotCreateResponse>(`/holes/${holeId}/shots`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  addPenalty: (
    holeId: string,
    body: {
      reason: string;
      relief: "replay" | "drop";
      drop_distance?: number;
      drop_unit?: "m";
    },
  ) =>
    request<PenaltyCreateResponse>(`/holes/${holeId}/penalties`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  bag: () => request<{ id: string; name: string; sort_order: number }[]>("/bag"),

  saveBag: (clubs: string[]) =>
    request<string[]>("/bag", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubs }),
    }),
};
