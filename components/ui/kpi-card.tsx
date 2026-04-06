import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface KpiCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  variant?: "default" | "warning" | "danger" | "success"
  description?: string
  className?: string
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  variant = "default",
  description,
  className
}: KpiCardProps) {
  const getIconStyles = () => {
    switch (variant) {
      case "success":
        return "bg-[#2E7D32]/10 text-[#2E7D32]"
      case "warning":
        return "bg-[#F57C00]/10 text-[#F57C00]"
      case "danger":
        return "bg-[#C8102E]/10 text-[#C8102E]"
      default:
        return "bg-[#FFD600]/20 text-[#C9A42B]"
    }
  }

  const getValueStyles = () => {
    switch (variant) {
      case "danger":
        return "text-[#C8102E]"
      case "warning":
        return "text-[#F57C00]"
      case "success":
        return "text-[#2E7D32]"
      default:
        return "text-[#1A1A1A]"
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-[#E0E0E0] bg-white p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[#5C5C5C]">
            {title}
          </p>
          <p className={cn("text-3xl font-bold", getValueStyles())}>
            {value}
          </p>
          {description && (
            <p className="text-xs text-[#5C5C5C]">{description}</p>
          )}
        </div>
        <div className={cn("rounded-lg p-2.5", getIconStyles())}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
