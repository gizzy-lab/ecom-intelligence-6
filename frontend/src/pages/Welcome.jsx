import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UploadCloud, Sparkles, ArrowRight, FileSpreadsheet, Loader2, CheckCircle2, BarChart3, Lightbulb, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useData } from "@/context/DataContext";
import { api } from "@/lib/api";

const STEPS = [
  { icon: BarChart3, title: "Executive Overview", desc: "Revenue, orders, AOV and trends at a glance." },
  { icon: Lightbulb, title: "Business Insights", desc: "Prioritized findings with clear recommended actions." },
  { icon: MessageSquareText, title: "Ask Runiq", desc: "Ask questions about your data in plain English." },
];

export default function Welcome() {
  const navigate = useNavigate();
  const { startSession } = useData();
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleMeta = (meta, label) => {
    startSession(meta);
    toast.success(`${label} ready`, { description: `${meta.row_count.toLocaleString()} rows analyzed.` });
    navigate("/overview");
  };

  const uploadFile = useCallback(
    async (file) => {
      if (!file) return;
      const ok = /\.(csv|xlsx|xls|txt)$/i.test(file.name);
      if (!ok) {
        toast.error("Unsupported file", { description: "Please upload a CSV or XLSX file." });
        return;
      }
      setLoading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const { data } = await api.post("/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        handleMeta(data, "Analysis");
      } catch (e) {
        toast.error("Could not analyze file", {
          description: e?.response?.data?.detail || "Please check your file and try again.",
        });
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line
    []
  );

  const loadDemo = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/demo");
      handleMeta(data, "Demo dataset");
    } catch (e) {
      toast.error("Could not load demo data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grain">
      <header className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
        <Logo />
        <span className="hidden sm:inline text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          by Runiq Studio
        </span>
      </header>

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-8 lg:pt-16">
        <div className="grid lg:grid-cols-2 gap-14 items-start">
          {/* Left: copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-navy-800">
                <Sparkles className="h-3.5 w-3.5" /> AI business decision assistant
              </span>
              <h1 className="mt-6 font-heading font-black tracking-tighter text-4xl sm:text-5xl lg:text-6xl leading-[1.02] text-navy-900">
                Turn raw sales data into decisions you can act on.
              </h1>
              <p className="mt-5 text-base leading-relaxed text-zinc-600 max-w-lg">
                Upload a spreadsheet and Runiq reads it the way a seasoned analyst
                would — surfacing what's happening, why, and exactly what to do next.
              </p>
            </motion.div>

            <div className="mt-10 space-y-4">
              {STEPS.map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
                  className="flex items-start gap-4"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-900 text-white">
                    <s.icon className="h-4.5 w-4.5" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="font-semibold text-navy-900 text-[15px]">{s.title}</p>
                    <p className="text-sm text-zinc-500">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: upload card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:sticky lg:top-10"
          >
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-navy-900">
                <FileSpreadsheet className="h-5 w-5" />
                <h2 className="font-heading font-bold text-xl tracking-tight">Upload your sales data</h2>
              </div>
              <p className="mt-1 text-sm text-zinc-500">CSV or XLSX. Columns are detected automatically.</p>

              <div
                data-testid="upload-dropzone"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  uploadFile(e.dataTransfer.files?.[0]);
                }}
                onClick={() => !loading && inputRef.current?.click()}
                className={`mt-5 cursor-pointer rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                  dragOver ? "border-navy-900 bg-navy-50" : "border-zinc-300 bg-zinc-50/60 hover:border-navy-700 hover:bg-navy-50/40"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  className="hidden"
                  data-testid="file-input"
                  onChange={(e) => uploadFile(e.target.files?.[0])}
                />
                {loading ? (
                  <div className="flex flex-col items-center text-navy-900">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="mt-3 text-sm font-medium">Analyzing your data…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-900 text-white">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-navy-900">
                      Drop your file here, or <span className="underline">browse</span>
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">Sales exports, order reports, transaction logs</p>
                  </div>
                )}
              </div>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-200" />
                <span className="text-xs font-medium text-zinc-400">or</span>
                <div className="h-px flex-1 bg-zinc-200" />
              </div>

              <Button
                data-testid="load-demo-btn"
                variant="outline"
                onClick={loadDemo}
                disabled={loading}
                className="w-full h-11 justify-between group"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Sparkles className="h-4 w-4" /> Explore with demo dataset
                </span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>

              <ul className="mt-6 space-y-2">
                {["Real calculations, no mockups", "Handles missing or renamed columns", "Nothing stored — analysis is per session"].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-2 text-xs text-zinc-500">
                      <CheckCircle2 className="h-3.5 w-3.5 text-navy-700" /> {t}
                    </li>
                  )
                )}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
