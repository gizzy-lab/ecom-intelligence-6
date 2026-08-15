import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { LayoutDashboard, Lightbulb, MessageSquareText, FileSpreadsheet, RotateCcw, Sparkles } from "lucide-react";
import { Logo } from "./Logo";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/overview", label: "Executive Overview", icon: LayoutDashboard, testid: "nav-overview" },
  { to: "/insights", label: "Business Insights", icon: Lightbulb, testid: "nav-insights" },
  { to: "/ask", label: "Ask Runiq", icon: MessageSquareText, testid: "nav-ask" },
];

export const Layout = () => {
  const { session, reset } = useData();
  const navigate = useNavigate();

  const onNew = () => {
    reset();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-zinc-200 bg-navy-50/40">
          <div className="px-5 h-16 flex items-center border-b border-zinc-200">
            <Logo />
          </div>

          <nav className="flex-1 px-3 py-5 space-y-1">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Workspace
            </p>
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={n.testid}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-navy-900 text-white"
                      : "text-zinc-600 hover:bg-navy-100/60 hover:text-navy-900"
                  }`
                }
              >
                <n.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                {n.label}
              </NavLink>
            ))}
          </nav>

          {session && (
            <div className="p-3">
              <div className="rounded-lg border border-zinc-200 bg-white p-3.5" data-testid="sidebar-dataset-card">
                <div className="flex items-center gap-2 text-navy-900">
                  <FileSpreadsheet className="h-4 w-4 shrink-0" />
                  <span className="truncate text-[13px] font-semibold" title={session.filename}>
                    {session.filename}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {session.row_count?.toLocaleString()} rows analyzed
                </p>
                {session.is_demo && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-semibold text-navy-800">
                    <Sparkles className="h-3 w-3" /> Demo data
                  </span>
                )}
                <Button
                  data-testid="new-dataset-btn"
                  variant="outline"
                  size="sm"
                  onClick={onNew}
                  className="mt-3 w-full text-xs h-8"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> New dataset
                </Button>
              </div>
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 lg:pl-64 min-h-screen">
          {/* Mobile top bar */}
          <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-4 h-14 backdrop-blur-xl">
            <Logo />
            {session && (
              <Button variant="outline" size="sm" onClick={onNew} data-testid="new-dataset-btn-mobile">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="lg:hidden border-b border-zinc-200">
            <div className="flex">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    `flex-1 text-center py-2.5 text-xs font-semibold ${
                      isActive ? "text-navy-900 border-b-2 border-navy-900" : "text-zinc-500"
                    }`
                  }
                >
                  {n.label.split(" ").pop()}
                </NavLink>
              ))}
            </div>
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
};
