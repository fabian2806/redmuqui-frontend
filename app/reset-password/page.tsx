"use client"

import { Suspense, useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Eye,
  EyeOff,
  Shield,
  AlertCircle,
  CheckCircle,
  KeyRound,
  Check,
  X,
} from "lucide-react"
import { resetPassword } from "@/lib/auth"

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/

interface Requirement {
  label: string
  test: (v: string) => boolean
}

const REQUIREMENTS: Requirement[] = [
  { label: "Al menos 8 caracteres", test: (v) => v.length >= 8 },
  { label: "Una letra mayúscula", test: (v) => /[A-Z]/.test(v) },
  { label: "Una letra minúscula", test: (v) => /[a-z]/.test(v) },
  { label: "Un número", test: (v) => /\d/.test(v) },
  { label: "Un carácter especial", test: (v) => /[^a-zA-Z0-9]/.test(v) },
]

function InvalidToken() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C8102E]/10">
        <AlertCircle className="h-8 w-8 text-[#C8102E]" />
      </div>
      <div>
        <h2 className="text-xl font-black text-[#1A1A1A]">Enlace inválido o incompleto</h2>
        <p className="mt-2 text-sm text-[#5C5C5C]">
          El enlace que usaste no es válido o ha expirado.
        </p>
      </div>
      <Link
        href="/recuperar"
        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#FFD600] px-6 py-3 text-sm font-bold text-[#1A1A1A] transition-all hover:bg-[#C9A42B]"
      >
        Solicitar nuevo enlace
      </Link>
    </div>
  )
}

function ResetForm({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const passwordValid =
    password.length >= 8 && PASSWORD_REGEX.test(password)
  const passwordsMatch = password === confirm && confirm.length > 0
  const canSubmit = passwordValid && passwordsMatch && !loading

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => router.push("/login"), 3000)
      return () => clearTimeout(timer)
    }
  }, [success, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setErrorMsg("")

    try {
      await resetPassword(token, password)
      setSuccess(true)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Token inválido o expirado.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Badge */}
      <div className="mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: "#FFD600" + "22" }}>
        <Shield className="h-3.5 w-3.5" style={{ color: "#C9A42B" }} />
        <span className="text-xs font-semibold" style={{ color: "#C9A42B" }}>Acceso seguro</span>
      </div>

      <h2 className="text-2xl font-black text-[#1A1A1A]">Nueva contraseña</h2>
      <p className="mt-2 mb-8 text-sm leading-relaxed text-[#5C5C5C]">
        Define una contraseña segura para tu cuenta.
      </p>

      {/* Banners */}
      {success && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
          style={{ background: "#16A34A" + "0D", borderColor: "#16A34A" + "33", color: "#16A34A" }}
        >
          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>Contraseña restablecida con éxito. Redirigiendo al inicio de sesión...</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
          style={{ background: "#C8102E" + "0D", borderColor: "#C8102E" + "33", color: "#C8102E" }}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nueva contraseña */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-[#1A1A1A]">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-2.5 pr-11 text-sm text-[#1A1A1A] placeholder-[#A0A0A0] outline-none transition-all focus:border-[#FFD600] focus:ring-2 focus:ring-[#FFD600]/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-[#5C5C5C]"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Checklist de requisitos */}
          {password.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {REQUIREMENTS.map((req) => {
                const met = req.test(password)
                return (
                  <li key={req.label} className="flex items-center gap-2 text-xs">
                    {met ? (
                      <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#16A34A]" />
                    ) : (
                      <X className="h-3.5 w-3.5 flex-shrink-0 text-[#A0A0A0]" />
                    )}
                    <span className={met ? "text-[#16A34A]" : "text-[#A0A0A0]"}>{req.label}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Confirmar contraseña */}
        <div className="space-y-1.5">
          <label htmlFor="confirm" className="block text-sm font-medium text-[#1A1A1A]">
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-2.5 pr-11 text-sm text-[#1A1A1A] placeholder-[#A0A0A0] outline-none transition-all focus:border-[#FFD600] focus:ring-2 focus:ring-[#FFD600]/20"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-[#5C5C5C]"
              aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirm.length > 0 && !passwordsMatch && (
            <p className="text-xs font-medium text-[#C8102E]">Las contraseñas no coinciden.</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD600] px-4 py-3 text-sm font-bold text-[#1A1A1A] transition-all hover:bg-[#C9A42B] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Restableciendo...
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" />
              Restablecer contraseña
            </>
          )}
        </button>
      </form>
    </>
  )
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""

  return (
    <div className="mx-auto w-full max-w-sm">
      {/* Logo mobile */}
      <div className="flex items-center gap-3 mb-10 lg:hidden">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl font-black text-base"
          style={{ background: "#FFD600", color: "#1A1A1A" }}
        >
          M
        </div>
        <p className="font-bold text-[#1A1A1A] text-lg">Red Muqui</p>
      </div>

      {token ? <ResetForm token={token} /> : <InvalidToken />}

      <p className="mt-8 text-center text-xs text-[#A0A0A0]">
        Red Muqui © 2026 · Desde 2003 defendiendo los derechos de comunidades mineras
      </p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-4 animate-pulse">
      <div className="h-6 w-24 rounded-full bg-[#E0E0E0]" />
      <div className="h-8 w-48 rounded-lg bg-[#E0E0E0]" />
      <div className="h-4 w-64 rounded bg-[#E0E0E0]" />
      <div className="h-12 w-full rounded-xl bg-[#E0E0E0]" />
      <div className="h-12 w-full rounded-xl bg-[#E0E0E0]" />
      <div className="h-12 w-full rounded-xl bg-[#E0E0E0]" />
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1A1A1A 0%, #2C2C2C 60%, #3A3A2A 100%)" }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#FFD600]/8" />
          <div className="absolute top-1/3 -right-32 h-80 w-80 rounded-full bg-[#C8102E]/8" />
          <div className="absolute -bottom-16 left-1/4 h-64 w-64 rounded-full bg-[#FFD600]/5" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl font-black text-lg"
            style={{ background: "#FFD600", color: "#1A1A1A" }}
          >
            M
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">Red Muqui</p>
            <p className="text-xs" style={{ color: "#FFD600" }}>Plataforma de Gestión</p>
          </div>
        </div>

        {/* Contenido central */}
        <div className="relative space-y-6">
          <div className="inline-block rounded-full border border-[#FFD600]/30 bg-[#FFD600]/10 px-4 py-1.5">
            <span className="text-xs font-medium text-[#FFD600] uppercase tracking-wider">
              Acceso seguro
            </span>
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white text-balance">
            Define tu{" "}
            <span className="text-[#FFD600]">nueva contraseña</span>{" "}
            de acceso
          </h1>
          <p className="text-base leading-relaxed text-[#A0A0A0]">
            Elige una contraseña segura para proteger tu cuenta y el acceso a los proyectos de incidencia de Red Muqui.
          </p>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-xs text-[#5C5C5C]">
            © 2026 Red Muqui · Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center bg-[#FAFAFA] px-8 py-12 sm:px-12">
        <Suspense fallback={<LoadingSkeleton />}>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  )
}
