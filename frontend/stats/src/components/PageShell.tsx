import type { ReactNode } from "react";

interface PageShellProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Contenedor estándar de página: ancho completo, espaciado compacto. */
export function PageShell({ title, subtitle, action, children, footer }: PageShellProps) {
  return (
    <div className="page">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="page-title">{title}</h2>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
      {footer}
    </div>
  );
}
