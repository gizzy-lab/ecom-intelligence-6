import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, Loader2, Sparkles } from "lucide-react";
import { useData } from "@/context/DataContext";
import { api } from "@/lib/api";
import { Logo } from "@/components/Logo";

const SUGGESTIONS = [
  "Which product should I focus on?",
  "Why did revenue change?",
  "Which category is growing fastest?",
  "What should I investigate first?",
];

export default function AskRuniq() {
  const navigate = useNavigate();
  const { session, messages, setMessages } = useData();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!session) navigate("/");
  }, [session, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading || !session) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const { data } = await api.post(`/ask/${session.dataset_id}`, { question: q });
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, I couldn't answer that right now. Please try again.", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="flex flex-col h-[calc(100vh)] lg:h-screen">
      <div className="border-b border-zinc-200 px-6 lg:px-10 py-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Ask Runiq</p>
        <h1 className="mt-1 font-heading font-black tracking-tighter text-2xl lg:text-3xl text-navy-900">
          Chat with your sales data
        </h1>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 lg:px-10 py-6" data-testid="ask-messages">
        <div className="mx-auto max-w-3xl space-y-5">
          {messages.length === 0 && (
            <div className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-900 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-700">
                  Hi! I've analyzed <span className="font-semibold text-navy-900">{session.filename}</span>. Ask me
                  anything about your sales — trends, products, categories, or where to focus next.
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2 pl-12">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    data-testid={`suggestion-${s.slice(0, 8)}`}
                    onClick={() => send(s)}
                    className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-sm text-navy-900 hover:bg-navy-50 hover:border-navy-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex items-start gap-3 ${m.role === "user" ? "justify-end" : ""}`}
              data-testid={`message-${m.role}`}
            >
              {m.role === "assistant" && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-900 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[80%] whitespace-pre-wrap text-[15px] leading-relaxed px-4 py-3 ${
                  m.role === "user"
                    ? "rounded-2xl rounded-tr-sm bg-navy-900 text-white"
                    : `rounded-2xl rounded-tl-sm border ${m.error ? "border-red-200 bg-red-50 text-red-700" : "border-zinc-200 bg-white text-zinc-700"}`
                }`}
              >
                {m.content}
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex items-start gap-3" data-testid="ask-loading">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-900 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-zinc-200 bg-white px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-300" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-300" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-300" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-200 bg-white px-6 lg:px-10 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="mx-auto flex max-w-3xl items-center gap-3"
        >
          <input
            data-testid="ask-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your sales data…"
            className="flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-5 py-3 text-[15px] text-navy-900 outline-none focus:border-navy-900 focus:bg-white transition-colors"
          />
          <button
            data-testid="ask-send-btn"
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-900 text-white transition-colors hover:bg-navy-800 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
