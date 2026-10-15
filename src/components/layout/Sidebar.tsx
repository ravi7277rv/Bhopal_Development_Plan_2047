import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Search,
  LocationOn,
  CropSquare,
  ChevronRight,
  ChevronLeft,
  Apps as AppsIcon,
  AltRoute,
  Map as MapIcon,
  Home,
  Park,
  Gavel,
  StickyNote2Outlined,
  Category as CategoryIcon,
} from "@mui/icons-material";
import type { MapMarker } from "../../types/index.type";

/* ============ CHIP THEME PALETTE ============ */
type ChipTheme = {
  icon: React.ReactNode;
  bg: string;
  text: string;
  iconColor: string;
  activeBg: string;
  cardStrip: string;
  cardIconBg: string;
  cardHoverBorder: string;
  cardHoverShadow: string;
  pillBg: string;
  pillText: string;
  pillBorder: string;
};

const THEME_PALETTE: ChipTheme[] = [
  {
    icon: <AltRoute sx={{ fontSize: 16 }} />,
    bg: "bg-red-50",
    text: "text-red-700",
    iconColor: "text-red-600",
    activeBg: "bg-red-600",
    cardStrip: "bg-red-500",
    cardIconBg: "bg-red-100 text-red-700",
    cardHoverBorder: "hover:border-red-300",
    cardHoverShadow: "hover:shadow-[0_4px_18px_rgba(239,68,68,0.15)]",
    pillBg: "bg-red-50",
    pillText: "text-red-700",
    pillBorder: "border-red-200",
  },
  {
    icon: <Home sx={{ fontSize: 16 }} />,
    bg: "bg-amber-50",
    text: "text-amber-700",
    iconColor: "text-amber-600",
    activeBg: "bg-amber-600",
    cardStrip: "bg-amber-500",
    cardIconBg: "bg-amber-100 text-amber-700",
    cardHoverBorder: "hover:border-amber-300",
    cardHoverShadow: "hover:shadow-[0_4px_18px_rgba(245,158,11,0.15)]",
    pillBg: "bg-amber-50",
    pillText: "text-amber-700",
    pillBorder: "border-amber-200",
  },
  {
    icon: <MapIcon sx={{ fontSize: 16 }} />,
    bg: "bg-blue-50",
    text: "text-blue-700",
    iconColor: "text-blue-600",
    activeBg: "bg-blue-600",
    cardStrip: "bg-blue-500",
    cardIconBg: "bg-blue-100 text-blue-700",
    cardHoverBorder: "hover:border-blue-300",
    cardHoverShadow: "hover:shadow-[0_4px_18px_rgba(59,130,246,0.15)]",
    pillBg: "bg-blue-50",
    pillText: "text-blue-700",
    pillBorder: "border-blue-200",
  },
  {
    icon: <Park sx={{ fontSize: 16 }} />,
    bg: "bg-green-50",
    text: "text-green-700",
    iconColor: "text-green-600",
    activeBg: "bg-green-600",
    cardStrip: "bg-green-500",
    cardIconBg: "bg-green-100 text-green-700",
    cardHoverBorder: "hover:border-green-300",
    cardHoverShadow: "hover:shadow-[0_4px_18px_rgba(34,197,94,0.15)]",
    pillBg: "bg-green-50",
    pillText: "text-green-700",
    pillBorder: "border-green-200",
  },
];

const ALL_THEME: ChipTheme = {
  icon: <AppsIcon sx={{ fontSize: 16 }} />,
  bg: "bg-slate-100",
  text: "text-slate-700",
  iconColor: "text-slate-600",
  activeBg: "bg-slate-800",
  cardStrip: "bg-slate-400",
  cardIconBg: "bg-slate-100 text-slate-700",
  cardHoverBorder: "hover:border-slate-300",
  cardHoverShadow: "hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)]",
  pillBg: "bg-slate-100",
  pillText: "text-slate-700",
  pillBorder: "border-slate-200",
};

/* ============ VARGIKARAN NORMALIZER ============ */
const normalizeVargikaran = (value: unknown): string => {
  const v = String(value ?? "").trim();
  if (!v || v === "null" || v === "NULL" || v === "undefined" || v === "—") {
    return "UN";
  }
  return v;
};

/* ============ DESCRIPTION FOR ACTIVE VARGIKARAN ============ */
// const buildFallbackDescription = (
//   vargikaran: string,
//   items: MapMarker[]
// ): React.ReactNode => {
//   if (vargikaran === 'All') {
//     return 'All public objections and suggestions across villages.';
//   }
//   if (vargikaran === 'UN') {
//     return 'Objections with no classification. Awaiting categorization.';
//   }

//   // Count distinct upvargikar values within this vargikaran
//   const upvargikarCounts = new Map<string, number>();
//   items.forEach((o) => {
//     const u = String(o.upvargikar ?? '').trim();
//     const key = u || 'Unspecified';
//     upvargikarCounts.set(key, (upvargikarCounts.get(key) ?? 0) + 1);
//   });

//   const entries = [...upvargikarCounts.entries()].sort(
//     (a, b) => b[1] - a[1]
//   );

//   if (entries.length === 0) {
//     return `Objections classified under ${vargikaran}.`;
//   }

//   return (
//     // <span>
//     //   <span className="text-slate-500">Sub-classifications (Upvargikar): </span>
//     //   {entries.map(([sub, count], idx) => {
//     //     const theme = getCategoryTheme(sub);
//     //     return (
//     //       <React.Fragment key={sub}>
//     //         <span
//     //           className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold border ${theme.pillBg} ${theme.pillText} ${theme.pillBorder} mx-0.5`}
//     //         >
//     //           {sub}
//     //           <span className="opacity-70">·</span>
//     //           <span className="font-bold">{count}</span>
//     //         </span>
//     //         {idx < entries.length - 1 && <span> and </span>}
//     //       </React.Fragment>
//     //     );
//     //   })}
//     // </span>
//   );
// };

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

  /* ============ CHIPS BY VARGIKARAN ============ */
  const chipGroups = useMemo(() => {
    const counts = new Map<string, number>();
    objections.forEach((o) => {
      const key = normalizeVargikaran(o.vargikaran);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const sorted = [...counts.entries()].sort(([a], [b]) => {
      if (a === "UN") return 1;
      if (b === "UN") return -1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

    return sorted.map(([vargikaran, count], idx) => ({
      vargikaran,
      count,
      theme: THEME_PALETTE[idx % THEME_PALETTE.length],
    }));
  }, [objections]);

  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = { All: objections.length };
    chipGroups.forEach(({ vargikaran, count }) => {
      counts[vargikaran] = count;
    });
    return counts;
  }, [objections, chipGroups]);

  const visibleObjections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return objections.filter((o) => {
      const key = String(o.vargikaran ?? '').trim() || '—';
      if (activeChip !== 'All' && key !== activeChip) return false;
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
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [objections, activeChip, searchQuery]);

  // const activeDescription = useMemo(
  //   () => buildFallbackDescription(activeChip, visibleObjections),
  //   [activeChip, visibleObjections]
  // );

  const handleChipClick = useCallback(
    (key: string) => {
      setActiveChip(key);
    },
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
          {/* ================= HEADER ================= */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-200 bg-white flex-shrink-0">
            <h2 className="text-[20px] font-bold text-slate-800 leading-tight tracking-tight mb-4">
              Public Objections & Suggestions
            </h2>
            <h4 className="text-[15px] font-bold text-slate-800 leading-tight tracking-tight mb-3">
              वर्गीकरण (Vargikaran)
            </h4>

            {/* Chips — vargikaran */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleChipClick("All")}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-150 border ${
                  activeChip === "All"
                    ? `${ALL_THEME.activeBg} text-white border-transparent shadow-sm`
                    : `${ALL_THEME.bg} ${ALL_THEME.text} border-transparent hover:brightness-[0.97]`
                }`}
              >
                <span
                  className={
                    activeChip === "All" ? "text-white" : ALL_THEME.iconColor
                  }
                >
                  {ALL_THEME.icon}
                </span>
                <span>All</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                    activeChip === "All"
                      ? "bg-white/20 text-white"
                      : "bg-white/70 text-slate-600"
                  }`}
                >
                  {chipCounts["All"] ?? 0}
                </span>
              </button>

              {chipGroups.map(({ vargikaran, theme }) => {
                const count = chipCounts[vargikaran] ?? 0;
                const isActive = activeChip === vargikaran;
                const label = vargikaran === "UN" ? "Unclassified" : vargikaran;
                return (
                  <button
                    key={vargikaran}
                    type="button"
                    onClick={() => handleChipClick(vargikaran)}
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-150 border ${
                      isActive
                        ? `${theme.activeBg} text-white border-transparent shadow-sm`
                        : `${theme.bg} ${theme.text} border-transparent hover:brightness-[0.97]`
                    }`}
                    title={label}
                  >
                    <span className={isActive ? "text-white" : theme.iconColor}>
                      {theme.icon}
                    </span>
                    <span>{label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
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

            {/* Active vargikaran description — lists upvargikar values */}
            {/* <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <InfoOutlined
                sx={{ fontSize: 15, color: '#64748b', marginTop: '1px' }}
              />
              <div className="text-[11.5px] text-slate-600 leading-snug">
                {activeDescription}
              </div>
            </div> */}
          </div>

          {/* ================= LIST ================= */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-slate-50/60">
            {visibleObjections.length === 0 ? (
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
            ) : (
              visibleObjections.map((obj) => {
                const vargikaranKey = normalizeVargikaran(obj.vargikaran);
                const idx = chipGroups.findIndex(
                  (g) => g.vargikaran === vargikaranKey,
                );
                const cardTheme = idx >= 0 ? chipGroups[idx].theme : ALL_THEME;
                const upvargikarLabel = String(obj.upvargikar ?? "").trim();

                return (
                  <div
                    key={obj.id}
                    onClick={() => {
                      onObjectionClick?.(obj);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onObjectionClick?.(obj);
                      }
                    }}
                    onMouseEnter={() => onVillageHover?.(obj)}
                    onMouseLeave={() => onVillageHover?.(null)}
                    className={`group relative bg-white rounded-xl border border-slate-200 cursor-pointer overflow-hidden transition-all duration-200 ${cardTheme.cardHoverBorder} ${cardTheme.cardHoverShadow} hover:-translate-y-[1px]`}
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${cardTheme.cardStrip}`}
                    />

                    <div className="pl-4 pr-4 py-3.5">
                      {/* Village */}
                      <button
                        type="button"
                        className="font-semibold text-sky-700 underline decoration-dotted underline-offset-2 hover:text-sky-900 mb-1"
                        title={`Show ${obj.village} on map`}
                        // onClick={(event) => {
                        //   event.stopPropagation();
                        //   onVillageSelect?.(obj);
                        // }}
                      >
                        {obj.village}
                      </button>

                      {/* Row 1: icon + objection ID + vargikaran pill */}
                      <div className="flex items-center gap-2 mb-2.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${cardTheme.cardIconBg}`}
                        >
                          {React.cloneElement(
                            cardTheme.icon as React.ReactElement<{
                              sx?: { fontSize: number };
                            }>,
                            { sx: { fontSize: 13 } },
                          )}
                        </div>
                        <span
                          className="text-[13px] font-semibold text-slate-700 tracking-wide truncate"
                          title={obj.objectionId}
                        >
                          {obj.objectionId}
                        </span>
                        {vargikaranKey !== "UN" && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold whitespace-nowrap border ${cardTheme.pillBg} ${cardTheme.pillText} ${cardTheme.pillBorder}`}
                            title={`Vargikaran: ${vargikaranKey}`}
                          >
                            {vargikaranKey}
                          </span>
                        )}
                      </div>

                      {/* Row 2: location */}
                      <div className="flex items-start gap-1.5 text-[12px] text-slate-600 mb-1.5">
                        <LocationOn
                          sx={{
                            fontSize: 13,
                            color: "#94a3b8",
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        />
                        <span className="truncate leading-tight">
                          Khasra {obj.khasraNo}, {obj.village}
                        </span>
                      </div>

                      {/* Row 3: upvargikar + area + gov land badge */}
                      <div className="flex items-center gap-2 text-[11.5px] text-slate-500 flex-wrap">
                        {upvargikarLabel && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                            <CategoryIcon sx={{ fontSize: 11 }} />
                            {upvargikarLabel}
                          </span>
                        )}
                        {obj.area !== undefined && obj.area > 0 && (
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <CropSquare
                              sx={{ fontSize: 11, color: "#94a3b8" }}
                            />
                            <span>{obj.area.toFixed(2)} sq.m</span>
                          </span>
                        )}
                        {obj.govKh && (
                          <span className="flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                            <Gavel sx={{ fontSize: 11 }} />
                            {obj.govKh}
                          </span>
                        )}
                      </div>

                      {/* Row 4: remark */}
                      {obj.remark && (
                        <div className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug">
                          <StickyNote2Outlined
                            sx={{
                              fontSize: 13,
                              color: "#94a3b8",
                              marginTop: "1px",
                              flexShrink: 0,
                            }}
                          />
                          <div className="min-w-0">
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                              Remark
                            </span>
                            <span className="text-slate-600 italic line-clamp-2">
                              {obj.remark}
                            </span>
                          </div>
                        </div>
                      )}
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
