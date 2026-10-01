import React, { useMemo, useState } from 'react';
import {
  Search,
  FilterList,
  LocationOn,
  CalendarToday,
  ChevronRight,
  ChevronLeft,
  Warning,
  Home,
  GridView,
  Park,
  Apps as AppsIcon,
} from '@mui/icons-material';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import type { MapMarker, ObjectionCategory } from '../../types/index.type';

const categoryColors: Record<ObjectionCategory, string> = {
  Residential: 'bg-red-500',
  Commercial: 'bg-amber-500',
  Infrastructure: 'bg-blue-500',
  Environment: 'bg-green-500',
  'Traffic & Mobility': 'bg-purple-500',
  Others: 'bg-gray-500',
};

const chipThemes: Record<
  string,
  { icon: React.ReactNode; bg: string; text: string; iconColor: string }
> = {
  All: {
    icon: <AppsIcon sx={{ fontSize: 14 }} />,
    bg: 'bg-blue-600',
    text: 'text-white',
    iconColor: 'text-white',
  },
  Road: {
    icon: <Warning sx={{ fontSize: 14 }} />,
    bg: 'bg-red-50',
    text: 'text-red-700',
    iconColor: 'text-red-600',
  },
  Residential: {
    icon: <Home sx={{ fontSize: 14 }} />,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    iconColor: 'text-amber-600',
  },
  Landuse: {
    icon: <GridView sx={{ fontSize: 14 }} />,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    iconColor: 'text-blue-600',
  },
  'Green Zone': {
    icon: <Park sx={{ fontSize: 14 }} />,
    bg: 'bg-green-50',
    text: 'text-green-700',
    iconColor: 'text-green-600',
  },
};

const statusColors: Record<string, string> = {
  Open: 'bg-red-100 text-red-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Resolved: 'bg-green-100 text-green-700',
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
    Road: ['Infrastructure', 'Traffic & Mobility'],
    Residential: ['Residential', 'Commercial'],
    Landuse: ['Commercial', 'Others'],
    'Green Zone': ['Environment'],
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

  // Sidebar width used for the transform translate value
  const SIDEBAR_WIDTH = 450;

  return (
    <>
      {/* ✅ Toggle button — absolutely positioned against the outer relative container in App.tsx */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        className="absolute top-[155px]-translate-y-[450px] z-50
                 w-7 h-12 bg-green-400 border border-gray-200
                 rounded-lg shadow-md
                 flex items-center justify-center
                 hover:bg-green-400 active:bg-gray-100
                 transition-[right] duration-300 ease-in-out"
        style={{ right: isOpen ? SIDEBAR_WIDTH - 2 : 0 }}
      >
        {isOpen ? (
          <ChevronRight className="text-gray-600" />
        ) : (
          <ChevronLeft className="text-gray-600" />
        )}
      </button>

      <aside
        className="relative h-full shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden"
        style={{ width: isOpen ? SIDEBAR_WIDTH : 0 }}
      >
        {/* Inner wrapper with fixed width — prevents content from squashing during transition */}
        <div
          className="h-full bg-white border-l border-gray-200 flex flex-col shadow-lg"
          style={{ width: SIDEBAR_WIDTH }}
        >


          {/* Sidebar content — same as before, just with padding for the toggle */}
          <div className="h-full bg-white border-l border-gray-200 flex flex-col shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">
                  Public Objections & Suggestions
                </h2>
              </div>

              {/* Category Chips — custom buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(chipThemes).map(([key, theme]) => {
                  const count = chipCounts[key] ?? 0;
                  const isActive = activeChip === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveChip(key)}
                      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium cursor-pointer transition-colors border ${isActive
                        ? 'bg-blue-600 text-white border-blue-600'
                        : `${theme.bg} ${theme.text} border-transparent hover:brightness-95`
                        }`}
                    >
                      <span className={isActive ? 'text-white' : theme.iconColor}>
                        {theme.icon}
                      </span>
                      <span>{key}</span>
                      <span className={isActive ? 'text-white/80' : 'opacity-70'}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search & Filter */}
              <div className="flex gap-2">
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search objections..."
                  variant="outlined"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <IconButton className="border border-gray-300 rounded-md">
                  <FilterList />
                </IconButton>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {visibleObjections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="text-4xl mb-3">🔍</span>
                  <p className="text-sm font-medium text-gray-600">
                    No objections found
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try adjusting your filters or search query
                  </p>
                </div>
              ) : (
                visibleObjections.map((obj) => (
                  <div
                    key={obj.id}
                    onClick={() => onObjectionClick?.(obj)}
                    className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${categoryColors[obj.category]}`}
                    />
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${categoryColors[obj.category]}`}
                        />
                        <span className="font-bold text-sm text-gray-800">
                          {obj.objectionId}
                        </span>
                      </div>
                      <ChevronRight className="text-gray-400" />
                    </div>

                    <h3 className="text-sm font-semibold text-gray-700 pl-2 mb-3">
                      {obj.title}
                    </h3>

                    <div className="pl-2 space-y-2 text-xs text-gray-500">
                      <div className="flex items-start gap-2">
                        <LocationOn fontSize="small" className="mt-[-2px]" />
                        <span>
                          Khasra {obj.khasraNo}, {obj.village} ({obj.tehsil})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarToday fontSize="small" />
                        <span>{obj.date}</span>
                      </div>
                    </div>

                    {'status' in obj && (
                      <div className="mt-3 pl-2 flex justify-end">
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[(obj as any).status] ??
                            'bg-gray-100 text-gray-700'
                            }`}
                        >
                          {(obj as any).status}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;