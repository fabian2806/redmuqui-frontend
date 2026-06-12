"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { KpiCard } from "@/components/ui/kpi-card"
import { StatusBadge, MacroregionBadge } from "@/components/ui/status-badge"
import { ProgressBar } from "@/components/ui/progress-bar"
import {
  proyectos,
  documentos,
  getProyectosPorMacroregion,
  getActividadesPorEstado
} from "@/lib/data"
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
import { ApiError } from "@/lib/api"
import { obtenerIndicadores } from "@/lib/reportes"
import type { Indicadores } from "@/lib/reportes"
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

const MACROREGION_COLORS = {
  Norte: "#C8102E",
  Centro: "#C9A42B",
  Sur: "#424242"
}

const ESTADO_COLORS = ["#2E7D32", "#0277BD", "#C8102E"]

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const proyectosPorMacroregion = getProyectosPorMacroregion()
  const actividadesPorEstado = getActividadesPorEstado()

  const [indicadores, setIndicadores] = useState<Indicadores | null>(null)
  const [indicadoresLoading, setIndicadoresLoading] = useState(true)
  const [indicadoresError, setIndicadoresError] = useState<string | null>(null)
  
  // Proyectos con alertas (en riesgo o con poco tiempo)
  const proyectosConAlertas = proyectos
    .filter(p => p.estado === "Activo" || p.estado === "Suspendido")
    .slice(0, 5)
    .map(p => {
      const fechaFin = new Date(p.fechaFin)
      const hoy = new Date()
      const diasRestantes = Math.ceil((fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      return { ...p, diasRestantes }
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes)

  // Últimos informes
  const ultimosInformes = documentos
    .sort((a, b) => new Date(b.fechaElaboracion).getTime() - new Date(a.fechaElaboracion).getTime())
    .slice(0, 4)

  const [formattedDate, setFormattedDate] = useState<string>("")
  const [mounted, setMounted] = useState(false)
  const displayRole = getUserRoleLabel(user)

  useEffect(() => {
    setMounted(true)
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

  // Helper function to format date safely
  const formatDate = (dateString: string) => {
    if (!mounted) return ""
    return new Date(dateString).toLocaleDateString("es-PE")
  }

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
        {/* Proyectos con alertas */}
        <div className="lg:col-span-2 rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E0E0E0] px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
              Proyectos con Alertas
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
                    Partida
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Macroregión
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#5C5C5C]">
                    Días restantes
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
                {proyectosConAlertas.map((proyecto, index) => (
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
                      <p className="text-xs text-[#5C5C5C]">{proyecto.codigo}</p>
                    </td>
                    <td className="px-5 py-3">
                      <MacroregionBadge macroregion={proyecto.macroregion} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge estado={proyecto.estado} />
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-sm font-semibold ${
                          proyecto.diasRestantes < 30
                            ? "text-[#C8102E]"
                            : proyecto.diasRestantes < 90
                            ? "text-[#F57C00]"
                            : "text-[#1A1A1A]"
                        }`}
                      >
                        {proyecto.diasRestantes} días
                      </span><br/>
                      <span className="text-[10px] text-[#5C5C5C]">
                        Vence: {formatDate(proyecto.fechaFin)}
                      </span>
                    </td>
                    <td className="px-5 py-3 w-32">
                      <ProgressBar value={proyecto.avance} size="sm" />
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Últimos informes */}
        <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E0E0E0] px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
              Últimos Informes
            </h2>
            <Link
              href="/informes"
              className="flex items-center gap-1 text-xs font-medium text-[#C9A42B] hover:text-[#FFD600]"
            >
              Ver todos
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-[#E0E0E0]">
            {ultimosInformes.map((doc) => (
              <div
                key={doc.id}
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
                    <span className="text-xs text-[#5C5C5C]">{doc.tipo}</span>
                    <span className="text-xs text-[#E0E0E0]">•</span>
                    <StatusBadge estado={doc.estado} />
                  </div>
                  <p className="mt-1 text-xs text-[#5C5C5C]">
                    {formatDate(doc.fechaElaboracion)}
                  </p>
                </div>
              </div>
            ))}
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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={proyectosPorMacroregion} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis 
                  dataKey="macroregion" 
                  tick={{ fontSize: 12, fill: "#5C5C5C" }}
                  axisLine={{ stroke: "#E0E0E0" }}
                />
                <YAxis 
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
                <Bar 
                  dataKey="cantidad" 
                  radius={[4, 4, 0, 0]}
                >
                  {proyectosPorMacroregion.map((entry) => (
                    <Cell 
                      key={`cell-${entry.macroregion}`} 
                      fill={MACROREGION_COLORS[entry.macroregion as keyof typeof MACROREGION_COLORS]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Estado de actividades */}
        <div className="rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
            Estado de Actividades
          </h2>
          <div className="h-64">
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
                  nameKey="estado"
                  label={({ estado, cantidad }) => `${estado}: ${cantidad}`}
                  labelLine={false}
                >
                  {actividadesPorEstado.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={ESTADO_COLORS[index % ESTADO_COLORS.length]} />
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
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
