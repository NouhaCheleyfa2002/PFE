"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, IdCard, Loader2 } from "lucide-react";
import { authService } from "@/lib/auth";

/* ── types ── */
type Mode = "login" | "register";
type Role = "teacher" | "student";

/* ── static data ── */
const REGIONS     = ["Tunis", "Sousse", "Sfax", "Monastir", "Bizerte", "Gabès", "Kairouan", "Nabeul"];
const SPECIALTIES = ["Cardiology", "Neurology", "Pediatrics", "Surgery", "Internal Medicine", "Radiology", "Oncology", "Emergency Medicine"];

/* ── small reusable pieces ── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block mb-1.5 text-[11px] font-bold uppercase tracking-[0.8px] text-[#4a5568]">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3.5 py-2.5 rounded-[9px] border-[1.5px] border-[#dde2ef] bg-white
                 text-[14px] text-[#0d1b3e] placeholder:text-[#b0bad0] outline-none
                 focus:border-[#63b3ed] focus:ring-2 focus:ring-[rgba(99,179,237,0.15)] transition-all"
    />
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className="w-full px-3.5 py-2.5 rounded-[9px] border-[1.5px] border-[#dde2ef] bg-white
                 text-[14px] text-[#0d1b3e] outline-none appearance-none
                 focus:border-[#63b3ed] focus:ring-2 focus:ring-[rgba(99,179,237,0.15)] transition-all"
    >
      {children}
    </select>
  );
}

function PrimaryBtn({ children, onClick, disabled, loading }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full mt-2 py-3 rounded-[10px] bg-[#0d1b3e] text-[#f0f4ff] text-[15px] font-semibold
                 flex items-center justify-center gap-2
                 hover:bg-[#1a2d5a] hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(13,27,62,0.25)]
                 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full mt-2 py-2.5 rounded-[10px] border-[1.5px] border-[#dde2ef] bg-transparent
                 text-[14px] font-medium text-[#8899bb]
                 hover:border-[#63b3ed] hover:text-[#0d1b3e] transition-all"
    >
      {children}
    </button>
  );
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3].map((n) => (
        <React.Fragment key={n}>
          <div
            className={[
              "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all",
              n < current   ? "bg-[#63b3ed] text-white"  :
              n === current ? "bg-[#0d1b3e] text-white"  :
                              "bg-[#e8ecf4] text-[#8899bb]",
            ].join(" ")}
          >
            {n < current ? <Check className="w-4 h-4" /> : n}
          </div>
          {n < 3 && (
            <div className={["flex-1 h-0.5 rounded transition-colors", n < current ? "bg-[#63b3ed]" : "bg-[#e8ecf4]"].join(" ")} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── main component ────────────────────────────────────────────────────── */
export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("teacher");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", university: "", specialty: "", region: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await authService.login({
        email: form.email,
        password: form.password,
      });
      
      // Redirect based on role
      if (result.user.role === "teacher") {
        router.push("/dashboard");
      } else {
        router.push("/student/library");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await authService.register({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        role: role,
        university: form.university,
        region: form.region,
        specialty: form.specialty,
      });
      
      // Redirect based on role
      if (result.user.role === "teacher") {
        router.push("/dashboard");
      } else {
        router.push("/student/library");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  /* ── LOGIN ── */
  const LoginView = (
    <>
      <h2 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-[28px] font-bold text-[#0d1b3e] mb-1">
        Welcome back
      </h2>
      <p className="text-[14px] text-[#8899bb] mb-8">Sign in to your account</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="flex p-1 rounded-[10px] bg-[#e8ecf4] mb-7">
        {(["teacher", "student"] as Role[]).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={[
              "flex-1 py-2 rounded-[7px] text-[14px] font-medium transition-all",
              role === r ? "bg-white text-[#0d1b3e] shadow-sm" : "text-[#8899bb]",
            ].join(" ")}
          >
            {r === "teacher" ? "Educator" : "Student"}
          </button>
        ))}
      </div>

      <div className="mb-4"><Label>Email address</Label><Input type="email" placeholder="prof@university.tn" value={form.email} onChange={set("email")} /></div>
      <div className="mb-4"><Label>Password</Label><Input type="password" placeholder="••••••••" value={form.password} onChange={set("password")} /></div>

      <PrimaryBtn onClick={handleLogin} loading={loading} disabled={!form.email || !form.password}>Sign In →</PrimaryBtn>

      <div className="flex items-center gap-3 my-5 text-[12px] text-[#c0c8d8]">
        <span className="flex-1 h-px bg-[#e8ecf4]" /> or <span className="flex-1 h-px bg-[#e8ecf4]" />
      </div>

      <p className="text-center text-[13px] text-[#8899bb]">
        Don't have an account?{" "}
        <button onClick={() => { setMode("register"); setStep(1); setError(null); }} className="text-[#63b3ed] font-semibold bg-transparent border-0 cursor-pointer">
          Create one
        </button>
      </p>
    </>
  );

  /* ── REGISTER ── */
  const Step1 = (
    <>
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {(["teacher", "student"] as Role[]).map((r) => (
          <div
            key={r}
            onClick={() => setRole(r)}
            className={[
              "border-2 rounded-[10px] p-3.5 cursor-pointer transition-all bg-white",
              role === r ? "border-[#63b3ed] bg-[rgba(99,179,237,0.05)]" : "border-[#dde2ef] hover:border-[#b0c0d8]",
            ].join(" ")}
          >
        
            <div className="text-[13px] font-semibold text-[#0d1b3e]">{r === "teacher" ? "Educator" : "Student"}</div>
            <div className="text-[11px] text-[#8899bb] mt-0.5">{r === "teacher" ? "Upload & create exams" : "Access resources"}</div>
          </div>
        ))}
      </div>
      <div className="mb-4"><Label>Full Name</Label><Input placeholder="Dr. Amira Ben Ali" value={form.fullName} onChange={set("fullName")} /></div>
      <div className="mb-4"><Label>Email</Label><Input type="email" placeholder="you@university.tn" value={form.email} onChange={set("email")} /></div>
      <div className="mb-4"><Label>Password</Label><Input type="password" placeholder="••••••••" value={form.password} onChange={set("password")} /></div>
      <PrimaryBtn onClick={() => setStep(2)}>Continue →</PrimaryBtn>
    </>
  );

  const Step2 = (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div><Label>University</Label><Input placeholder="Faculté de Médecine…" value={form.university} onChange={set("university")} /></div>
        <div>
          <Label>Region</Label>
          <Select value={form.region} onChange={set("region")}>
            <option value="">Select…</option>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </Select>
        </div>
      </div>
      <div className="mb-4">
        <Label>Specialty</Label>
        <Select value={form.specialty} onChange={set("specialty")}>
          <option value="">Select specialty…</option>
          {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
        </Select>
      </div>
      <PrimaryBtn onClick={() => setStep(3)}>Continue →</PrimaryBtn>
      <GhostBtn onClick={() => setStep(1)}>← Back</GhostBtn>
    </>
  );

  const Step3 = role === "teacher" ? (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}
      <div className="border-2 border-dashed border-[#dde2ef] rounded-[12px] p-7 text-center bg-[#f9faff] hover:border-[#63b3ed] transition-colors cursor-pointer mb-4">
        <div className="flex justify-center mb-2.5 text-[#63b3ed]">
          <IdCard className="w-9 h-9" />
        </div>
        <p className="text-[14px] font-semibold text-[#0d1b3e] mb-1">Upload Professional ID Card</p>
        <p className="text-[12px] text-[#8899bb] leading-relaxed">JPEG, PNG or PDF · Max 5 MB<br />Our AI verifies your identity automatically</p>
      </div>
      <p className="text-[12px] text-[#aab4cc] leading-relaxed mb-4">
        Your card is used only for one-time identity verification and is never stored or shared publicly.
      </p>
      <PrimaryBtn onClick={handleRegister} loading={loading}>Submit for Verification <Sparkles className="w-4 h-4 inline" /></PrimaryBtn>
      <GhostBtn onClick={() => setStep(2)}>← Back</GhostBtn>
    </>
  ) : (
    <div className="text-center py-8">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-left">
          {error}
        </div>
      )}
      <h3 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-[20px] font-bold text-[#0d1b3e] mb-2">You're all set!</h3>
      <p className="text-[14px] text-[#8899bb] mb-6">Your student account is ready. Start exploring resources from verified educators.</p>
      <PrimaryBtn onClick={handleRegister} loading={loading}>Go to Library →</PrimaryBtn>
    </div>
  );

  const RegisterView = (
    <>
      <h2 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-[28px] font-bold text-[#0d1b3e] mb-1">Create account</h2>
      <p className="text-[14px] text-[#8899bb] mb-6">Join the educator community</p>
      <StepIndicator current={step} />
      {step === 1 && Step1}
      {step === 2 && Step2}
      {step === 3 && Step3}
      <p className="text-center text-[13px] text-[#8899bb] mt-5">
        Already have an account?{" "}
        <button onClick={() => { setMode("login"); setError(null); }} className="text-[#63b3ed] font-semibold bg-transparent border-0 cursor-pointer">
          Sign in
        </button>
      </p>
    </>
  );

  return (
    <div className="w-full max-w-105">
      {mode === "login" ? LoginView : RegisterView}
    </div>
  );
}