import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Search,
  Close,
  LocationOn,
  CropSquare,
  ChevronRight,
  ChevronLeft,
  Apps as AppsIcon,
  AltRoute,
  Map as MapIcon,
  Home,
  Park,
} from '@mui/icons-material';
import { TextField, InputAdornment } from '@mui/material';
import type { MapMarker } from '../../types/index.type';

/* ============ CHIP THEME PALETTE ============ */
/* Since categories are now dynamic (group numbers), we cycle through
   a fixed palette to give each group its own visual identity. */
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
};

const THEME_PALETTE: ChipTheme[] = [
  {
    icon: <AltRoute sx={{ fontSize: 16 }} />,
    bg: 'bg-red-50',
    text: 'text-red-700',
    iconColor: 'text-red-600',
    activeBg: 'bg-red-600',
    cardStrip: 'bg-red-500',
    cardIconBg: 'bg-red-100 text-red-700',
    cardHoverBorder: 'hover:border-red-300',
    cardHoverShadow: 'hover:shadow-[0_4px_18px_rgba(239,68,68,0.15)]',
  },
  {
    icon: <Home sx={{ fontSize: 16 }} />,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    iconColor: 'text-amber-600',
    activeBg: 'bg-amber-600',
    cardStrip: 'bg-amber-500',
    cardIconBg: 'bg-amber-100 text-amber-700',
    cardHoverBorder: 'hover:border-amber-300',
    cardHoverShadow: 'hover:shadow-[0_4px_18px_rgba(245,158,11,0.15)]',
  },
  {
    icon: <MapIcon sx={{ fontSize: 16 }} />,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    iconColor: 'text-blue-600',
    activeBg: 'bg-blue-600',
    cardStrip: 'bg-blue-500',
    cardIconBg: 'bg-blue-100 text-blue-700',
    cardHoverBorder: 'hover:border-blue-300',
    cardHoverShadow: 'hover:shadow-[0_4px_18px_rgba(59,130,246,0.15)]',
  },
  {
    icon: <Park sx={{ fontSize: 16 }} />,
    bg: 'bg-green-50',
    text: 'text-green-700',
    iconColor: 'text-green-600',
    activeBg: 'bg-green-600',
    cardStrip: 'bg-green-500',
    cardIconBg: 'bg-green-100 text-green-700',
    cardHoverBorder: 'hover:border-green-300',
    cardHoverShadow: 'hover:shadow-[0_4px_18px_rgba(34,197,94,0.15)]',
  },
];

const ALL_THEME: ChipTheme = {
  icon: <AppsIcon sx={{ fontSize: 16 }} />,
  bg: 'bg-slate-100',
  text: 'text-slate-700',
  iconColor: 'text-slate-600',
  activeBg: 'bg-slate-800',
  cardStrip: 'bg-slate-400',
  cardIconBg: 'bg-slate-100 text-slate-700',
  cardHoverBorder: 'hover:border-slate-300',
  cardHoverShadow: 'hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)]',
};

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
}

/* ============ RESPONSIVE WIDTH HOOK ============ */
const useSidebarWidth = () => {
  const getWidth = useCallback(() => {
    if (typeof window === 'undefined') return 400;
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
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [getWidth]);

  return width;
};

const Sidebar: React.FC<SidebarProps> = ({
  objections,
  searchQuery,
  onSearchChange,
  onObjectionClick,
  onVillageHover,
  onVillageSelect,
  isOpen,
  onToggle,
  onClearAll,
  resetKey,
}) => {
  const [activeChip, setActiveChip] = useState<string>('All');
  const SIDEBAR_WIDTH = useSidebarWidth();

  /* ============ DERIVE CHIP GROUPS FROM DATA ============ */
  const chipGroups = useMemo(() => {
    const counts = new Map<string, number>();
    objections.forEach((o) => {
      const key = String(o.apattiGro ?? '').trim() || 'UN';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    // Sort numerically when possible, else alphabetically
    const sorted = [...counts.entries()].sort(([a], [b]) => {
      const na = Number(a);
      const nb = Number(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });

    return sorted.map(([group, count], idx) => ({
      group,
      count,
      theme: THEME_PALETTE[idx % THEME_PALETTE.length],
    }));
  }, [objections]);

  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = { All: objections.length };
    chipGroups.forEach(({ group, count }) => {
      counts[group] = count;
    });
    return counts;
  }, [objections, chipGroups]);

  const visibleObjections = useMemo(() => {
    if (activeChip === 'All') return objections;
    return objections.filter((o) => {
      const key = String(o.apattiGro ?? '').trim() || '—';
      return key === activeChip;
    });
  }, [objections, activeChip]);

  const handleChipClick = useCallback((key: string) => {
    setActiveChip(key);
  }, []);

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        className="absolute top-1/2 -translate-y-1/2 z-50
                   w-7 h-14 bg-white border border-slate-200
                   shadow-[0_2px_8px_rgba(0,0,0,0.08)]
                   flex items-center justify-center
                   hover:bg-slate-50 active:bg-slate-100
                   transition-[right] duration-300 ease-in-out"
        style={{
          right: isOpen ? SIDEBAR_WIDTH - 2 : 0,
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
          borderRight: 'none',
          borderTopRightRadius: isOpen ? 0 : 8,
          borderBottomRightRadius: isOpen ? 0 : 8,
        }}
      >
        {isOpen ? (
          <ChevronRight sx={{ fontSize: 20, color: '#475569' }} />
        ) : (
          <ChevronLeft sx={{ fontSize: 20, color: '#475569' }} />
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
            borderLeft: '1px solid #e2e8f0',
            boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.06)',
          }}
        >
          {/* ================= HEADER SECTION ================= */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-200 bg-white flex-shrink-0">
            <h2 className="text-[15px] font-bold text-slate-800 leading-tight tracking-tight mb-3">
              Public Objections & Suggestions
            </h2>

            {/* Category chips — dynamic group numbers */}
            <div className="flex flex-wrap gap-2 mb-3">
              {/* "All" chip */}
              <button
                type="button"
                onClick={() => handleChipClick('All')}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-150 border ${
                  activeChip === 'All'
                    ? `${ALL_THEME.activeBg} text-white border-transparent shadow-sm`
                    : `${ALL_THEME.bg} ${ALL_THEME.text} border-transparent hover:brightness-[0.97]`
                }`}
              >
                <span
                  className={
                    activeChip === 'All' ? 'text-white' : ALL_THEME.iconColor
                  }
                >
                  {ALL_THEME.icon}
                </span>
                <span>All</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                    activeChip === 'All'
                      ? 'bg-white/20 text-white'
                      : 'bg-white/70 text-slate-600'
                  }`}
                >
                  {chipCounts['All'] ?? 0}
                </span>
              </button>

              {/* Group chips — one per distinct apattiGro */}
              {chipGroups.map(({ group, theme }) => {
                const count = chipCounts[group] ?? 0;
                const isActive = activeChip === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => handleChipClick(group)}
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-150 border ${
                      isActive
                        ? `${theme.activeBg} text-white border-transparent shadow-sm`
                        : `${theme.bg} ${theme.text} border-transparent hover:brightness-[0.97]`
                    }`}
                    title={`Group ${group}`}
                  >
                    <span
                      className={isActive ? 'text-white' : theme.iconColor}
                    >
                      {theme.icon}
                    </span>
                    <span>Group {group}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white/70 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search + Clear */}
            {/* <div className="flex items-center gap-2">
              <TextField
                fullWidth
                size="small"
                placeholder="Search objections..."
                variant="outlined"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 36,
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    fontSize: 13,
                    '& fieldset': { borderColor: '#e2e8f0' },
                    '&:hover fieldset': { borderColor: '#cbd5e1' },
                    '&.Mui-focused fieldset': {
                      borderColor: '#3b82f6',
                      borderWidth: '1.5px',
                    },
                  },
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: 18, color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <button
                type="button"
                onClick={onClearAll}
                className="shrink-0 h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1"
                title="Clear search and filters"
              >
                <Close sx={{ fontSize: 16 }} /> Clear
              </button>
            </div> */}
          </div>

          {/* ================= LIST SECTION ================= */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-slate-50/60">
            {visibleObjections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Search sx={{ fontSize: 24, color: '#94a3b8' }} />
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
                const groupKey =
                  String(obj.apattiGro ?? '').trim() || '—';
                const idx = chipGroups.findIndex(
                  (g) => g.group === groupKey
                );
                const cardTheme =
                  idx >= 0
                    ? chipGroups[idx].theme
                    : ALL_THEME;

                return (
                  <div
                    key={obj.id}
                    onClick={() => onObjectionClick?.(obj)}
                    onMouseEnter={() => onVillageHover?.(obj)}
                    onMouseLeave={() => onVillageHover?.(null)}
                    className={`group relative bg-white rounded-xl border border-slate-200 cursor-pointer overflow-hidden transition-all duration-200 ${cardTheme.cardHoverBorder} ${cardTheme.cardHoverShadow} hover:-translate-y-[1px]`}
                  >
                    {/* Left accent strip */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${cardTheme.cardStrip}`}
                    />

                    <div className="pl-4 pr-4 py-3.5">
                      {/* Village link button */}
                      <button
                        type="button"
                        className="font-semibold text-sky-700 underline decoration-dotted underline-offset-2 hover:text-sky-900 mb-1"
                        title={`Show ${obj.village} on map`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onVillageSelect?.(obj);
                        }}
                      >
                        {obj.village}
                      </button>

                      {/* Top row: Icon + Objection ID + Group + Chevron */}
                      <div className="flex items-center justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${cardTheme.cardIconBg}`}
                          >
                            {React.cloneElement(
                              cardTheme.icon as React.ReactElement<{
                                sx?: { fontSize: number };
                              }>,
                              { sx: { fontSize: 13 } }
                            )}
                          </div>
                          <span className="text-[13px] font-semibold text-slate-700 tracking-wide truncate">
                            {obj.objectionId}
                          </span>
                          {obj.apattiGro && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold whitespace-nowrap">
                              G{obj.apattiGro}
                            </span>
                          )}
                        </div>

                        <ChevronRight
                          sx={{ fontSize: 15 }}
                          className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                        />
                      </div>

                      {/* ROW 2: Location */}
                      <div className="flex items-start gap-1.5 text-[12px] text-slate-600 mb-1.5">
                        <LocationOn
                          sx={{
                            fontSize: 13,
                            color: '#94a3b8',
                            flexShrink: 0,
                            marginTop: '1px',
                          }}
                        />
                        <span className="truncate leading-tight">
                          Khasra {obj.khasraNo}, {obj.village}
                        </span>
                      </div>

                      {/* ROW 3: Object type + Area */}
                      <div className="flex items-center gap-3 text-[11.5px] text-slate-500">
                        {obj.objectType && (
                          <span className="truncate max-w-[140px]">
                            {obj.objectType}
                          </span>
                        )}
                        {obj.area !== undefined && obj.area > 0 && (
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <CropSquare
                              sx={{ fontSize: 11, color: '#94a3b8' }}
                            />
                            <span>{obj.area.toFixed(2)} sq.m</span>
                          </span>
                        )}
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