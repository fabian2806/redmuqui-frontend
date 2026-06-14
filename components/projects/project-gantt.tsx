"use client"

import { useMemo, useState } from "react"
import {
  addQuarters,
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from "date-fns"
import { es } from "date-fns/locale"
import { CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Clock3 } from "lucide-react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { parseDateOnly } from "@/lib/date-only"
import type {
  ActividadResponse,
  EstadoCronograma,
  FaseResponse,
  SubactividadResponse,
} from "@/lib/types"

type GanttHito = {
  id: string
  idFase: number
  nombre: string
  fecha: string
  fechaCumplimientoReal?: string | null
  desfaseDias?: number | null
  estadoCronograma?: EstadoCronograma
}

type GanttScale = "week" | "month" | "quarter"

type TimelineUnit = {
  id: string
  label: string
  sublabel: string
}

type DateRange = {
  start: Date
  end: Date
}

const scaleOptions: Array<{ value: GanttScale; label: string }> = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "quarter", label: "Trimestre" },
]

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
    const units = eachDayOfInterval({ start, end }).map(day => ({
      id: day.toISOString(),
      label: format(day, "EEE", { locale: es }),
      sublabel: format(day, "dd MMM", { locale: es }),
    }))
    return { start, end, units, unitWidth: 72 }
  }

  if (scale === "month") {
    const start = startOfMonth(inicio)
    const end = endOfMonth(fin)
    const units = eachDayOfInterval({ start, end }).map(day => ({
      id: day.toISOString(),
      label: format(day, "dd"),
      sublabel: format(day, "EEEEE", { locale: es }),
    }))
    return { start, end, units, unitWidth: 34 }
  }

  const start = startOfQuarter(inicio)
  const end = endOfQuarter(fin)
  return { start, end, units: buildQuarterUnits(start, end), unitWidth: 128 }
}

function validRange(startValue?: string | null, endValue?: string | null): DateRange | null {
  if (!startValue || !endValue) return null
  const start = parseDateOnly(startValue)
  const end = parseDateOnly(endValue)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null
  return { start, end }
}

function plannedActivityRange(actividad: ActividadResponse) {
  return validRange(actividad.fechaInicioPlanificada, actividad.fechaFinPlanificada)
}

function plannedSubactivityRange(subactividad: SubactividadResponse) {
  return validRange(subactividad.fechaInicioPlanificada, subactividad.fechaFinPlanificada)
}

function normalizedRealStart(
  plannedStartValue: string,
  realStartValue?: string | null,
) {
  const plannedStart = parseDateOnly(plannedStartValue)
  if (!realStartValue) return plannedStart
  const realStart = parseDateOnly(realStartValue)
  return realStart < plannedStart ? plannedStart : realStart
}

function realRange(
  planned: DateRange,
  fechaInicioReal?: string | null,
  fechaFinReal?: string | null,
): DateRange | null {
  if (!fechaFinReal) return null
  const normalizedStart = normalizedRealStart(
    format(planned.start, "yyyy-MM-dd"),
    fechaInicioReal,
  )
  return validRange(format(normalizedStart, "yyyy-MM-dd"), fechaFinReal)
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

function variancePosition(plannedEnd: Date, realEnd: Date, timelineStart: Date, totalDays: number) {
  const difference = differenceInCalendarDays(realEnd, plannedEnd)
  if (difference === 0) return null
  const start = difference > 0 ? addDays(plannedEnd, 1) : addDays(realEnd, 1)
  const end = difference > 0 ? realEnd : plannedEnd
  return getBarPosition(start, end, timelineStart, totalDays)
}

function getDateEndPosition(date: Date, timelineStart: Date, totalDays: number) {
  const offset = differenceInCalendarDays(date, timelineStart) + 1
  return Math.max(0, Math.min(100, (offset / totalDays) * 100))
}

function varianceClass(estado?: EstadoCronograma) {
  if (estado === "ATRASADO") {
    return "bg-[repeating-linear-gradient(135deg,#C8102E,#C8102E_6px,#F8B4BF_6px,#F8B4BF_12px)]"
  }
  return "bg-[repeating-linear-gradient(135deg,#2E7D32,#2E7D32_6px,#A5D6A7_6px,#A5D6A7_12px)]"
}

function scheduleLabel(estado?: EstadoCronograma, dias?: number | null, completed = false) {
  const total = Math.abs(dias ?? 0)
  if (estado === "ATRASADO") {
    return completed
      ? `Finalizó con ${total} día${total === 1 ? "" : "s"} de retraso`
      : `Vencido por ${total} día${total === 1 ? "" : "s"}`
  }
  if (estado === "ADELANTADO") return `Finalizó ${total} día${total === 1 ? "" : "s"} antes`
  if (estado === "EN_FECHA") return "Completado en fecha"
  return "Pendiente de cierre"
}

function scheduleTextClass(estado?: EstadoCronograma) {
  if (estado === "ATRASADO") return "text-[#C8102E]"
  if (estado === "ADELANTADO") return "text-[#2E7D32]"
  return "text-[#777]"
}

function TimelineBackground({ units }: { units: number }) {
  return (
    <div
      className="absolute inset-0 bg-[repeating-linear-gradient(to_right,transparent,transparent_calc(100%/var(--units)-1px),#ececec_calc(100%/var(--units)-1px),#ececec_calc(100%/var(--units)))]"
      style={{ "--units": units } as React.CSSProperties}
    />
  )
}

function ScheduleCard({
  name,
  kind,
  planned,
  real,
  estadoCronograma,
  desfaseDias,
}: {
  name: string
  kind: string
  planned: DateRange
  real: DateRange | null
  estadoCronograma?: EstadoCronograma
  desfaseDias?: number | null
}) {
  const completed = Boolean(real?.end)
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#777]">{kind}</p>
        <p className="mt-0.5 text-sm font-bold text-[#1A1A1A]">{name}</p>
      </div>
      <div className={`rounded-md px-2.5 py-2 text-xs font-semibold ${
        estadoCronograma === "ATRASADO"
          ? "bg-[#C8102E]/10 text-[#C8102E]"
          : estadoCronograma === "ADELANTADO" || estadoCronograma === "EN_FECHA"
            ? "bg-[#2E7D32]/10 text-[#2E7D32]"
            : "bg-[#F2F2F2] text-[#5C5C5C]"
      }`}>
        {scheduleLabel(estadoCronograma, desfaseDias, completed)}
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4F81BD]" />
          <div>
            <p className="font-semibold text-[#1A1A1A]">Planificado</p>
            <p className="text-[#666]">{format(planned.start, "dd/MM/yyyy")} - {format(planned.end, "dd/MM/yyyy")}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          {completed
            ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2E7D32]" />
            : <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F57C00]" />}
          <div>
            <p className="font-semibold text-[#1A1A1A]">Ejecución real</p>
            <p className="text-[#666]">
              {real
                ? `${format(real.start, "dd/MM/yyyy")} - ${format(real.end, "dd/MM/yyyy")}`
                : "Aún no cuenta con fecha real de cierre"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScheduleBars({
  name,
  kind,
  planned,
  real,
  estadoCronograma,
  desfaseDias,
  timelineStart,
  totalDays,
  compact = false,
}: {
  name: string
  kind: string
  planned: DateRange
  real: DateRange | null
  estadoCronograma?: EstadoCronograma
  desfaseDias?: number | null
  timelineStart: Date
  totalDays: number
  compact?: boolean
}) {
  const plannedPosition = getBarPosition(planned.start, planned.end, timelineStart, totalDays)
  const realPosition = real ? getBarPosition(real.start, real.end, timelineStart, totalDays) : null
  const variance = real ? variancePosition(planned.end, real.end, timelineStart, totalDays) : null
  const height = compact ? "h-3" : "h-5"
  const top = compact ? "top-1" : "top-1.5"
  const hoverStart = real && real.start < planned.start ? real.start : planned.start
  const hoverEnd = real && real.end > planned.end ? real.end : planned.end
  const hoverPosition = getBarPosition(hoverStart, hoverEnd, timelineStart, totalDays)

  return (
    <>
      <div
        className={`absolute ${top} ${height} min-w-2 rounded bg-[#4F81BD]/75`}
        style={{ left: `${plannedPosition.left}%`, width: `${Math.max(plannedPosition.width, 0.5)}%` }}
      />
      {realPosition && (
        <div
          className={`absolute ${top} ${height} min-w-2 rounded border border-white/70 bg-[#2E7D32] shadow-sm`}
          style={{ left: `${realPosition.left}%`, width: `${Math.max(realPosition.width, 0.5)}%` }}
        />
      )}
      {variance && (
        <div
          className={`absolute ${top} ${height} min-w-1 rounded ${varianceClass(estadoCronograma)}`}
          style={{ left: `${variance.left}%`, width: `${Math.max(variance.width, 0.35)}%` }}
        />
      )}
      <HoverCard openDelay={180} closeDelay={80}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            aria-label={`Ver detalle de ${name}`}
            className={`absolute ${top} z-20 ${height} min-w-3 cursor-help rounded bg-transparent`}
            style={{ left: `${hoverPosition.left}%`, width: `${Math.max(hoverPosition.width, 0.6)}%` }}
          />
        </HoverCardTrigger>
        <HoverCardContent side="top" align="center" className="w-72 p-3">
          <ScheduleCard
            name={name}
            kind={kind}
            planned={planned}
            real={real}
            estadoCronograma={estadoCronograma}
            desfaseDias={desfaseDias}
          />
        </HoverCardContent>
      </HoverCard>
    </>
  )
}

export function ProjectGantt({
  fases,
  hitos,
  actividades,
}: {
  fases: FaseResponse[]
  hitos: GanttHito[]
  actividades: ActividadResponse[]
}) {
  const [scale, setScale] = useState<GanttScale>("month")
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const fasesProgramadas = useMemo(
    () => fases.filter(fase => validRange(fase.fechaInicioPlanificada, fase.fechaFinPlanificada)),
    [fases],
  )

  const actividadesProgramadas = useMemo(
    () => actividades.filter(actividad => plannedActivityRange(actividad)),
    [actividades],
  )

  const allDates = useMemo(() => {
    const values: Date[] = []
    fasesProgramadas.forEach(fase => {
      values.push(parseDateOnly(fase.fechaInicioPlanificada), parseDateOnly(fase.fechaFinPlanificada))
      if (fase.fechaInicioReal) {
        values.push(normalizedRealStart(fase.fechaInicioPlanificada, fase.fechaInicioReal))
      }
      if (fase.fechaFinReal) values.push(parseDateOnly(fase.fechaFinReal))
    })
    actividadesProgramadas.forEach(actividad => {
      values.push(parseDateOnly(actividad.fechaInicioPlanificada!), parseDateOnly(actividad.fechaFinPlanificada!))
      if (actividad.fechaInicioReal) {
        values.push(normalizedRealStart(actividad.fechaInicioPlanificada!, actividad.fechaInicioReal))
      }
      if (actividad.fechaFinReal) values.push(parseDateOnly(actividad.fechaFinReal))
      actividad.subactividades?.forEach(subactividad => {
        values.push(parseDateOnly(subactividad.fechaInicioPlanificada), parseDateOnly(subactividad.fechaFinPlanificada))
        if (subactividad.fechaInicioReal) {
          values.push(normalizedRealStart(
            subactividad.fechaInicioPlanificada,
            subactividad.fechaInicioReal,
          ))
        }
        if (subactividad.fechaFinReal) values.push(parseDateOnly(subactividad.fechaFinReal))
      })
    })
    hitos.forEach(hito => {
      values.push(parseDateOnly(hito.fecha))
      if (hito.fechaCumplimientoReal) values.push(parseDateOnly(hito.fechaCumplimientoReal))
    })
    return values.filter(value => !Number.isNaN(value.getTime()))
  }, [actividadesProgramadas, fasesProgramadas, hitos])

  if (fasesProgramadas.length === 0 || allDates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#D8D8D8] p-8 text-center text-sm text-[#5C5C5C]">
        Registra una fase con fechas planificadas para generar el diagrama de Gantt.
      </div>
    )
  }

  const timeline = buildTimeline(
    new Date(Math.min(...allDates.map(Number))),
    new Date(Math.max(...allDates.map(Number))),
    scale,
  )
  const totalDays = Math.max(1, differenceInCalendarDays(timeline.end, timeline.start) + 1)
  const timelineWidth = Math.max(720, timeline.units.length * timeline.unitWidth)
  const leftColumnWidth = 330
  const allExpanded = fasesProgramadas.every(fase => expandedIds.has(fase.id))

  const togglePhase = (id: number) => {
    setExpandedIds(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#E0E0E0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E0E0E0] bg-[#FAFAFA] px-4 py-3">
        <div>
          <h4 className="text-sm font-bold text-[#1A1A1A]">Diagrama de Gantt</h4>
          <p className="text-xs text-[#5C5C5C]">Fases, actividades y subactividades. Los hitos se muestran como fechas de referencia.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#5C5C5C]">
          <div className="flex rounded-md border border-[#D8D8D8] bg-white p-0.5">
            {scaleOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setScale(option.value)}
                className={`rounded px-2.5 py-1 font-medium ${scale === option.value ? "bg-[#FFD000] text-[#1A1A1A]" : "hover:bg-[#F2F2F2]"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setExpandedIds(allExpanded ? new Set() : new Set(fasesProgramadas.map(fase => fase.id)))}
            className="rounded-md border border-[#D8D8D8] bg-white px-3 py-1.5 font-medium text-[#1A1A1A] hover:bg-[#F7F7F7]"
          >
            {allExpanded ? "Contraer fases" : "Expandir fases"}
          </button>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded bg-[#4F81BD]/75" />Plan</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded bg-[#2E7D32]" />Real</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-[#1A1A1A]" />Hito</span>
        </div>
      </div>

      <div className="max-h-[68vh] overflow-auto">
        <div style={{ minWidth: leftColumnWidth + timelineWidth }}>
          <div
            className="sticky top-0 z-30 grid border-b border-[#E0E0E0] bg-[#FFF8CC]"
            style={{ gridTemplateColumns: `${leftColumnWidth}px ${timelineWidth}px` }}
          >
            <div className="sticky left-0 z-40 border-r border-[#E0E0E0] bg-[#FFF8CC] px-4 py-3 text-xs font-bold uppercase text-[#5C5C5C]">
              Fase / actividad / subactividad
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

          {fasesProgramadas.map(fase => {
            const planned = validRange(fase.fechaInicioPlanificada, fase.fechaFinPlanificada)!
            const real = realRange(planned, fase.fechaInicioReal, fase.fechaFinReal)
            const faseActividades = actividadesProgramadas.filter(actividad => actividad.idFase === fase.id)
            const faseHitos = hitos.filter(hito => hito.idFase === fase.id)
            const isExpanded = expandedIds.has(fase.id)

            return (
              <div key={fase.id}>
                <div
                  className="grid border-b border-[#D8D8D8] bg-[#F1F5F9]"
                  style={{ gridTemplateColumns: `${leftColumnWidth}px ${timelineWidth}px` }}
                >
                  <button
                    type="button"
                    onClick={() => togglePhase(fase.id)}
                    className="sticky left-0 z-20 flex min-h-16 items-center gap-2 border-r border-[#D8D8D8] bg-[#F1F5F9] px-4 py-2 text-left hover:bg-[#E7EDF4]"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-[#1A1A1A]">{fase.nombre}</span>
                      <span className="block text-[11px] text-[#666]">
                        {fase.actividadesFinalizadas} de {fase.totalActividades} actividades · {fase.porcentajeAvance.toFixed(1)}%
                      </span>
                      <span className={`block text-[10px] font-semibold ${scheduleTextClass(fase.estadoCronograma)}`}>
                        {scheduleLabel(fase.estadoCronograma, fase.desfaseDias, Boolean(fase.fechaFinReal))}
                      </span>
                    </span>
                  </button>
                  <div className="relative my-3 h-10">
                    <TimelineBackground units={timeline.units.length} />
                    <ScheduleBars
                      name={fase.nombre}
                      kind="Fase"
                      planned={planned}
                      real={real}
                      estadoCronograma={fase.estadoCronograma}
                      desfaseDias={fase.desfaseDias}
                      timelineStart={timeline.start}
                      totalDays={totalDays}
                    />
                    {faseHitos.map(hito => {
                      const date = parseDateOnly(hito.fecha)
                      const marker = getDateEndPosition(date, timeline.start, totalDays)
                      return (
                        <HoverCard key={hito.id} openDelay={180} closeDelay={80}>
                          <HoverCardTrigger asChild>
                            <button
                              type="button"
                              className="absolute inset-y-0 z-30 w-0.5 cursor-help bg-[#1A1A1A]"
                              style={{ left: `${marker}%` }}
                              aria-label={`Ver detalle del hito ${hito.nombre}`}
                            >
                              <span className="absolute -top-1 left-1 whitespace-nowrap rounded bg-[#FFD000] px-1 text-[9px] font-bold">
                                {hito.nombre}
                              </span>
                            </button>
                          </HoverCardTrigger>
                          <HoverCardContent side="top" align="center" className="w-72 p-3">
                            <div className="space-y-3">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-[#777]">Hito</p>
                                <p className="mt-0.5 text-sm font-bold text-[#1A1A1A]">{hito.nombre}</p>
                              </div>
                              <div className={`rounded-md px-2.5 py-2 text-xs font-semibold ${
                                hito.estadoCronograma === "ATRASADO"
                                  ? "bg-[#C8102E]/10 text-[#C8102E]"
                                  : hito.estadoCronograma === "ADELANTADO" || hito.estadoCronograma === "EN_FECHA"
                                    ? "bg-[#2E7D32]/10 text-[#2E7D32]"
                                    : "bg-[#F2F2F2] text-[#5C5C5C]"
                              }`}>
                                {scheduleLabel(hito.estadoCronograma, hito.desfaseDias, Boolean(hito.fechaCumplimientoReal))}
                              </div>
                              <div className="space-y-2 text-xs">
                                <p><span className="font-semibold">Fecha clave:</span> {format(date, "dd/MM/yyyy")}</p>
                                <p>
                                  <span className="font-semibold">Cumplimiento real:</span>{" "}
                                  {hito.fechaCumplimientoReal
                                    ? format(parseDateOnly(hito.fechaCumplimientoReal), "dd/MM/yyyy")
                                    : "Aún no completado"}
                                </p>
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      )
                    })}
                  </div>
                </div>

                {isExpanded && faseActividades.map(actividad => {
                  const activityPlanned = plannedActivityRange(actividad)!
                  const activityReal = realRange(activityPlanned, actividad.fechaInicioReal, actividad.fechaFinReal)
                  return (
                    <div key={actividad.id}>
                      <div
                        className="grid border-b border-[#EEEEEE]"
                        style={{ gridTemplateColumns: `${leftColumnWidth}px ${timelineWidth}px` }}
                      >
                        <div className="sticky left-0 z-10 border-r border-[#E0E0E0] bg-white px-4 py-2.5 pl-10">
                          <p className="truncate text-xs font-medium text-[#1A1A1A]">{actividad.nombre}</p>
                          <p className="text-[11px] text-[#777]">
                            {format(activityPlanned.start, "dd/MM/yyyy")} - {format(activityPlanned.end, "dd/MM/yyyy")}
                          </p>
                          <p className={`text-[10px] font-semibold ${scheduleTextClass(actividad.estadoCronograma)}`}>
                            {scheduleLabel(actividad.estadoCronograma, actividad.desfaseDias, Boolean(actividad.fechaFinReal))}
                          </p>
                        </div>
                        <div className="relative my-2 h-8">
                          <TimelineBackground units={timeline.units.length} />
                          <ScheduleBars
                            name={actividad.nombre}
                            kind="Actividad"
                            planned={activityPlanned}
                            real={activityReal}
                            estadoCronograma={actividad.estadoCronograma}
                            desfaseDias={actividad.desfaseDias}
                            timelineStart={timeline.start}
                            totalDays={totalDays}
                          />
                        </div>
                      </div>

                      {(actividad.subactividades ?? []).map(subactividad => {
                        const subPlanned = plannedSubactivityRange(subactividad)
                        if (!subPlanned) return null
                        const subReal = realRange(subPlanned, subactividad.fechaInicioReal, subactividad.fechaFinReal)
                        return (
                          <div
                            key={subactividad.id}
                            className="grid border-b border-[#F2F2F2]"
                            style={{ gridTemplateColumns: `${leftColumnWidth}px ${timelineWidth}px` }}
                          >
                            <div className="sticky left-0 z-10 border-r border-[#E0E0E0] bg-[#FAFAFA] px-4 py-2 pl-16">
                              <p className="truncate text-[11px] font-medium">{subactividad.nombre}</p>
                              <p className={`text-[10px] font-semibold ${scheduleTextClass(subactividad.estadoCronograma)}`}>
                                {scheduleLabel(subactividad.estadoCronograma, subactividad.desfaseDias, Boolean(subactividad.fechaFinReal))}
                              </p>
                            </div>
                            <div className="relative my-2 h-5">
                              <TimelineBackground units={timeline.units.length} />
                              <ScheduleBars
                                name={subactividad.nombre}
                                kind="Subactividad"
                                planned={subPlanned}
                                real={subReal}
                                estadoCronograma={subactividad.estadoCronograma}
                                desfaseDias={subactividad.desfaseDias}
                                timelineStart={timeline.start}
                                totalDays={totalDays}
                                compact
                              />
                            </div>
                          </div>
                        )
                      })}
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
