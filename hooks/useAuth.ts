// =====================================================================
// Hook de autenticación con dos modos:
//
//   - "mock"  (default en Sprint 1 mientras Auth termina la Fase A)
//             Devuelve un admin hardcodeado. Login acepta cualquier
//             credencial. Útil para que los squads de Usuarios,
//             Catálogos y Proyectos avancen sin esperar al backend.
//
//   - "real"  Llama al backend de verdad: /auth/login y /usuarios/me.
//             Cuando squad Auth termine Fase A (día 4), el equipo
//             setea NEXT_PUBLIC_AUTH_MODE=real en .env.local y el
//             reemplazo es transparente.
//
// El squad Usuarios extiende este hook agregando:
//   - permisos (cuando el backend agregue el campo a /usuarios/me)
//   - hasPermission(perm) helper
// =====================================================================

"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import {
  login as authLogin,
  logout as authLogout,
  isAuthenticated as hasToken,
} from "@/lib/auth"
import type { LoginRequest, UsuarioResponse } from "@/lib/types"

const AUTH_MODE = (process.env.NEXT_PUBLIC_AUTH_MODE ?? "mock") as "mock" | "real"

// ----- Mock user para modo "mock" -----

const MOCK_ADMIN: UsuarioResponse = {
  id: 1,
  nombres: "Administrador",
  apellidos: "Sistema",
  email: "admin@redmuqui.org",
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

interface UseAuthReturn {
  user: UsuarioResponse | null
  isAuthenticated: boolean
  loading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (permiso: string) => boolean
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<UsuarioResponse | null>(
    AUTH_MODE === "mock" ? MOCK_ADMIN : null,
  )
  const [loading, setLoading] = useState<boolean>(AUTH_MODE === "real")

  // En modo "real": al montar, si hay token, cargar el usuario.
  useEffect(() => {
    if (AUTH_MODE !== "real") return
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
      // Mock: cualquier credencial es válida; usuario fijo.
      setUser(MOCK_ADMIN)
      return
    }
    await authLogin(credentials)
    try {
      const me = await api.get<UsuarioResponse>("/usuarios/me")
      setUser(me)
    } catch (err) {
      if (err instanceof ApiError) {
        // No interrumpir el flujo si /usuarios/me todavía no existe;
        // dejar al menos el flag de autenticado.
        setUser({ ...MOCK_ADMIN, email: credentials.email })
      } else {
        throw err
      }
    }
  }, [])

  const logout = useCallback(async () => {
    if (AUTH_MODE === "mock") {
      setUser(null)
      return
    }
    await authLogout()
    setUser(null)
  }, [])

  const hasPermission = useCallback(
    (permiso: string) => {
      if (!user) return false
      if (!user.permisos || user.permisos.length === 0) return false
      if (user.permisos.includes("*")) return true
      return user.permisos.includes(permiso)
    },
    [user],
  )

  return {
    user,
    isAuthenticated: AUTH_MODE === "mock" ? user !== null : hasToken() && user !== null,
    loading,
    login,
    logout,
    hasPermission,
  }
}
