import { useRef, useState } from "react";
import { api } from "../api/client";
import { PageShell } from "../components/PageShell";
import type { BackupImportResult, ImportMode } from "../types";

export function BackupPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("replace");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastImport, setLastImport] = useState<BackupImportResult | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setMessage(null);
    try {
      await api.exportBackup();
      setMessage("Copia de seguridad descargada.");
    } catch {
      setError("No se pudo exportar. Comprueba que la API esté en marcha.");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Elige un archivo .json de copia de seguridad.");
      return;
    }

    if (
      mode === "replace" &&
      !window.confirm(
        "¿Reemplazar todos los datos actuales? Se borrarán rondas y bolsa antes de importar.",
      )
    ) {
      return;
    }

    setImporting(true);
    setError(null);
    setMessage(null);
    setLastImport(null);
    try {
      const result = await api.importBackup(file, mode);
      setLastImport(result);
      setMessage(
        `Importación completada: ${result.rounds_imported} ronda${result.rounds_imported !== 1 ? "s" : ""}, ${result.bag_clubs} palos en bolsa.`,
      );
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo importar el archivo.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <PageShell
      title="Copia de seguridad"
      subtitle="Exporta o restaura bolsa, rondas, hoyos y golpes"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-lg font-bold">Exportar</h2>
          <p className="mt-2 text-sm text-white/50">
            Descarga un archivo JSON con toda tu información: palos de la bolsa, rondas, hoyos y
            golpes (distancias incluidas).
          </p>
          <p className="mt-2 text-xs text-white/35">
            Guárdalo donde quieras. Al levantar la app de nuevo puedes importarlo para recuperar
            todo.
          </p>
          <button
            type="button"
            disabled={exporting}
            onClick={handleExport}
            className="mt-5 rounded-xl bg-lime-glow px-5 py-3 text-sm font-bold text-fairway-950 disabled:opacity-50"
          >
            {exporting ? "Exportando…" : "Descargar copia de seguridad"}
          </button>
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-bold">Importar</h2>
          <p className="mt-2 text-sm text-white/50">
            Sube un archivo exportado previamente para restaurar o añadir datos.
          </p>

          <div className="mt-4 space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/3 px-4 py-3">
              <input
                type="radio"
                name="import-mode"
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">Reemplazar todo</span>
                <span className="mt-0.5 block text-xs text-white/45">
                  Borra rondas y bolsa actuales e importa el archivo.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/3 px-4 py-3">
              <input
                type="radio"
                name="import-mode"
                checked={mode === "merge"}
                onChange={() => setMode("merge")}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">Combinar</span>
                <span className="mt-0.5 block text-xs text-white/45">
                  Añade las rondas del archivo y actualiza la bolsa si el backup la incluye.
                </span>
              </span>
            </label>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="mt-4 block w-full text-sm text-white/60 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          />

          <button
            type="button"
            disabled={importing}
            onClick={handleImport}
            className="mt-4 rounded-xl border border-sand/40 bg-sand/10 px-5 py-3 text-sm font-bold text-sand disabled:opacity-50"
          >
            {importing ? "Importando…" : "Importar archivo"}
          </button>
        </section>
      </div>

      {message && (
        <div className="card border-lime-glow/25 bg-lime-glow/10 px-5 py-4 text-sm text-lime-glow">
          {message}
          {lastImport && (
            <p className="mt-1 text-xs text-lime-glow/70">Modo: {lastImport.mode}</p>
          )}
        </div>
      )}
      {error && <div className="card border-danger/30 bg-danger/10 px-5 py-4 text-sm text-danger">{error}</div>}
    </PageShell>
  );
}
