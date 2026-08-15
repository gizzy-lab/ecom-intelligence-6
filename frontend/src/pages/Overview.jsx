import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, ShoppingCart, Receipt, Package, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useData } from "@/context/DataContext";
import { api, fmtMoney, fmtMoneyFull, fmtNum } from "@/lib/api";
import { toast } from "sonner";

const KPI = ({ icon: Icon, label, value, sub, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="relative bg-white p-6"
  >
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <Icon className="h-4 w-4 text-zinc-300" />
    </div>
    <div className="mt-3 font-heading font-black tracking-tight text-3xl lg:text-4xl text-navy-900">
      {value}
    </div>
    {sub && <p className="mt-1.5 text-xs text-zinc-500">{sub}</p>}
  </motion.div>
);

const Bar = ({ label, value, share, sub, max }) => (
  <div className="py-3">
    <div className="flex items-baseline justify-between gap-4">
      <span className="truncate text-sm font-medium text-navy-900" title={label}>{label}</span>
      <span className="shrink-0 font-mono text-sm text-navy-900">{fmtMoneyFull(value)}</span>
    </div>
    <div className="mt-2 flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-navy-900" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
      </div>
      <span className="w-20 shrink-0 text-right text-xs text-zinc-400">{sub}</span>
    </div>
  </div>
);

export default function Overview() {
  const navigate = useNavigate();
  const { session, overview, setOverview } = useData();
  const [loading, setLoading] = useState(!overview);

  useEffect(() => {
    if (!session) {
      navigate("/");
      return;
    }
    if (overview) return;
    (async () => {
      try {
        const { data } = await api.get(`/overview/${session.dataset_id}`);
        setOverview(data.overview);
      } catch (e) {
        toast.error("Session expired", { description: "Please upload your data again." });
        navigate("/");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line
  }, [session]);

  if (loading || !overview) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-navy-900">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const trend = overview.revenue_trend || [];
  const firstRev = trend[0]?.revenue || 0;
  const lastRev = trend[trend.length - 1]?.revenue || 0;
  const trendUp = lastRev >= firstRev;
  const trendPct = firstRev ? Math.round(((lastRev - firstRev) / firstRev) * 100) : 0;
  const maxProduct = Math.max(...(overview.top_products || []).map((p) => p.revenue), 1);
  const maxCat = Math.max(...(overview.top_categories || []).map((p) => p.revenue), 1);

  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 hidden" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Executive Overview</p>
      <h1 className="mt-1 font-heading font-black tracking-tighter text-3xl lg:text-4xl text-navy-900">
        Here's how your business is performing
      </h1>
      <p className="mt-2 text-sm text-zinc-500">Based on {session.row_count.toLocaleString()} rows from {session.filename}.</p>

      {/* KPI grid */}
      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-zinc-200 overflow-hidden divide-x divide-y divide-zinc-200 lg:divide-y-0"
           data-testid="kpi-grid">
        <KPI icon={DollarSign} label="Total Revenue" value={fmtMoney(overview.total_revenue)}
             sub={fmtMoneyFull(overview.total_revenue)} delay={0.02} />
        <KPI icon={ShoppingCart} label="Total Orders" value={fmtNum(overview.total_orders)}
             sub="unique orders" delay={0.06} />
        <KPI icon={Receipt} label="Avg Order Value" value={fmtMoney(overview.average_order_value)}
             sub="per order" delay={0.1} />
        <KPI icon={Package} label="Units Sold" value={fmtNum(overview.units_sold)}
             sub="items" delay={0.14} />
      </div>

      {/* Revenue trend */}
      {trend.length > 1 && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6" data-testid="revenue-trend">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-heading font-bold text-lg text-navy-900">Revenue over time</h2>
              <p className="text-sm text-zinc-500">From {trend[0].period} to {trend[trend.length - 1].period}</p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              trendUp ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {trendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {trendPct > 0 ? "+" : ""}{trendPct}%
            </span>
          </div>
          <div className="mt-5 h-64 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f2439" stopOpacity={0.16} />
                    <stop offset="100%" stopColor="#0f2439" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false}
                       tickFormatter={(v) => fmtMoney(v)} width={54} />
                <Tooltip
                  cursor={{ stroke: "#0f2439", strokeWidth: 1, strokeDasharray: "3 3" }}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e4e4e7", fontSize: 12 }}
                  formatter={(v) => [fmtMoneyFull(v), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#0f2439" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top products & categories */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {overview.top_products?.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6" data-testid="top-products">
            <h2 className="font-heading font-bold text-lg text-navy-900">Top products</h2>
            <div className="mt-3 divide-y divide-zinc-100">
              {overview.top_products.map((p) => (
                <Bar key={p.name} label={p.name} value={p.revenue} sub={`${p.share}% · ${p.units} units`} max={maxProduct} />
              ))}
            </div>
          </div>
        )}
        {overview.top_categories?.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6" data-testid="top-categories">
            <h2 className="font-heading font-bold text-lg text-navy-900">Top categories</h2>
            <div className="mt-3 divide-y divide-zinc-100">
              {overview.top_categories.map((c) => (
                <Bar key={c.name} label={c.name} value={c.revenue} sub={`${c.share}% · ${c.units} units`} max={maxCat} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
