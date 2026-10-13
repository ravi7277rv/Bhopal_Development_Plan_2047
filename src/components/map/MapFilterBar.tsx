import React from "react";
import {
  HolidayVillage,
  CropSquare,
  KeyboardArrowDown,
} from "@mui/icons-material";
import { Select, MenuItem } from "@mui/material";
import { KhasraInput } from "../forms/KhasraInput";

interface MapFilterBarProps {
  villages: string[];
  khasraNumbers: string[];
  selectedVillage: string;
  selectedKhasra: string;
  onVillageChange: (v: string) => void;
  onKhasraChange: (v: string) => void;
  /** "onMap" = horizontal cards; "stacked" = vertical layout for drawers */
  variant?: "onMap" | "stacked";
}

const MapFilterBar: React.FC<MapFilterBarProps> = ({
  villages,
  khasraNumbers,
  selectedVillage,
  selectedKhasra,
  onVillageChange,
  onKhasraChange,
  variant = "onMap",
}) => {
  const stacked = variant === "stacked";

  /* ---------- Shared MUI styles ---------- */
  const filterSelectSx = {
    width: "100%",
    height: 34,
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    fontWeight: 500,
    fontSize: "12.5px",
    fontFamily: '"Segoe UI", Arial, Helvetica, sans-serif !important',
    transition: "border-color 0.15s ease",
    "& .MuiOutlinedInput-notchedOutline": {
      border: "1px solid #e2e8f0",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      border: "1px solid #cbd5e1",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      border: "1.5px solid #fbbf24",
    },
    "& .MuiSelect-select": {
      padding: "0 10px",
      fontSize: "12px",
      fontWeight: 500,
      fontFamily: '"Segoe UI", Arial, Helvetica, sans-serif !important',
      color: "#0f172a",
      display: "flex",
      alignItems: "center",
      height: 34,
      boxSizing: "border-box",
    },
    "& .MuiSelect-icon": { color: "#64748b", fontSize: 16, right: 6 },
  };

  const menuItemSx = {
    fontSize: "12px",
    py: 0.55,
    px: 1.55,
    minHeight: "auto",
    fontWeight: 500,
    color: "#334155",
    fontFamily: '"Segoe UI", Arial, Helvetica, sans-serif !important',
    "&:hover": { backgroundColor: "#f1f5f9" },
    "&.Mui-selected": {
      backgroundColor: "#eff6ff",
      color: "#1e40af",
      fontWeight: 600,
      "&:hover": { backgroundColor: "#dbeafe" },
    },
  };

  const dropdownPaperSx = {
    mt: 1,
    borderRadius: "8px",
    boxShadow: "0 10px 28px rgba(0,0,0,0.14)",
    border: "1px solid #e2e8f0",
    maxHeight: 240,
    overflow: "auto",
    "&::-webkit-scrollbar": { width: 6 },
    "&::-webkit-scrollbar-track": { background: "transparent" },
    "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: 3 },
  };

  /* ---------- Cards ---------- */
  const cardBase =
    "flex flex-col bg-white/95 backdrop-blur-md rounded-lg " +
    "border border-slate-200 shadow-[0_4px_14px_rgba(15,23,42,0.08)] " +
    "px-2.5 py-1.5";

  // Fixed width for BOTH cards → symmetric
  const cardWidthClass = stacked
    ? "w-full"
    : "w-[190px] shrink-0";

  const wrapperClass = stacked
    ? "flex flex-col gap-3 w-full"
    : "flex flex-wrap items-end gap-2";

  return (
    <div className={wrapperClass}>
      {/* ============ VILLAGE CARD ============ */}
      <div className={`${cardBase} ${cardWidthClass}`}>
        <label className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide mb-1 text-slate-500">
          <HolidayVillage sx={{ fontSize: 12, color: "#f59e0b" }} />
          <span>Village</span>
        </label>
        <Select
          value={selectedVillage}
          onChange={(e) => onVillageChange(e.target.value)}
          displayEmpty
          IconComponent={KeyboardArrowDown}
          sx={filterSelectSx}
          MenuProps={{ slotProps: { paper: { sx: dropdownPaperSx } } }}
        >
          <MenuItem value="" sx={menuItemSx}>
            <span style={{ color: "#64748b" }}>All Villages</span>
          </MenuItem>
          {villages.map((v) => (
            <MenuItem key={v} value={v} sx={menuItemSx}>
              {v}
            </MenuItem>
          ))}
        </Select>
      </div>

      {/* ============ KHASRA CARD ============ */}
      <div className={`${cardBase} ${cardWidthClass}`}>
        <label className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide mb-1 text-slate-500">
          <CropSquare sx={{ fontSize: 12, color: "#f59e0b" }} />
          <span>Khasra No.</span>
        </label>
        <KhasraInput
          value={selectedKhasra}
          options={khasraNumbers}
          onChange={onKhasraChange}
        />
      </div>
    </div>
  );
};

export default MapFilterBar;