import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Search,
  Close,
  LocationOn,
  CalendarToday,
  ChevronRight,
  ChevronLeft,
  AltRoute,
  Map as MapIcon,
  Home,
  Park,
  Apps as AppsIcon,
} from '@mui/icons-material';
import { TextField, InputAdornment } from '@mui/material';
import type { MapMarker, ObjectionCategory } from '../../types/index.type';

/* ============ CATEGORY → CHIP mapping ============ */
const categoryToChip: Record<ObjectionCategory, string> = {
  Road: 'Road',
  Residential: 'Residential',
  Landuse: 'Landuse',
  'Green Zone': 'Green Zone',
};

/* ============ Chip themes ============ */
const chipThemes: Record<
  string,
  {
    icon: React.ReactNode;
    bg: string;
    text: string;
    iconColor: string;
    activeBg: string;
    cardStrip: string;
    cardIconBg: string;
    cardHoverBorder: string;
    cardHoverShadow: string;
  }
> = {
  All: {
    icon: <AppsIcon sx={{ fontSize: 16 }} />,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    iconColor: 'text-slate-600',
    activeBg: 'bg-slate-800',
    cardStrip: 'bg-slate-400',
    cardIconBg: 'bg-slate-100 text-slate-700',
    cardHoverBorder: 'hover:border-slate-300',
    cardHoverShadow: 'hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)]',
  },
  Road: {
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
  Residential: {
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
  Landuse: {
    icon: <MapIcon sx={{ fontSize: 16 }} />,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    iconColor: 'text-blue-600',
    activeBg: 'bg-blue-600',
    cardStrip: 'bg-blue-500',
    cardIconBg: 'bg-blue-100 text-blue-700',
    cardHoverBorder: 'hover:border-blue-300',
    cardHoverShadow: 'hover:shadow-[0_4px_18px_rgba(20,184,166,0.15)]',
  },
  'Green Zone': {
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
};

const statusColors: Record<string, string> = {
  Open: 'bg-red-50 text-red-700 border-red-200',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  Resolved: 'bg-green-50 text-green-700 border-green-200',
};

const chipToCategories: Record<string, ObjectionCategory[]> = {
  All: [],
  Road: ['Road'],
  Residential: ['Residential'],
  Landuse: ['Landuse'],
  'Green Zone': ['Green Zone'],
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

  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = { All: objections.length };
    Object.keys(chipToCategories).forEach((key) => {
      if (key === 'All') return;
      const cats = chipToCategories[key];
      counts[key] = objections.filter((o) => cats.includes(o.category)).length;
    });
    return counts;
  }, [objections]);

  const visibleObjections = useMemo(() => {
    if (activeChip === 'All') return objections;
    const cats = chipToCategories[activeChip] ?? [];
    return objections.filter((o) => cats.includes(o.category));
  }, [objections, activeChip]);

  const handleChipClick = useCallback((key: string) => {
    setActiveChip(key);
  }, []);

  const handleObjectionClick = useCallback(
    (obj: MapMarker) => {
      onObjectionClick?.(obj);
    },
    [onObjectionClick]
  );

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
            {/* Title — original font size */}
            <h2 className="text-[15px] font-bold text-slate-800 leading-tight tracking-tight mb-3">
              Public Objections & Suggestions
            </h2>

            {/* Category chips — original sizes, optimized gap */}
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(chipThemes).map(([key, theme]) => {
                const count = chipCounts[key] ?? 0;
                const isActive = activeChip === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleChipClick(key)}
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-150 border ${
                      isActive
                        ? `${theme.activeBg} text-white border-transparent shadow-sm`
                        : `${theme.bg} ${theme.text} border-transparent hover:brightness-[0.97]`
                    }`}
                  >
                    <span className={isActive ? 'text-white' : theme.iconColor}>
                      {theme.icon}
                    </span>
                    <span>{key}</span>
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

            {/* ✅ Search bar — full width of panel (only padding gap) */}
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
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                title="Clear search and filters"
              >
                <Close sx={{ fontSize: 16, verticalAlign: 'middle' }} /> Clear
              </button>
            </div>
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
                const chipKey = categoryToChip[obj.category] ?? 'All';
                const cardTheme = chipThemes[chipKey];
                const status = (obj as MapMarker & { status?: string }).status;
                const statusClass =
                  statusColors[status] ??
                  'bg-gray-50 text-gray-700 border-gray-200';

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
                         <button
                              type="button"
                              className="font-semibold text-sky-700 underline decoration-dotted underline-offset-2 hover:text-sky-900"
                              title={`Show ${obj.village} on map`}
                           
                              onClick={(event) => {
                                event.stopPropagation();
                                onVillageSelect?.(obj);
                              }}
                            >
                              {obj.village}
                            </button>
                      {/* Top row: Icon badge + ID + category + status/chevron */}
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
                        </div>

                        {status ? (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${statusClass} whitespace-nowrap flex-shrink-0`}
                          >
                            {status}
                          </span>
                        ) : (
                          <ChevronRight
                            sx={{ fontSize: 15 }}
                            className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                          />
                        )}
                      </div>

                      {/* ============ ROW 2: Location ============ */}
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

                      {/* ============ ROW 3: Date ============ */}
                      <div className="flex items-center gap-2 text-[11.5px] text-slate-500">
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <CalendarToday
                            sx={{ fontSize: 11, color: '#94a3b8' }}
                          />
                          <span>{obj.date}</span>
                        </div>
                        {/* <span className="text-slate-300">·</span>
                        <span className="truncate text-slate-400">
                        
                          {obj.category}
                        </span> */}
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
