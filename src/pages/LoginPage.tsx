import React, { useState, useEffect } from "react";
import { Alert, CircularProgress } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { forceLogout, SESSION_CONFLICT_CODE } from "../services/auth.service";
import { ForceLogoutModal } from "../components/auth/ForceLogoutModal";
// import { useObjectionFilters } from "../hooks/useObjectionsFilter";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const navigate = (path: string) => window.location.assign(path);

export const LoginPage: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  // const { reload } = useObjectionFilters();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [conflictOpen, setConflictOpen] = useState(false);
  const [isForcing, setIsForcing] = useState(false);
  const [forceError, setForceError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (error === SESSION_CONFLICT_CODE) setConflictOpen(true);
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setForceError(null);
    try {
      await login({ username, password });
      navigate('/home');
      // eslint-disable-next-line no-empty
    } catch { }
  };
  const handleForceLogout = async () => {
    setIsForcing(true);
    setForceError(null);
    try {
      await forceLogout(username, password);

      clearError();
      setConflictOpen(false);


      await login({ username, password });
      navigate('/home');

    } catch (err) {
      setForceError(err instanceof Error ? err.message : "Force logout failed.");
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
      {/* ================= PAGE ================= */}
      <div
        className="relative flex min-h-screen w-full items-center justify-center overflow-hidden font-segoe"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(245,178,27,0.12), transparent 40%), linear-gradient(180deg, #0B253F 0%, #102F4F 55%, #173B5E 100%)",
        }}
      >
        {/* Bottom light wash */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%]"
          style={{
            background:
              "linear-gradient(to top, rgba(255,255,255,0.08), transparent)",
          }}
        />

        {/* ================= CARD ================= */}
        <div
          className="
            relative z-[2]
            flex w-[475px] max-w-[calc(100vw-48px)] flex-col
            rounded-[45px] border-[5px] p-[28px_30px_34px]
            mobile:w-[calc(100%-32px)] mobile:rounded-[32px] mobile:p-[24px]
          "
          style={{
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(244,247,250,0.97))",
            borderColor: "rgba(245,178,27,0.85)",
            boxShadow:
              "0 25px 55px rgba(0,0,0,0.38), 0 5px 15px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.9)",
          }}
        >
          {/* -------- Brand Icon -------- */}
          <div
            className="
              mx-auto mb-[10px] flex h-[58px] w-[58px] flex-col
              items-center justify-center rounded-[14px]
              border-2 border-[#D7DEE5]
            "
            style={{
              background: "linear-gradient(145deg, #FFFFFF, #EDF1F5)",
              boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
            }}
          >
            <span className="text-[15px] font-extrabold leading-none tracking-[-0.5px] text-navy">
              BDP
            </span>
            <span className="mt-[2px] text-[8px] font-extrabold leading-none tracking-[1px] text-goldDark">
              2047
            </span>
          </div>

          {/* -------- Title -------- */}
          <div className="text-center text-[22px] font-extrabold uppercase leading-[1.2] tracking-[0.2px] text-navy mobile:text-[18px]">
            BHOPAL DEVELOPMENT PLAN
          </div>
          <div className="mt-[2px] text-center text-[22px] font-extrabold tracking-[1px] text-goldDark mobile:text-[18px]">
            2047 (DRAFT)
          </div>

          {/* -------- Subtitle -------- */}
          <div className="mt-[6px] text-center text-[13px] font-bold leading-[1.5] text-ink">
            Objections &amp; Suggestions on Draft Development Plan
          </div>

          {/* -------- Alerts -------- */}
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

          {/* -------- Form -------- */}
          <form className="mt-[20px]" onSubmit={handleSubmit}>
            {/* Username */}
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
                className="
                  h-[38px] w-full rounded-[5px] border bg-white px-2
                  text-[13px] text-ink outline-none
                  transition-[border-color,box-shadow] duration-200
                  placeholder:italic placeholder:text-[#8A99A8]
                  focus:ring-[3px] focus:ring-gold/20
                  disabled:opacity-60
                "
                style={{ borderColor: "#D9E1E8" }}
              />
            </div>

            {/* Password */}
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
                  className="
                    h-[38px] w-full rounded-[5px] border bg-white py-0 pl-2 pr-10
                    text-[13px] text-ink outline-none
                    transition-[border-color,box-shadow] duration-200
                    placeholder:italic placeholder:text-[#8A99A8]
                    focus:ring-[3px] focus:ring-gold/20
                    disabled:opacity-60
                  "
                  style={{ borderColor: "#D9E1E8" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                  className="
                    absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2
                    items-center justify-center rounded-md border-none
                    bg-transparent text-[#8A99A8] transition-all duration-150
                    hover:bg-navy/[0.06] hover:text-navy active:scale-[0.94]
                  "
                >
                  {showPassword ? (
                    <Visibility sx={{ fontSize: 18 }} />
                  ) : (
                    <VisibilityOff sx={{ fontSize: 18 }} />
                  )}
                </button>
              </div>
            </div>

            {/* -------- ENTER button -------- */}
            <div className="mt-[10px] text-center">
              <button
                type="submit"
                disabled={isLoading || !username || !password}
                className="
                  inline-flex h-[40px] min-w-[160px] items-center justify-center
                  gap-[10px] rounded-[22px] border-2
                  py-0 pl-[18px] pr-[9px]
                  text-[12px] font-extrabold tracking-[0.8px] text-navy
                  transition-all duration-[250ms] ease-in-out
                  hover:-translate-y-0.5
                  active:translate-y-px
                  disabled:cursor-not-allowed disabled:opacity-60
                  disabled:hover:translate-y-0
                "
                style={{
                  borderColor: "#F5B21B",
                  background:
                    "linear-gradient(180deg, #FFFFFF 0%, #EEF2F5 100%)",
                  boxShadow: "0 4px 9px rgba(0,0,0,0.16), inset 0 1px #FFFFFF",
                }}
              >
                {isLoading ? (
                  <>
                    <CircularProgress size={14} sx={{ color: "#102F4F" }} />
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

        {/* ================= Reflection ================= */}
        <div
          aria-hidden="true"
          className="
            pointer-events-none absolute bottom-[100px] left-1/2 z-[1]
            h-[95px] w-[420px] -translate-x-1/2 rotate-3
            rounded-[50%] blur-[3px]
            max-mobile:hidden
          "
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
