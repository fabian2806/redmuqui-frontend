import { ESTADO_PROYECTO_LABELS } from "@/lib/project-status"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  estado?: string
  status?: string
  type?: string
  className?: string
}

const statusLabels: Record<string, string> = {
  ...ESTADO_PROYECTO_LABELS,
  PENDIENTE: "Pendiente",
  EN_CURSO: "En curso",
  FINALIZADO: "Finalizado",
}

export function StatusBadge({ estado, status, className }: StatusBadgeProps) {
  const value = estado ?? status ?? ""
  const getStatusStyles = () => {
    switch (value) {
      case "Activo":
      case "ACTIVO":
      case "Publicado":
      case "Completada":
      case "Completado":
      case "Finalizado":
      case "EN_CURSO":
      case "FINALIZADO":
        return "bg-[#2E7D32]/10 text-[#2E7D32] border-[#2E7D32]/20"
      case "En riesgo":
      case "En revisión":
      case "En progreso":
      case "En curso":
        return "bg-[#F57C00]/10 text-[#F57C00] border-[#F57C00]/20"
      case "Vencido":
      case "Vencida":
      case "Suspendido":
      case "SUSPENDIDO":
        return "bg-[#C8102E]/10 text-[#C8102E] border-[#C8102E]/20"
      case "Cerrado":
      case "CERRADO":
      case "Inactivo":
        return "bg-[#5C5C5C]/10 text-[#5C5C5C] border-[#5C5C5C]/20"
      case "Borrador":
      case "Pendiente":
      case "Pendientes":
      case "PENDIENTE":
        return "bg-[#0277BD]/10 text-[#0277BD] border-[#0277BD]/20"
      default:
        return "bg-[#5C5C5C]/10 text-[#5C5C5C] border-[#5C5C5C]/20"
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        getStatusStyles(),
        className,
      )}
    >
      {statusLabels[value] ?? value}
    </span>
  )
}

interface MacroregionBadgeProps {
  macroregion: string
  className?: string
}

export function MacroregionBadge({
  macroregion,
  className,
}: MacroregionBadgeProps) {
  const getStyles = () => {
    switch (macroregion) {
      case "Norte":
        return "bg-[#C8102E]/10 text-[#C8102E] border-[#C8102E]/20"
      case "Centro":
        return "bg-[#C9A42B]/10 text-[#C9A42B] border-[#C9A42B]/20"
      case "Sur":
        return "bg-[#424242]/10 text-[#424242] border-[#424242]/20"
      default:
        return "bg-[#5C5C5C]/10 text-[#5C5C5C] border-[#5C5C5C]/20"
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        getStyles(),
        className,
      )}
    >
      {macroregion}
    </span>
  )
}

interface TypeBadgeProps {
  tipo: string
  className?: string
}

export function TypeBadge({ tipo, className }: TypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[#E0E0E0] bg-[#F7F7F7] px-2.5 py-0.5 text-xs font-medium text-[#5C5C5C]",
        className,
      )}
    >
      {tipo}
    </span>
  )
}
