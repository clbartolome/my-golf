import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ClubTrendChart } from "../components/ClubTrendChart";
import { StrokesTrendChart } from "../components/StrokesTrendChart";
import { TrendChart } from "../components/TrendChart";
import { ClubTrendSeries, RoundSummaryStats, ScoringTrendPoint } from "../types";

export function TrendsPage() {
  const [scoring, setScoring] = useState<ScoringTrendPoint[]>([]);
  const [clubs, setClubs] = useState<ClubTrendSeries[]>([]);
  const [rounds, setRounds] = useState<RoundSummaryStats[]>([]);

  useEffect(() => {
    Promise.all([api.scoringTrends(), api.clubTrends(), api.rounds()]).then(([s, c, r]) => {
      setScoring(s);
      setClubs(c);
      setRounds(r);
    });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Tendencias</h2>
        <p className="mt-1 text-white/50">Evolución de tu juego en el tiempo</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <StrokesTrendChart data={scoring} />
        <TrendChart rounds={rounds} />
      </div>

      <ClubTrendChart series={clubs} />
    </div>
  );
}
