import axios from 'axios'
import type { Route, RouteStats } from '../types'
import { getToken, clearAuth } from '../auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 30000,
})

// 每个请求自动带 Authorization 头
api.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// 401 自动跳登录
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ────────────────────────────────────────────────
export interface AuthResult {
  token: string
  user: { id: number; email: string; nickname: string }
}

export async function apiRegister(email: string, password: string, nickname?: string): Promise<AuthResult> {
  const res = await api.post('/auth/register', { email, password, nickname })
  return res.data
}

export async function apiLogin(email: string, password: string): Promise<AuthResult> {
  const res = await api.post('/auth/login', { email, password })
  return res.data
}

export async function apiMe(): Promise<{ user: AuthResult['user'] }> {
  const res = await api.get('/auth/me')
  return res.data
}

// ── Routes ──────────────────────────────────────────────
export async function getRoutes(params?: {
  sport?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}): Promise<{ routes: Route[]; total: number }> {
  const res = await api.get('/routes', { params })
  return res.data
}

export async function getRoute(id: number): Promise<Route> {
  const res = await api.get(`/routes/${id}`)
  return res.data
}

export async function deleteRoute(id: number): Promise<void> {
  await api.delete(`/routes/${id}`)
}

export async function renameRoute(id: number, name: string): Promise<void> {
  await api.patch(`/routes/${id}`, { name })
}

export async function getStats(): Promise<RouteStats> {
  const res = await api.get('/routes/stats')
  return res.data
}

// ── Upload ──────────────────────────────────────────────
export async function uploadFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ routeId: number; summary: Partial<Route> }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
    },
  })
  return res.data
}

export async function uploadBatch(
  files: File[],
  onProgress?: (percent: number) => void
): Promise<{ results: { file: string; success: boolean; routeId?: number; error?: string }[] }> {
  const formData = new FormData()
  files.forEach(f => formData.append('files', f))
  const res = await api.post('/upload/batch', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
    },
  })
  return res.data
}
