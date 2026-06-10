import { Modal } from "./Modal";
import { RoundDetailPanel } from "./RoundDetailPanel";
import type { RoundDetail, RoundStatsDetail, RoundSummaryStats } from "../types";

interface RoundDetailModalProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  summary: RoundSummaryStats | undefined;
  detail: RoundDetail | null;
  holeStats: RoundStatsDetail | null;
  onClose: () => void;
  captureUrl: string;
}

export function RoundDetailModal({
  open,
  loading,
  error,
  summary,
  detail,
  holeStats,
  onClose,
  captureUrl,
}: RoundDetailModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <div className="px-6 py-16 text-center text-sm text-white/45">Cargando detalle…</div>
        )}
        {error && !loading && (
          <div className="px-6 py-16 text-center">
            <p className="text-danger">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/70"
            >
              Cerrar
            </button>
          </div>
        )}
        {!loading && !error && summary && detail && holeStats && (
          <RoundDetailPanel
            summary={summary}
            detail={detail}
            holeStats={holeStats}
            onClose={onClose}
            captureUrl={captureUrl}
          />
        )}
      </div>
    </Modal>
  );
}
