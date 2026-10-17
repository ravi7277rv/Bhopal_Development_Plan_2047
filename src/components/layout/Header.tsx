
import React, { useState } from "react";
import {
  Logout,
  KeyboardArrowDown,
  Close as CloseIcon,
  FilterList,
  Person as PersonIcon,
} from "@mui/icons-material";
import {
  Box,
  Drawer,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";

import { useAuth } from "../../context/AuthContext";
import emblemLogo from "../../assets/mpcost_light.png";
import mpcostLogo from "../../assets/mp-logo.png";

/* ---------- Shared styles ---------- */

const HEADER_SHADOW =
  "0 4px 10px rgba(0,0,0,0.12), " +
  "0 12px 28px rgba(8,32,56,0.18), " +
  "inset 0 1px 0 rgba(255,255,255,0.12)";

const LOGO_SHADOW =
  "0 5px 12px rgba(0,0,0,0.20), " +
  "0 2px 4px rgba(0,0,0,0.12), " +
  "inset 0 1px 0 rgba(255,255,255,0.95)";

const GOLD_GRADIENT =
  "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)";

const logoContainerStyle: React.CSSProperties = {
  width: 68,
  height: 68,
  padding: 4,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: LOGO_SHADOW,
};

const userIconStyle: React.CSSProperties = {
  background: GOLD_GRADIENT,
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.4), " +
    "0 2px 5px rgba(0,0,0,0.18)",
};

const menuPaperSx = {
  mt: 1,
  width: { xs: 220, sm: 240 },
  maxWidth: "calc(100vw - 24px)",
  borderRadius: "12px",
  boxShadow:
    "0 12px 30px rgba(15,44,74,0.16), " +
    "0 3px 8px rgba(15,44,74,0.08)",
  border: "1px solid #e2e8f0",
  overflow: "hidden",
};

const drawerPaperSx = {
  width: { xs: "100%", sm: 400 },
  maxWidth: "100%",
};

const menuItemSx = {
  fontSize: "13px",
  py: 1.2,
  px: 2,
  gap: 1.25,
  color: "#dc2626",
  fontWeight: 500,
  minHeight: "auto",
  "&:hover": { backgroundColor: "#fef2f2" },
};

/* ---------- Header component ---------- */

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const isUserMenuOpen = Boolean(anchorEl);

  const userName = user?.name || user?.username || "Signed in";
  const userRole = user?.role || user?.email || "user@bdp.gov.in";

  const handleUserMenuOpen = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };

  const handleDrawerClose = () => {
    setMobileFiltersOpen(false);
  };

  return (
    <>
      <header
        className="relative z-30"
        style={{
          background: "var(--gradient-header)",
          boxShadow: HEADER_SHADOW,
          borderBottom: "1px solid rgba(251,191,36,0.45)",
        }}
      >
        {/* Subtle decorative lighting */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at 0% 100%, " +
              "rgba(251,191,36,0.10), transparent 38%), " +
              "linear-gradient(180deg, " +
              "rgba(255,255,255,0.06), transparent 35%)",
          }}
        />

        {/* Fine gold highlight */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, " +
              "rgba(251,191,36,0.75), transparent)",
          }}
        />

        {/* Main header row */}
        <div className="relative flex items-center justify-between px-3 sm:px-4 lg:px-5 xl:px-6 py-2 lg:py-2.5 gap-2 sm:gap-3 lg:gap-4">
          {/* Left: State emblem and title */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                ...logoContainerStyle,
                width: 68,
                height: 68,
                padding: 4,
                background: "var(--gradient-logo)",
                outline: "1px solid rgba(251,191,36,0.3)",
                outlineOffset: "-1px",
              }}
            >
              <img
                src={emblemLogo}
                alt="Madhya Pradesh State Emblem"
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>

            <div className="flex flex-col min-w-0">
              <h1
                className="text-[16px] sm:text-[19px] lg:text-[22px] xl:text-[24px] font-bold leading-tight tracking-tight"
                style={{
                  color: "#fff",
                  textShadow: "0 2px 4px rgba(0,0,0,0.22)",
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

              <div
                className="hidden sm:block text-[12px] lg:text-[14px] xl:text-[15px] font-medium mt-1 truncate"
                style={{
                  color: "#fbbf24",
                  textShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}
              >
                <span className="hidden xl:inline">
                  GIS-Based Objections &amp; Suggestions on Draft
                  Development Plan
                </span>
                <span className="xl:hidden">
                  Objections &amp; Suggestions
                </span>
              </div>
            </div>
          </div>

          {/* Right: Logo and actions */}
          <div className="flex items-center gap-2 lg:gap-2.5 flex-shrink-0">
            {/* MPCOST logo */}
            <div
              className="hidden sm:flex items-center justify-center rounded-xl transition-shadow duration-200 hover:shadow-xl"
              style={{
                ...logoContainerStyle,
                background:
                  "linear-gradient(145deg, #ffffff 0%, #edf2f7 100%)",
                border: "1px solid rgba(255,255,255,0.85)",
              }}
            >
              <img
                src={mpcostLogo}
                alt="M.P. Council of Science & Technology"
                className="w-full h-full object-contain"
                draggable={false}
              />
            </div>

            {/* Mobile filter toggle */}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="xl:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 hover:bg-white/15 active:scale-95"
              style={{
                backgroundColor: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.17)",
                color: "#fff",
                backdropFilter: "blur(6px)",
              }}
              aria-label="Open filters"
            >
              <FilterList sx={{ fontSize: 19 }} />
            </button>

            {/* User menu trigger */}
            <button
              type="button"
              onClick={handleUserMenuOpen}
              className="flex items-center gap-1.5 sm:gap-2 pl-1 pr-1.5 sm:pr-2.5 py-1 rounded-xl transition-all duration-200 hover:-translate-y-px active:translate-y-0"
              style={{
                backgroundColor: isUserMenuOpen
                  ? "rgba(255,255,255,0.15)"
                  : "rgba(255,255,255,0.06)",
                border: `1px solid ${
                  isUserMenuOpen
                    ? "rgba(251,191,36,0.65)"
                    : "rgba(255,255,255,0.15)"
                }`,
                boxShadow: isUserMenuOpen
                  ? "0 4px 12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)"
                  : "0 2px 5px rgba(0,0,0,0.08)",
                backdropFilter: "blur(6px)",
              }}
              aria-label="User menu"
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={userIconStyle}
              >
                <PersonIcon sx={{ fontSize: 17, color: "#0f2c4a" }} />
              </div>

              <span
                className="hidden lg:block text-[12px] xl:text-[13px] font-semibold max-w-36 truncate"
                style={{ color: "#fff" }}
              >
                {userName}
              </span>

              <KeyboardArrowDown
                className="hidden lg:block"
                sx={{
                  fontSize: 17,
                  color: "rgba(255,255,255,0.75)",
                  transition: "transform 0.2s ease",
                  transform: isUserMenuOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                }}
              />
            </button>

            {/* User dropdown */}
            <Menu
              anchorEl={anchorEl}
              open={isUserMenuOpen}
              onClose={handleUserMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              slotProps={{
                paper: {
                  sx: menuPaperSx,
                },
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.75,
                  background:
                    "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      ...userIconStyle,
                      boxShadow:
                        "0 3px 7px rgba(0,0,0,0.12), " +
                        "inset 0 1px 0 rgba(255,255,255,0.4)",
                    }}
                  >
                    <PersonIcon
                      sx={{ fontSize: 19, color: "#0f2c4a" }}
                    />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold text-slate-800 truncate">
                      {userName}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate mt-0.5">
                      {userRole}
                    </span>
                  </div>
                </div>
              </Box>

              <MenuItem onClick={handleLogout} sx={menuItemSx}>
                <Logout sx={{ fontSize: 17 }} />
                Logout
              </MenuItem>
            </Menu>
          </div>
        </div>
      </header>

      {/* Mobile filter drawer */}
      <Drawer
        anchor="right"
        open={mobileFiltersOpen}
        onClose={handleDrawerClose}
        slotProps={{
          paper: {
            sx: drawerPaperSx,
          },
        }}
      >
        <div className="flex flex-col h-full">
          <div
            className="flex items-center justify-between px-4 sm:px-5 py-3.5 flex-shrink-0"
            style={{
              background:
                "linear-gradient(145deg, #0f2c4a 0%, #1a4a75 100%)",
              boxShadow: "0 3px 10px rgba(15,44,74,0.18)",
              borderBottom: "2px solid #fbbf24",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: GOLD_GRADIENT,
                  boxShadow:
                    "0 3px 7px rgba(0,0,0,0.16), " +
                    "inset 0 1px 0 rgba(255,255,255,0.4)",
                }}
              >
                <FilterList sx={{ fontSize: 19, color: "#0f2c4a" }} />
              </div>

              <div>
                <h2 className="text-[15px] font-bold text-white leading-tight">
                  Filters
                </h2>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Refine your selection
                </p>
              </div>
            </div>

            <IconButton
              onClick={handleDrawerClose}
              aria-label="Close filters"
              sx={{
                color: "#fff",
                backgroundColor: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.16)",
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </div>

          {/* Add your filter controls here when needed. */}

          <div className="px-4 sm:px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <button
              type="button"
              onClick={handleDrawerClose}
              className="w-full py-3 rounded-lg font-semibold text-[13px] transition-all duration-200 hover:-translate-y-px active:translate-y-0"
              style={{
                background: GOLD_GRADIENT,
                color: "#0f2c4a",
                border: "1px solid rgba(180,120,0,0.18)",
                cursor: "pointer",
                boxShadow:
                  "0 4px 10px rgba(180,120,0,0.18), " +
                  "inset 0 1px 0 rgba(255,255,255,0.35)",
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
