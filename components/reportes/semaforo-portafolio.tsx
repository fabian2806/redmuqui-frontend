"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ProgressBar } from "@/components/ui/progress-bar"
import { RiesgoBadge } from "@/components/ui/riesgo-badge"
import { ApiError } from "@/lib/api"
import { formatDateOnly } from "@/lib/date-only"
import { useAuth } from "@/hooks/useAuth"
import {
  clasificarRiesgo,
  obtenerIndicadores,
  obtenerProyectosEnRiesgo,
  SEMAFORO,
  type Indicadores,
  type NivelSemaforo,
  type ProyectoRiesgo,
} from "@/lib/reportes"
import { AlertTriangle, Eye, ShieldCheck } from "lucide-react"

// Orden de severidad para listar primero lo más urgente.
const ORDEN_NIVEL: Record<"critico" | "atencion", number> = {
  critico: 0,
  atencion: 1,
}

type Tono = "rojo" | "ambar" | "neutro"

const TONO_CHIP: Record<Tono, string> = {
  rojo: "border-[#C8102E]/20 bg-[#C8102E]/10 text-[#C8102E]",
  ambar: "border-[#F57C00]/20 bg-[#F57C00]/10 text-[#F57C00]",
  neutro: "border-[#E0E0E0] bg-[#F7F7F7] text-[#5C5C5C]",
}

/** Motivos legibles por los que un proyecto entró al semáforo. */
function motivos(p: ProyectoRiesgo): { label: string; tono: Tono }[] {
  const lista: { label: string; tono: Tono }[] = []
  if (p.hitosVencidos > 0) {
    lista.push({
      label: `${p.hitosVencidos} hito${p.hitosVencidos !== 1 ? "s" : ""} vencido${p.hitosVencidos !== 1 ? "s" : ""}`,
      tono: "rojo",
    })
  }
  if (p.diasRestantes !== null && p.diasRestantes < 0) {
    lista.push({ label: "Plazo vencido", tono: "rojo" })
  } else if (p.diasRestantes !== null && p.diasRestantes <= 30) {
    lista.push({
      label: `Vence en ${p.diasRestantes} día${p.diasRestantes !== 1 ? "s" : ""}`,
      tono: "ambar",
    })
  }
  if (p.porcentajeAvance < 70) {
    lista.push({ label: `Avance ${Math.round(p.porcentajeAvance)}%`, tono: "ambar" })
  }
  return lista
}

/**
 * Semáforo de Portafolio (Sprint 4 ③, RF-071). Clasifica los proyectos
 * activos en riesgo (rojo/ámbar/verde) reutilizando los endpoints
 * `/reportes/indicadores` y `/reportes/proyectos-en-riesgo`. Pensado para
 * vivir dentro de una pestaña de `/reportes`.
 */
export function SemaforoPortafolio() {
  const { loading: authLoading } = useAuth()

  const [indicadores, setIndicadores] = useState<Indicadores | null>(null)
  const [enRiesgo, setEnRiesgo] = useState<ProyectoRiesgo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    let cancelled = false

    async function cargar() {
      setLoading(true)
      setError(null)
      try {
        const [indicadoresData, riesgoData] = await Promise.all([
          obtenerIndicadores(),
          obtenerProyectosEnRiesgo(),
        ])
        if (!cancelled) {
          setIndicadores(indicadoresData)
          setEnRiesgo(riesgoData)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "No se pudo cargar el semáforo de portafolio",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    cargar()
    return () => {
      cancelled = true
    }
  }, [authLoading])

  const criticos = enRiesgo.filter((p) => clasificarRiesgo(p) === "critico").length
  const atencion = enRiesgo.length - criticos
  // El endpoint solo trae los activos en riesgo; el resto de activos es "saludable".
  const activos = indicadores?.proyectosActivos ?? null
  const saludables =
    activos !== null ? Math.max(0, activos - enRiesgo.length) : null

  const ordenados = [...enRiesgo].sort((a, b) => {
    const porNivel =
      ORDEN_NIVEL[clasificarRiesgo(a)] - ORDEN_NIVEL[clasificarRiesgo(b)]
    if (porNivel !== 0) return porNivel
    // Dentro del mismo nivel: más urgente (menos días restantes) primero; sin fecha al final.
    const da = a.diasRestantes ?? Number.POSITIVE_INFINITY
    const db = b.diasRestantes ?? Number.POSITIVE_INFINITY
    return da - db
  })

  const resumen: { nivel: NivelSemaforo; valor: number | null }[] = [
    { nivel: "critico", valor: loading ? null : criticos },
    { nivel: "atencion", valor: loading ? null : atencion },
    { nivel: "saludable", valor: loading ? null : saludables },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#1A1A1A]">
          Semáforo de Portafolio
        </h2>
        <p className="text-sm text-[#5C5C5C]">
          Estado de los proyectos activos según hitos vencidos, plazo y avance
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-4 py-3 text-sm font-medium text-[#C8102E]">
          {error}
        </div>
      )}

      {/* Tarjetas resumen del semáforo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {resumen.map(({ nivel, valor }) => {
          const meta = SEMAFORO[nivel]
          return (
            <div
              key={nivel}
              className={`rounded-lg border border-[#E0E0E0] border-l-4 ${meta.borderL} bg-white p-5 shadow-sm`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                <p className={`text-sm font-semibold ${meta.text}`}>{meta.label}</p>
              </div>
              <p className="mt-2 text-3xl font-bold text-[#1A1A1A]">
                {valor === null ? "—" : valor}
              </p>
              <p className="mt-1 text-xs text-[#5C5C5C]">{meta.descripcion}</p>
            </div>
          )
        })}
      </div>

      {/* Detalle de proyectos en alerta */}
      <div className="overflow-hidden rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#E0E0E0] px-5 py-4">
          <AlertTriangle className="h-4 w-4 text-[#F57C00]" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
            Proyectos en alerta
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E0E0E0] bg-[#FAFAFA]">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                  Proyecto
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                  Nivel
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                  Motivos
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                  Plazo
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                  Avance
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-3">
                      <div className="h-8 animate-pulse rounded bg-[#FAFAFA]" />
                    </td>
                  </tr>
                ))
              ) : ordenados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-sm text-[#5C5C5C]">
                      <ShieldCheck className="h-8 w-8 text-[#2E7D32]" />
                      <span>
                        Ningún proyecto activo en riesgo. Todo el portafolio está
                        saludable.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                ordenados.map((p, index) => (
                  <tr
                    key={p.id}
                    className={`border-b border-[#E0E0E0] transition-colors hover:bg-[#FFFDE7] ${
                      index % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"
                    }`}
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-[#1A1A1A]">{p.nombre}</p>
                      <p className="text-xs text-[#5C5C5C]">{p.codigoInterno}</p>
                    </td>
                    <td className="px-5 py-3">
                      <RiesgoBadge nivel={clasificarRiesgo(p)} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {motivos(p).map((m) => (
                          <span
                            key={m.label}
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONO_CHIP[m.tono]}`}
                          >
                            {m.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {p.diasRestantes === null ? (
                        <span className="text-sm text-[#5C5C5C]">Sin fecha</span>
                      ) : p.diasRestantes < 0 ? (
                        <>
                          <span className="text-sm font-semibold text-[#C8102E]">
                            Vencido
                          </span>
                          <br />
                          <span className="text-[10px] text-[#5C5C5C]">
                            Venció: {formatDateOnly(p.fechaFinEstimada)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            className={`text-sm font-semibold ${
                              p.diasRestantes < 30 ? "text-[#C8102E]" : "text-[#F57C00]"
                            }`}
                          >
                            {p.diasRestantes} días
                          </span>
                          <br />
                          <span className="text-[10px] text-[#5C5C5C]">
                            Vence: {formatDateOnly(p.fechaFinEstimada)}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-5 py-3 w-32">
                      <ProgressBar value={Math.round(p.porcentajeAvance)} size="sm" />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/proyectos/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-[#F7F7F7] px-2.5 py-1.5 text-xs font-medium text-[#5C5C5C] hover:bg-[#FFD600] hover:text-[#1A1A1A]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
