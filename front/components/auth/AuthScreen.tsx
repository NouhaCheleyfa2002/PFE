"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, IdCard, Loader2, CheckCircle, XCircle } from "lucide-react";
import { authService } from "@/lib/auth";

/* ── types ── */
type Mode = "login" | "register";
type Role = "teacher" | "student";

/* ── static data ── */
const REGIONS = ["Tunis", "Sousse", "Sfax", "Monastir", "Bizerte", "Gabès", "Kairouan", "Nabeul", "Ariana", "Ben Arous", "Manouba", "Zaghouan", "Jendouba", "Kef", "Siliana", "Béja", "Kasserine", "Sidi Bouzid", "Gafsa", "Tozeur", "Kebili", "Tataouine", "Medenine", "Mahdia"];

const EDUCATION_SPECIALTIES = [
  // Primary Education
  "Primary Education",
  "Early Childhood Education",
  
  // Secondary Education - Humanities
  "Arabic Language and Literature",
  "French Language and Literature",
  "English Language and Literature",
  "German Language",
  "Spanish Language",
  "History and Geography",
  "Islamic Education",
  "Philosophy",
  
  // Secondary Education - Sciences
  "Mathematics",
  "Physics",
  "Chemistry",
  "Life and Earth Sciences (SVT)",
  "Computer Science (Informatique)",
  "Technology",
  
  // Secondary Education - Economics
  "Economics and Management",
  "Accounting",
  
  // Secondary Education - Arts
  "Arts and Design",
  "Music Education",
  "Physical Education and Sports",
  
  // Special Needs
  "Special Education",
  "Educational Psychology",
  
  // Other
  "Other"
];

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
  const [showPassword, setShowPassword] = useState(false);

  // Helper function for password strength
  const getPasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    return strength;
  };

  const isPasswordValid = (password: string): boolean => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password) &&
      /[@$!%*?&]/.test(password)
    );
  };

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
      if (result.user.role === "student") {
        router.push("/student/library");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // Validate password before submitting
    if (!isPasswordValid(form.password)) {
      setError("Password must be at least 8 characters and contain uppercase, lowercase, number, and special character (@$!%*?&)");
      return;
    }

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
      
      // Redirect to dashboard - teachers can verify later
      if (result.user.role === "student") {
        router.push("/student/library");
      } else {
        // Teacher goes to dashboard, can verify from profile
        router.push("/dashboard");
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
      
      <div className="mb-4">
        <Label>Password</Label>
        <Input type="password" placeholder="••••••••" value={form.password} onChange={set("password")} />
        
        {/* Password Strength Indicator */}
        {form.password && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    level <= getPasswordStrength(form.password)
                      ? getPasswordStrength(form.password) === 1
                        ? "bg-red-500"
                        : getPasswordStrength(form.password) === 2
                        ? "bg-yellow-500"
                        : getPasswordStrength(form.password) === 3
                        ? "bg-blue-500"
                        : "bg-green-500"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <p className={`text-xs font-medium ${
              getPasswordStrength(form.password) === 1 ? "text-red-600" :
              getPasswordStrength(form.password) === 2 ? "text-yellow-600" :
              getPasswordStrength(form.password) === 3 ? "text-blue-600" :
              "text-green-600"
            }`}>
              {getPasswordStrength(form.password) === 1 && "Weak password"}
              {getPasswordStrength(form.password) === 2 && "Fair password"}
              {getPasswordStrength(form.password) === 3 && "Good password"}
              {getPasswordStrength(form.password) === 4 && "Strong password"}
            </p>
          </div>
        )}

        {/* Password Requirements Checklist */}
        {form.password && (
          <div className="mt-3 space-y-1.5 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 text-xs">
              {form.password.length >= 8 ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              )}
              <span className={form.password.length >= 8 ? "text-green-700" : "text-gray-600"}>
                At least 8 characters
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {/[A-Z]/.test(form.password) ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              )}
              <span className={/[A-Z]/.test(form.password) ? "text-green-700" : "text-gray-600"}>
                One uppercase letter
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {/[a-z]/.test(form.password) ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              )}
              <span className={/[a-z]/.test(form.password) ? "text-green-700" : "text-gray-600"}>
                One lowercase letter
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {/\d/.test(form.password) ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              )}
              <span className={/\d/.test(form.password) ? "text-green-700" : "text-gray-600"}>
                One number
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {/[@$!%*?&]/.test(form.password) ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              )}
              <span className={/[@$!%*?&]/.test(form.password) ? "text-green-700" : "text-gray-600"}>
                One special character (@$!%*?&)
              </span>
            </div>
          </div>
        )}
      </div>
      
      <PrimaryBtn 
        onClick={() => {
          if (!isPasswordValid(form.password)) {
            setError("Please ensure your password meets all requirements");
            return;
          }
          setError(null);
          setStep(2);
        }}
        disabled={!form.fullName || !form.email || !isPasswordValid(form.password)}
      >
        Continue →
      </PrimaryBtn>
    </>
  );

  const Step2 = (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div><Label>Institution / School</Label><Input placeholder="e.g., Lycée Pilote de Tunis…" value={form.university} onChange={set("university")} /></div>
        <div>
          <Label>Governorate</Label>
          <Select value={form.region} onChange={set("region")}>
            <option value="">Select…</option>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </Select>
        </div>
      </div>
      <div className="mb-4">
        <Label>Specialty / Subject</Label>
        <Select value={form.specialty} onChange={set("specialty")}>
          <option value="">Select your teaching specialty…</option>
          {EDUCATION_SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
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
      <div className="bg-[#f0f4ff] border border-[#dde2ef] rounded-[12px] p-5 mb-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#63b3ed] bg-opacity-20 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-[#63b3ed]" />
          </div>
          <div>
            <h3 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-[16px] font-bold text-[#0d1b3e] mb-1">
              Almost there!
            </h3>
            <p className="text-[13px] text-[#4a5568] leading-relaxed">
              Your educator account will be created. You can start exploring immediately.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 bg-white bg-opacity-60 rounded-lg p-3">
          <IdCard className="w-5 h-5 text-[#63b3ed] shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] text-[#0d1b3e] font-medium mb-1">
              Verification Required for Full Access
            </p>
            <p className="text-[12px] text-[#8899bb] leading-relaxed">
              To upload resources and create exams, you'll need to verify your educator account. 
              You can do this anytime from your profile settings.
            </p>
          </div>
        </div>
      </div>
      <PrimaryBtn onClick={handleRegister} loading={loading}>
        Create Account → 
      </PrimaryBtn>
      <GhostBtn onClick={() => setStep(2)}>← Back</GhostBtn>
    </>
  ) : (
    <div className="text-center py-8">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-left">
          {error}
        </div>
      )}
      <div className="w-16 h-16 rounded-full bg-[#10b981] bg-opacity-10 flex items-center justify-center mx-auto mb-4">
        <Check className="w-8 h-8 text-[#10b981]" />
      </div>
      <h3 style={{ fontFamily: "var(--font-heading), sans-serif" }} className="text-[20px] font-bold text-[#0d1b3e] mb-2">
        You're all set!
      </h3>
      <p className="text-[14px] text-[#8899bb] mb-6">
        Your student account is ready. Start exploring resources from verified educators.
      </p>
      <PrimaryBtn onClick={handleRegister} loading={loading}>
        Go to Library →
      </PrimaryBtn>
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