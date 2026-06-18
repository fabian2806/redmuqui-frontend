// =====================================================================
// AuthContext: estado global de autenticación.
//
// El AuthProvider envuelve toda la app en app/layout.tsx, así cualquier
// componente puede leer y modificar el usuario actual con useAuth() y
// los cambios se propagan a todos los demás (header, sidebar, páginas).
//
// Modos:
//   - "real" (default): login real contra el backend + carga de /usuarios/me.
//   - "mock": admin hardcodeado solo para prototipos locales.
// =====================================================================

"use client"

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { api } from "@/lib/api"
import {
  clearTokens,
  login as authLogin,
  logout as authLogout,
  isAuthenticated as hasToken,
} from "@/lib/auth"
import type { LoginRequest, UsuarioResponse } from "@/lib/types"

const AUTH_MODE = (process.env.NEXT_PUBLIC_AUTH_MODE ?? "real") as "mock" | "real"

const MOCK_ADMIN: UsuarioResponse = {
  id: 1,
  nombres: "Administrador",
  apellidos: "Sistema",
  email: "admin@redmuqui.org",
  telefono: null,
  estado: true,
  nombreRol: "ADMINISTRADOR",
  idRol: 1,
  nombreMacroregion: null,
  idMacroregion: null,
  nombreInstitucion: null,
  idInstitucion: null,
  ultimoAcceso: null,
  permisos: ["*"], // wildcard: admin tiene todos
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMINISTRADOR: ["*"],
  TECNICO: [
    "CATALOGOS_READ",
    "PROYECTOS_READ",
    "PROYECTOS_CREATE",
    "PROYECTOS_UPDATE",
    "DOCUMENTOS_READ",
    "DOCUMENTOS_CREATE",
    "DOCUMENTOS_UPDATE",
    "BITACORA_READ",
    "REPORTES_READ",
  ],
  COORDINADOR: [
    "USUARIOS_READ",
    "CATALOGOS_READ",
    "PROYECTOS_READ",
    "PROYECTOS_CREATE",
    "PROYECTOS_UPDATE",
    "DOCUMENTOS_READ",
    "DOCUMENTOS_CREATE",
    "DOCUMENTOS_UPDATE",
    "DOCUMENTOS_VALIDATE",
    "BITACORA_READ",
    "REPORTES_READ",
    "REPORTES_EXPORT",
  ],
  CONSULTOR: [
    "CATALOGOS_READ",
    "PROYECTOS_READ",
    "DOCUMENTOS_READ",
    "REPORTES_READ",
  ],
}

function normalizeRol(rol: string | null | undefined) {
  return (rol ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
}

function getFallbackPermissions(nombreRol: string | null | undefined) {
  const normalized = normalizeRol(nombreRol)
  return ROLE_PERMISSIONS[normalized] ?? []
}

export interface AuthContextValue {
  user: UsuarioResponse | null
  isAuthenticated: boolean
  loading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: UsuarioResponse) => void
  hasPermission: (permiso: string) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioResponse | null>(
    AUTH_MODE === "mock" ? MOCK_ADMIN : null,
  )
  const [loading, setLoading] = useState<boolean>(AUTH_MODE === "real")

  // Modo "real": al montar, si hay token persistido, cargar /usuarios/me.
  useEffect(() => {
    if (AUTH_MODE !== "real"){
      console.log("🧪 [Modo Mock]: setUser a MOCK_ADMIN")
      return
    } 
    if (!hasToken()) {
      setLoading(false)
      return
    }
    let cancelled = false
    api
      .get<UsuarioResponse>("/usuarios/me")
      .then((data) => {
        if (!cancelled) setUser(data)
      })
      .catch(() => {
        clearTokens()
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (credentials: LoginRequest) => {
    if (AUTH_MODE === "mock") {
      console.log("🧪 [Modo Mock]: setUser a MOCK_ADMIN")
      setUser(MOCK_ADMIN)
      return
    }
    await authLogin(credentials)
    try {
      const me = await api.get<UsuarioResponse>("/usuarios/me")
      setUser(me)
    } catch (err) {
      // Si no se puede cargar el usuario real (sea ApiError o error de red),
      // no concedemos acceso: limpiamos tokens y la cookie de presencia para
      // no dejar una sesión "presente" con user=null que el middleware
      // dejaría pasar a rutas protegidas.
      clearTokens()
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    if (AUTH_MODE === "mock") {
      console.log("🧪 [Modo Mock]: setUser a NULL")
      setUser(null)
      return
    }
    await authLogout()
    setUser(null)
  }, [])

  const updateUser = useCallback((nextUser: UsuarioResponse) => {
    setUser(nextUser)
  }, [])

  const hasPermission = useCallback(
    (permiso: string) => {
      if (!user) return false
      if (user.permisos?.includes("*")) return true
      if (!user.permisos || user.permisos.length === 0) {
        const fallbackPermissions = getFallbackPermissions(user.nombreRol)
        return fallbackPermissions.includes("*") || fallbackPermissions.includes(permiso)
      }
      return user.permisos.includes(permiso)
    },
    [user],
  )

  const value: AuthContextValue = {
    user,
    isAuthenticated:
      AUTH_MODE === "mock" ? user !== null : hasToken() && user !== null,
    loading,
    login,
    logout,
    updateUser,
    hasPermission,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
