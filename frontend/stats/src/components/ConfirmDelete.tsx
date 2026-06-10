interface ConfirmDeleteProps {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDelete({ label, onConfirm, onCancel, loading }: ConfirmDeleteProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="card max-w-sm p-6">
        <h3 className="text-lg font-bold">¿Borrar ronda?</h3>
        <p className="mt-2 text-sm text-white/55">
          Se eliminará <strong>{label}</strong> con todos sus hoyos y golpes. No se puede deshacer.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-12 rounded-xl border border-white/15 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 min-h-12 rounded-xl bg-danger font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Borrando…" : "Borrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
