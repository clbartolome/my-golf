import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/clubs", label: "Palos" },
  { to: "/distances", label: "Distancias" },
  { to: "/putting", label: "Putting" },
  { to: "/par", label: "Por par" },
  { to: "/rounds", label: "Rondas" },
  { to: "/backup", label: "Copia" },
  { to: "/bag", label: "Bolsa" },
];

export function Layout() {
  return (
    <div className="flex min-h-full">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/8 bg-fairway-900/50 p-5 lg:flex">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-glow/70">My Golf</p>
          <h1 className="text-xl font-bold">Estadísticas</h1>
        </div>
        <nav className="space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                [
                  "block rounded-xl px-4 py-3 text-sm font-semibold transition",
                  isActive ? "bg-lime-glow text-fairway-950" : "text-white/60 hover:bg-white/6 hover:text-white",
                ].join(" ")
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-8 text-xs text-white/30">
          Captura en{" "}
          <a href="http://localhost:3000" className="text-lime-glow/70 underline">
            :3000
          </a>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-white/8 bg-fairway-900/80 px-4 py-3 backdrop-blur-md lg:hidden">
          <p className="text-xs text-lime-glow/70">My Golf</p>
          <nav className="mt-2 flex gap-2">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  [
                    "rounded-full px-4 py-2 text-sm font-semibold",
                    isActive ? "bg-lime-glow text-fairway-950" : "bg-white/8 text-white/60",
                  ].join(" ")
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-5 lg:px-6 lg:py-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
