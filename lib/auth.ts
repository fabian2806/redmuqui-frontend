// =====================================================================
// Helpers de autenticación: login, logout, refresh, manejo de tokens.
//
// Estrategia Sprint 1 (decisión documentada en docs/sprints/sprint-1/):
// - Tokens en localStorage (migrar a httpOnly cookies en Sprint 4).
// - Cookie no httpOnly `auth-presence` para que el middleware de Next.js
//   sepa si hay sesión activa (no contiene el token, solo una bandera).
// =====================================================================

import { API_BASE_URL } from "./api"
import type {
  LoginRequest,
  RecoverRequest,
  ResetRequest,
  TokenResponse,
} from "./types"

export const ACCESS_TOKEN_KEY = "redmuqui.accessToken"
export const REFRESH_TOKEN_KEY = "redmuqui.refreshToken"
const PRESENCE_COOKIE = "auth-presence"

// ---------- Storage ----------

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(tokens: TokenResponse): void {
  if (typeof window === "undefined") return
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  // Cookie ligera para el middleware (no contiene el token)
  document.cookie = `${PRESENCE_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
}

export function clearTokens(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  document.cookie = `${PRESENCE_COOKIE}=; path=/; max-age=0; SameSite=Lax`
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null
}

// ---------- Calls al backend ----------

export async function login(credentials: LoginRequest): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    throw new Error(errorBody.message || "Credenciales inválidas")
  }

  const tokens: TokenResponse = await res.json()
  setTokens(tokens)
  return tokens
}

export async function logout(): Promise<void> {
  const accessToken = getAccessToken()

  if (accessToken) {
    // Best-effort: aunque falle el backend, limpiamos en cliente.
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    } catch {
      // ignorar errores de red
    }
  }

  clearTokens()
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) {
    clearTokens()
    return null
  }

  const tokens: TokenResponse = await res.json()
  setTokens(tokens)
  return tokens.accessToken
}

export async function requestRecovery(email: string): Promise<void> {
  const body: RecoverRequest = { email }
  const res = await fetch(`${API_BASE_URL}/auth/recover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    throw new Error(errorBody.message || "No se pudo procesar la solicitud")
  }
}

export async function resetPassword(
  token: string,
  nuevaContrasenha: string,
): Promise<void> {
  const body: ResetRequest = { token, nuevaContrasenha }
  const res = await fetch(`${API_BASE_URL}/auth/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    throw new Error(errorBody.message || "Token inválido o expirado")
  }
}
