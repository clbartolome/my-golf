import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ClubAnalyticsTable } from "../components/ClubAnalyticsTable";
import { MissRose } from "../components/MissRose";
import { ProximityChart } from "../components/ProximityChart";
import { StatCard } from "../components/StatCard";
import { ShotAnalysisOverview } from "../types";

export function AnalysisPage() {
  const [data, setData] = useState<ShotAnalysisOverview | null>(null);

  useEffect(() => {
    api.shotAnalysis().then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <p className="text-white/40">Cargando…</p>;

  if (!data.total_shots) {
    return (
      <div className="card px-6 py-16 text-center">
        <p className="text-lg font-semibold">Sin golpes para analizar</p>
        <p className="mt-2 text-sm text-white/45">Completa hoyos en captura con resultado y distancia tras cada golpe.</p>
      </div>
    );
  }

  const teeFir = data.tee.on_target_pct;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Análisis de tiros</h2>
        <p className="mt-1 max-w-2xl text-white/50">
          Dispersión y tendencias por fase del juego. Basado en el resultado y la distancia al hoyo que registras
          tras cada golpe.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Golpes analizados" value={`${data.total_shots}`} accent />
        <StatCard label="FIR (salida)" value={teeFir != null ? `${Number(teeFir).toFixed(0)}%` : "—"} hint="Fairway de salida" />
        <StatCard
          label="Miss izq. salida"
          value={data.tee.left_pct != null ? `${Number(data.tee.left_pct).toFixed(0)}%` : "—"}
        />
        <StatCard
          label="Miss der. salida"
          value={data.tee.right_pct != null ? `${Number(data.tee.right_pct).toFixed(0)}%` : "—"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <MissRose title="Salida (tee)" subtitle="Par 4 y 5 · primer golpe" stats={data.tee} />
        <MissRose title="Approach" subtitle="Hasta llegar al green" stats={data.approach} />
        <MissRose title="Putts" subtitle="Sobre el green" stats={data.putt} />
      </div>

      <ProximityChart buckets={data.proximity_buckets} />

      <div>
        <h3 className="mb-4 text-lg font-bold">Detalle por palo</h3>
        <p className="mb-4 text-sm text-white/45">
          Carry = distancia del golpe · Restante = metros al hoyo tras miss · Prox. = distancia al hoyo al
          alcanzar green
        </p>
        <ClubAnalyticsTable clubs={data.by_club} />
      </div>
    </div>
  );
}
