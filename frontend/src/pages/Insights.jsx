import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Info, ArrowUpRight, Loader2, Sparkles, Target } from "lucide-react";
import { useData } from "@/context/DataContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

const SEV = {
  danger: { label: "Needs attention", cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", icon: AlertTriangle },
  warning: { label: "Watch closely", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", icon: AlertTriangle },
  success: { label: "Opportunity", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", icon: TrendingUp },
  info: { label: "Good to know", cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", icon: Info },
};

export default function Insights() {
  const navigate = useNavigate();
  const { session, insights, setInsights } = useData();
  const [loading, setLoading] = useState(!insights);

  useEffect(() => {
    if (!session) {
      navigate("/");
      return;
    }
    if (insights) return;
    (async () => {
      try {
        const { data } = await api.get(`/insights/${session.dataset_id}`);
        setInsights(data.insights);
      } catch (e) {
        toast.error("Session expired", { description: "Please upload your data again." });
        navigate("/");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line
  }, [session]);

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-navy-900">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="mt-3 text-sm text-zinc-500">Runiq is interpreting your data…</p>
      </div>
    );
  }

  const list = insights || [];

  return (
    <div className="px-6 lg:px-10 py-8 max-w-4xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Business Insights</p>
      <h1 className="mt-1 font-heading font-black tracking-tighter text-3xl lg:text-4xl text-navy-900">
        What deserves your attention
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        {list.length} prioritized findings, each with the why and a recommended next step.
      </p>

      <div className="mt-8 space-y-5">
        {list.map((ins, i) => {
          const sev = SEV[ins.severity] || SEV.info;
          const Icon = sev.icon;
          return (
            <motion.div
              key={ins.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              data-testid={`insight-card-${ins.id}`}
              className="rounded-xl border border-zinc-200 bg-white overflow-hidden hover:-translate-y-[1px] transition-transform"
            >
              <div className="flex items-stretch">
                <div className={`w-1.5 shrink-0 ${sev.dot}`} />
                <div className="flex-1 p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${sev.cls}`}>
                      <Icon className="h-3 w-3" /> {sev.label}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">{ins.metric}</span>
                  </div>

                  <h3 className="mt-3 font-heading font-bold text-xl tracking-tight text-navy-900">{ins.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-700">{ins.what}</p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg bg-zinc-50 border border-zinc-100 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Why it's happening</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-zinc-700">{ins.why}</p>
                    </div>
                    <div className="rounded-lg bg-navy-900 p-4 text-white">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">
                        <Target className="h-3 w-3" /> Recommended action
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-white/95">{ins.action}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        {list.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
            No significant insights detected for this dataset.
          </div>
        )}
      </div>

      <button
        data-testid="insights-to-ask"
        onClick={() => navigate("/ask")}
        className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-navy-900 hover:gap-3 transition-all"
      >
        <Sparkles className="h-4 w-4" /> Ask Runiq a follow-up question
        <ArrowUpRight className="h-4 w-4" />
      </button>
    </div>
  );
}
