"use client"

import { useEffect, useMemo, useState } from "react"
import type { CoberturaTerritorial } from "@/lib/reportes"

// ---------------------------------------------------------------------------
// Mapa Territorial del Perú (Sprint 4 ④).
// Proyecta el GeoJSON de departamentos (public/geo/peru-departamentos.json) a
// un SVG y lo colorea por métrica de cobertura. Sin librerías de mapas: la
// geometría es estática y la proyección es una equirectangular simple con
// corrección de longitud por la latitud media (suficiente para el Perú).
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

interface MapaTerritorialProps {
  cobertura: CoberturaTerritorial[]
  loading?: boolean
}

export function MapaTerritorial({ cobertura, loading = false }: MapaTerritorialProps) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null)
  const [geoError, setGeoError] = useState(false)
  const [metrica, setMetrica] = useState<Metrica>("proyectos")
  const [activo, setActivo] = useState<string | null>(null) // ubigeo seleccionado/hover

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

  // Datos por UBIGEO para el join con la geometría.
  const porUbigeo = useMemo(() => {
    const m = new Map<string, CoberturaTerritorial>()
    for (const c of cobertura) {
      if (c.codigo) m.set(c.codigo, c)
    }
    return m
  }, [cobertura])

  // Proyección + paths (solo depende de la geometría).
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

  const valorDe = (c: CoberturaTerritorial | undefined): number =>
    c ? c[metrica] : 0

  const maxValor = useMemo(() => {
    let max = 0
    for (const c of porUbigeo.values()) max = Math.max(max, valorDe(c))
    return max
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [porUbigeo, metrica])

  const colorDe = (ubigeo: string): string => {
    const v = valorDe(porUbigeo.get(ubigeo))
    if (v <= 0 || maxValor <= 0) return COLOR_CERO
    // sqrt para que los valores bajos no queden casi invisibles
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

  const detalle = activo ? porUbigeo.get(activo) : undefined

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
        {/* Selector de métrica */}
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
              const esActivo = p.ubigeo === activo
              const c = porUbigeo.get(p.ubigeo)
              return (
                <path
                  key={p.ubigeo}
                  d={p.d}
                  fill={colorDe(p.ubigeo)}
                  stroke={esActivo ? "#1A1A1A" : "#FFFFFF"}
                  strokeWidth={esActivo ? 1.8 : 0.8}
                  strokeLinejoin="round"
                  className="cursor-pointer transition-[stroke,fill] hover:stroke-[#1A1A1A]"
                  onMouseEnter={() => setActivo(p.ubigeo)}
                  onClick={() => setActivo(p.ubigeo)}
                >
                  <title>
                    {`${c?.nombre ?? p.nombre}: ${formatNumber(valorDe(c))} ${
                      METRICAS.find((m) => m.key === metrica)?.label.toLowerCase()
                    }`}
                  </title>
                </path>
              )
            })}
          </svg>
        )}

        {/* Leyenda */}
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#5C5C5C]">
          <span>0</span>
          <div
            className="h-2 w-40 rounded-full"
            style={{ background: `linear-gradient(to right, ${COLOR_CERO}, ${COLOR_MIN}, ${COLOR_MAX})` }}
          />
          <span>{formatNumber(maxValor)}</span>
        </div>
      </div>

      {/* Panel de detalle */}
      <div className="rounded-lg border border-[#E0E0E0] bg-white shadow-sm">
        {detalle ? (
          <div className="p-5">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#C9A42B]/30 bg-[#FFD600]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#C9A42B]">
                {detalle.tipo === "DEPARTAMENTO" ? "Departamento" : detalle.tipo}
              </span>
              <span className="text-[11px] text-[#5C5C5C]">UBIGEO {detalle.codigo}</span>
            </div>
            <h3 className="text-lg font-bold capitalize text-[#1A1A1A]">
              {detalle.nombre.toLowerCase()}
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat label="Proyectos" value={formatNumber(detalle.proyectos)} />
              <Stat label="Instituciones" value={formatNumber(detalle.instituciones)} />
              <Stat label="Beneficiarios" value={formatNumber(detalle.beneficiarios)} />
              <Stat label="Presupuesto" value={formatCurrency(detalle.presupuesto)} />
            </div>

            {detalle.proyectos === 0 && (
              <p className="mt-4 text-xs text-[#5C5C5C]">
                La red aún no registra proyectos en este territorio.
              </p>
            )}
          </div>
        ) : (
          <div className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#1A1A1A]">
              Cobertura nacional
            </h3>
            <p className="mt-1 text-xs text-[#5C5C5C]">
              Pasa el cursor o haz clic en un departamento para ver su detalle.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat label="Proyectos" value={formatNumber(totales.proyectos)} />
              <Stat label="Instituciones" value={formatNumber(totales.instituciones)} />
              <Stat label="Beneficiarios" value={formatNumber(totales.beneficiarios)} />
              <Stat label="Presupuesto" value={formatCurrency(totales.presupuesto)} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#E0E0E0] bg-[#FAFAFA] p-3">
      <p className="text-xs text-[#5C5C5C]">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-[#1A1A1A]">{value}</p>
    </div>
  )
}
