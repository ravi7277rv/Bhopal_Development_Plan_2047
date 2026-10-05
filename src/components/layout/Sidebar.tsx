import React, { useMemo, useState } from 'react';
import {
  Search,
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

/* ============ Chip themes with card-specific styles ============ */
const chipThemes: Record<
  string,
  {
    icon: React.ReactNode;
    bg: string;
    text: string;
    iconColor: string;
    activeBg: string;
    /* card styles */
    cardStrip: string;       // left strip color
    cardIconBg: string;      // icon badge bg + text
    cardHoverBorder: string; // hover border color
    cardHoverShadow: string; // hover shadow color
  }
> = {
  All: {
    icon: <AppsIcon sx={{ fontSize: 15 }} />,
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
    icon: <AltRoute sx={{ fontSize: 15 }} />,
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
    icon: <Home sx={{ fontSize: 15 }} />,
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
    icon: <MapIcon sx={{ fontSize: 15 }} />,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    iconColor: 'text-blue-600',
    activeBg: 'bg-blue-600',
    cardStrip: 'bg-blue-500',
    cardIconBg: 'bg-blue-100 text-blue-700',
    cardHoverBorder: 'hover:border-blue-300',
    cardHoverShadow: 'hover:shadow-[0_4px_18px_rgba(59,130,246,0.15)]',
  },
  'Green Zone': {
    icon: <Park sx={{ fontSize: 15 }} />,
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

interface SidebarProps {
  objections: MapMarker[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onObjectionClick?: (objection: MapMarker) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  objections,
  searchQuery,
  onSearchChange,
  onObjectionClick,
  isOpen,
  onToggle,
}) => {
  const [activeChip, setActiveChip] = useState<string>('All');

  const chipToCategories: Record<string, ObjectionCategory[]> = {
    All: [],
    Road: ['Road'],
    Residential: ['Residential'],
    Landuse: ['Landuse'],
    'Green Zone': ['Green Zone'],
  };

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

  const SIDEBAR_WIDTH = 450;

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
          <div className="px-5 pt-5 pb-4 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[17px] font-bold text-slate-800 leading-tight tracking-tight">
                  Public Objections & Suggestions
                </h2>
                
              </div>
            </div>

            {/* Category chips */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {Object.entries(chipThemes).map(([key, theme]) => {
                const count = chipCounts[key] ?? 0;
                const isActive = activeChip === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveChip(key)}
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold cursor-pointer transition-all duration-150 border ${
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
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white/70 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="flex gap-2">
              <TextField
                fullWidth
                size="small"
                placeholder="Search by ID, title, location..."
                variant="outlined"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 40,
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
                  '& input::placeholder': {
                    fontSize: 13,
                    color: '#94a3b8',
                    opacity: 1,
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
            </div>
          </div>

          {/* ================= LIST SECTION ================= */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/60">
            {visibleObjections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Search sx={{ fontSize: 28, color: '#94a3b8' }} />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  No objections found
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                  Try adjusting your filters or search query
                </p>
              </div>
            ) : (
              visibleObjections.map((obj) => {
                const chipKey = categoryToChip[obj.category] ?? 'All';
                const cardTheme = chipThemes[chipKey];
                const status = (obj as any).status;
                const statusClass =
                  statusColors[status] ?? 'bg-gray-50 text-gray-700 border-gray-200';

                return (
                  <div
                    key={obj.id}
                    onClick={() => onObjectionClick?.(obj)}
                    className={`group relative bg-white rounded-xl border border-slate-200 cursor-pointer overflow-hidden transition-all duration-200 ${cardTheme.cardHoverBorder} ${cardTheme.cardHoverShadow} hover:-translate-y-[1px]`}
                  >
                    {/* ✅ Left accent strip — category color */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${cardTheme.cardStrip}`}
                    />

                    <div className="pl-4 pr-4 py-3.5">
                      {/* Top row: Icon badge + ID + category + status/chevron */}
                      <div className="flex items-center justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* ✅ Icon badge — replaces the dot */}
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${cardTheme.cardIconBg}`}
                          >
                            {React.cloneElement(
                              cardTheme.icon as React.ReactElement,
                              { sx: { fontSize: 14 } }
                            )}
                          </div>

                          <span className="text-[12.5px] font-semibold text-slate-700 tracking-wide truncate">
                            {obj.objectionId}
                          </span>
                          <span className="text-[10.5px] text-slate-400 font-medium truncate">
                            · {obj.category}
                          </span>
                        </div>

                        {status ? (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusClass} whitespace-nowrap flex-shrink-0`}
                          >
                            {status}
                          </span>
                        ) : (
                          <ChevronRight
                            sx={{ fontSize: 16 }}
                            className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                          />
                        )}
                      </div>

                      {/* Title */}
                      {/* <h3 className="text-[13.5px] font-semibold text-slate-800 leading-snug mb-3 line-clamp-2">
                        {obj.title}
                      </h3> */}

                      {/* Meta — inline */}
                      <div className="flex items-center gap-2.5 text-[11.5px] text-slate-500 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <LocationOn sx={{ fontSize: 13, color: '#94a3b8' }} />
                          <span className="truncate">
                            Khasra {obj.khasraNo}, {obj.village}
                          </span>
                        </div>
                        <span className="text-slate-300">·</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <CalendarToday sx={{ fontSize: 12, color: '#94a3b8' }} />
                          <span>{obj.date}</span>
                        </div>
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