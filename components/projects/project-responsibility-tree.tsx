"use client"

import { useMemo, useState } from "react"
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react"
import type { OrganigramaProyecto } from "@/lib/types"

const MIN_ZOOM = 0.5
const MAX_ZOOM = 1.5
const ZOOM_STEP = 0.1

export function ProjectResponsibilityTree({ data }: { data: OrganigramaProyecto }) {
  const [zoom, setZoom] = useState(1)
  const minWidth = useMemo(
    () => Math.max(920, data.fases.length * 340),
    [data.fases.length],
  )

  const adjustZoom = (delta: number) => {
    setZoom(current => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((current + delta).toFixed(2)))))
  }

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-[#E0E0E0] bg-[#FAFAFA]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E0E0E0] bg-white px-4 py-3">
        <div>
          <h4 className="text-sm font-bold text-[#1A1A1A]">Estructura jerárquica de responsables</h4>
          <p className="text-xs text-[#5C5C5C]">Proyecto → fases → actividades → subactividades</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[#E0E0E0] bg-white p-1">
          <button type="button" onClick={() => adjustZoom(-ZOOM_STEP)} disabled={zoom <= MIN_ZOOM} className="rounded p-1.5 hover:bg-[#F2F2F2] disabled:opacity-40" title="Alejar">
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-14 text-center text-xs font-semibold">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => adjustZoom(ZOOM_STEP)} disabled={zoom >= MAX_ZOOM} className="rounded p-1.5 hover:bg-[#F2F2F2] disabled:opacity-40" title="Acercar">
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setZoom(1)} className="rounded p-1.5 hover:bg-[#F2F2F2]" title="Restablecer zoom">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setZoom(0.7)} className="rounded p-1.5 hover:bg-[#F2F2F2]" title="Ajustar estructura">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="h-[560px] overflow-auto p-8">
        <div
          className="mx-auto origin-top transition-transform"
          style={{ minWidth, transform: `scale(${zoom})`, width: "max-content" }}
        >
          <div className="mx-auto w-72 rounded-md border-2 border-[#244D78] bg-[#356EAD] px-4 py-3 text-center text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide">Responsable del proyecto</p>
            <p className="mt-1 text-sm font-bold">{data.responsableProyecto?.nombre ?? "Sin responsable asignado"}</p>
          </div>

          <div className="mx-auto h-8 w-px bg-[#356EAD]" />
          {data.fases.length > 0 ? (
            <div className="relative flex items-start justify-center gap-8 border-t-2 border-[#356EAD] pt-8">
              {data.fases.map((fase, faseIndex) => (
                <div key={fase.idFase} className="relative w-72 shrink-0">
                  <div className="absolute -top-8 left-1/2 h-8 w-px -translate-x-1/2 bg-[#356EAD]" />
                  <div className="rounded-md border-2 border-[#356EAD] bg-[#D9E8F5] px-3 py-3 text-center shadow-sm">
                    <p className="text-[10px] font-semibold uppercase text-[#356EAD]">Fase {faseIndex + 1}</p>
                    <p className="mt-1 text-sm font-bold text-[#1A1A1A]">{fase.nombre}</p>
                  </div>

                  {fase.actividades.length > 0 && (
                    <div className="ml-6 border-l-2 border-[#356EAD] pb-1 pt-5">
                      {fase.actividades.map((actividad, actividadIndex) => (
                        <div key={actividad.idActividad} className="relative mb-5 ml-5">
                          <div className="absolute -left-5 top-8 h-px w-5 bg-[#356EAD]" />
                          <div className="rounded-md border-2 border-[#4F81BD] bg-[#4F81BD] px-3 py-3 text-center text-white shadow-sm">
                            <p className="text-[10px] font-semibold uppercase">Actividad {faseIndex + 1}.{actividadIndex + 1}</p>
                            <p className="mt-1 text-sm font-bold">{actividad.nombre}</p>
                            <p className="mt-2 border-t border-white/30 pt-2 text-[11px]">
                              {actividad.responsables.map(responsable => responsable.nombre).join(", ") || "Sin responsable"}
                            </p>
                          </div>

                          {actividad.subactividades.length > 0 && (
                            <div className="ml-5 border-l border-[#6D9ECA] pt-3">
                              {actividad.subactividades.map((subactividad, subIndex) => (
                                <div key={subactividad.idSubactividad} className="relative mb-3 ml-4">
                                  <div className="absolute -left-4 top-1/2 h-px w-4 bg-[#6D9ECA]" />
                                  <div className="rounded-md border border-[#6D9ECA] bg-white px-3 py-2 text-left shadow-sm">
                                    <p className="text-[10px] font-semibold uppercase text-[#356EAD]">
                                      {faseIndex + 1}.{actividadIndex + 1}.{subIndex + 1} Subactividad
                                    </p>
                                    <p className="mt-1 text-xs font-bold text-[#1A1A1A]">{subactividad.nombre}</p>
                                    <p className="mt-1 text-[11px] text-[#5C5C5C]">{subactividad.responsable.nombre}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-[#5C5C5C]">Aún no hay fases registradas.</p>
          )}
        </div>
      </div>
    </section>
  )
}
