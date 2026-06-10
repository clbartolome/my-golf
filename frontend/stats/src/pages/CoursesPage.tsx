import { useEffect, useState } from "react";
import { api } from "../api/client";
import { StatCard } from "../components/StatCard";
import { fmtAvg, fmtNum, fmtPct } from "../lib/format";
import { CourseStats } from "../types";

export function CoursesPage() {
  const [courses, setCourses] = useState<CourseStats[]>([]);

  useEffect(() => {
    api.courses().then(setCourses).catch(() => setCourses([]));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Por campo</h2>
        <p className="mt-1 text-white/50">Comparativa agrupada por nombre de campo</p>
      </div>

      {!courses.length ? (
        <div className="card px-6 py-12 text-center text-white/45">Sin datos por campo aún</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {courses.map((c) => (
            <div key={c.course_name} className="card space-y-4 p-5">
              <div>
                <h3 className="text-lg font-bold">{c.course_name}</h3>
                <p className="text-xs text-white/45">
                  {c.rounds} rondas · {c.holes} hoyos
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="vs Par / hoyo" value={fmtNum(c.avg_score_vs_par)} accent />
                <StatCard label="Putts / hoyo" value={fmtAvg(c.avg_putts_per_hole)} />
                <StatCard label="GIR" value={fmtPct(c.gir_pct)} />
                <StatCard label="FIR" value={fmtPct(c.fir_pct)} />
              </div>
              {c.penalty_strokes > 0 && (
                <p className="text-xs text-white/40">{c.penalty_strokes} penalizaciones en total</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
