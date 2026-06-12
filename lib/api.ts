// =====================================================================
// Cliente HTTP para hablar con el backend Spring Boot.
//
// - Toma la URL base de NEXT_PUBLIC_API_URL (default localhost:8080).
// - Inyecta el access token en cada request si existe.
// - Si el backend responde 401, intenta refrescar el token UNA vez y
//   reintenta el request. Si el refresh falla, redirige a /login.
// - Lanza ApiError con la shape de ErrorResponse del backend.
// =====================================================================

import type { ErrorResponse } from "./types"

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1"

/** Timeout por request (ms). Si el backend acepta la conexión pero no
 *  responde, abortamos para no dejar spinners colgados indefinidamente. */
export const DEFAULT_TIMEOUT_MS = 30_000

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: ErrorResponse | null,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  headers?: Record<string, string>
  // Si es true, no agrega Authorization (útil para /auth/login).
  skipAuth?: boolean
}

async function rawFetch<T>(
  path: string,
  options: RequestOptions,
  accessToken: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  }
  if (!options.skipAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    })
  } catch (err) {
    // fetch rechaza por backend caído / sin red / timeout. Lo normalizamos a
    // ApiError con status 0 para que los callers lo distingan de un error de
    // negocio (y para que NO dispare el flujo de refresh/redirect a login).
    const isTimeout = (err as { name?: string } | null)?.name === "TimeoutError"
    throw new ApiError(
      0,
      null,
      isTimeout
        ? "La solicitud tardó demasiado. Revisa tu conexión e inténtalo de nuevo."
        : "No se pudo conectar con el servidor. Verifica tu conexión.",
    )
  }

  if (res.status === 204) return undefined as T

  const text = await res.text()
  const parsed = text ? safeParse(text) : null

  if (!res.ok) {
    const errBody = parsed as ErrorResponse | null
    throw new ApiError(
      res.status,
      errBody,
      errBody?.message ?? `HTTP ${res.status}`,
    )
  }

  return parsed as T
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** Petición JSON autenticada (fetch + Bearer + manejo de 401/refresh y {@link ApiError}). */
export async function authenticatedJsonRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  // Lazy-import para evitar ciclos: api.ts -> auth.ts -> api.ts
  const { getAccessToken, refreshAccessToken, clearTokens } = await import("./auth")

  const accessToken = getAccessToken()

  try {
    return await rawFetch<T>(path, options, accessToken)
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 401 && !options.skipAuth) {
      // Intentar refresh UNA vez
      const newToken = await refreshAccessToken()
      if (newToken) {
        return await rawFetch<T>(path, options, newToken)
      }
      // Refresh falló: limpiar y redirigir
      clearTokens()
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }
    throw err
  }
}

  async function postForm<T>(
    path: string,
    formData: FormData,
  ): Promise<T> {
    const { getAccessToken, refreshAccessToken, clearTokens } = await import("./auth")

    const makeRequest = async (accessToken: string | null) => {
      return fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: formData,
      })
    }

    let res = await makeRequest(getAccessToken())

    if (res.status === 401) {
      const newToken = await refreshAccessToken()

      if (newToken) {
        res = await makeRequest(newToken)
      } else {
        clearTokens()
        if (typeof window !== "undefined") {
          window.location.href = "/login"
        }
      }
    }

    if (res.status === 204) return undefined as T

    const text = await res.text()
    const parsed = text ? safeParse(text) : null

    if (!res.ok) {
      const errBody = parsed as ErrorResponse | null

      throw new ApiError(
        res.status,
        errBody,
        errBody?.message ?? "Error al subir archivo",
      )
    }

    return parsed as T
  }

export const api = {
  get: <T>(path: string, opts: Omit<RequestOptions, "method" | "body"> = {}) =>
    authenticatedJsonRequest<T>(path, { ...opts, method: "GET" }),

  post: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, "method" | "body"> = {}) =>
    authenticatedJsonRequest<T>(path, { ...opts, method: "POST", body }),

  put: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, "method" | "body"> = {}) =>
    authenticatedJsonRequest<T>(path, { ...opts, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, "method" | "body"> = {}) =>
    authenticatedJsonRequest<T>(path, { ...opts, method: "PATCH", body }),

  delete: <T>(path: string, opts: Omit<RequestOptions, "method" | "body"> = {}) =>
    authenticatedJsonRequest<T>(path, { ...opts, method: "DELETE" }),

  postForm,
}
