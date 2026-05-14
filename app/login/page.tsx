"use client"

import { Suspense, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, Eye, EyeOff, LogIn, Shield } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login({ email, contrasenha: password })
      const from = searchParams.get("from")
      router.push(from && from.startsWith("/") ? from : "/")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No pudimos iniciar sesión"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL – Brand ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1A1A1A 0%, #2C2C2C 60%, #3A3A2A 100%)" }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-24 -left-24 h-72 w-72 rounded-full opacity-10"
          style={{ background: "#FFD600" }}
        />
        <div
          className="absolute bottom-0 right-0 h-96 w-96 rounded-full opacity-5"
          style={{ background: "#FFD600", transform: "translate(30%, 30%)" }}
        />
        <div
          className="absolute top-1/2 -right-12 h-48 w-48 rounded-full opacity-10"
          style={{ background: "#C8102E" }}
        />

        {/* Logo & name */}
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

        {/* Main copy */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-black text-white leading-tight">
            Gestión<br />
            <span style={{ color: "#FFD600" }}>transparente</span><br />
            de proyectos
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#A0A0A0" }}>
            Monitorea actividades, hitos y documentos de los proyectos de la red de
            instituciones de derechos humanos y vigilancia ambiental del Perú.
          </p>

          {/* Stats row */}
          <div className="flex gap-8 pt-2">
            {[
              { label: "Proyectos activos", value: "8" },
              { label: "Instituciones miembro", value: "12" },
              { label: "Regiones", value: "3" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "#A0A0A0" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="relative z-10 text-xs" style={{ color: "#5C5C5C" }}>
          © 2026 Red Muqui · Todos los derechos reservados
        </p>
      </div>

      {/* ── RIGHT PANEL – Form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-[#FAFAFA]">
        {/* Mobile logo */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl font-black text-base"
            style={{ background: "#FFD600", color: "#1A1A1A" }}
          >
            M
          </div>
          <p className="font-bold text-[#1A1A1A] text-lg">Red Muqui</p>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4"
              style={{ background: "#FFD600" + "22", color: "#C9A42B" }}
            >
              <Shield className="h-3 w-3" />
              Acceso seguro
            </div>
            <h2 className="text-2xl font-black text-[#1A1A1A]">Iniciar sesión</h2>
            <p className="text-sm text-[#5C5C5C] mt-1">
              Ingresa tus credenciales para acceder a la plataforma
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@muqui.org"
                className="w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#ADADAD] outline-none transition-all focus:border-[#FFD600] focus:ring-2 focus:ring-[#FFD600]/20"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 pr-12 text-sm text-[#1A1A1A] placeholder-[#ADADAD] outline-none transition-all focus:border-[#FFD600] focus:ring-2 focus:ring-[#FFD600]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ADADAD] hover:text-[#5C5C5C] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember + forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[#E0E0E0] accent-[#FFD600]"
                />
                <span className="text-sm text-[#5C5C5C]">Recordarme</span>
              </label>
              <Link
                href="/recuperar"
                className="text-sm font-medium transition-colors hover:underline"
                style={{ color: "#C9A42B" }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Error banner */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
                style={{
                  background: "#C8102E" + "0D",
                  borderColor: "#C8102E" + "33",
                  color: "#C8102E",
                }}
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-xl px-4 py-3 text-sm font-bold text-[#1A1A1A] transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-60"
              style={{ background: "#FFD600" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Ingresando…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Ingresar a la plataforma
                </span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E0E0E0]" />
            <span className="text-xs text-[#ADADAD]">o continúa con</span>
            <div className="flex-1 h-px bg-[#E0E0E0]" />
          </div>

          {/* Google SSO hint */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 text-sm font-medium text-[#1A1A1A] hover:bg-[#F7F7F7] transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Ingresar con Google Workspace
          </button>

          {/* Help text */}
          <p className="mt-8 text-center text-xs text-[#ADADAD]">
            ¿Problemas para acceder?{" "}
            <button className="font-medium underline underline-offset-2 text-[#5C5C5C] hover:text-[#1A1A1A]">
              Contacta al administrador
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] text-sm text-[#5C5C5C]">
          Cargando inicio de sesión...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
