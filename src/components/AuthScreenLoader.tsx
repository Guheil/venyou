"use client";

export default function AuthScreenLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1817]">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(40% 35% at 30% 25%, rgba(123,196,184,0.18), transparent 70%), radial-gradient(35% 30% at 70% 75%, rgba(42,101,88,0.22), transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2A6558] text-base font-bold text-white shadow-lg">
            V
          </span>
          <span className="text-2xl font-extrabold tracking-tight text-white">
            Ven<span className="text-[#7BC4B8]">YOU</span>
          </span>
        </div>

        {/* Spinner ring */}
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#7BC4B8]"
            style={{ animation: "auth-spin 0.9s linear infinite" }}
          />
        </div>

        {/* Label */}
        <p className="text-sm font-medium tracking-wide text-white/50">
          Signing you in&hellip;
        </p>
      </div>

      <style>{`
        @keyframes auth-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
