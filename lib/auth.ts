// =====================================================================
// Helpers de autenticación: login, logout, refresh, manejo de tokens.
//
// Estrategia Sprint 1 (decisión documentada en docs/sprints/sprint-1/):
// - Tokens en localStorage (migrar a httpOnly cookies en Sprint 4).
// - Cookie no httpOnly `auth-presence` para que el middleware de Next.js
//   sepa si hay sesión activa (no contiene el token, solo una bandera).
// =====================================================================

import { API_BASE_URL, ApiError, DEFAULT_TIMEOUT_MS } from "./api"
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
  const refreshToken = getRefreshToken()

  if (accessToken && refreshToken) {
    // Best-effort: aunque falle el backend, limpiamos en cliente.
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      })
    } catch {
      // ignorar errores de red
    }
  }

  clearTokens()
}

// Single-flight: una sola operación de refresh a la vez. Si varios requests
// reciben 401 simultáneamente (páginas con llamadas en paralelo tras expirar
// el access token), todos comparten esta misma promesa en lugar de disparar
// cada uno su propio /auth/refresh. Sin esto, el backend rota y revoca el
// refresh token en la primera llamada y las siguientes fallan con "revocado",
// expulsando al usuario al login pese a tener sesión válida.
let refreshPromise: Promise<string | null> | null = null

export function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = doRefresh().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    })
  } catch {
    // Error de red/timeout: la sesión sigue siendo válida, NO borramos tokens.
    // Lanzamos ApiError(0) para que el caller lo propague como error de red
    // (sin clearTokens ni redirect a /login), reservando el `null` de abajo
    // exclusivamente para "sesión inválida" (token revocado/expirado).
    throw new ApiError(
      0,
      null,
      "No se pudo conectar con el servidor para renovar la sesión.",
    )
  }

  if (!res.ok) {
    // El backend rechazó el refresh (revocado/expirado): sesión inválida.
    clearTokens()
    return null
  }

  // Un 200 con cuerpo inválido/vacío se trata como sesión inválida; así un
  // SyntaxError de res.json() no rechaza la promesa compartida del single-flight.
  const tokens: TokenResponse | null = await res.json().catch(() => null)
  if (!tokens?.accessToken) {
    clearTokens()
    return null
  }

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
