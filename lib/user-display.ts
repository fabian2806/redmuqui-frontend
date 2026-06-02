import type { UsuarioResponse } from "./types"

export function getUserDisplayName(user: UsuarioResponse | null): string {
  if (!user) return "Usuario"
  return `${user.nombres} ${user.apellidos}`.trim() || user.email
}

export function getUserRoleLabel(user: UsuarioResponse | null): string {
  if (!user?.nombreRol) return "Sin rol"
  return user.nombreRol
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
