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
import { api, ApiError } from "@/lib/api"
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

export interface AuthContextValue {
  user: UsuarioResponse | null
  isAuthenticated: boolean
  loading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => Promise<void>
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
      if (err instanceof ApiError) {
        // Si no se puede cargar el usuario real, no concedemos acceso.
        clearTokens()
        throw err
      } else {
        throw err
      }
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

  const isAdminRole = (user?.nombreRol ?? "").toLowerCase().includes("administrador")

  const hasPermission = useCallback(
    (permiso: string) => {
      if (!user) return false
      if (user.permisos?.includes("*")) return true
      if (!user.permisos || user.permisos.length === 0) {
        return isAdminRole
      }
      return user.permisos.includes(permiso)
    },
    [user, isAdminRole],
  )

  const value: AuthContextValue = {
    user,
    isAuthenticated:
      AUTH_MODE === "mock" ? user !== null : hasToken() && user !== null,
    loading,
    login,
    logout,
    hasPermission,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
