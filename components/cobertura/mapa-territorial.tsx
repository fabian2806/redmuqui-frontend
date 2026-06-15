"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Award,
  Building2,
  Check,
  ChevronsUpDown,
  Eye,
  FolderKanban,
  Pin,
  Search,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react"
import type { CoberturaTerritorial } from "@/lib/reportes"
import { KpiCard } from "@/components/ui/kpi-card"
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// ---------------------------------------------------------------------------
// Mapa Territorial del Perú (Sprint 4 ④).
// Dos ejes de interacción, separados para no confundir al usuario:
//   · COLOREAR (chips): un lente sobre todo el mapa. La leyenda nombra la métrica.
//   · INSPECCIONAR (hover/clic): hover = preview + tooltip; clic = fija el panel.
// La geometría es estática (public/geo) y se proyecta sin librerías de mapas.
// El join con los datos es por UBIGEO (codigo ↔ FIRST_IDDP).
// ---------------------------------------------------------------------------

type Geometria =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] }

interface Feature {
  type: "Feature"
  properties: { NOMBDEP: string; FIRST_IDDP: string }
  geometry: Geometria
}

interface FeatureCollection {
  type: "FeatureCollection"
  features: Feature[]
}

type Metrica = "proyectos" | "presupuesto" | "beneficiarios" | "instituciones"

const METRICAS: { key: Metrica; label: string; icon: typeof FolderKanban }[] = [
  { key: "proyectos", label: "Proyectos", icon: FolderKanban },
  { key: "presupuesto", label: "Presupuesto", icon: Wallet },
  { key: "beneficiarios", label: "Beneficiarios", icon: Users },
  { key: "instituciones", label: "Instituciones", icon: Building2 },
]

const VIEW_W = 520
const VIEW_H = 680
const PAD = 14

const COLOR_CERO = "#ECECEC"
// Rampa por clases (claro → oscuro), 4 tramos lineales sobre el máximo.
const RAMP = ["#FFEFA8", "#F2D24E", "#D9B233", "#9A7B12"]

function forEachRing(geom: Geometria, cb: (ring: number[][]) => void) {
  if (geom.type === "Polygon") geom.coordinates.forEach(cb)
  else geom.coordinates.forEach((poly) => poly.forEach(cb))
}

interface FeaturePath {
  ubigeo: string
  nombre: string
  d: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000) return `S/ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `S/ ${(value / 1_000).toFixed(0)}K`
  return formatCurrency(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-PE").format(value)
}

function formatMetrica(metrica: Metrica, value: number): string {
  return metrica === "presupuesto" ? formatCurrency(value) : formatNumber(Math.round(value))
}

function tituloCapital(nombre: string): string {
  return nombre.toLowerCase().replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase())
}

interface MapaTerritorialProps {
  cobertura: CoberturaTerritorial[]
  loading?: boolean
}

export function MapaTerritorial({ cobertura, loading = false }: MapaTerritorialProps) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null)
  const [geoError, setGeoError] = useState(false)
  const [metrica, setMetrica] = useState<Metrica>("proyectos")

  // Dos estados independientes: hover (preview) y pinned (fijado por clic).
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)
  const [buscarOpen, setBuscarOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/geo/peru-departamentos.json")
      .then((r) => {
        if (!r.ok) throw new Error("geo")
        return r.json()
      })
      .then((data: FeatureCollection) => {
        if (!cancelled) setGeo(data)
      })
      .catch(() => {
        if (!cancelled) setGeoError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const porUbigeo = useMemo(() => {
    const m = new Map<string, CoberturaTerritorial>()
    for (const c of cobertura) {
      if (c.codigo) m.set(c.codigo, c)
    }
    return m
  }, [cobertura])

  const paths = useMemo<FeaturePath[]>(() => {
    if (!geo) return []

    let minLon = Infinity
    let maxLon = -Infinity
    let minLat = Infinity
    let maxLat = -Infinity
    for (const f of geo.features) {
      forEachRing(f.geometry, (ring) => {
        for (const [lon, lat] of ring) {
          if (lon < minLon) minLon = lon
          if (lon > maxLon) maxLon = lon
          if (lat < minLat) minLat = lat
          if (lat > maxLat) maxLat = lat
        }
      })
    }

    const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)
    const rawW = (maxLon - minLon) * kx
    const rawH = maxLat - minLat
    const scale = Math.min((VIEW_W - 2 * PAD) / rawW, (VIEW_H - 2 * PAD) / rawH)
    const offsetX = (VIEW_W - rawW * scale) / 2
    const offsetY = (VIEW_H - rawH * scale) / 2

    const project = (lon: number, lat: number): [number, number] => [
      offsetX + (lon - minLon) * kx * scale,
      offsetY + (maxLat - lat) * scale,
    ]

    return geo.features.map((f) => {
      const rings: string[] = []
      forEachRing(f.geometry, (ring) => {
        const segmentos = ring.map(([lon, lat], i) => {
          const [x, y] = project(lon, lat)
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
        })
        rings.push(segmentos.join(" ") + "Z")
      })
      return {
        ubigeo: f.properties.FIRST_IDDP,
        nombre: f.properties.NOMBDEP,
        d: rings.join(" "),
      }
    })
  }, [geo])

  const valorDe = (c: CoberturaTerritorial | undefined): number => (c ? c[metrica] : 0)

  const maxMetrica = useMemo(() => {
    let max = 0
    for (const c of porUbigeo.values()) max = Math.max(max, c[metrica])
    return max
  }, [porUbigeo, metrica])

  // Tramos lineales (3 cortes → 4 clases) sobre el máximo de la métrica activa.
  const cortes = useMemo(() => {
    if (maxMetrica <= 0) return [] as number[]
    return [maxMetrica * 0.25, maxMetrica * 0.5, maxMetrica * 0.75]
  }, [maxMetrica])

  const claseDe = (v: number): number => {
    if (v <= 0 || cortes.length === 0) return -1
    if (v <= cortes[0]) return 0
    if (v <= cortes[1]) return 1
    if (v <= cortes[2]) return 2
    return 3
  }

  const colorDe = (ubigeo: string): string => {
    const clase = claseDe(valorDe(porUbigeo.get(ubigeo)))
    return clase < 0 ? COLOR_CERO : RAMP[clase]
  }

  // Ranking completo ordenado por la métrica activa (para posición y top).
  const rankingCompleto = useMemo(() => {
    return [...porUbigeo.values()]
      .filter((c) => c[metrica] > 0)
      .sort((a, b) => b[metrica] - a[metrica])
  }, [porUbigeo, metrica])

  const ranking = rankingCompleto.slice(0, 6)

  const posicionDe = (codigo?: string | null): number => {
    if (!codigo) return -1
    return rankingCompleto.findIndex((c) => c.codigo === codigo)
  }

  const totales = useMemo(() => {
    return cobertura.reduce(
      (acc, c) => {
        acc.proyectos += c.proyectos
        acc.presupuesto += c.presupuesto
        acc.beneficiarios += c.beneficiarios
        acc.beneficiariosHombres += c.beneficiariosHombres
        acc.beneficiariosMujeres += c.beneficiariosMujeres
        acc.instituciones += c.instituciones
        return acc
      },
      {
        proyectos: 0,
        presupuesto: 0,
        beneficiarios: 0,
        beneficiariosHombres: 0,
        beneficiariosMujeres: 0,
        instituciones: 0,
      },
    )
  }, [cobertura])

  // Insights automáticos sobre la métrica activa.
  const insights = useMemo(() => {
    const conCobertura = rankingCompleto.length
    const totalDeptos = cobertura.length || conCobertura
    const sinCobertura = Math.max(0, totalDeptos - conCobertura)
    const lider = rankingCompleto[0]
    const promedio =
      conCobertura > 0
        ? rankingCompleto.reduce((s, c) => s + c[metrica], 0) / conCobertura
        : 0
    const ultimo = rankingCompleto[rankingCompleto.length - 1]
    const brecha = lider && ultimo ? lider[metrica] - ultimo[metrica] : 0
    return { conCobertura, sinCobertura, lider, promedio, brecha }
  }, [rankingCompleto, cobertura, metrica])

  const activoUbigeo = pinned ?? hovered
  const detalle = activoUbigeo ? porUbigeo.get(activoUbigeo) : undefined
  const estaFijado = pinned !== null && pinned === activoUbigeo

  const hoverData = hovered ? porUbigeo.get(hovered) : undefined
  const metricaActual = METRICAS.find((m) => m.key === metrica)
  const metricaLabel = metricaActual?.label ?? ""

  const generoSub = (h: number, m: number) =>
    h + m > 0 ? `${formatNumber(m)} mujeres · ${formatNumber(h)} hombres` : undefined

  // Etiqueta compacta para la leyenda (moneda abreviada: S/ 387K, S/ 1.2M).
  const formatLeyenda = (value: number): string =>
    metrica === "presupuesto" ? formatCompactCurrency(value) : formatNumber(Math.round(value))

  // Datos del gráfico de barras (top por métrica activa).
  const chartData = useMemo(
    () =>
      ranking.map((c) => ({
        nombre: tituloCapital(c.nombre),
        codigo: c.codigo,
        valor: c[metrica],
      })),
    [ranking, metrica],
  )

  const chartConfig: ChartConfig = {
    valor: { label: metricaLabel, color: "#C9A42B" },
  }

  // Lista ordenada alfabéticamente para el buscador.
  const deptosOrdenados = useMemo(
    () => [...cobertura].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [cobertura],
  )

  if (geoError) {
    return (
      <div className="rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-4 py-3 text-sm font-medium text-[#C8102E]">
        No se pudo cargar la geometría del mapa.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Banda de KPIs nacionales */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Proyectos"
          value={loading ? "—" : formatNumber(totales.proyectos)}
          icon={FolderKanban}
          description={`${insights.conCobertura} departamentos con cobertura`}
        />
        <KpiCard
          title="Presupuesto"
          value={loading ? "—" : formatCompactCurrency(totales.presupuesto)}
          icon={Wallet}
          variant="success"
          description="Inversión acumulada en la red"
        />
        <KpiCard
          title="Beneficiarios"
          value={loading ? "—" : formatNumber(totales.beneficiarios)}
          icon={Users}
          description={generoSub(
            totales.beneficiariosHombres,
            totales.beneficiariosMujeres,
          )}
        />
        <KpiCard
          title="Instituciones"
          value={loading ? "—" : formatNumber(totales.instituciones)}
          icon={Building2}
          description="Aliados activos en territorio"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Mapa */}
        <div className="lg:col-span-2 rounded-lg border border-[#E0E0E0] bg-white p-4 shadow-sm">
          {/* Controles: colorear + buscar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[#5C5C5C]">Colorear por:</span>
              {METRICAS.map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.key}
                    onClick={() => setMetrica(m.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      metrica === m.key
                        ? "bg-[#FFD600] text-[#1A1A1A]"
                        : "border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {m.label}
                  </button>
                )
              })}
            </div>

            {/* Buscador rápido de departamento */}
            <Popover open={buscarOpen} onOpenChange={setBuscarOpen}>
              <PopoverTrigger asChild>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-[#E0E0E0] px-3 py-1.5 text-xs font-medium text-[#5C5C5C] transition-colors hover:bg-[#F7F7F7]"
                  aria-label="Buscar departamento"
                >
                  <Search className="h-3.5 w-3.5" />
                  Buscar departamento
                  <ChevronsUpDown className="h-3 w-3 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Escribe un departamento…" />
                  <CommandList>
                    <CommandEmpty>Sin coincidencias.</CommandEmpty>
                    <CommandGroup>
                      {deptosOrdenados.map((c) => (
                        <CommandItem
                          key={c.codigo ?? c.idTerritorio}
                          value={c.nombre}
                          onSelect={() => {
                            setPinned(c.codigo)
                            setBuscarOpen(false)
                          }}
                        >
                          <Check
                            className={`h-4 w-4 ${
                              pinned === c.codigo ? "opacity-100 text-[#C9A42B]" : "opacity-0"
                            }`}
                          />
                          <span className="flex-1">{tituloCapital(c.nombre)}</span>
                          <span className="text-xs text-[#5C5C5C]">
                            {formatMetrica(metrica, c[metrica])}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div
            ref={wrapRef}
            className="relative"
            onMouseMove={(e) => {
              const rect = wrapRef.current?.getBoundingClientRect()
              if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top })
            }}
            onMouseLeave={() => {
              setHovered(null)
              setTooltip(null)
            }}
          >
            {loading || !geo ? (
              <div className="aspect-[520/680] w-full max-w-[520px] mx-auto animate-pulse rounded-lg bg-[#FAFAFA]" />
            ) : (
              <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                className="mx-auto block h-auto w-full max-w-[520px]"
                role="img"
                aria-label="Mapa de cobertura por departamento"
              >
                {paths.map((p) => {
                  const esPinned = p.ubigeo === pinned
                  const esHover = p.ubigeo === hovered
                  const atenuado = pinned !== null && !esPinned && !esHover
                  return (
                    <path
                      key={p.ubigeo}
                      d={p.d}
                      fill={colorDe(p.ubigeo)}
                      stroke={esPinned ? "#1A1A1A" : esHover ? "#5C5C5C" : "#FFFFFF"}
                      strokeWidth={esPinned ? 2 : esHover ? 1.4 : 0.8}
                      strokeLinejoin="round"
                      style={{
                        opacity: atenuado ? 0.55 : 1,
                        transition: "opacity 200ms, stroke 150ms, fill 300ms",
                      }}
                      className="cursor-pointer"
                      onMouseEnter={() => setHovered(p.ubigeo)}
                      onClick={() =>
                        setPinned((prev) => (prev === p.ubigeo ? null : p.ubigeo))
                      }
                    />
                  )
                })}
              </svg>
            )}

            {/* Tooltip al cursor (preview del departamento bajo el mouse) */}
            {tooltip && hovered && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-[#1A1A1A] px-2 py-1 text-xs text-white shadow-lg"
                style={{ left: tooltip.x, top: tooltip.y - 8 }}
              >
                <span className="font-semibold capitalize">
                  {(hoverData?.nombre ?? hovered).toLowerCase()}
                </span>
                <span className="ml-1 text-[#FFD600]">
                  {formatMetrica(metrica, valorDe(hoverData))} {metricaLabel.toLowerCase()}
                </span>
              </div>
            )}
          </div>

          {/* Leyenda: rango explícito por clase (nombra la métrica activa) */}
          <div className="mt-3">
            <p className="mb-2 text-center text-xs font-medium text-[#5C5C5C]">
              Coloreando por {metricaLabel.toLowerCase()}
            </p>
            {cortes.length === 0 ? (
              <p className="text-center text-[10px] text-[#5C5C5C]">
                Sin datos para esta métrica.
              </p>
            ) : (
              <div className="flex justify-center">
                <LegendLista cortes={cortes} format={formatLeyenda} />
              </div>
            )}
          </div>
        </div>

        {/* Eje 2: inspección + insights + ranking (columna derecha) */}
        <div className="space-y-6">
          {/* Panel de detalle */}
          <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            {detalle ? (
              <div className="p-5">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-[#C9A42B]/30 bg-[#FFD600]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#C9A42B]">
                      {detalle.tipo === "DEPARTAMENTO" ? "Departamento" : detalle.tipo}
                    </span>
                    <span className="text-[11px] text-[#5C5C5C]">UBIGEO {detalle.codigo}</span>
                  </div>
                  {estaFijado && (
                    <button
                      onClick={() => setPinned(null)}
                      className="inline-flex items-center gap-1 rounded-full bg-[#1A1A1A]/5 px-2 py-0.5 text-[11px] font-medium text-[#5C5C5C] hover:bg-[#1A1A1A]/10"
                      title="Soltar selección (Esc)"
                    >
                      <Pin className="h-3 w-3" /> fijado <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold capitalize text-[#1A1A1A]">
                    {detalle.nombre.toLowerCase()}
                  </h3>
                  {posicionDe(detalle.codigo) >= 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#1A1A1A] px-2 py-0.5 text-[11px] font-semibold text-white">
                      <Award className="h-3 w-3 text-[#FFD600]" />#{posicionDe(detalle.codigo) + 1} de {rankingCompleto.length}
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2.5">
                  <PanelStat
                    label="Proyectos"
                    value={formatNumber(detalle.proyectos)}
                    activo={metrica === "proyectos"}
                    ratio={maxMetrica > 0 && metrica === "proyectos" ? detalle.proyectos / maxMetrica : undefined}
                  />
                  <PanelStat
                    label="Presupuesto"
                    value={formatCurrency(detalle.presupuesto)}
                    activo={metrica === "presupuesto"}
                    ratio={maxMetrica > 0 && metrica === "presupuesto" ? detalle.presupuesto / maxMetrica : undefined}
                  />
                  <PanelStat
                    label="Beneficiarios"
                    value={formatNumber(detalle.beneficiarios)}
                    activo={metrica === "beneficiarios"}
                    ratio={maxMetrica > 0 && metrica === "beneficiarios" ? detalle.beneficiarios / maxMetrica : undefined}
                    sub={generoSub(detalle.beneficiariosHombres, detalle.beneficiariosMujeres)}
                    genero={{ h: detalle.beneficiariosHombres, m: detalle.beneficiariosMujeres }}
                  />
                  <PanelStat
                    label="Instituciones"
                    value={formatNumber(detalle.instituciones)}
                    activo={metrica === "instituciones"}
                    ratio={maxMetrica > 0 && metrica === "instituciones" ? detalle.instituciones / maxMetrica : undefined}
                  />
                </div>

                {/* % del total nacional para la métrica activa */}
                {totales[metrica] > 0 && (
                  <p className="mt-3 text-[11px] text-[#5C5C5C]">
                    Representa el{" "}
                    <span className="font-semibold text-[#1A1A1A]">
                      {((detalle[metrica] / totales[metrica]) * 100).toFixed(1)}%
                    </span>{" "}
                    de {metricaLabel.toLowerCase()} a nivel nacional.
                  </p>
                )}

                {detalle.proyectos > 0 ? (
                  <Link
                    href={`/proyectos?idTerritorio=${detalle.idTerritorio}`}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#FFD600] px-4 py-2.5 text-sm font-bold text-[#1A1A1A] transition-colors hover:bg-[#C9A42B]"
                  >
                    <Eye className="h-4 w-4" />
                    Ver {detalle.proyectos} proyecto{detalle.proyectos !== 1 ? "s" : ""}
                  </Link>
                ) : (
                  <p className="mt-4 text-xs text-[#5C5C5C]">
                    La red aún no registra proyectos en este territorio.
                  </p>
                )}

                {!estaFijado && (
                  <p className="mt-3 text-[11px] text-[#5C5C5C]">
                    Haz clic en el departamento para fijarlo.
                  </p>
                )}
              </div>
            ) : (
              <div className="p-5">
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                  Cobertura nacional
                </h3>
                <p className="mt-1 text-xs text-[#5C5C5C]">
                  Pasa el cursor por un departamento para previsualizar; haz clic para fijarlo.
                </p>
                <div className="mt-4 space-y-2.5">
                  <PanelStat label="Proyectos" value={formatNumber(totales.proyectos)} activo={metrica === "proyectos"} />
                  <PanelStat label="Presupuesto" value={formatCurrency(totales.presupuesto)} activo={metrica === "presupuesto"} />
                  <PanelStat
                    label="Beneficiarios"
                    value={formatNumber(totales.beneficiarios)}
                    activo={metrica === "beneficiarios"}
                    sub={generoSub(totales.beneficiariosHombres, totales.beneficiariosMujeres)}
                    genero={{ h: totales.beneficiariosHombres, m: totales.beneficiariosMujeres }}
                  />
                  <PanelStat label="Instituciones" value={formatNumber(totales.instituciones)} activo={metrica === "instituciones"} />
                </div>
              </div>
            )}
          </div>

          {/* Insights automáticos sobre la métrica activa */}
          <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#E0E0E0] px-5 py-3">
              <TrendingUp className="h-4 w-4 text-[#C9A42B]" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Cobertura en cifras
              </h3>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-[#E0E0E0]">
              <InsightCell
                label="Líder"
                value={insights.lider ? tituloCapital(insights.lider.nombre) : "—"}
                sub={insights.lider ? formatMetrica(metrica, insights.lider[metrica]) : undefined}
              />
              <InsightCell
                label={`Promedio · ${metricaLabel.toLowerCase()}`}
                value={formatMetrica(metrica, insights.promedio)}
              />
              <InsightCell
                label="Sin cobertura"
                value={`${insights.sinCobertura}`}
                sub="departamentos"
                muted={insights.sinCobertura === 0}
              />
              <InsightCell
                label="Brecha líder→último"
                value={formatMetrica(metrica, insights.brecha)}
              />
            </div>
          </div>

          {/* Ranking + mini gráfico de barras por la métrica activa */}
          <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
            <div className="border-b border-[#E0E0E0] px-5 py-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
                Top por {metricaLabel.toLowerCase()}
              </h3>
            </div>
            {chartData.length === 0 ? (
              <p className="px-5 py-4 text-xs text-[#5C5C5C]">Sin datos para esta métrica.</p>
            ) : (
              <div className="p-3">
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 4, right: 40, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" dataKey="valor" hide />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      tickLine={false}
                      axisLine={false}
                      width={92}
                      tick={{ fontSize: 11, fill: "#5C5C5C" }}
                    />
                    <ChartTooltip
                      cursor={{ fill: "#FFFDE7" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload as { nombre: string; valor: number }
                        return (
                          <div className="rounded-md border border-[#E0E0E0] bg-white px-2.5 py-1.5 text-xs shadow-md">
                            <p className="font-semibold text-[#1A1A1A]">{d.nombre}</p>
                            <p className="text-[#5C5C5C]">
                              {formatMetrica(metrica, d.valor)} {metricaLabel.toLowerCase()}
                            </p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="valor" radius={[0, 4, 4, 0]} barSize={18}>
                      {chartData.map((d) => (
                        <Cell
                          key={d.codigo}
                          fill={d.codigo === activoUbigeo ? "#1A1A1A" : "#D9B233"}
                          className="cursor-pointer"
                          onMouseEnter={() => setHovered(d.codigo)}
                          onMouseLeave={() => setHovered(null)}
                          onClick={() =>
                            setPinned((prev) => (prev === d.codigo ? null : d.codigo))
                          }
                        />
                      ))}
                      <LabelList
                        dataKey="valor"
                        position="right"
                        className="fill-[#1A1A1A]"
                        style={{ fontSize: 10, fontWeight: 600 }}
                        formatter={(v: number) =>
                          metrica === "presupuesto" ? formatCompactCurrency(v) : formatNumber(v)
                        }
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Leyenda: lista vertical con el rango explícito de cada clase.
function LegendLista({
  cortes,
  format,
}: {
  cortes: number[]
  format: (v: number) => string
}) {
  const filas = [
    { color: RAMP[3], label: `Más de ${format(cortes[2])}` },
    { color: RAMP[2], label: `${format(cortes[1])} – ${format(cortes[2])}` },
    { color: RAMP[1], label: `${format(cortes[0])} – ${format(cortes[1])}` },
    { color: RAMP[0], label: `Hasta ${format(cortes[0])}` },
  ]
  return (
    <div className="inline-flex flex-col gap-1">
      {filas.map((fila) => (
        <div key={fila.label} className="flex items-center gap-2 text-[10px] text-[#5C5C5C]">
          <span
            className="h-3 w-6 shrink-0 rounded-sm"
            style={{ backgroundColor: fila.color }}
          />
          <span>{fila.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 text-[10px] text-[#5C5C5C]">
        <span className="h-3 w-6 shrink-0 rounded-sm" style={{ backgroundColor: COLOR_CERO }} />
        <span>Sin datos</span>
      </div>
    </div>
  )
}

function InsightCell({
  label,
  value,
  sub,
  muted = false,
}: {
  label: string
  value: string
  sub?: string
  muted?: boolean
}) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[#5C5C5C]">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate text-sm font-bold ${
          muted ? "text-[#2E7D32]" : "text-[#1A1A1A]"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-[#5C5C5C]">{sub}</p>}
    </div>
  )
}

function PanelStat({
  label,
  value,
  activo,
  sub,
  ratio,
  genero,
}: {
  label: string
  value: string
  activo: boolean
  sub?: string
  ratio?: number
  genero?: { h: number; m: number }
}) {
  const totalGenero = genero ? genero.h + genero.m : 0
  const pctMujeres = totalGenero > 0 ? (genero!.m / totalGenero) * 100 : 0

  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        activo ? "border-[#C9A42B]/40 bg-[#FFF8D6]" : "border-[#E0E0E0] bg-[#FAFAFA]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-[#5C5C5C]">
          {activo && <span className="h-1.5 w-1.5 rounded-full bg-[#C9A42B]" />}
          {label}
          {activo && <span className="text-[10px] text-[#C9A42B]">coloreando</span>}
        </span>
        <span className="text-sm font-bold text-[#1A1A1A]">{value}</span>
      </div>

      {/* Barra comparativa vs. máximo nacional (solo en métrica activa) */}
      {typeof ratio === "number" && (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E0E0E0]">
          <div
            className="h-full rounded-full bg-[#C9A42B] transition-all duration-500"
            style={{ width: `${Math.max(2, ratio * 100)}%` }}
          />
        </div>
      )}

      {/* Split de género visual para beneficiarios */}
      {genero && totalGenero > 0 && (
        <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full">
          <div className="h-full bg-[#C9A42B]" style={{ width: `${pctMujeres}%` }} />
          <div className="h-full bg-[#1A1A1A]" style={{ width: `${100 - pctMujeres}%` }} />
        </div>
      )}

      {sub && <p className="mt-0.5 text-[10px] text-[#5C5C5C]">{sub}</p>}
    </div>
  )
}
