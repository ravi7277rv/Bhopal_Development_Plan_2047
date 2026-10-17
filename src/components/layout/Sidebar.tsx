import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Search,
  LocationOn,
  // CropSquare,          // ✅ new Khasra icon
  ChevronRight,
  ChevronLeft,
  Assignment,
  Groups,
} from "@mui/icons-material";
import type { MapMarker } from "../../types/index.type";
import VargikaranPanel from "./VargikaranPanel";
import {
  ALL_THEME,
  getVargikaranTheme,
  normalizeVargikaran
} from "./vargikaranTheme";

/* ============ WIDTH HOOK ============ */
const useSidebarWidth = () => {
  const getWidth = useCallback(() => {
    if (typeof window === "undefined") return 400;
    if (window.innerWidth < 640) return window.innerWidth;
    if (window.innerWidth < 1024) return 340;
    if (window.innerWidth < 1280) return 370;
    return 400;
  }, []);

  const [width, setWidth] = useState(getWidth);

  useEffect(() => {
    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        setWidth(getWidth());
        rafId = null;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [getWidth]);

  return width;
};

/* ============ INFO ROW (helper) ============ */
// const InfoRow: React.FC<{
//   icon: React.ReactNode;
//   label: string;
//   value?: string | null;
//   last?: boolean;
// }> = ({ icon, label, value, last }) => (
//   <div
//     className={`flex items-start gap-1.5 text-[12px] text-slate-600 min-w-0 ${
//       last ? "" : "mb-2"
//     }`}
//   >
//     {React.cloneElement(
//       icon as React.ReactElement<{ sx?: Record<string, unknown> }>,
//       {
//         sx: {
//           fontSize: 13,
//           color: "#94a3b8",
//           flexShrink: 0,
//           marginTop: "2px",
//         },
//       },
//     )}
//     <span className="font-medium flex-shrink-0">{label}</span>
//     <span className="min-w-0 whitespace-normal break-words">
//       {value || "N/A"}
//     </span>
//   </div>
// );

/* ============ OBJECTION CARD ============ */
// const ObjectionCard: React.FC<{
//   obj: MapMarker;
//   onClick: () => void;
// }> = ({ obj, onClick }) => {
//   const vargikaranKey = normalizeVargikaran(obj.vargikaran);
//   const theme: ChipTheme = getVargikaranTheme(vargikaranKey);

//   return (
//     <div
//       role="button"
//       tabIndex={0}
//       onClick={onClick}
//       onKeyDown={(e) => {
//         if (e.key === "Enter" || e.key === " ") {
//           e.preventDefault();
//           onClick();
//         }
//       }}
//       className={`group relative bg-white rounded-xl border border-slate-200 cursor-pointer overflow-hidden transition-all duration-200 ${theme.cardHoverBorder} ${theme.cardHoverShadow} hover:-translate-y-[1px]`}
//     >
//       <div className={`absolute left-0 top-0 bottom-0 w-1 ${theme.cardStrip}`} />
//       <div className="pl-4 pr-4 py-3.5">
//         {/* Vargikaran */}
//         <div className="mb-2.5 min-w-0">
//           <div className="flex items-start gap-2">
//             <span className="text-[12px] font-medium text-slate-500 flex-shrink-0">
//               Vargikaran:
//             </span>
//             <span
//               className={`min-w-0 break-words whitespace-normal text-[11px] px-1.5 py-0.5 rounded-md font-semibold border ${theme.pillBg} ${theme.pillText} ${theme.pillBorder}`}
//             >
//               {vargikaranKey !== "UN" ? vargikaranKey : "N/A"}
//             </span>
//           </div>
//         </div>

//         <InfoRow icon={<LocationOn />} label="Village:" value={obj.village} />
//         <InfoRow
//           icon={<CropSquare />}          /* ✅ new Khasra icon */
//           label="Khasara:"
//           value={obj.khasraNo}
//         />
//         <InfoRow
//           icon={<Assignment />}
//           label="Apatti No:"
//           value={obj.objectionId}
//         />
//         <InfoRow
//           icon={<Groups />}
//           label="Apatti Group:"
//           value={obj.apattiGro}
//           last
//         />
//       </div>
//     </div>
//   );
// };

/* ============ EMPTY STATE ============ */
const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
      <Search sx={{ fontSize: 24, color: "#94a3b8" }} />
    </div>
    <p className="text-[13px] font-semibold text-slate-700">
      No objections found
    </p>
    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
      Try adjusting your filters or search query
    </p>
  </div>
);

/* ============ MAIN SIDEBAR ============ */
interface SidebarProps {
  objections: MapMarker[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onObjectionClick?: (objection: MapMarker) => void;
  onVillageHover?: (objection: MapMarker | null) => void;
  onVillageSelect?: (objection: MapMarker) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClearAll: () => void;
  resetKey: number;
  activeChip: string;
  setActiveChip: (value: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  objections,
  searchQuery,
  onObjectionClick,
  onVillageHover,
  isOpen,
  onToggle,
  activeChip,
  setActiveChip,
}) => {
  const SIDEBAR_WIDTH = useSidebarWidth();

  const chipGroups = useMemo(() => {
    const counts = new Map<string, number>();
    objections.forEach((o) => {
      const key = normalizeVargikaran(o.vargikaran);
      if (key === "UN") return; // ✅ UN skip
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const sorted = [...counts.entries()].sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );

    return sorted.map(([vargikaran, count]) => ({
      vargikaran,
      count,
      theme: getVargikaranTheme(vargikaran),
    }));
  }, [objections]);

  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: objections.filter((o) => normalizeVargikaran(o.vargikaran) !== "UN")
        .length,
    };
    chipGroups.forEach(({ vargikaran, count }) => {
      counts[vargikaran] = count;
    });
    return counts;
  }, [objections, chipGroups]);

  const visibleObjections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return objections.filter((o) => {
      const key = normalizeVargikaran(o.vargikaran);
      if (key === "UN") return false; // ✅ UN skip

      if (activeChip !== "All" && key !== activeChip) return false;
      if (!q) return true;

      const haystack = [
        o.objectionId,
        o.khasraNo,
        o.village,
        o.objectType,
        o.bhucode,
        o.code,
        o.remark,
        o.upvargikar,
        o.vargikaran,
        o.apattiGro,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [objections, activeChip, searchQuery]);

  const handleChipClick = useCallback(
    (key: string) => setActiveChip(key),
    [setActiveChip],
  );

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        className="absolute top-1/2 -translate-y-1/2 z-10
                   w-7 h-14 bg-white border border-slate-200
                   shadow-[0_2px_8px_rgba(0,0,0,0.08)]
                   flex items-center justify-center
                   hover:bg-slate-50 active:bg-slate-100
                   transition-[right] duration-300 ease-in-out"
        style={{
          right: isOpen ? SIDEBAR_WIDTH - 2 : 0,
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
          borderRight: "none",
          borderTopRightRadius: isOpen ? 0 : 8,
          borderBottomRightRadius: isOpen ? 0 : 8,
        }}
      >
        {isOpen ? (
          <ChevronRight sx={{ fontSize: 20, color: "#475569" }} />
        ) : (
          <ChevronLeft sx={{ fontSize: 20, color: "#475569" }} />
        )}
      </button>

      <aside
        className="relative h-full shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden"
        style={{ width: isOpen ? SIDEBAR_WIDTH : 0 }}
      >
        <div
          className="h-full bg-white flex flex-col"
          style={{
            width: SIDEBAR_WIDTH,
            borderLeft: "1px solid #e2e8f0",
            boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.06)",
          }}
        >
          {/* ═══ PART 1 — Vargikaran panel ═══ */}
          <VargikaranPanel
            activeChip={activeChip}
            onChipClick={handleChipClick}
            chipGroups={chipGroups}
            chipCounts={chipCounts}
          />

          {/* ═══ PART 2 — Objections list ═══ */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-slate-50/60">
            {visibleObjections.length === 0 ? (
              <EmptyState />
            ) : (
              visibleObjections.map((obj) => {
                const vargikaranKey = normalizeVargikaran(obj.vargikaran);
                const idx = chipGroups.findIndex(
                  (g) => g.vargikaran === vargikaranKey,
                );
                const cardTheme = idx >= 0 ? chipGroups[idx].theme : ALL_THEME;
                // const upvargikarLabel = String(obj.upvargikar ?? "").trim();

                return (
                  <div
                    key={obj.id}
                    onClick={() => {
                      onObjectionClick?.(obj);
                      onVillageHover?.(obj);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onObjectionClick?.(obj);
                        onVillageHover?.(obj);
                      }
                    }}
                    // onMouseEnter={() => onVillageHover?.(obj)}
                    // onMouseLeave={() => onVillageHover?.(null)}
                    className={`group relative bg-white rounded-xl border border-slate-200 cursor-pointer overflow-hidden transition-all duration-200 ${cardTheme.cardHoverBorder} ${cardTheme.cardHoverShadow} hover:-translate-y-[1px]`}
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${cardTheme.cardStrip}`}
                    />
                    <div className="pl-4 pr-4 py-3.5">
                      {/* Row 1: Vargikaran */}
                      <div className="mb-2.5 min-w-0">
                        <div className="flex items-start gap-2">
                          <span className="text-[14px] font-semibold text-black-500 flex-shrink-0">
                            Vargikaran:
                          </span>

                          <span
                            className={`min-w-0 break-words whitespace-normal text-[11px] px-1.5 py-0.5 rounded-md font-semibold border ${cardTheme.pillBg} ${cardTheme.pillText} ${cardTheme.pillBorder}`}
                          >
                            {vargikaranKey !== "UN" ? vargikaranKey : "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Village */}
                      <div className="flex items-start gap-1.5 text-[12px] text-slate-600 mb-2 min-w-0">
                        <LocationOn
                          sx={{
                            fontSize: 13,
                            color: "#94a3b8",
                            flexShrink: 0,
                            marginTop: "2px",
                          }}
                        />
                        <span className="font-medium flex-shrink-0">
                          Village:
                        </span>
                        <span className="min-w-0 whitespace-normal break-words">
                          {obj.village || "N/A"}
                        </span>
                      </div>

                      {/* Row 3: Khasara */}
                      <div className="flex items-start gap-1.5 text-[12px] text-slate-600 mb-2 min-w-0">
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M5 3.5L21 11.5V21H5V3.5Z"
                            // fill="#1d6aa3"
                            stroke="#94a3b8"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="font-medium flex-shrink-0">
                          Khasara:
                        </span>
                        <span className="min-w-0 whitespace-normal break-words">
                          {obj.khasraNo || "N/A"}
                        </span>
                      </div>

                      {/* Row 4: Apatti No */}
                      <div className="flex items-start gap-1.5 text-[12px] text-slate-600 mb-2 min-w-0">
                        <Assignment
                          sx={{
                            fontSize: 13,
                            color: "#94a3b8",
                            flexShrink: 0,
                            marginTop: "2px",
                          }}
                        />
                        <span className="font-medium flex-shrink-0">
                          Apatti No:
                        </span>
                        <span className="min-w-0 whitespace-normal break-words">
                          {obj.objectionId || "N/A"}
                        </span>
                      </div>

                      {/* Row 5: Apatti Group */}
                      <div className="flex items-start gap-1.5 text-[12px] text-slate-600 min-w-0">
                        <Groups
                          sx={{
                            fontSize: 13,
                            color: "#94a3b8",
                            flexShrink: 0,
                            marginTop: "2px",
                          }}
                        />
                        <span className="font-medium flex-shrink-0">
                          Apatti Group:
                        </span>
                        <span className="min-w-0 whitespace-normal break-words">
                          {obj.apattiGro || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
