"use client"

import { useEffect, useState } from "react"
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { generarResumenProyecto, type ResumenIa } from "@/lib/ia"
import { ApiError } from "@/lib/api"

/**
 * Tarjeta de Resumen Ejecutivo con IA (Sprint 4 ⑤).
 *
 * Autocontenida: maneja su propio estado y llamada al backend, así puede vivir
 * en la pestaña Resumen o moverse a un modal/cabecera sin tocar la lógica.
 */
const claveCache = (proyectoId: string) => `resumen-ia:${proyectoId}`

export function ResumenIaCard({ proyectoId }: { proyectoId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resumen, setResumen] = useState<ResumenIa | null>(null)
  const [copied, setCopied] = useState(false)

  // Persiste el resumen en sessionStorage por proyecto: sobrevive al cambio de
  // pestaña y a recargas dentro de la sesión (se limpia al cerrar la pestaña).
  useEffect(() => {
    try {
      const cache = sessionStorage.getItem(claveCache(proyectoId))
      setResumen(cache ? (JSON.parse(cache) as ResumenIa) : null)
    } catch {
      // sessionStorage no disponible; seguimos sin caché.
    }
  }, [proyectoId])

  async function generar() {
    setLoading(true)
    setError(null)
    try {
      const data = await generarResumenProyecto(proyectoId)
      setResumen(data)
      try {
        sessionStorage.setItem(claveCache(proyectoId), JSON.stringify(data))
      } catch {
        // Si no se puede cachear, no es crítico.
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo generar el resumen. Inténtalo de nuevo.",
      )
    } finally {
      setLoading(false)
    }
  }

  async function copiar() {
    if (!resumen) return
    try {
      await navigator.clipboard.writeText(resumen.resumen)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // El portapapeles puede no estar disponible (contexto no seguro); lo ignoramos.
    }
  }

  return (
    <div className="rounded-xl border border-[#E0E0E0] bg-gradient-to-br from-[#FFFDF2] to-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFD600]/20">
            <Sparkles className="h-5 w-5 text-[#C9A42B]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1A1A1A]">Resumen ejecutivo con IA</h3>
            <p className="max-w-xl text-xs text-[#5C5C5C]">
              Genera un resumen narrativo del proyecto a partir de sus datos reales:
              avance, presupuesto, beneficiarios (H/M), hitos y alertas de riesgo.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={generar}
          disabled={loading}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-[#FFD600] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#C9A42B] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : resumen ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {loading ? "Generando…" : resumen ? "Regenerar" : "Generar resumen"}
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-3 py-2 text-sm font-medium text-[#C8102E]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {resumen && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {resumen.generadoPorIa ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-medium text-green-700">
                <Sparkles className="h-3 w-3" />
                Generado con IA · {resumen.modelo}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F7F7] px-2.5 py-0.5 text-[11px] font-medium text-[#5C5C5C]">
                Resumen automático (sin IA)
              </span>
            )}
            <span className="text-[11px] text-[#9CA3AF]">{formatGeneradoEn(resumen.generadoEn)}</span>
          </div>

          {resumen.aviso && (
            <p className="rounded-lg bg-[#FFF8E1] px-3 py-2 text-xs text-[#8A6D00]">{resumen.aviso}</p>
          )}

          <p className="whitespace-pre-line text-sm leading-relaxed text-[#1A1A1A]">
            {resumen.resumen}
          </p>

          <button
            type="button"
            onClick={copiar}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C5C5C] hover:text-[#1A1A1A]"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      )}
    </div>
  )
}

function formatGeneradoEn(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return ""
  return fecha.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
}
