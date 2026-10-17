
import React, { useState, useEffect } from "react";
import { Alert, CircularProgress } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import {
  forceLogout,
  SESSION_CONFLICT_CODE,
} from "../services/auth.service";
import { ForceLogoutModal } from "../components/auth/ForceLogoutModal";

import cityMapBg from "../assets/login/LoginN.png";
import Logo from "../assets/mpcost_light.png";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [conflictOpen, setConflictOpen] = useState(false);
  const [isForcing, setIsForcing] = useState(false);
  const [forceError, setForceError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (error === SESSION_CONFLICT_CODE) {
      setConflictOpen(true);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setForceError(null);

    try {
      await login({ username, password });
      navigate("/home");
    } catch {
      // Authentication errors are handled by AuthContext.
    }
  };

  const handleForceLogout = async () => {
    setIsForcing(true);
    setForceError(null);

    try {
      await forceLogout(username, password);
      clearError();
      setConflictOpen(false);

      await login({ username, password });
      navigate("/home");
    } catch (err) {
      setForceError(
        err instanceof Error ? err.message : "Force logout failed."
      );
    } finally {
      setIsForcing(false);
    }
  };

  const handleCancelConflict = () => {
    setConflictOpen(false);
    setForceError(null);
    clearError();
  };

  return (
    <>
      <div
        className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-8 font-segoe"
        style={{
          background:
            "linear-gradient(160deg, #101b35 0%, #182b49 50%, #091426 100%)",
        }}
      >
        {/* Full-screen Bhopal background */}
        <img
          src={cityMapBg}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-cover"
        />

        {/* Background overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,15,30,0.08) 0%, rgba(8,15,30,0.10) 55%, rgba(8,15,30,0.30) 100%)",
          }}
        />

        {/* Golden ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-[1] h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,214,112,0.22) 0%, rgba(245,178,27,0.09) 42%, transparent 70%)",
            filter: "blur(28px)",
          }}
        />

        {/* Login card */}
        <div
          className="login-glass-card relative z-[2] flex w-[540px] max-w-full flex-col rounded-[42px] border-[5px] p-[34px_36px_38px] max-mobile:rounded-[28px] max-mobile:p-[24px_20px_28px]"
          style={{
            background:
              "linear-gradient(145deg, #ffffff 0%, #f8f7f5 35%, #ecebed 75%, #e4e5e8 100%) padding-box, linear-gradient(145deg, #fff4bf 0%, #d8b849 16%, #fff0ad 34%, #c5a13d 68%, #f8dc7b 88%, #b89231 100%) border-box",
            borderColor: "transparent",
            boxShadow: [
              "0 30px 65px -15px rgba(0,0,0,0.62)",
              "0 14px 28px rgba(0,0,0,0.32)",
              "0 0 8px 2px rgba(255,218,124,0.58)",
              "0 0 25px rgba(239,192,77,0.28)",
              "inset 0 0 0 1px rgba(255,255,255,0.9)",
              "inset 0 2px 2px rgba(255,255,255,1)",
              "inset 0 -8px 15px rgba(48,49,58,0.08)",
            ].join(", "),
          }}
        >
          {/* Fine inner rim */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[5px] rounded-[32px] border border-white/90 max-mobile:rounded-[21px]"
            style={{
              boxShadow:
                "inset 0 0 0 1px rgba(215,215,220,0.28), 0 0 2px rgba(255,255,255,0.8)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.08) 55%, transparent)",
            }}
          />

          {/* Top glossy reflection */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[12px] top-[10px] h-[42%] rounded-t-[30px]"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.08) 55%, transparent)",
            }}
          />

          {/* Logo */}
          <div className="relative z-[1] mx-auto mb-[14px] flex h-[70px] w-[70px] items-center justify-center">
            <img
              src={Logo}
              alt="Madhya Pradesh Logo"
              className="h-[70px] w-[70px] object-contain"
            />
          </div>

          {/* Main heading */}
          <div className="relative z-[1] text-center text-[25px] font-extrabold uppercase leading-[1.2] tracking-[0.2px] text-navy max-mobile:text-[19px]">
            BHOPAL DEVELOPMENT PLAN
          </div>

          {/* Draft year */}
          <div
            className="relative z-[1] mt-[4px] text-center text-[25px] font-extrabold tracking-[1px] max-mobile:text-[20px]"
            style={{
              color: "#b3953d",
              textShadow:
                "0 1px 0 rgba(255,255,255,0.95), 0 2px 0 #d9bd61, 0 3px 2px rgba(81,61,14,0.42)",
            }}
          >
            2047 (DRAFT)
          </div>

          {/* Subtitle */}
          <div className="relative z-[1] mt-[10px] text-center text-[15px] font-medium leading-[1.5] text-ink max-mobile:text-[12px]">
            GIS-Based Objections &amp; Suggestions on Draft Development Plan
          </div>

          {/* Login error */}
          {error && error !== SESSION_CONFLICT_CODE && (
            <Alert
              severity="error"
              onClose={clearError}
              sx={{
                mt: 2,
                fontSize: 12,
                borderRadius: "8px",
                position: "relative",
                zIndex: 2,
              }}
            >
              {error}
            </Alert>
          )}

          {/* Force logout error */}
          {forceError && (
            <Alert
              severity="warning"
              onClose={() => setForceError(null)}
              sx={{
                mt: 2,
                fontSize: 12,
                borderRadius: "8px",
                position: "relative",
                zIndex: 2,
              }}
            >
              {forceError}
            </Alert>
          )}

          {/* Login form */}
          <form
            className="relative z-[1] mt-[24px]"
            onSubmit={handleSubmit}
          >
            {/* Username */}
            <div className="mb-[18px] grid grid-cols-[110px_minmax(0,1fr)] items-center gap-2 max-mobile:grid-cols-[82px_minmax(0,1fr)]">
              <label
                htmlFor="bdp-username"
                className="text-[14px] font-semibold text-ink max-mobile:text-[12px]"
              >
                User Name
              </label>

              <input
                id="bdp-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                disabled={isLoading}
                required
                className="login-input h-[44px] w-full min-w-0 rounded-[7px] border px-[10px] text-[14px] text-ink outline-none transition-all duration-200 placeholder:italic placeholder:text-[#626b78] focus:border-[#c5a64b] focus:ring-[3px] focus:ring-gold/20 disabled:opacity-60 max-mobile:text-[12px]"
                style={{
                  borderColor: "#c9c9ce",
                  background:
                    "linear-gradient(180deg, #d4d5da 0%, #f2f2f4 100%)",
                  boxShadow:
                    "inset 0 2px 5px rgba(0,0,0,0.13), inset 0 1px 1px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.95)",
                }}
              />
            </div>

            {/* Password */}
            <div className="mb-[18px] grid grid-cols-[110px_minmax(0,1fr)] items-center gap-2 max-mobile:grid-cols-[82px_minmax(0,1fr)]">
              <label
                htmlFor="bdp-password"
                className="text-[14px] font-semibold text-ink max-mobile:text-[12px]"
              >
                Password
              </label>

              <div className="relative w-full min-w-0">
                <input
                  id="bdp-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  required
                  className="login-input h-[44px] w-full rounded-[7px] border py-0 pl-[10px] pr-[42px] text-[14px] text-ink outline-none transition-all duration-200 placeholder:italic placeholder:text-[#626b78] focus:border-[#c5a64b] focus:ring-[3px] focus:ring-gold/20 disabled:opacity-60 max-mobile:text-[12px]"
                  style={{
                    borderColor: "#c9c9ce",
                    background:
                      "linear-gradient(180deg, #d4d5da 0%, #f2f2f4 100%)",
                    boxShadow:
                      "inset 0 2px 5px rgba(0,0,0,0.13), inset 0 1px 1px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.95)",
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  aria-pressed={showPassword}
                  className="absolute right-[7px] top-1/2 z-10 flex h-[30px] w-[30px] -translate-y-1/2 items-center justify-center rounded-md border-none bg-transparent text-navy transition-colors hover:bg-navy/[0.06]"
                >
                  {showPassword ? (
                    <Visibility sx={{ fontSize: 19 }} />
                  ) : (
                    <VisibilityOff sx={{ fontSize: 19 }} />
                  )}
                </button>
              </div>
            </div>

            {/* ENTER button */}
            <div className="mt-[20px] text-center">
              <button
                type="submit"
                disabled={isLoading || !username || !password}
                className="login-enter-button inline-flex h-[46px] min-w-[180px] items-center justify-center gap-[12px] rounded-full border-2 py-0 pl-[22px] pr-[10px] text-[14px] font-extrabold tracking-[0.5px] text-navy transition-all duration-200 hover:-translate-y-0.5 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                style={{
                  borderColor: "#ddc477",
                  background:
                    "linear-gradient(180deg, #ffffff 0%, #f4f1e7 48%, #e4e2dc 100%)",
                  boxShadow:
                    "0 5px 9px rgba(0,0,0,0.24), 0 1px 2px rgba(0,0,0,0.16), inset 0 2px 2px rgba(255,255,255,1), inset 0 -2px 3px rgba(160,139,78,0.15)",
                }}
              >
                {isLoading ? (
                  <>
                    <CircularProgress
                      size={15}
                      sx={{ color: "var(--color-navy)" }}
                    />
                    SIGNING IN...
                  </>
                ) : (
                  <>
                    ENTER

                    <span
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[15px] font-black text-navy"
                      style={{
                        background:
                          "linear-gradient(180deg, #ffe99b 0%, #e7bd45 100%)",
                        boxShadow:
                          "0 2px 4px rgba(0,0,0,0.18), inset 0 1px 1px rgba(255,255,255,0.9)",
                      }}
                    >
                      ➜
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Existing session conflict modal */}
      <ForceLogoutModal
        open={conflictOpen}
        username={username}
        isProcessing={isForcing}
        onCancel={handleCancelConflict}
        onConfirm={handleForceLogout}
      />
    </>
  );
};

export default LoginPage;
