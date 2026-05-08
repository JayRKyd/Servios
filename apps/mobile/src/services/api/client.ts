const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export async function apiRequest<T>(path: string, options?: RequestInit & { token?: string }): Promise<T> {
  const { token, ...rest } = options ?? {}
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...rest.headers },
  })
  if (!res.ok) throw new Error((await res.json()).error ?? 'Request failed')
  return res.json()
}
