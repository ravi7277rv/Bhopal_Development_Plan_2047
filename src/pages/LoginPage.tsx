import React, { useState, useEffect } from "react";
import { Alert, CircularProgress } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { forceLogout, SESSION_CONFLICT_CODE } from "../services/auth.service";
import { ForceLogoutModal } from "../components/auth/ForceLogoutModal";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import cityMapBg from "../assets/login/city-map-bg.png";
import Logo from "../assets/mpcost_light.png";
import { useNavigate } from "react-router-dom";



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
    if (error === SESSION_CONFLICT_CODE) setConflictOpen(true);
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setForceError(null);
    try {
      await login({ username, password });
      navigate("/home");
    } catch {}
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
        err instanceof Error ? err.message : "Force logout failed.",
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
        className="relative flex min-h-screen w-full items-center justify-center overflow-hidden font-segoe"
        style={{
          background:
            "radial-gradient(circle at 50% 15%, rgba(245,178,27,0.12), transparent 60%), linear-gradient(160deg, #0B1F3A 0%, #142E52 50%, #0A192E 100%)",
        }}
      >
        {/* City map background image */}
        <img
          src={cityMapBg}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-cover opacity-70"
        />

        {/* Soft gold aura behind card */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-[1] h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(245,178,27,0.14) 0%, rgba(245,178,27,0.05) 40%, transparent 70%)",
            filter: "blur(20px)",
          }}
        />

        {/* Bottom light wash */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[30%]"
          style={{
            background:
              "linear-gradient(to top, rgba(255,255,255,0.08), transparent)",
          }}
        />

        {/* Card */}
        <div
          className="relative z-[2] flex w-[475px] max-w-[calc(100vw-48px)] flex-col rounded-[38px] border-[3px] p-[28px_30px_34px] transition-shadow duration-300 mobile:w-[calc(100%-32px)] mobile:rounded-[30px] mobile:p-[24px]"
          style={{
            background: `
              linear-gradient(
                145deg,
                rgba(255,255,255,1) 0%,
                rgba(250,252,255,0.99) 48%,
                rgba(231,238,246,0.98) 100%
              )
            `,
            borderColor: "rgba(245,178,27,0.95)",
            boxShadow: [
              "0 45px 80px -22px rgba(0,0,0,0.60)",
              "0 24px 40px -12px rgba(0,0,0,0.35)",
              "0 10px 18px rgba(0,0,0,0.18)",
              "0 0 28px rgba(245,178,27,0.12)",
              "inset 0 2px 2px rgba(255,255,255,1)",
              "inset 0 -8px 18px rgba(15,35,65,0.045)",
              "inset 0 0 0 1px rgba(255,255,255,0.8)",
            ].join(", "),
          }}
        >
          {/* Brand */}
          <div className="mx-auto mb-[10px] flex h-[68px] w-[68px] flex-col items-center justify-center rounded-[14px]">
            <img
              src={Logo}
              alt="Madhya Pradesh Logo"
              className="h-[70px] w-[70px] object-contain"
            />
          </div>

          <div className="text-center text-[22px] font-extrabold uppercase leading-[1.2] tracking-[0.2px] text-navy mobile:text-[18px]">
            BHOPAL DEVELOPMENT PLAN
          </div>
          <div className="mt-[2px] text-center text-[22px] font-extrabold tracking-[1px] text-goldDark mobile:text-[18px]">
            2047 (DRAFT)
          </div>
          <div className="mt-[6px] text-center text-[13px] font-bold leading-[1.5] text-ink">
            GIS-Based Objections &amp; Suggestions on Draft Development Plan
          </div>

          {error && error !== SESSION_CONFLICT_CODE && (
            <Alert
              severity="error"
              onClose={clearError}
              sx={{ mt: 2, fontSize: 12, borderRadius: "8px" }}
            >
              {error}
            </Alert>
          )}
          {forceError && (
            <Alert
              severity="warning"
              onClose={() => setForceError(null)}
              sx={{ mt: 2, fontSize: 12, borderRadius: "8px" }}
            >
              {forceError}
            </Alert>
          )}

          <form className="mt-[20px]" onSubmit={handleSubmit}>
            <div className="mb-[16px] grid grid-cols-[105px_1fr] items-center mobile:grid-cols-[88px_1fr]">
              <label
                htmlFor="bdp-username"
                className="text-[13px] font-bold text-ink"
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
                className="h-[38px] w-full rounded-[5px] border bg-white px-2 text-[13px] text-ink outline-none transition-[border-color,box-shadow] duration-200 placeholder:italic placeholder:text-[#8A99A8] focus:ring-[3px] focus:ring-gold/20 disabled:opacity-60"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>

            <div className="mb-[16px] grid grid-cols-[105px_1fr] items-center mobile:grid-cols-[88px_1fr]">
              <label
                htmlFor="bdp-password"
                className="text-[13px] font-bold text-ink"
              >
                Password
              </label>
              <div className="relative w-full">
                <input
                  id="bdp-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  required
                  className="h-[38px] w-full rounded-[5px] border bg-white py-0 pl-2 pr-10 text-[13px] text-ink outline-none transition-[border-color,box-shadow] duration-200 placeholder:italic placeholder:text-[#8A99A8] focus:ring-[3px] focus:ring-gold/20 disabled:opacity-60"
                  style={{ borderColor: "var(--color-border)" }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPassword((s) => !s);
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md border-none bg-transparent text-[#8A99A8] transition-all duration-150 hover:bg-navy/[0.06] hover:text-navy active:scale-[0.94]"
                >
                  {showPassword ? (
                    <Visibility sx={{ fontSize: 18 }} />
                  ) : (
                    <VisibilityOff sx={{ fontSize: 18 }} />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-[10px] text-center">
              <button
                type="submit"
                disabled={isLoading || !username || !password}
                className="inline-flex h-[40px] min-w-[160px] items-center justify-center gap-[10px] rounded-[22px] border-2 py-0 pl-[18px] pr-[9px] text-[12px] font-extrabold tracking-[0.8px] text-navy transition-all duration-[250ms] ease-in-out hover:-translate-y-0.5 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                style={{
                  borderColor: "var(--color-gold)",
                  background:
                    "linear-gradient(180deg, #FFFFFF 0%, #EEF2F5 100%)",
                  boxShadow: "0 4px 9px rgba(0,0,0,0.16), inset 0 1px #FFFFFF",
                }}
              >
                {isLoading ? (
                  <>
                    <CircularProgress
                      size={14}
                      sx={{ color: "var(--color-navy)" }}
                    />
                    SIGNING IN…
                  </>
                ) : (
                  <>
                    ENTER
                    <span className="flex h-[23px] w-[23px] items-center justify-center rounded-full bg-gold text-[12px] font-black text-navy">
                      ➜
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Reflection */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[100px] left-1/2 z-[1] h-[95px] w-[420px] -translate-x-1/2 rotate-3 rounded-[50%] blur-[3px] max-mobile:hidden"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.45), rgba(255,255,255,0))",
            opacity: 0.3,
          }}
        />
      </div>

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