const BASE = 'http://localhost:3000'

export function apiClient(token: string) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-city-id': 'szczecin',
  }

  return {
    get:    (url: string)              => fetch(`${BASE}${url}`, { headers }),
    post:   (url: string, body?: unknown) => fetch(`${BASE}${url}`, { method: 'POST',   headers, body: body ? JSON.stringify(body) : undefined }),
    delete: (url: string, body?: unknown) => fetch(`${BASE}${url}`, { method: 'DELETE', headers, body: body ? JSON.stringify(body) : undefined }),
  }
}

export async function loginRequest(email: string, password: string, cityId: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, cityId }),
  })
  return { ok: res.ok, data: await res.json() }
}
