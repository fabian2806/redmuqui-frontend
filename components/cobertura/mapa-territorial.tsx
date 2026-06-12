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
const COLOR_MIN = "#FFF1B8"
const COLOR_MAX = "#8A6D0F"

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const mix = ca.map((c, i) => Math.round(c + (cb[i] - c) * t))
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`
}

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
  return metrica === "presupuesto" ? formatCurrency(value) : formatNumber(value)
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

  // Esc deselecciona lo fijado.
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

  const maxValor = useMemo(() => {
    let max = 0
    for (const c of porUbigeo.values()) max = Math.max(max, c[metrica])
    return max
  }, [porUbigeo, metrica])

  const colorDe = (ubigeo: string): string => {
    const v = valorDe(porUbigeo.get(ubigeo))
    if (v <= 0 || maxValor <= 0) return COLOR_CERO
    return lerpColor(COLOR_MIN, COLOR_MAX, Math.sqrt(v / maxValor))
  }

  const totales = useMemo(() => {
    return cobertura.reduce(
      (acc, c) => {
        acc.proyectos += c.proyectos
        acc.presupuesto += c.presupuesto
        acc.beneficiarios += c.beneficiarios
        acc.instituciones += c.instituciones
        return acc
      },
      { proyectos: 0, presupuesto: 0, beneficiarios: 0, instituciones: 0 },
    )
  }, [cobertura])

  // El panel se queda en lo fijado; si no hay nada fijado, sigue al hover.
  const activoUbigeo = pinned ?? hovered
  const detalle = activoUbigeo ? porUbigeo.get(activoUbigeo) : undefined
  const estaFijado = pinned !== null && pinned === activoUbigeo

  // Tooltip = siempre el departamento bajo el cursor.
  const hoverData = hovered ? porUbigeo.get(hovered) : undefined
  const metricaLabel = METRICAS.find((m) => m.key === metrica)?.label ?? ""

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

        {/* Leyenda (nombra la métrica activa) */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-[#5C5C5C]">
          <span className="font-medium">Coloreando por {metricaLabel.toLowerCase()}:</span>
          <span>0</span>
          <div
            className="h-2 w-40 rounded-full"
            style={{ background: `linear-gradient(to right, ${COLOR_CERO}, ${COLOR_MIN}, ${COLOR_MAX})` }}
          />
          <span>{formatMetrica(metrica, maxValor)}</span>
        </div>
      </div>

      {/* Eje 2: panel de inspección */}
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
              <PanelStat label="Beneficiarios" value={formatNumber(detalle.beneficiarios)} activo={metrica === "beneficiarios"} />
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
              <PanelStat label="Beneficiarios" value={formatNumber(totales.beneficiarios)} activo={metrica === "beneficiarios"} />
              <PanelStat label="Instituciones" value={formatNumber(totales.instituciones)} activo={metrica === "instituciones"} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PanelStat({
  label,
  value,
  activo,
}: {
  label: string
  value: string
  activo: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
        activo ? "border-[#C9A42B]/40 bg-[#FFF8D6]" : "border-[#E0E0E0] bg-[#FAFAFA]"
      }`}
    >
      <span className="flex items-center gap-1.5 text-xs text-[#5C5C5C]">
        {activo && <span className="h-1.5 w-1.5 rounded-full bg-[#C9A42B]" />}
        {label}
        {activo && <span className="text-[10px] text-[#C9A42B]">coloreando</span>}
      </span>
      <span className="text-sm font-bold text-[#1A1A1A]">{value}</span>
    </div>
  )
}
