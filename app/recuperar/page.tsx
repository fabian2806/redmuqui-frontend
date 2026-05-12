"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail, Shield, AlertCircle, CheckCircle } from "lucide-react"
import { requestRecovery } from "@/lib/auth"

export default function RecuperarPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [networkError, setNetworkError] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setNetworkError(false)

    try {
      await requestRecovery(email)
      setSuccess(true)
    } catch {
      setNetworkError(true)
    } finally {
      setLoading(false)
    }
  }

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
            Recupera tu{" "}
            <span className="text-[#FFD600]">acceso</span>{" "}
            a la plataforma
          </h1>
          <p className="text-base leading-relaxed text-[#A0A0A0]">
            Te enviaremos un enlace seguro para que puedas restablecer tu contraseña y retomar el seguimiento de tus proyectos.
          </p>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-xs text-[#5C5C5C]">
            © 2026 Red Muqui · Todos los derechos reservados
          </p>
        </div>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center bg-[#FAFAFA] px-8 py-12 sm:px-12">
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

          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: "#FFD600" + "22" }}>
            <Shield className="h-3.5 w-3.5" style={{ color: "#C9A42B" }} />
            <span className="text-xs font-semibold" style={{ color: "#C9A42B" }}>Acceso seguro</span>
          </div>

          {/* Encabezado */}
          <h2 className="text-2xl font-black text-[#1A1A1A]">Recuperar contraseña</h2>
          <p className="mt-2 mb-8 text-sm leading-relaxed text-[#5C5C5C]">
            Te enviaremos un enlace para restablecer tu contraseña.
          </p>

          {/* Banners */}
          {success && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
              style={{ background: "#16A34A" + "0D", borderColor: "#16A34A" + "33", color: "#16A34A" }}
            >
              <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>
                Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada y spam.
              </span>
            </div>
          )}

          {networkError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium"
              style={{ background: "#C8102E" + "0D", borderColor: "#C8102E" + "33", color: "#C8102E" }}
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>No pudimos procesar tu solicitud. Intenta más tarde.</span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-[#1A1A1A]">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@redmuqui.org"
                required
                className="w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-[#A0A0A0] outline-none transition-all focus:border-[#FFD600] focus:ring-2 focus:ring-[#FFD600]/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD600] px-4 py-3 text-sm font-bold text-[#1A1A1A] transition-all hover:bg-[#C9A42B] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Enviar enlace de recuperación
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#5C5C5C]">
            ¿Recordaste tu contraseña?{" "}
            <Link href="/login" className="font-medium hover:underline" style={{ color: "#C9A42B" }}>
              Volver al inicio de sesión
            </Link>
          </p>

          <p className="mt-8 text-center text-xs text-[#A0A0A0]">
            Red Muqui © 2026 · Desde 2003 defendiendo los derechos de comunidades mineras
          </p>
        </div>
      </div>
    </div>
  )
}
