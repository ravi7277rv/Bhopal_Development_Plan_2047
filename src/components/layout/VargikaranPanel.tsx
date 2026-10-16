import React from "react";
import { Apps as AppsIcon } from "@mui/icons-material";
import type { ChipTheme } from "./vargikaranTheme";

interface ChipGroup {
  vargikaran: string;
  count: number;
  theme: ChipTheme;
}

interface VargikaranPanelProps {
  activeChip: string;
  onChipClick: (key: string) => void;
  chipGroups: ChipGroup[];
  chipCounts: Record<string, number>;
}

const VargikaranPanel: React.FC<VargikaranPanelProps> = ({
  activeChip,
  onChipClick,
  chipGroups,
  chipCounts,
}) => {
  return (
    <div className="px-4 pt-4 pb-3 border-b border-slate-200 bg-white flex-shrink-0">
      <h2 className="text-[20px] font-bold text-slate-800 leading-tight tracking-tight mb-4">
        Public Objections & Suggestions
      </h2>
      <h4 className="text-[15px] font-bold text-slate-800 leading-tight tracking-tight mb-3">
        वर्गीकरण (Vargikaran)
      </h4>

      {/* ══════ PART 1 — All (full width, primary) ══════ */}
      <button
        type="button"
        onClick={() => onChipClick("All")}
        className={`flex items-center justify-between gap-2 h-9 px-3 mb-2 rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-150 border w-full ${
          activeChip === "All"
            ? "bg-[#0D4574] text-white border-transparent shadow-sm"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            className={`shrink-0 ${
              activeChip === "All" ? "text-white" : "text-slate-500"
            }`}
          >
            <AppsIcon sx={{ fontSize: 16 }} />
          </span>
          <span className="whitespace-normal break-words leading-tight">
            All Vargikaran
          </span>
        </span>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold ${
            activeChip === "All"
              ? "bg-white/20 text-white"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {chipCounts["All"] ?? 0}
        </span>
      </button>

      {/* ══════ PART 2 — Categories (2-col grid) ══════ */}
      <div className="grid grid-cols-2 gap-2">
        {chipGroups.map(({ vargikaran, theme }) => {
          const count = chipCounts[vargikaran] ?? 0;
          const isActive = activeChip === vargikaran;
          const label = vargikaran === "UN" ? "Unclassified" : vargikaran;
          return (
            <button
              key={vargikaran}
              type="button"
              onClick={() => onChipClick(vargikaran)}
              className={`flex items-center justify-between gap-2 min-h-9 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium cursor-pointer transition-all duration-150 border w-full text-left ${
                isActive
                  ? `${theme.activeBg} text-white border-transparent shadow-sm`
                  : `${theme.bg} ${theme.text} border-transparent hover:brightness-[0.97]`
              }`}
              title={label}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`shrink-0 ${
                    isActive ? "text-white" : theme.iconColor
                  }`}
                >
                  {theme.icon}
                </span>
                <span className="whitespace-normal break-words leading-tight">
                  {label}
                </span>
              </span>
              <span
                className={`shrink-0 px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-white/70 text-slate-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default VargikaranPanel;