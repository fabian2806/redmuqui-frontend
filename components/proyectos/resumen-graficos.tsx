"use client"

import type { ReactNode } from "react"
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"
import type { MetricasResumen } from "@/lib/ia"

/**
 * Gráficos del reporte ejecutivo (Sprint 4 ⑤).
 *
 * Dibuja las mismas cifras de la ficha que alimentan el texto de la IA, así
 * gráficos y narrativa siempre cuadran. Colores en hex (paleta Red Muqui) para
 * que la futura exportación a PDF no choque con `oklch`.
 */

const COLOR = {
  avance: "#C9A42B",
  pista: "#EFEAD6",
  ejecutado: "#2563EB",
  restante: "#E5E7EB",
  hombres: "#3B82F6",
  mujeres: "#EC4899",
  finalizadas: "#16A34A",
  enCurso: "#3B82F6",
  pendientes: "#9CA3AF",
  vencidas: "#C8102E",
} as const

function moneda(v: number): string {
  return "S/ " + v.toLocaleString("es-PE", { maximumFractionDigits: 0 })
}

function pct(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0
}

function Panel({ titulo, extra, children }: { titulo: string; extra?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#ECECEC] bg-white p-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[#5C5C5C]">{titulo}</h4>
        {extra && <span className="shrink-0 text-[11px] font-medium text-[#9CA3AF]">{extra}</span>}
      </div>
      {children}
    </div>
  )
}

function Donut({
  valor,
  resto,
  colorValor,
  colorResto,
  centro,
  sub,
}: {
  valor: number
  resto: number
  colorValor: string
  colorResto: string
  centro: string
  sub?: string
}) {
  const data = [
    { name: "valor", value: Math.max(0, valor) },
    { name: "resto", value: Math.max(0, resto) },
  ]
  return (
    <div className="relative h-[110px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={38}
            outerRadius={52}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={colorValor} />
            <Cell fill={colorResto} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold leading-none text-[#1A1A1A]">{centro}</span>
        {sub && <span className="mt-0.5 text-[10px] text-[#9CA3AF]">{sub}</span>}
      </div>
    </div>
  )
}

type Barra = { name: string; value: number; fill: string }

function BarrasH({ data }: { data: Barra[] }) {
  return (
    <div className="h-[110px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 30, bottom: 4, left: 4 }}
          barCategoryGap={6}
        >
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="name"
            width={74}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#5C5C5C" }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              style={{ fontSize: 11, fontWeight: 600, fill: "#1A1A1A" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ResumenGraficos({ metricas: m }: { metricas: MetricasResumen }) {
  const totalBenef = m.beneficiariosHombres + m.beneficiariosMujeres
  const ejecPct = m.presupuestoTotal != null ? pct(m.presupuestoEjecutado, m.presupuestoTotal) : null
  const restante = m.presupuestoTotal != null ? Math.max(0, m.presupuestoTotal - m.presupuestoEjecutado) : 0

  const beneficiarios: Barra[] = [
    { name: "Mujeres", value: m.beneficiariosMujeres, fill: COLOR.mujeres },
    { name: "Hombres", value: m.beneficiariosHombres, fill: COLOR.hombres },
  ]

  const actividades: Barra[] = [
    { name: "Finalizadas", value: m.actividadesFinalizadas, fill: COLOR.finalizadas },
    { name: "En curso", value: m.actividadesEnCurso, fill: COLOR.enCurso },
    { name: "Pendientes", value: m.actividadesPendientes, fill: COLOR.pendientes },
  ]

  const hitosPendientes = Math.max(0, m.hitosTotal - m.hitosFinalizados - m.hitosVencidos)
  const hitos: Barra[] = [
    { name: "Finalizados", value: m.hitosFinalizados, fill: COLOR.finalizadas },
    { name: "Vencidos", value: m.hitosVencidos, fill: COLOR.vencidas },
    { name: "Pendientes", value: hitosPendientes, fill: COLOR.pendientes },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Panel titulo="Avance">
        <Donut
          valor={m.avance}
          resto={100 - m.avance}
          colorValor={COLOR.avance}
          colorResto={COLOR.pista}
          centro={`${Math.round(m.avance)}%`}
          sub="físico"
        />
      </Panel>

      <Panel titulo="Presupuesto" extra={ejecPct != null ? `${ejecPct}% ejec.` : undefined}>
        {m.presupuestoTotal != null ? (
          <Donut
            valor={m.presupuestoEjecutado}
            resto={restante}
            colorValor={COLOR.ejecutado}
            colorResto={COLOR.restante}
            centro={moneda(m.presupuestoEjecutado)}
            sub={`de ${moneda(m.presupuestoTotal)}`}
          />
        ) : (
          <div className="flex h-[110px] items-center justify-center text-center text-xs text-[#9CA3AF]">
            Presupuesto no definido
          </div>
        )}
      </Panel>

      <Panel titulo="Beneficiarios" extra={`${totalBenef} · ${pct(m.beneficiariosMujeres, totalBenef)}% M`}>
        <BarrasH data={beneficiarios} />
      </Panel>

      <Panel
        titulo="Actividades"
        extra={
          m.actividadesVencidas > 0 ? `${m.actividadesTotal} · ${m.actividadesVencidas} vencidas` : `${m.actividadesTotal}`
        }
      >
        <BarrasH data={actividades} />
      </Panel>

      <Panel titulo="Hitos" extra={`${m.hitosFinalizados}/${m.hitosTotal}`}>
        <BarrasH data={hitos} />
      </Panel>

      <Panel titulo="Estado">
        <div className="flex h-[110px] flex-col items-center justify-center gap-2">
          {m.enRiesgo ? (
            <span className="rounded-full bg-[#C8102E]/10 px-3 py-1 text-sm font-bold text-[#C8102E]">
              En riesgo
            </span>
          ) : (
            <span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-sm font-bold text-[#15803D]">
              Sin alertas
            </span>
          )}
          <span className="text-center text-[11px] text-[#9CA3AF]">
            {m.hitosVencidos > 0 && `${m.hitosVencidos} hito(s) vencido(s)`}
            {m.hitosVencidos === 0 && "Plazos e hitos al día"}
          </span>
        </div>
      </Panel>
    </div>
  )
}
