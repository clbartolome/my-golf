import type {
  BagClub,
  ClubAnalysisResponse,
  DashboardResponse,
  DistanceAnalysisResponse,
  HolesFilter,
  MinSample,
  ParAnalysisResponse,
  PuttingAnalysisResponse,
  RoundRange,
  BackupImportResult,
  ImportMode,
  RoundDetail,
  RoundStatsDetail,
  RoundSummaryStats,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const json = (await res.json()) as { detail?: string | { msg: string }[] };
      if (typeof json.detail === "string") detail = json.detail;
      else if (Array.isArray(json.detail)) detail = json.detail.map((d) => d.msg).join(", ");
    } catch {
      /* keep default */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface DashboardParams {
  round_range?: RoundRange;
  holes_filter?: HolesFilter;
  course?: string | null;
  min_sample?: MinSample;
}

function qs(params: DashboardParams): string {
  const q = new URLSearchParams();
  if (params.round_range) q.set("round_range", params.round_range);
  if (params.holes_filter) q.set("holes_filter", params.holes_filter);
  if (params.course) q.set("course", params.course);
  if (params.min_sample !== undefined) q.set("min_sample", String(params.min_sample));
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const api = {
  dashboard: (params: DashboardParams = {}) =>
    request<DashboardResponse>(`/stats/dashboard${qs(params)}`),

  clubs: (params: DashboardParams = {}) =>
    request<ClubAnalysisResponse>(`/stats/clubs${qs(params)}`),

  putting: (params: Omit<DashboardParams, "min_sample"> = {}) =>
    request<PuttingAnalysisResponse>(`/stats/putting${qs(params)}`),

  distances: (params: DashboardParams = {}) =>
    request<DistanceAnalysisResponse>(`/stats/distances${qs(params)}`),

  par: (params: Omit<DashboardParams, "min_sample"> = {}) =>
    request<ParAnalysisResponse>(`/stats/par${qs(params)}`),

  bag: () => request<BagClub[]>("/bag"),

  saveBag: (clubs: string[]) =>
    request<string[]>("/bag", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubs }),
    }),

  rounds: () => request<RoundSummaryStats[]>("/stats/rounds"),

  getRound: (id: string) => request<RoundDetail>(`/rounds/${id}`),

  roundStats: (id: string) => request<RoundStatsDetail>(`/stats/rounds/${id}`),

  deleteRound: (id: string) =>
    request<void>(`/rounds/${id}`, { method: "DELETE" }),

  updateRound: (id: string, body: { status?: "completed" | "in_progress"; notes?: string }) =>
    request<{ id: string }>(`/rounds/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  exportBackup: async () => {
    const res = await fetch(`${API_BASE}/backup/export`);
    if (!res.ok) {
      let detail = `Error ${res.status}`;
      try {
        const json = (await res.json()) as { detail?: string };
        if (json.detail) detail = json.detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition");
    const match = disposition?.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? `my-golf-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  },

  importBackup: (file: File, mode: ImportMode) => {
    const form = new FormData();
    form.append("file", file);
    return request<BackupImportResult>(`/backup/import?mode=${mode}`, {
      method: "POST",
      body: form,
    });
  },
};
