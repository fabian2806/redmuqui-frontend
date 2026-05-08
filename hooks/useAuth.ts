// =====================================================================
// Hook que lee el AuthContext global.
//
// Cualquier componente cliente puede usar:
//
//   const { user, login, logout, hasPermission } = useAuth()
//
// El estado es compartido entre TODOS los componentes — si Header llama
// login(), Sidebar y las páginas se enteran automáticamente.
//
// Lanza error si se usa fuera de <AuthProvider>. El Provider está en
// app/layout.tsx envolviendo toda la app, así que en práctica nunca
// debería pasar.
// =====================================================================

"use client"

import { useContext } from "react"
import { AuthContext, type AuthContextValue } from "@/contexts/AuthContext"

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>")
  }
  return ctx
}
