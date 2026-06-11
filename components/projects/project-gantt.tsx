"use client"

import { useMemo, useState } from "react"
import {
  addQuarters,
  differenceInCalendarDays,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from "date-fns"
import { es } from "date-fns/locale"
import { ChevronDown, ChevronRight } from "lucide-react"
import { parseDateOnly } from "@/lib/date-only"
import type { ActividadResponse } from "@/lib/types"

type GanttHito = { id: string; nombre: string }
type GanttScale = "week" | "month" | "quarter"

type TimelineUnit = {
  id: string
  label: string
  sublabel: string
}

type GanttGroup = {
  hito: GanttHito
  actividades: ActividadResponse[]
  fechaInicio: Date
  fechaFin: Date
  duracion: number
  finalizadas: number
  avance: number
}

const estadoStyles: Record<string, string> = {
  PENDIENTE: "bg-slate-400",
  EN_CURSO: "bg-amber-500",
  FINALIZADA: "bg-emerald-600",
}

const scaleOptions: Array<{ value: GanttScale; label: string }> = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "quarter", label: "Trimestre" },
]

function formatPercent(value: number | null | undefined, decimals = 1): string {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0
  return `${safeValue.toFixed(decimals)}%`
}

function buildQuarterUnits(inicio: Date, fin: Date): TimelineUnit[] {
  const units: TimelineUnit[] = []
  let current = startOfQuarter(inicio)
  const last = endOfQuarter(fin)

  while (current <= last) {
    units.push({
      id: current.toISOString(),
      label: `T${Math.floor(current.getMonth() / 3) + 1}`,
      sublabel: format(current, "yyyy", { locale: es }),
    })
    current = addQuarters(current, 1)
  }

  return units
}

function buildTimeline(inicio: Date, fin: Date, scale: GanttScale) {
  if (scale === "week") {
    const start = startOfWeek(inicio, { weekStartsOn: 1 })
    const end = endOfWeek(fin, { weekStartsOn: 1 })
    const units = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map((week, index) => ({
      id: week.toISOString(),
      label: `S${index + 1}`,
      sublabel: format(week, "dd MMM", { locale: es }),
    }))

    return { start, end, units, unitWidth: 112 }
  }

  if (scale === "month") {
    const start = startOfMonth(inicio)
    const end = endOfMonth(fin)
    const units = eachMonthOfInterval({ start, end }).map(month => ({
      id: month.toISOString(),
      label: format(month, "MMM", { locale: es }),
      sublabel: format(month, "yyyy", { locale: es }),
    }))

    return { start, end, units, unitWidth: 118 }
  }

  const start = startOfQuarter(inicio)
  const end = endOfQuarter(fin)
  return { start, end, units: buildQuarterUnits(start, end), unitWidth: 128 }
}

function getActivityRange(actividad: ActividadResponse) {
  const start = parseDateOnly(actividad.fechaInicio!)
  const end = parseDateOnly(actividad.fechaFin!)
  const duration = Math.max(1, differenceInCalendarDays(end, start) + 1)

  return { start, end, duration }
}

function getBarPosition(start: Date, end: Date, timelineStart: Date, totalDays: number) {
  const offset = differenceInCalendarDays(start, timelineStart)
  const duration = Math.max(1, differenceInCalendarDays(end, start) + 1)
  const boundedOffset = Math.max(0, offset)
  const boundedDuration = Math.min(totalDays - boundedOffset, duration)

  return {
    left: (boundedOffset / totalDays) * 100,
    width: (Math.max(1, boundedDuration) / totalDays) * 100,
  }
}

function makeGroup(hito: GanttHito, actividades: ActividadResponse[]): GanttGroup {
  const ranges = actividades.map(getActivityRange)
  const fechaInicio = new Date(Math.min(...ranges.map(range => Number(range.start))))
  const fechaFin = new Date(Math.max(...ranges.map(range => Number(range.end))))
  const duracion = Math.max(1, differenceInCalendarDays(fechaFin, fechaInicio) + 1)
  const totalPeso = ranges.reduce((sum, range) => sum + range.duration, 0)
  const pesoFinalizado = actividades.reduce((sum, actividad, index) => {
    return actividad.estado === "FINALIZADA" ? sum + ranges[index].duration : sum
  }, 0)
  const finalizadas = actividades.filter(actividad => actividad.estado === "FINALIZADA").length
  const avance = totalPeso > 0 ? Math.round((pesoFinalizado / totalPeso) * 100) : 0

  return { hito, actividades, fechaInicio, fechaFin, duracion, finalizadas, avance }
}

export function ProjectGantt({ hitos, actividades }: { hitos: GanttHito[]; actividades: ActividadResponse[] }) {
  const [scale, setScale] = useState<GanttScale>("month")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const programadas = useMemo(
    () => actividades.filter(a => {
      if (!a.fechaInicio || !a.fechaFin) return false
      const start = parseDateOnly(a.fechaInicio)
      const end = parseDateOnly(a.fechaFin)
      return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start
    }),
    [actividades],
  )

  const grupos = useMemo(() => {
    const hitoGroups = hitos
      .map(hito => ({ hito, actividades: programadas.filter(a => String(a.idHito) === hito.id) }))
      .filter(grupo => grupo.actividades.length > 0)
      .map(grupo => makeGroup(grupo.hito, grupo.actividades))
    const sinHito = programadas.filter(a => !a.idHito || !hitos.some(h => h.id === String(a.idHito)))

    if (sinHito.length) {
      hitoGroups.push(makeGroup({ id: "sin-hito", nombre: "Sin hito asignado" }, sinHito))
    }

    return hitoGroups
  }, [hitos, programadas])

  if (programadas.length === 0) {
    return <div className="rounded-lg border border-dashed border-[#D8D8D8] p-8 text-center text-sm text-[#5C5C5C]">Agrega fechas de inicio y fin a las actividades para generar el diagrama de Gantt.</div>
  }

  const fechasInicio = programadas.map(a => parseDateOnly(a.fechaInicio!))
  const fechasFin = programadas.map(a => parseDateOnly(a.fechaFin!))
  const timeline = buildTimeline(new Date(Math.min(...fechasInicio.map(Number))), new Date(Math.max(...fechasFin.map(Number))), scale)
  const totalDias = Math.max(1, differenceInCalendarDays(timeline.end, timeline.start) + 1)
  const anchoTimeline = Math.max(720, timeline.units.length * timeline.unitWidth)
  const leftColumnWidth = 320
  const allExpanded = grupos.every(grupo => expandedIds.has(grupo.hito.id))

  const toggleGroup = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setExpandedIds(allExpanded ? new Set() : new Set(grupos.map(grupo => grupo.hito.id)))
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#E0E0E0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3">
        <div>
          <h4 className="text-sm font-bold text-[#1A1A1A]">Diagrama de Gantt</h4>
          <p className="text-xs text-[#5C5C5C]">Vista compacta por hitos. Expande solo los bloques que necesitas revisar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5C5C5C]">
          <div className="flex rounded-md border border-[#D8D8D8] bg-white p-0.5">
            {scaleOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setScale(option.value)}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${scale === option.value ? "bg-[#FFD000] text-[#1A1A1A]" : "text-[#5C5C5C] hover:bg-[#F2F2F2]"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-md border border-[#D8D8D8] bg-white px-3 py-1.5 font-medium text-[#1A1A1A] hover:bg-[#F7F7F7]"
          >
            {allExpanded ? "Contraer hitos" : "Expandir hitos"}
          </button>
          {[["bg-slate-400", "Pendiente"], ["bg-amber-500", "En curso"], ["bg-emerald-600", "Finalizada"]].map(([color, label]) => (
            <span key={label} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>
          ))}
        </div>
      </div>

      <div className="max-h-[68vh] overflow-auto">
        <div style={{ minWidth: leftColumnWidth + anchoTimeline }}>
          <div
            className="sticky top-0 z-30 grid border-b border-[#E0E0E0] bg-[#FFF8CC]"
            style={{ gridTemplateColumns: `${leftColumnWidth}px ${anchoTimeline}px` }}
          >
            <div className="sticky left-0 z-40 border-r border-[#E0E0E0] bg-[#FFF8CC] px-4 py-3 text-xs font-bold uppercase text-[#5C5C5C]">
              Hito / actividad
            </div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${timeline.units.length}, 1fr)` }}>
              {timeline.units.map((unit, index) => (
                <div key={unit.id} className={`px-2 py-2 text-center ${index ? "border-l border-[#E0E0E0]" : ""}`}>
                  <p className="text-[10px] font-bold uppercase text-[#8A6D00]">{unit.label}</p>
                  <p className="text-xs text-[#5C5C5C]">{unit.sublabel}</p>
                </div>
              ))}
            </div>
          </div>

          {grupos.map(grupo => {
            const groupPosition = getBarPosition(grupo.fechaInicio, grupo.fechaFin, timeline.start, totalDias)
            const isExpanded = expandedIds.has(grupo.hito.id)

            return (
              <div key={grupo.hito.id}>
                <div
                  className="grid border-b border-[#E0E0E0] bg-[#F7F7F7]"
                  style={{ gridTemplateColumns: `${leftColumnWidth}px ${anchoTimeline}px` }}
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(grupo.hito.id)}
                    className="sticky left-0 z-20 flex min-h-14 items-center gap-2 border-r border-[#E0E0E0] bg-[#F7F7F7] px-4 py-2 text-left hover:bg-[#EFEFEF]"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-[#5C5C5C]" /> : <ChevronRight className="h-4 w-4 shrink-0 text-[#5C5C5C]" />}
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-[#1A1A1A]" title={grupo.hito.nombre}>{grupo.hito.nombre}</span>
                      <span className="mt-0.5 block text-[11px] text-[#666]">
                        {grupo.actividades.length} act. · {grupo.finalizadas} fin. · {formatPercent(grupo.avance)}
                      </span>
                    </span>
                  </button>
                  <div
                    className="relative my-3 h-8 bg-[repeating-linear-gradient(to_right,transparent,transparent_calc(100%/var(--units)-1px),#e8e8e8_calc(100%/var(--units)-1px),#e8e8e8_calc(100%/var(--units)))]"
                    style={{ "--units": timeline.units.length } as React.CSSProperties}
                  >
                    <div
                      className="absolute top-1 h-6 min-w-2 rounded-md bg-[#333333] shadow-sm"
                      style={{ left: `${groupPosition.left}%`, width: `${Math.max(groupPosition.width, .5)}%` }}
                      title={`${grupo.hito.nombre}: ${grupo.duracion} dias, ${formatPercent(grupo.avance)}`}
                    >
                      <div className="h-full rounded-md bg-[#FFD000]" style={{ width: `${grupo.avance}%` }} />
                    </div>
                  </div>
                </div>

                {isExpanded && grupo.actividades.map(actividad => {
                  const range = getActivityRange(actividad)
                  const position = getBarPosition(range.start, range.end, timeline.start, totalDias)

                  return (
                    <div
                      key={actividad.id}
                      className="grid border-b border-[#EEEEEE] last:border-b-0"
                      style={{ gridTemplateColumns: `${leftColumnWidth}px ${anchoTimeline}px` }}
                    >
                      <div className="sticky left-0 z-10 border-r border-[#E0E0E0] bg-white px-4 py-2.5 pl-10">
                        <p className="truncate text-xs font-medium text-[#1A1A1A]" title={actividad.nombre}>{actividad.nombre}</p>
                        <p className="mt-0.5 text-[11px] text-[#777]">
                          {format(range.start, "dd/MM/yyyy")} - {format(range.end, "dd/MM/yyyy")} · {range.duration} día{range.duration === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div
                        className="relative my-2.5 h-7 bg-[repeating-linear-gradient(to_right,transparent,transparent_calc(100%/var(--units)-1px),#eeeeee_calc(100%/var(--units)-1px),#eeeeee_calc(100%/var(--units)))]"
                        style={{ "--units": timeline.units.length } as React.CSSProperties}
                      >
                        <div
                          className={`absolute top-1 h-5 min-w-2 rounded-md ${estadoStyles[actividad.estado] ?? estadoStyles.PENDIENTE} shadow-sm`}
                          style={{ left: `${position.left}%`, width: `${Math.max(position.width, .5)}%` }}
                          title={`${actividad.nombre}: ${actividad.estado}`}
                        >
                          <span className="sr-only">{actividad.estado}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
