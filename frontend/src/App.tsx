import React, { useCallback, useEffect, useState } from 'react'
import AMapRoute from './components/AMapRoute'
import AuthPage from './components/AuthPage'
import ElevationChart from './components/ElevationChart'
import FileUploader from './components/FileUploader'
import RouteList from './components/RouteList'
import StatsPanel from './components/StatsPanel'
import { getRoute, getRoutes } from './api'
import { isLoggedIn, getUser, clearAuth } from './auth'
import type { Route, ColorMode, MapStyle } from './types'
import { MAP_STYLE_OPTIONS } from './types'

type SideTab = 'list' | 'upload' | 'stats'

const COLOR_MODE_OPTIONS: { value: ColorMode; label: string }[] = [
  { value: 'solid',     label: '单色' },
  { value: 'speed',     label: '按速度' },
  { value: 'heartrate', label: '按心率' },
  { value: 'elevation', label: '按海拔' },
]

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isLoggedIn())
  const user = getUser()

  const [routes, setRoutes] = useState<Route[]>([])
  const [loadedRoutes, setLoadedRoutes] = useState<Route[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [colorMode, setColorMode] = useState<ColorMode>('solid')
  const [mapStyle, setMapStyle] = useState<MapStyle>('grey')
  const [lineWidth, setLineWidth] = useState(5)
  const [sideTab, setSideTab] = useState<SideTab>('list')
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAuthSuccess = () => setLoggedIn(true)

  const handleLogout = () => {
    clearAuth()
    setLoggedIn(false)
    setRoutes([])
    setLoadedRoutes([])
    setSelectedId(null)
    setSelectedRoute(null)
  }

  const loadRoutes = useCallback(async () => {
    try {
      const res = await getRoutes({ limit: 200 })
      setRoutes(res.routes)
    } catch (e) {
      console.error('加载路线失败', e)
    }
  }, [])

  useEffect(() => { if (loggedIn) loadRoutes() }, [loggedIn, loadRoutes])

  const handleSelectRoute = useCallback(async (route: Route) => {
    setSelectedId(route.id)
    setShowAll(false)
    setLoading(true)
    try {
      const full = await getRoute(route.id)
      setSelectedRoute(full)
      setLoadedRoutes([full])
    } catch (e) {
      console.error('加载轨迹点失败', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleShowAll = useCallback(async () => {
    setSelectedId(null)
    setSelectedRoute(null)
    setShowAll(true)
    setLoading(true)
    try {
      const limit = Math.min(routes.length, 30)
      const results = await Promise.all(routes.slice(0, limit).map(r => getRoute(r.id)))
      setLoadedRoutes(results)
    } catch (e) {
      console.error('批量加载失败', e)
    } finally {
      setLoading(false)
    }
  }, [routes])

  const handleUploadSuccess = useCallback(() => {
    loadRoutes()
    setSideTab('list')
  }, [loadRoutes])

  // ── 未登录：显示登录页 ──────────────────────────────
  if (!loggedIn) return <AuthPage onSuccess={handleAuthSuccess} />

  const selectedTrackPoints = selectedRoute?.trackPoints ?? []

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f5f7fa' }}>

      {/* 左侧面板 */}
      <div style={{ width: 320, display: 'flex', flexDirection: 'column', background: '#fff', boxShadow: '2px 0 8px rgba(0,0,0,0.06)', zIndex: 10, flexShrink: 0 }}>

        {/* 标题 + 用户信息 */}
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>🚴</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>骑行轨迹</div>
                <div style={{ fontSize: 11, color: '#999' }}>运动数据可视化</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{user?.nickname}</div>
                <div style={{ fontSize: 11, color: '#bbb' }}>{user?.email}</div>
              </div>
              <button
                onClick={handleLogout}
                title="退出登录"
                style={{ background: 'none', border: '1px solid #f0f0f0', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, color: '#999' }}>
                退出
              </button>
            </div>
          </div>
        </div>

        {/* Tab 切换 */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
          {([['list', '📋 路线'], ['upload', '📤 导入'], ['stats', '📊 统计']] as [SideTab, string][]).map(([tab, label]) => (
            <button key={tab} onClick={() => setSideTab(tab)}
              style={{
                flex: 1, border: 'none',
                borderBottom: sideTab === tab ? '2px solid #1677ff' : '2px solid transparent',
                background: 'none', padding: '10px 4px', cursor: 'pointer',
                fontSize: 12, color: sideTab === tab ? '#1677ff' : '#666',
                fontWeight: sideTab === tab ? 600 : 400, transition: 'all 0.15s',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {sideTab === 'list' && (
            <>
              <div style={{ padding: '10px 14px 6px' }}>
                <button
                  onClick={handleShowAll}
                  disabled={loading || routes.length === 0}
                  style={{
                    width: '100%', padding: '6px 0',
                    border: `1px solid ${showAll ? '#1677ff' : '#d9d9d9'}`,
                    borderRadius: 6,
                    background: showAll ? '#e6f4ff' : '#fff',
                    color: showAll ? '#1677ff' : '#333',
                    cursor: routes.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: 12, fontWeight: showAll ? 600 : 400,
                  }}>
                  {loading && showAll ? '加载中...' : `显示全部（${Math.min(routes.length, 30)}条）`}
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <RouteList routes={routes} selectedId={selectedId} onSelect={handleSelectRoute} onDeleted={loadRoutes} />
              </div>
            </>
          )}
          {sideTab === 'upload' && <FileUploader onUploadSuccess={handleUploadSuccess} />}
          {sideTab === 'stats' && <div style={{ flex: 1, overflowY: 'auto' }}><StatsPanel /></div>}
        </div>
      </div>

      {/* 右侧主内容 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 顶部工具栏 */}
        <div style={{ background: '#fff', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>着色</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {COLOR_MODE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setColorMode(opt.value)}
                  style={{ padding: '3px 10px', border: `1px solid ${colorMode === opt.value ? '#1677ff' : '#d9d9d9'}`, borderRadius: 20, background: colorMode === opt.value ? '#1677ff' : '#fff', color: colorMode === opt.value ? '#fff' : '#555', cursor: 'pointer', fontSize: 12, fontWeight: colorMode === opt.value ? 600 : 400, transition: 'all 0.15s' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: 1, height: 20, background: '#f0f0f0' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>底图</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {MAP_STYLE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setMapStyle(opt.value)}
                  style={{ padding: '3px 10px', border: `1px solid ${mapStyle === opt.value ? '#722ed1' : '#d9d9d9'}`, borderRadius: 20, background: mapStyle === opt.value ? '#722ed1' : '#fff', color: mapStyle === opt.value ? '#fff' : '#555', cursor: 'pointer', fontSize: 12, fontWeight: mapStyle === opt.value ? 600 : 400, transition: 'all 0.15s' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: 1, height: 20, background: '#f0f0f0' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>线宽 {lineWidth}</span>
            <input type="range" min={2} max={12} value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))}
              style={{ width: 80, accentColor: '#1677ff', cursor: 'pointer' }} />
          </div>

          {loading && !showAll && <span style={{ fontSize: 12, color: '#1677ff' }}>加载中...</span>}

          {selectedRoute && (
            <div style={{ marginLeft: 'auto', fontSize: 12, color: '#666', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <span>📍 {selectedRoute.distanceKm} km</span>
              <span>⏱️ {selectedRoute.durationFormatted}</span>
              {selectedRoute.elevation_gain > 0 && <span>⛰️ +{selectedRoute.elevation_gain} m</span>}
              {selectedRoute.avg_speed > 0 && <span>💨 {selectedRoute.avg_speed} km/h</span>}
              {selectedRoute.avg_heart_rate && <span>❤️ {selectedRoute.avg_heart_rate} bpm</span>}
            </div>
          )}
        </div>

        {/* 地图 */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {loadedRoutes.length === 0 && !loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ccc', pointerEvents: 'none' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🗺️</div>
              <p style={{ fontSize: 18, margin: 0, color: '#bbb' }}>点击左侧路线查看轨迹</p>
              <p style={{ fontSize: 13, color: '#d0d0d0', marginTop: 8 }}>或点击「显示全部」叠加所有骑行</p>
            </div>
          )}
          <AMapRoute routes={loadedRoutes} selectedId={selectedId} colorMode={colorMode} mapStyle={mapStyle} lineWidth={lineWidth} />
        </div>

        {/* 海拔剖面图 */}
        {selectedTrackPoints.length > 0 && !showAll && (
          <div style={{ background: '#fff', borderTop: '1px solid #f0f0f0', padding: '12px 16px', boxShadow: '0 -2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>
              海拔剖面 · {selectedRoute?.name}
            </div>
            <ElevationChart trackPoints={selectedTrackPoints} />
          </div>
        )}
      </div>
    </div>
  )
}
