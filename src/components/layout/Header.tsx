import React, { useState } from "react";
import {
  Logout,
  Place,
  HolidayVillage,
  CropSquare,
  KeyboardArrowDown,
  Close as CloseIcon,
  FilterList,
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

  /* ---------- Shared styles ---------- */
  const filterSelectSx = {
    width: "100%",
    height: 42,
    borderRadius: "10px",
    fontSize: 14.5,
    fontWeight: 500,
    backgroundColor: "#ffffff",
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
      py: 1,
      px: 1.75,
      color: "#0f172a",
      display: "flex",
      alignItems: "center",
      fontSize: 14.5,
      fontWeight: 500,
    },
    "& .MuiSelect-icon": {
      color: "#64748b",
      fontSize: 22,
      right: 10,
    },
  };

  const menuItemSx = {
    fontSize: 14,
    py: 1.25,
    px: 2.25,
    minHeight: "auto",
    fontWeight: 500,
    color: "#334155",
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
    borderRadius: "10px",
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
    "&::-webkit-scrollbar-thumb:hover": {
      background: "#94a3b8",
    },
  };

  const userInitial = (user?.name || user?.username || "U")
    .charAt(0)
    .toUpperCase();
  const userName = user?.name || user?.username || "Signed in";
  const userRole = user?.role || user?.email || "user@bdp.gov.in";

  /* ---------- Filter block (reused in desktop + mobile drawer) ---------- */
  const FiltersBlock = ({ stacked = false }: { stacked?: boolean }) => (
    <div
      className={
        stacked
          ? "flex flex-col gap-5"
          : "flex items-end gap-4 flex-1 justify-center max-w-3xl"
      }
    >
      {/* Tehsil */}
      <div
        className={`flex flex-col ${stacked ? "w-full" : "flex-1 min-w-[160px]"}`}
      >
        <label
          className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-wider mb-2"
          style={{ color: stacked ? "#334155" : "#e2e8f0" }}
        >
          <Place sx={{ fontSize: 17, color: "#fbbf24" }} />
          <span>Tahsil</span>
        </label>
        <Select
          value={selectedTehsil}
          onChange={(e) => onTehsilChange(e.target.value)}
          displayEmpty
          IconComponent={KeyboardArrowDown}
          sx={filterSelectSx}
          MenuProps={{
            slotProps: { paper: { sx: dropdownPaperSx } },
          }}
        >
          <MenuItem value="" sx={menuItemSx}>
            <em style={{ color: "#64748b" }}>All Tehsils</em>
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
        className={`flex flex-col ${stacked ? "w-full" : "flex-1 min-w-[180px]"}`}
      >
        <label
          className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-wider mb-2"
          style={{ color: stacked ? "#334155" : "#e2e8f0" }}
        >
          <HolidayVillage sx={{ fontSize: 17, color: "#fbbf24" }} />
          <span>Village</span>
        </label>
        <Select
          value={selectedVillage}
          onChange={(e) => onVillageChange(e.target.value)}
          displayEmpty
          IconComponent={KeyboardArrowDown}
          sx={filterSelectSx}
          MenuProps={{
            slotProps: { paper: { sx: dropdownPaperSx } },
          }}
        >
          <MenuItem value="" sx={menuItemSx}>
            <em style={{ color: "#64748b" }}>All Villages</em>
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
        className={`flex flex-col ${stacked ? "w-full" : "flex-1 min-w-[160px]"}`}
      >
        <label
          className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-wider mb-2"
          style={{ color: stacked ? "#334155" : "#e2e8f0" }}
        >
          <CropSquare sx={{ fontSize: 17, color: "#fbbf24" }} />
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
        {/* Soft gold glow at bottom-left */}
        <div
          className="absolute bottom-0 left-0 w-64 h-16 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at bottom left, rgba(251,191,36,0.14) 0%, transparent 70%)",
          }}
        />

        <div className="relative flex items-center justify-between px-5 lg:px-8 py-2 lg:py-4 gap-4 lg:gap-6">
          {/* ============ LEFT: BRANDING ============ */}
          <div className="flex items-center gap-3.5 lg:gap-4 flex-shrink-0 min-w-0">
            {/* Logo */}
            <div
              className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center flex-shrink-0 relative"
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #e8eef5 100%)",
                boxShadow:
                  "0 4px 12px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 1px rgba(251,191,36,0.25)",
              }}
            >
              <div className="flex flex-col items-center justify-center">
                <span
                  className="font-black text-base lg:text-lg leading-none tracking-tight"
                  style={{ color: "#0f2c4a" }}
                >
                  BDP
                </span>
                <span
                  className="text-[7px] lg:text-[8px] font-bold tracking-widest mt-0.5"
                  style={{ color: "#f59e0b" }}
                >
                  2047
                </span>
              </div>
            </div>

            {/* Title */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="text-base lg:text-2xl font-semibold leading-tight tracking-tight truncate"
                  style={{
                    color: "#ffffff",
                    textShadow: "0 1px 2px rgba(0,0,0,0.25)",
                  }}
                >
                  <span className="hidden sm:inline">
                    BHOPAL DEVELOPMENT PLAN - 2047 (DRAFT)
                  </span>
                </h1>
              </div>
              <div
                className="text-[14px] lg:text-[16px] font-medium mt-1 flex items-center gap-1.5 truncate"
                style={{ color: "#ffb642" }}
              >
                <span className="truncate">
                  Objections &amp; Suggestions on Draft Development Plan
                </span>
              </div>
            </div>
          </div>

          {/* ============ CENTER: FILTERS (desktop only) ============ */}
          <div className="hidden lg:flex flex-1 justify-center">
            <FiltersBlock />
          </div>

          {/* ============ RIGHT: ACTIONS ============ */}
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150 hover:scale-[1.03] active:scale-95"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                color: "#ffffff",
                cursor: "pointer",
                backdropFilter: "blur(6px)",
              }}
              aria-label="Open filters"
            >
              <FilterList sx={{ fontSize: 20 }} />
            </button>

            {/* User chip */}
            <button
              onClick={(e) => setAnchorEl(e.currentTarget)}
              className="flex items-center gap-2 lg:gap-2.5 pl-1 pr-2 lg:pl-1.5 lg:pr-3 py-1 lg:py-1.5 rounded-lg lg:rounded-xl transition-all duration-150"
              style={{
                backgroundColor: anchorEl
                  ? "rgba(255, 255, 255, 0.14)"
                  : "rgba(255, 255, 255, 0.04)",
                border: "1px solid",
                borderColor: anchorEl
                  ? "rgba(251, 191, 36, 0.5)"
                  : "rgba(255, 255, 255, 0.12)",
                cursor: "pointer",
                boxShadow: anchorEl
                  ? "0 4px 14px rgba(251,191,36,0.18)"
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (!anchorEl) {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.borderColor =
                    "rgba(255, 255, 255, 0.24)";
                }
              }}
              onMouseLeave={(e) => {
                if (!anchorEl) {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.04)";
                  e.currentTarget.style.borderColor =
                    "rgba(255, 255, 255, 0.12)";
                }
              }}
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 6px rgba(0,0,0,0.2)",
                }}
              >
                <span
                  className="text-sm lg:text-base font-bold"
                  style={{ color: "#0f2c4a" }}
                >
                  {userInitial}
                </span>
              </div>

              {/* User info (hidden on small) */}
              <div className="hidden md:flex flex-col items-start text-left">
                <span
                  className="text-[13px] lg:text-[14px] font-semibold leading-tight"
                  style={{ color: "#ffffff" }}
                >
                  {userName}
                </span>
                <span
                  className="text-[10px] lg:text-[11px] leading-tight"
                  style={{ color: "#ffb642" }}
                >
                  {userRole}
                </span>
              </div>

              <KeyboardArrowDown
                className="hidden sm:block"
                sx={{
                  fontSize: 18,
                  color: "#cbd5e1",
                  transition: "transform 0.2s ease",
                  transform: anchorEl ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>

            {/* ============ USER DROPDOWN ============ */}
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
                    width: 220,
                    borderRadius: "10px",
                    boxShadow: "0 6px 24px rgba(0, 0, 0, 0.12)",
                    border: "1px solid #e2e8f0",
                    overflow: "hidden",
                  },
                },
              }}
            >
              {/* Slim user header */}
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  backgroundColor: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                    }}
                  >
                    <span
                      className="text-sm font-bold"
                      style={{ color: "#0f2c4a" }}
                    >
                      {userInitial}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
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

              {/* Logout */}
              <MenuItem
                onClick={() => {
                  logout();
                  setAnchorEl(null);
                }}
                sx={{
                  fontSize: 13.5,
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

      {/* ============ MOBILE FILTER DRAWER ============ */}
      <Drawer
        anchor="right"
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: 380 },
              maxWidth: "100%",
            },
          },
        }}
      >
        <div className="flex flex-col h-full">
          {/* Drawer header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{
              background: "linear-gradient(135deg, #0f2c4a 0%, #1a4a75 100%)",
              borderBottom: "3px solid #fbbf24",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                }}
              >
                <FilterList sx={{ fontSize: 20, color: "#0f2c4a" }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">
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

          {/* Drawer body */}
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <FiltersBlock stacked />
          </div>

          {/* Drawer footer */}
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50">
            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="w-full py-3 rounded-lg font-semibold text-sm transition-all duration-150"
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
