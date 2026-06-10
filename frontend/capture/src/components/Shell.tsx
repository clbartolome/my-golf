import { ReactNode } from "react";

interface ShellProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
}

export function Shell({ children, header, footer }: ShellProps) {
  return (
    <div className="flex min-h-full flex-col bg-fairway-950">
      {header && (
        <header className="safe-top sticky top-0 z-20 border-b border-white/8 bg-fairway-900/95 backdrop-blur-md">
          {header}
        </header>
      )}
      <main className="flex-1 overflow-y-auto">{children}</main>
      {footer && (
        <footer className="safe-bottom sticky bottom-0 z-20 border-t border-white/8 bg-fairway-900/95 backdrop-blur-md">
          {footer}
        </footer>
      )}
    </div>
  );
}
