import { LOGO_URL } from "@/lib/api";

export const Logo = ({ className = "", showMark = true, dark = false }) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} data-testid="runiq-logo">
      {showMark && (
        <img
          src={LOGO_URL}
          alt="Runiq Studio"
          className="h-9 w-9 rounded-md object-cover ring-1 ring-navy-900/10"
        />
      )}
      <div className="leading-none">
        <div className="font-heading font-black tracking-tight text-[19px]">
          <span className={dark ? "text-white" : "text-navy-900"}>Runiq</span>
          <span className="text-zinc-400"> Insight</span>
        </div>
      </div>
    </div>
  );
};
