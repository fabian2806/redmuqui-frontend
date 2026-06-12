"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { KpiCard } from "@/components/ui/kpi-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { ProgressBar } from "@/components/ui/progress-bar"
import {
  FolderKanban,
  Users,
  Wallet,
  FileText,
  BookOpen,
  Eye,
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { getUserRoleLabel } from "@/lib/user-display"
import { formatDateOnly } from "@/lib/date-only"
import { ApiError } from "@/lib/api"
import {
  obtenerIndicadores,
  obtenerProyectosPorMacroregion,
  obtenerActividadesPorEstado,
  obtenerProyectosEnRiesgo,
  obtenerDocumentosRecientes,
} from "@/lib/reportes"
import type {
  Conteo,
  DocumentoReciente,
  Indicadores,
  ProyectoRiesgo,
} from "@/lib/reportes"
import type { EstadoDocumento } from "@/lib/types"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"

// Paleta de respaldo: las macroregiones son un catálogo dinámico, así que no se
// puede colorear por 3 nombres fijos. Se mapean los conocidos (consistente con
// MacroregionBadge) y se cae a la paleta por índice para cualquier otro.
const PALETTE = ["#C8102E", "#C9A42B", "#424242", "#0277BD", "#2E7D32", "#6A1B9A"]

const MACROREGION_COLORS: Record<string, string> = {
  Norte: "#C8102E",
  Centro: "#C9A42B",
  Sur: "#424242",
}

const ESTADO_ACTIVIDAD_COLORS: Record<string, string> = {
  Finalizadas: "#2E7D32",
  "En curso": "#0277BD",
  Pendientes: "#C9A42B",
  Vencidas: "#C8102E",
}

const colorMacroregion = (etiqueta: string, index: number) =>
  MACROREGION_COLORS[etiqueta] ?? PALETTE[index % PALETTE.length]

const colorEstadoActividad = (etiqueta: string, index: number) =>
  ESTADO_ACTIVIDAD_COLORS[etiqueta] ?? PALETTE[index % PALETTE.length]

// El backend envía el estado en mayúsculas (enum); StatusBadge espera la
// etiqueta en español para colorear y rotular.
const ESTADO_DOC_LABEL: Record<EstadoDocumento, string> = {
  BORRADOR: "Borrador",
  EN_REVISION: "En revisión",
  PUBLICADO: "Publicado",
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()

  const [indicadores, setIndicadores] = useState<Indicadores | null>(null)
  const [indicadoresLoading, setIndicadoresLoading] = useState(true)
  const [indicadoresError, setIndicadoresError] = useState<string | null>(null)

  const [proyectosPorMacroregion, setProyectosPorMacroregion] = useState<Conteo[]>([])
  const [actividadesPorEstado, setActividadesPorEstado] = useState<Conteo[]>([])
  const [chartsLoading, setChartsLoading] = useState(true)
  const [chartsError, setChartsError] = useState<string | null>(null)

  const [proyectosEnRiesgo, setProyectosEnRiesgo] = useState<ProyectoRiesgo[]>([])
  const [documentosRecientes, setDocumentosRecientes] = useState<DocumentoReciente[]>([])
  const [panelesLoading, setPanelesLoading] = useState(true)
  const [panelesError, setPanelesError] = useState<string | null>(null)

  const [formattedDate, setFormattedDate] = useState<string>("")
  const displayRole = getUserRoleLabel(user)

  useEffect(() => {
    const today = new Date()
    setFormattedDate(
      today.toLocaleDateString("es-PE", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    )
  }, [])

  useEffect(() => {
    if (authLoading) return

    let cancelled = false

    async function loadIndicadores() {
      setIndicadoresLoading(true)
      setIndicadoresError(null)
      try {
        const data = await obtenerIndicadores()
        if (!cancelled) setIndicadores(data)
      } catch (err) {
        if (!cancelled) {
          setIndicadoresError(
            err instanceof ApiError
              ? err.message
              : "No se pudieron cargar los indicadores",
          )
          setIndicadores(null)
        }
      } finally {
        if (!cancelled) setIndicadoresLoading(false)
      }
    }

    loadIndicadores()
    return () => {
      cancelled = true
    }
  }, [authLoading])

  useEffect(() => {
    if (authLoading) return

    let cancelled = false

    async function loadCharts() {
      setChartsLoading(true)
      setChartsError(null)
      try {
        const [porMacroregion, porEstado] = await Promise.all([
          obtenerProyectosPorMacroregion(),
          obtenerActividadesPorEstado(),
        ])
        if (!cancelled) {
          setProyectosPorMacroregion(porMacroregion)
          setActividadesPorEstado(porEstado)
        }
      } catch (err) {
        if (!cancelled) {
          setChartsError(
            err instanceof ApiError
              ? err.message
              : "No se pudieron cargar los gráficos",
          )
        }
      } finally {
        if (!cancelled) setChartsLoading(false)
      }
    }

    loadCharts()
    return () => {
      cancelled = true
    }
  }, [authLoading])

  useEffect(() => {
    if (authLoading) return

    let cancelled = false

    async function loadPaneles() {
      setPanelesLoading(true)
      setPanelesError(null)
      try {
        const [enRiesgo, recientes] = await Promise.all([
          obtenerProyectosEnRiesgo(),
          obtenerDocumentosRecientes(),
        ])
        if (!cancelled) {
          setProyectosEnRiesgo(enRiesgo)
          setDocumentosRecientes(recientes)
        }
      } catch (err) {
        if (!cancelled) {
          setPanelesError(
            err instanceof ApiError
              ? err.message
              : "No se pudieron cargar los paneles",
          )
        }
      } finally {
        if (!cancelled) setPanelesLoading(false)
      }
    }

    loadPaneles()
    return () => {
      cancelled = true
    }
  }, [authLoading])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      maximumFractionDigits: 0,
    }).format(value)

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("es-PE").format(value)

  return (
    <AppLayout>
      {/* Welcome header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">
          Bienvenida, {displayRole}
        </h1>
        <p className="text-sm text-[#5C5C5C] capitalize">{formattedDate}</p>
      </div>

      {/* KPI Cards */}
      {indicadoresError ? (
        <div className="mb-8 rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-4 py-3 text-sm font-medium text-[#C8102E]">
          {indicadoresError}
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {indicadoresLoading || !indicadores ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[108px] animate-pulse rounded-lg border border-[#E0E0E0] bg-[#FAFAFA]"
              />
            ))
          ) : (
            <>
              <KpiCard
                title="Proyectos Activos"
                value={indicadores.proyectosActivos}
                icon={FolderKanban}
                variant="default"
                description={`${indicadores.proyectosEnRiesgo} en riesgo`}
              />
              <KpiCard
                title="Presupuesto Gestionado"
                value={formatCurrency(indicadores.presupuestoTotal)}
                icon={Wallet}
                variant="default"
                description="Proyectos activos"
              />
              <KpiCard
                title="Beneficiarios"
                value={formatNumber(
                  indicadores.beneficiariosHombres + indicadores.beneficiariosMujeres,
                )}
                icon={Users}
                variant="success"
                description={`${formatNumber(indicadores.beneficiariosMujeres)} mujeres · ${formatNumber(indicadores.beneficiariosHombres)} hombres`}
              />
              <KpiCard
                title="Documentos Publicados"
                value={indicadores.documentosPublicados}
                icon={BookOpen}
                variant="success"
                description={`${indicadores.documentosPendientes} en proceso`}
              />
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Proyectos en riesgo */}
        <div className="lg:col-span-2 rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E0E0E0] px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
              Proyectos en Riesgo
            </h2>
            <Link
              href="/proyectos"
              className="flex items-center gap-1 text-xs font-medium text-[#C9A42B] hover:text-[#FFD600]"
            >
              Ver todos
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E0E0E0] bg-[#FAFAFA]">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Proyecto
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Hitos vencidos
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
                {panelesError ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#C8102E]">
                      {panelesError}
                    </td>
                  </tr>
                ) : panelesLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-5 py-3">
                        <div className="h-8 animate-pulse rounded bg-[#FAFAFA]" />
                      </td>
                    </tr>
                  ))
                ) : proyectosEnRiesgo.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-[#5C5C5C]">
                      No hay proyectos en riesgo en este momento.
                    </td>
                  </tr>
                ) : (
                  proyectosEnRiesgo.map((proyecto, index) => (
                    <tr
                      key={proyecto.id}
                      className={`border-b border-[#E0E0E0] transition-colors hover:bg-[#FFFDE7] ${
                        index % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"
                      }`}
                    >
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-[#1A1A1A]">
                          {proyecto.nombre}
                        </p>
                        <p className="text-xs text-[#5C5C5C]">{proyecto.codigoInterno}</p>
                      </td>
                      <td className="px-5 py-3">
                        {proyecto.hitosVencidos > 0 ? (
                          <span className="inline-flex items-center rounded-full border border-[#C8102E]/20 bg-[#C8102E]/10 px-2.5 py-0.5 text-xs font-medium text-[#C8102E]">
                            {proyecto.hitosVencidos} vencido{proyecto.hitosVencidos !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-sm text-[#5C5C5C]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {proyecto.diasRestantes === null ? (
                          <span className="text-sm text-[#5C5C5C]">Sin fecha</span>
                        ) : proyecto.diasRestantes < 0 ? (
                          <>
                            <span className="text-sm font-semibold text-[#C8102E]">Vencido</span>
                            <br />
                            <span className="text-[10px] text-[#5C5C5C]">
                              Venció: {formatDateOnly(proyecto.fechaFinEstimada)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span
                              className={`text-sm font-semibold ${
                                proyecto.diasRestantes < 30
                                  ? "text-[#C8102E]"
                                  : "text-[#F57C00]"
                              }`}
                            >
                              {proyecto.diasRestantes} días
                            </span>
                            <br />
                            <span className="text-[10px] text-[#5C5C5C]">
                              Vence: {formatDateOnly(proyecto.fechaFinEstimada)}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-5 py-3 w-32">
                        <ProgressBar value={Math.round(proyecto.porcentajeAvance)} size="sm" />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/proyectos/${proyecto.id}`}
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

        {/* Documentos recientes */}
        <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E0E0E0] px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
              Documentos Recientes
            </h2>
            <Link
              href="/documentos"
              className="flex items-center gap-1 text-xs font-medium text-[#C9A42B] hover:text-[#FFD600]"
            >
              Ver todos
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-[#E0E0E0]">
            {panelesError ? (
              <div className="px-5 py-8 text-center text-sm text-[#C8102E]">
                {panelesError}
              </div>
            ) : panelesLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="h-10 animate-pulse rounded bg-[#FAFAFA]" />
                </div>
              ))
            ) : documentosRecientes.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#5C5C5C]">
                Sin documentos recientes
              </div>
            ) : (
              documentosRecientes.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documentos/${doc.id}`}
                  className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-[#FFFDE7]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FFD600]/20">
                    <FileText className="h-5 w-5 text-[#C9A42B]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#1A1A1A]">
                      {doc.titulo}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      {doc.tipo && (
                        <>
                          <span className="text-xs text-[#5C5C5C]">{doc.tipo}</span>
                          <span className="text-xs text-[#E0E0E0]">•</span>
                        </>
                      )}
                      <StatusBadge estado={ESTADO_DOC_LABEL[doc.estado]} />
                    </div>
                    <p className="mt-1 text-xs text-[#5C5C5C]">
                      {formatDateOnly(doc.fechaCarga)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Proyectos por macroregión */}
        <div className="rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
            Proyectos por Macroregión
          </h2>
          <div className="h-64">
            {chartsError ? (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[#C8102E]">
                {chartsError}
              </div>
            ) : chartsLoading ? (
              <div className="h-full w-full animate-pulse rounded-lg bg-[#FAFAFA]" />
            ) : proyectosPorMacroregion.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#5C5C5C]">
                Sin datos para mostrar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={proyectosPorMacroregion} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis
                    dataKey="etiqueta"
                    tick={{ fontSize: 12, fill: "#5C5C5C" }}
                    axisLine={{ stroke: "#E0E0E0" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#5C5C5C" }}
                    axisLine={{ stroke: "#E0E0E0" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E0E0E0",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                  />
                  <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                    {proyectosPorMacroregion.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.etiqueta}`}
                        fill={colorMacroregion(entry.etiqueta, index)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Estado de actividades */}
        <div className="rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
            Estado de Actividades
          </h2>
          <div className="h-64">
            {chartsError ? (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[#C8102E]">
                {chartsError}
              </div>
            ) : chartsLoading ? (
              <div className="h-full w-full animate-pulse rounded-lg bg-[#FAFAFA]" />
            ) : actividadesPorEstado.every((a) => a.cantidad === 0) ? (
              <div className="flex h-full items-center justify-center text-sm text-[#5C5C5C]">
                Sin datos para mostrar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={actividadesPorEstado}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="cantidad"
                    nameKey="etiqueta"
                    label={({ etiqueta, cantidad }) => `${etiqueta}: ${cantidad}`}
                    labelLine={false}
                  >
                    {actividadesPorEstado.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.etiqueta}`}
                        fill={colorEstadoActividad(entry.etiqueta, index)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E0E0E0",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px" }}
                    formatter={(value) => <span className="text-[#5C5C5C]">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
