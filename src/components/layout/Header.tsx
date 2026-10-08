/* eslint-disable react-hooks/static-components */
import React, { useState } from "react";
import {
  Logout,
  Place,
  HolidayVillage,
  CropSquare,
  KeyboardArrowDown,
  Close as CloseIcon,
  FilterList,
  Person as PersonIcon,
} from "@mui/icons-material";
import {
  Select,
  Menu,
  MenuItem,
  Box,
  Divider,
  IconButton,
  Drawer,
} from "@mui/material";

import { useAuth } from "../../context/AuthContext";
import { KhasraInput } from "../forms/KhasraInput";

interface HeaderProps {
  tehsils: string[];
  villages: string[];
  khasraNumbers: string[];
  selectedTehsil: string;
  selectedVillage: string;
  selectedKhasra: string;
  onTehsilChange: (v: string) => void;
  onVillageChange: (v: string) => void;
  onKhasraChange: (v: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  tehsils,
  villages,
  khasraNumbers,
  selectedTehsil,
  selectedVillage,
  selectedKhasra,
  onTehsilChange,
  onVillageChange,
  onKhasraChange,
}) => {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  /* ---------- ✅ SHARED STYLES — One source of truth ---------- */
const filterSelectSx = {
  width: "100%",
  height: 36,
  borderRadius: "8px",
  backgroundColor: "#ffffff",
  fontWeight: 500,
  fontSize: "13px",
  fontFamily: '"Segoe UI", Arial, Helvetica, sans-serif !important',  
  transition: "all 0.18s ease",
  "& .MuiOutlinedInput-notchedOutline": {
    border: "1px solid transparent",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    border: "1px solid #cbd5e1",
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    border: "1.5px solid #fbbf24",
  },
  "& .MuiSelect-select": {
    padding: "0 12px",
    fontSize: "13px",
    fontWeight: 500,
    fontFamily: '"Segoe UI", Arial, Helvetica, sans-serif !important',  // ✅ Force
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    height: 36,
    boxSizing: "border-box",
  },
  "& .MuiSelect-icon": {
    color: "#64748b",
    fontSize: 18,
    right: 8,
  },
};

const menuItemSx = {
  fontSize: "13px",
  py: 1,
  px: 2,
  minHeight: "auto",
  fontWeight: 500,
  color: "#334155",
  fontFamily: '"Segoe UI", Arial, Helvetica, sans-serif !important',   
  "&:hover": {
    backgroundColor: "#f1f5f9",
  },
  "&.Mui-selected": {
    backgroundColor: "#eff6ff",
    color: "#1e40af",
    fontWeight: 600,
    "&:hover": {
      backgroundColor: "#dbeafe",
    },
  },
};

  const dropdownPaperSx = {
    mt: 0.5,
    borderRadius: "8px",
    boxShadow: "0 10px 32px rgba(0,0,0,0.14)",
    border: "1px solid #e2e8f0",
    maxHeight: 280,
    overflow: "auto",
    "&::-webkit-scrollbar": { width: 6 },
    "&::-webkit-scrollbar-track": { background: "transparent" },
    "&::-webkit-scrollbar-thumb": {
      background: "#cbd5e1",
      borderRadius: 3,
    },
  };

  const userName = user?.name || user?.username || "Signed in";
  const userRole = user?.role || user?.email || "user@bdp.gov.in";

  /* ---------- Filter block (symmetric) ---------- */
  const FiltersBlock = ({ stacked = false }: { stacked?: boolean }) => (
    <div
      className={
        stacked
          ? "flex flex-col gap-4"
          : "flex items-end gap-2.5 xl:gap-3 flex-1 justify-center max-w-xl"
      }
    >
      {/* Tehsil */}
      <div
        className={`flex flex-col ${
          stacked ? "w-full" : "flex-1 min-w-[110px] xl:min-w-[130px]"
        }`}
      >
        <label
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mb-1.5"
          style={{ color: stacked ? "#334155" : "#cbd5e1" }}
        >
          <Place sx={{ fontSize: 13, color: "#fbbf24" }} />
          <span>Tehsil</span>
        </label>
        <Select
          value={selectedTehsil}
          onChange={(e) => onTehsilChange(e.target.value)}
          displayEmpty
          IconComponent={KeyboardArrowDown}
          sx={filterSelectSx}
          MenuProps={{ slotProps: { paper: { sx: dropdownPaperSx } } }}
        >
          <MenuItem value="" sx={menuItemSx}>
          
            <span style={{ color: "#64748b" }}>All Tehsils </span>
          </MenuItem>
          {tehsils.map((t) => (
            <MenuItem key={t} value={t} sx={menuItemSx}>
              {t}
            </MenuItem>
          ))}
        </Select>
      </div>

      {/* Village */}
      <div
        className={`flex flex-col ${
          stacked ? "w-full" : "flex-1 min-w-[110px] xl:min-w-[130px]"
        }`}
      >
        <label
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mb-1.5"
          style={{ color: stacked ? "#334155" : "#cbd5e1" }}
        >
          <HolidayVillage sx={{ fontSize: 13, color: "#fbbf24" }} />
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
            {/* <em style={{ color: "#64748b" }}>All Villages</em> */}
            <span style={{ color: "#64748b" }}> All Villages</span>
          </MenuItem>
          {villages.map((v) => (
            <MenuItem key={v} value={v} sx={menuItemSx}>
              {v}
            </MenuItem>
          ))}
        </Select>
      </div>

      {/* Khasra */}
      <div
        className={`flex flex-col ${
          stacked ? "w-full" : "flex-1 min-w-[110px] xl:min-w-[130px]"
        }`}
      >
        <label
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mb-1.5"
          style={{ color: stacked ? "#334155" : "#cbd5e1" }}
        >
          <CropSquare sx={{ fontSize: 13, color: "#fbbf24" }} />
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

  return (
    <>
      <header
        className="relative z-30"
        style={{
          background:
            "linear-gradient(135deg, #0b1f38 0%, #0f2c4a 40%, #1a4a75 100%)",
          borderBottom: "3px solid #fbbf24",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.22)",
        }}
      >
        {/* Gold glow */}
        <div
          className="absolute bottom-0 left-0 w-60 h-16 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at bottom left, rgba(251,191,36,0.14) 0%, transparent 70%)",
          }}
        />

        {/* Main header row */}
        <div className="relative flex items-center justify-between px-3 sm:px-4 lg:px-5 xl:px-6 py-2 lg:py-2.5 gap-2 sm:gap-3 lg:gap-4">
          {/* ============ LEFT: BRANDING ============ */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-3.5 xl:gap-4 flex-shrink-0 min-w-0">
            {/* Logo */}
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #e8eef5 100%)",
                boxShadow:
                  "0 4px 12px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 1px rgba(251,191,36,0.25)",
              }}
            >
              <div className="flex flex-col items-center justify-center">
                {/* ✅ xs: 10px, sm: 11px, lg: 12px */}
                <span
                  className="font-black text-[10px] sm:text-[11px] lg:text-[12px] leading-none tracking-tight"
                  style={{ color: "#0f2c4a" }}
                >
                  BDP
                </span>
                {/* ✅ xs: 6px, sm: 7px, lg: 8px */}
                <span
                  className="text-[6px] sm:text-[7px] lg:text-[8px] font-bold tracking-widest mt-0.5"
                  style={{ color: "#fbbf24" }}
                >
                  2047
                </span>
              </div>
            </div>

            {/* Title — progressive disclosure */}
            <div className="flex flex-col min-w-0">
              {/* ✅ Title: sm: 13px, lg: 15px, xl: 17px */}
              <h1
                className="text-[13px] lg:text-[16px] xl:text-[18px] font-bold leading-tight tracking-tight truncate"
                style={{
                  color: "#ffffff",
                  textShadow: "0 1px 2px rgba(0,0,0,0.25)",
                }}
              >
                <span className="sm:hidden">BDP - 2047</span>
                <span className="hidden sm:inline xl:hidden">
                  BHOPAL DEVELOPMENT PLAN - 2047
                </span>
                <span className="hidden xl:inline">
                  BHOPAL DEVELOPMENT PLAN - 2047 (DRAFT)
                </span>
              </h1>
              {/* ✅ Subtitle: sm: 10px, lg: 11px, xl: 13px */}
              <div
                className="text-[11px] lg:text-[12px] xl:text-[13px] font-medium mt-0.5 truncate hidden sm:block"
                style={{ color: "#fbbf24" }}
              >
                <span className="hidden xl:inline">
                  Objections &amp; Suggestions on Draft Development Plan
                </span>
                <span className="xl:hidden">
                  Objections &amp; Suggestions
                </span>
              </div>
            </div>
          </div>

          {/* ============ CENTER: FILTERS (XL only) ============ */}
          <div className="hidden xl:flex flex-1 justify-center">
            <FiltersBlock />
          </div>

          {/* ============ RIGHT: ACTIONS ============ */}
          <div className="flex items-center gap-2 lg:gap-2.5 flex-shrink-0">
            {/* Filter toggle — xl hidden */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="xl:hidden flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-all duration-150 hover:scale-[1.03] active:scale-95"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                color: "#ffffff",
                cursor: "pointer",
                backdropFilter: "blur(6px)",
              }}
              aria-label="Open filters"
            >
              <FilterList sx={{ fontSize: 18 }} />
            </button>

            {/* User chip */}
            <button
              onClick={(e) => setAnchorEl(e.currentTarget)}
              className="flex items-center gap-1.5 sm:gap-2 pl-1 pr-1.5 sm:pr-2.5 py-1 rounded-lg transition-all duration-150 flex-shrink-0"
              style={{
                backgroundColor: anchorEl
                  ? "rgba(255, 255, 255, 0.15)"
                  : "rgba(255, 255, 255, 0.06)",
                border: "1px solid",
                borderColor: anchorEl
                  ? "rgba(251, 191, 36, 0.55)"
                  : "rgba(255, 255, 255, 0.15)",
                cursor: "pointer",
                boxShadow: anchorEl
                  ? "0 4px 14px rgba(251,191,36,0.2)"
                  : "none",
                backdropFilter: "blur(6px)",
              }}
              onMouseEnter={(e) => {
                if (!anchorEl) {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.12)";
                  e.currentTarget.style.borderColor =
                    "rgba(255, 255, 255, 0.28)";
                }
              }}
              onMouseLeave={(e) => {
                if (!anchorEl) {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.06)";
                  e.currentTarget.style.borderColor =
                    "rgba(255, 255, 255, 0.15)";
                }
              }}
              aria-label="User menu"
            >
              {/* User icon badge */}
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center flex-shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 4px rgba(0,0,0,0.2)",
                }}
              >
                <PersonIcon
                  sx={{ fontSize: 15, color: "#0f2c4a" }}
                />
              </div>

              {/* ✅ User name: lg: 12px, xl: 13px */}
              <span
                className="hidden lg:block text-[12px] xl:text-[13px] font-semibold whitespace-nowrap"
                style={{ color: "#ffffff" }}
              >
                {userName}
              </span>

              {/* Chevron */}
              <KeyboardArrowDown
                className="hidden lg:block"
                sx={{
                  fontSize: 15,
                  color: "rgba(255, 255, 255, 0.7)",
                  transition: "transform 0.2s ease",
                  transform: anchorEl ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            {/* User dropdown */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1,
                    width: { xs: 220, sm: 240 },
                    maxWidth: "calc(100vw - 24px)",
                    borderRadius: "10px",
                    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.16)",
                    border: "1px solid #e2e8f0",
                    overflow: "hidden",
                  },
                },
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.75,
                  backgroundColor: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                    }}
                  >
                    <PersonIcon sx={{ fontSize: 17, color: "#0f2c4a" }} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    {/* ✅ 13px for name, 11px for role */}
                    <span className="text-[13px] font-semibold text-slate-800 truncate leading-tight">
                      {userName}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                      {userRole}
                    </span>
                  </div>
                </div>
              </Box>

              <Divider sx={{ borderColor: "#e2e8f0" }} />

              <MenuItem
                onClick={() => {
                  logout();
                  setAnchorEl(null);
                }}
                sx={{
                  fontSize: "13px",
                  py: 1.2,
                  px: 2,
                  gap: 1.25,
                  color: "#dc2626",
                  fontWeight: 500,
                  minHeight: "auto",
                  "&:hover": { backgroundColor: "#fef2f2" },
                }}
              >
                <Logout sx={{ fontSize: 17 }} />
                Logout
              </MenuItem>
            </Menu>
          </div>
        </div>
      </header>

      {/* ============ MOBILE DRAWER ============ */}
      <Drawer
        anchor="right"
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: 400 },
              maxWidth: "100%",
            },
          },
        }}
      >
        <div className="flex flex-col h-full">
          <div
            className="flex items-center justify-between px-4 sm:px-5 py-3.5 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #0f2c4a 0%, #1a4a75 100%)",
              borderBottom: "3px solid #fbbf24",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                }}
              >
                <FilterList sx={{ fontSize: 18, color: "#0f2c4a" }} />
              </div>
              <div>
                {/* ✅ 15px heading, 11px subtitle */}
                <h2 className="text-[15px] font-bold text-white leading-tight">
                  Filters
                </h2>
                <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
                  Refine your selection
                </p>
              </div>
            </div>
            <IconButton
              onClick={() => setMobileFiltersOpen(false)}
              sx={{
                color: "#ffffff",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.16)",
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5">
            <FiltersBlock stacked />
          </div>

          <div className="px-4 sm:px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="w-full py-3 rounded-lg font-semibold text-[13px] transition-all duration-150"
              style={{
                background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                color: "#0f2c4a",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(251, 191, 36, 0.35)",
              }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default Header;