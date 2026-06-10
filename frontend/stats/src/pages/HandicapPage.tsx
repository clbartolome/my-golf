import { useEffect, useState } from "react";
import { api } from "../api/client";
import { HandicapChart } from "../components/HandicapChart";
import { StatCard } from "../components/StatCard";
import { fmtDate } from "../lib/format";
import { HandicapStats } from "../types";

export function HandicapPage() {
  const [data, setData] = useState<HandicapStats | null>(null);

  useEffect(() => {
    api.handicap().then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <p className="text-white/40">Cargando…</p>;

  const index = data.handicap_index != null ? Number(data.handicap_index).toFixed(1) : "—";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Handicap</h2>
        <p className="mt-1 max-w-2xl text-white/50">
          Cálculo WHS simplificado: diferencial = (113 / Slope) × (Golpes − Valoración). Se usan las mejores
          tarjetas de tus últimas 20 rondas completas. Sin valoración oficial, se usa el par del recorrido.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Handicap Index"
          value={index}
          accent
          hint={
            data.rounds_needed > 0
              ? `Faltan ${data.rounds_needed} rondas completas (mín. 3)`
              : `${data.eligible_rounds} rondas elegibles`
          }
        />
        <StatCard label="Rondas elegibles" value={`${data.eligible_rounds}`} hint="9 o 18 hoyos completados" />
        <StatCard
          label="Tarjetas en cálculo"
          value={`${Math.min(data.eligible_rounds, 20)}`}
          hint="Máximo últimas 20"
        />
      </div>

      <HandicapChart history={data.history} />

      <div>
        <h3 className="mb-4 text-lg font-bold">Diferenciales de tarjeta</h3>
        {!data.differentials.length ? (
          <div className="card px-6 py-12 text-center text-white/45">
            Completa una ronda entera (todos los hoyos) para calcular el handicap
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/8 text-xs uppercase tracking-wider text-white/40">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Campo</th>
                  <th className="px-4 py-3">Golpes</th>
                  <th className="px-4 py-3">Valoración</th>
                  <th className="px-4 py-3">Diferencial</th>
                  <th className="px-4 py-3">Usada</th>
                </tr>
              </thead>
              <tbody>
                {data.differentials.map((d) => (
                  <tr
                    key={d.round_id}
                    className={`border-b border-white/5 ${d.used_in_index ? "bg-lime-glow/5" : ""}`}
                  >
                    <td className="px-4 py-3 text-white/70">{fmtDate(d.played_at)}</td>
                    <td className="px-4 py-3">{d.course_name}</td>
                    <td className="px-4 py-3 tabular-nums">{d.total_strokes}</td>
                    <td className="px-4 py-3 tabular-nums text-white/60">{Number(d.course_rating).toFixed(1)}</td>
                    <td className="px-4 py-3 font-bold tabular-nums text-lime-soft">{Number(d.differential).toFixed(1)}</td>
                    <td className="px-4 py-3">{d.used_in_index ? "★" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-white/30">
        Para mayor precisión, introduce la valoración y slope al crear la ronda en captura (opcional, sección avanzada).
        Más info:{" "}
        <a href="https://www.rfeg.es/handicap" className="text-lime-glow/60 underline" target="_blank" rel="noreferrer">
          RFEG WHS
        </a>
      </p>
    </div>
  );
}
