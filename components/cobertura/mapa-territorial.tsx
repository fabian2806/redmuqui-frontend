"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Eye, Pin, X } from "lucide-react"
import type { CoberturaTerritorial } from "@/lib/reportes"

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

const METRICAS: { key: Metrica; label: string }[] = [
  { key: "proyectos", label: "Proyectos" },
  { key: "presupuesto", label: "Presupuesto" },
  { key: "beneficiarios", label: "Beneficiarios" },
  { key: "instituciones", label: "Instituciones" },
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-PE").format(value)
}

function formatMetrica(metrica: Metrica, value: number): string {
  return metrica === "presupuesto" ? formatCurrency(value) : formatNumber(Math.round(value))
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

  // Tramos lineales (3 cortes → 4 clases) sobre el máximo de la métrica activa.
  const cortes = useMemo(() => {
    let max = 0
    for (const c of porUbigeo.values()) max = Math.max(max, c[metrica])
    if (max <= 0) return [] as number[]
    return [max * 0.25, max * 0.5, max * 0.75]
  }, [porUbigeo, metrica])

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

  const ranking = useMemo(() => {
    return [...porUbigeo.values()]
      .filter((c) => c[metrica] > 0)
      .sort((a, b) => b[metrica] - a[metrica])
      .slice(0, 6)
  }, [porUbigeo, metrica])

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

  const activoUbigeo = pinned ?? hovered
  const detalle = activoUbigeo ? porUbigeo.get(activoUbigeo) : undefined
  const estaFijado = pinned !== null && pinned === activoUbigeo

  const hoverData = hovered ? porUbigeo.get(hovered) : undefined
  const metricaLabel = METRICAS.find((m) => m.key === metrica)?.label ?? ""

  const generoSub = (h: number, m: number) =>
    h + m > 0 ? `${formatNumber(m)} mujeres · ${formatNumber(h)} hombres` : undefined

  if (geoError) {
    return (
      <div className="rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-4 py-3 text-sm font-medium text-[#C8102E]">
        No se pudo cargar la geometría del mapa.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Mapa */}
      <div className="lg:col-span-2 rounded-lg border border-[#E0E0E0] bg-white p-4 shadow-sm">
        {/* Eje 1: colorear */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#5C5C5C]">Colorear por:</span>
          {METRICAS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetrica(m.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                metrica === m.key
                  ? "bg-[#FFD600] text-[#1A1A1A]"
                  : "border border-[#E0E0E0] text-[#5C5C5C] hover:bg-[#F7F7F7]"
              }`}
            >
              {m.label}
            </button>
          ))}
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
                return (
                  <path
                    key={p.ubigeo}
                    d={p.d}
                    fill={colorDe(p.ubigeo)}
                    stroke={esPinned ? "#1A1A1A" : esHover ? "#5C5C5C" : "#FFFFFF"}
                    strokeWidth={esPinned ? 2 : esHover ? 1.4 : 0.8}
                    strokeLinejoin="round"
                    className="cursor-pointer transition-[stroke,fill]"
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

        {/* Leyenda por tramos (nombra la métrica activa) */}
        <div className="mt-3">
          <p className="mb-1 text-center text-xs font-medium text-[#5C5C5C]">
            Coloreando por {metricaLabel.toLowerCase()}
          </p>
          <div className="flex items-end justify-center gap-px text-[10px] text-[#5C5C5C]">
            <LegendSwatch color={COLOR_CERO} label="0" />
            {RAMP.map((color, i) => (
              <LegendSwatch
                key={color}
                color={color}
                label={
                  cortes.length === 0
                    ? ""
                    : i === RAMP.length - 1
                      ? `> ${formatMetrica(metrica, cortes[2])}`
                      : `≤ ${formatMetrica(metrica, cortes[i])}`
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Eje 2: inspección + ranking (columna derecha) */}
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
              <h3 className="text-lg font-bold capitalize text-[#1A1A1A]">
                {detalle.nombre.toLowerCase()}
              </h3>

              <div className="mt-4 space-y-2">
                <PanelStat label="Proyectos" value={formatNumber(detalle.proyectos)} activo={metrica === "proyectos"} />
                <PanelStat label="Presupuesto" value={formatCurrency(detalle.presupuesto)} activo={metrica === "presupuesto"} />
                <PanelStat
                  label="Beneficiarios"
                  value={formatNumber(detalle.beneficiarios)}
                  activo={metrica === "beneficiarios"}
                  sub={generoSub(detalle.beneficiariosHombres, detalle.beneficiariosMujeres)}
                />
                <PanelStat label="Instituciones" value={formatNumber(detalle.instituciones)} activo={metrica === "instituciones"} />
              </div>

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
              <div className="mt-4 space-y-2">
                <PanelStat label="Proyectos" value={formatNumber(totales.proyectos)} activo={metrica === "proyectos"} />
                <PanelStat label="Presupuesto" value={formatCurrency(totales.presupuesto)} activo={metrica === "presupuesto"} />
                <PanelStat
                  label="Beneficiarios"
                  value={formatNumber(totales.beneficiarios)}
                  activo={metrica === "beneficiarios"}
                  sub={generoSub(totales.beneficiariosHombres, totales.beneficiariosMujeres)}
                />
                <PanelStat label="Instituciones" value={formatNumber(totales.instituciones)} activo={metrica === "instituciones"} />
              </div>
            </div>
          )}
        </div>

        {/* Ranking por la métrica activa */}
        <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
          <div className="border-b border-[#E0E0E0] px-5 py-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
              Top por {metricaLabel.toLowerCase()}
            </h3>
          </div>
          {ranking.length === 0 ? (
            <p className="px-5 py-4 text-xs text-[#5C5C5C]">Sin datos para esta métrica.</p>
          ) : (
            <ol className="divide-y divide-[#E0E0E0]">
              {ranking.map((c, i) => {
                const activo = c.codigo === activoUbigeo
                return (
                  <li key={c.codigo ?? c.idTerritorio}>
                    <button
                      onClick={() => setPinned(c.codigo)}
                      onMouseEnter={() => setHovered(c.codigo)}
                      onMouseLeave={() => setHovered(null)}
                      className={`flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-[#FFFDE7] ${
                        activo ? "bg-[#FFF8D6]" : ""
                      }`}
                    >
                      <span className="w-4 text-xs font-bold text-[#C9A42B]">{i + 1}</span>
                      <span className="flex-1 truncate text-sm capitalize text-[#1A1A1A]">
                        {c.nombre.toLowerCase()}
                      </span>
                      <span className="text-sm font-semibold text-[#1A1A1A]">
                        {formatMetrica(metrica, c[metrica])}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="h-3 w-9 rounded-sm" style={{ backgroundColor: color }} />
      <span className="whitespace-nowrap">{label}</span>
    </div>
  )
}

function PanelStat({
  label,
  value,
  activo,
  sub,
}: {
  label: string
  value: string
  activo: boolean
  sub?: string
}) {
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
      {sub && <p className="mt-0.5 text-[10px] text-[#5C5C5C]">{sub}</p>}
    </div>
  )
}
