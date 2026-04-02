import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left decorative panel ── */}
      <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0B1120] flex-col justify-between p-12">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-32 -left-20 w-125 h-125 rounded-full bg-[radial-gradient(circle,rgba(99,179,237,0.13)_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 w-100 h-100 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.10)_0%,transparent_70%)]" />

        {/* Brand */}
        <div className="relative z-10 flex items-center gap-3">
          
          <span
            style={{ fontFamily: "var(--font-heading), sans-serif" }}
            className="text-xl font-extrabold tracking-tight text-[#f0f4ff]"
          >
            Edu<span className="text-[#63b3ed]">Share</span>
          </span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-5">
          
          <h1
            style={{ fontFamily: "var(--font-heading), sans-serif" }}
            className="text-[44px] font-black leading-[1.08] tracking-[-1.5px] text-[#f0f4ff]"
          >
            Build Better<br />
            <em className="not-italic text-[#63b3ed]">Exams,</em> Share<br />
            Knowledge.
          </h1>
          <p className="text-[15px] text-[#8899bb] leading-[1.75] max-w-sm">
            The collaborative platform where professors create, share, and
            discover AI-powered educational resources across Tunisia's
            universities.
          </p>
        </div>

        {/* Stats row */}
        <div className="relative z-10 flex gap-10">
          {[
            { num: "12,400+", label: "Questions in database" },
            { num: "380+",    label: "Verified educators"   },
            { num: "8",       label: "Regions covered"      },
          ].map(({ num, label }) => (
            <div key={label}>
              <p style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-[28px] font-black text-[#f0f4ff]">{num}</p>
              <p className="text-[12px] text-[#8899bb] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Right content slot ── */}
      <main className="flex-1 flex items-center justify-center bg-[#f6f8ff] px-6 py-12">
        {children}
      </main>
    </div>
  );
}