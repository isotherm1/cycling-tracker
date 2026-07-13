import React, { useEffect, useRef, useState } from 'react'
import type { Route, TrackPoint, ColorMode, MapStyle } from '../types'
import { AMAP_STYLE_MAP } from '../types'

declare global {
  interface Window {
    AMap: any
    _AMapSecurityConfig: any
  }
}

interface Props {
  routes: Route[]
  selectedId: number | null
  colorMode: ColorMode
  mapStyle: MapStyle
  lineWidth: number
}

// 根据值（0~1）生成颜色：绿→黄→红
function valueToColor(t: number): string {
  const clamp = Math.max(0, Math.min(1, t))
  if (clamp < 0.5) {
    const r = Math.round(clamp * 2 * 255)
    return `rgb(${r},200,50)`
  } else {
    const g = Math.round((1 - clamp) * 2 * 200)
    return `rgb(255,${g},50)`
  }
}

// 将轨迹点转为高德 LngLat
function toLatLng(pt: TrackPoint) {
  return [pt.lon, pt.lat] as [number, number]
}

export default function AMapRoute({ routes, selectedId, colorMode, mapStyle, lineWidth }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const polylinesRef = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // 切换底图样式
  useEffect(() => {
    if (!mapRef.current || !mapReady) return
    mapRef.current.setMapStyle(AMAP_STYLE_MAP[mapStyle])
  }, [mapStyle, mapReady])

  // 初始化地图
  useEffect(() => {
    const tryInit = () => {
      if (!window.AMap) return false
      if (!containerRef.current) return false
      if (mapRef.current) return true

      try {
        mapRef.current = new window.AMap.Map(containerRef.current, {
          zoom: 13,
          center: [116.397428, 39.90923],
          mapStyle: 'amap://styles/normal',
          resizeEnable: true,
        })

        // 添加控件
        window.AMap.plugin(['AMap.Scale', 'AMap.ToolBar'], () => {
          mapRef.current.addControl(new window.AMap.Scale())
          mapRef.current.addControl(new window.AMap.ToolBar({ position: 'RB' }))
        })

        setMapReady(true)
        return true
      } catch (e) {
        console.error('地图初始化失败', e)
        setLoadError(true)
        return false
      }
    }

    if (tryInit()) return

    // 等待高德 JS API 加载完成
    let attempts = 0
    const timer = setInterval(() => {
      attempts++
      if (tryInit() || attempts > 60) clearInterval(timer)
      if (attempts > 60) setLoadError(true)
    }, 500)

    return () => clearInterval(timer)
  }, [])

  // 路线变化时重绘
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    // 清除旧折线
    polylinesRef.current.forEach(p => mapRef.current.remove(p))
    polylinesRef.current = []

    if (routes.length === 0) return

    const allBounds: [number, number][] = []
    const ROUTE_COLORS = [
      '#ff4d4f', '#1677ff', '#52c41a', '#fa8c16', '#722ed1',
      '#eb2f96', '#13c2c2', '#fadb14', '#2f54eb', '#a0d911',
    ]

    // 绘制带描边的折线：先画粗白边，再画细彩色线，视觉更突出
    const addPolylineWithBorder = (
      path: [number, number][],
      color: string,
      weight: number,
      opacity: number,
      zIndex: number
    ) => {
      // 白色描边（更宽）
      const border = new window.AMap.Polyline({
        path,
        strokeColor: '#ffffff',
        strokeWeight: weight + 4,
        strokeOpacity: opacity * 0.9,
        zIndex: zIndex - 1,
        lineJoin: 'round',
        lineCap: 'round',
      })
      // 彩色主线
      const line = new window.AMap.Polyline({
        path,
        strokeColor: color,
        strokeWeight: weight,
        strokeOpacity: opacity,
        zIndex,
        lineJoin: 'round',
        lineCap: 'round',
      })
      mapRef.current.add([border, line])
      polylinesRef.current.push(border, line)
    }

    // 分段着色时也加描边
    const addSegmentWithBorder = (
      p1: [number, number],
      p2: [number, number],
      color: string,
      weight: number,
      opacity: number,
      zIndex: number
    ) => {
      const border = new window.AMap.Polyline({
        path: [p1, p2],
        strokeColor: '#ffffff',
        strokeWeight: weight + 4,
        strokeOpacity: opacity * 0.85,
        zIndex: zIndex - 1,
        lineJoin: 'round',
        lineCap: 'round',
      })
      const line = new window.AMap.Polyline({
        path: [p1, p2],
        strokeColor: color,
        strokeWeight: weight,
        strokeOpacity: opacity,
        zIndex,
        lineJoin: 'round',
        lineCap: 'round',
      })
      mapRef.current.add([border, line])
      polylinesRef.current.push(border, line)
    }

    routes.forEach((route, idx) => {
      const pts = route.trackPoints
      if (!pts || pts.length < 2) return

      const isSelected = selectedId === route.id
      const baseColor = ROUTE_COLORS[idx % ROUTE_COLORS.length]
      const weight = isSelected ? lineWidth + 2 : lineWidth
      const opacity = isSelected ? 1 : 0.82
      const zIndex = isSelected ? 20 : 8

      if (colorMode === 'solid') {
        addPolylineWithBorder(pts.map(toLatLng), isSelected ? '#ff4d4f' : baseColor, weight, opacity, zIndex)

      } else if (colorMode === 'elevation') {
        const elevations = pts.map(p => p.elevation ?? 0)
        const minE = Math.min(...elevations)
        const range = (Math.max(...elevations) - minE) || 1
        for (let i = 1; i < pts.length; i++) {
          const t = ((pts[i].elevation ?? 0) - minE) / range
          addSegmentWithBorder(toLatLng(pts[i - 1]), toLatLng(pts[i]), valueToColor(t), weight, opacity, zIndex)
        }

      } else if (colorMode === 'speed') {
        const speeds: number[] = []
        for (let i = 1; i < pts.length; i++) {
          if (pts[i - 1].time && pts[i].time) {
            const dt = (new Date(pts[i].time!).getTime() - new Date(pts[i - 1].time!).getTime()) / 1000
            const dlat = pts[i].lat - pts[i - 1].lat
            const dlon = pts[i].lon - pts[i - 1].lon
            const dist = Math.sqrt(dlat * dlat + dlon * dlon) * 111000
            speeds.push(dt > 0 ? (dist / dt) * 3.6 : 0)
          } else {
            speeds.push(0)
          }
        }
        const maxS = Math.max(...speeds.filter(s => s < 100)) || 30
        for (let i = 1; i < pts.length; i++) {
          const t = Math.min(speeds[i - 1] / maxS, 1)
          addSegmentWithBorder(toLatLng(pts[i - 1]), toLatLng(pts[i]), valueToColor(t), weight, opacity, zIndex)
        }

      } else if (colorMode === 'heartrate') {
        const hrs = pts.map(p => p.heart_rate ?? 0).filter(h => h > 0)
        if (hrs.length === 0) {
          addPolylineWithBorder(pts.map(toLatLng), baseColor, weight, opacity, zIndex)
        } else {
          const minHR = Math.min(...hrs)
          const range = (Math.max(...hrs) - minHR) || 1
          for (let i = 1; i < pts.length; i++) {
            const hr = pts[i].heart_rate ?? minHR
            const t = (hr - minHR) / range
            addSegmentWithBorder(toLatLng(pts[i - 1]), toLatLng(pts[i]), valueToColor(t), weight, opacity, zIndex)
          }
        }
      }

      // 起终点标记（仅选中时）
      if (isSelected && pts.length > 0) {
        const startMarker = new window.AMap.Marker({
          position: toLatLng(pts[0]),
          title: '起点',
          label: {
            content: '<div style="background:#52c41a;color:#fff;padding:2px 6px;border-radius:4px;font-size:12px;font-weight:bold">▶ 起</div>',
            offset: new window.AMap.Pixel(-20, -36),
          },
          zIndex: 30,
        })
        const endMarker = new window.AMap.Marker({
          position: toLatLng(pts[pts.length - 1]),
          title: '终点',
          label: {
            content: '<div style="background:#ff4d4f;color:#fff;padding:2px 6px;border-radius:4px;font-size:12px;font-weight:bold">■ 终</div>',
            offset: new window.AMap.Pixel(-20, -36),
          },
          zIndex: 30,
        })
        mapRef.current.add([startMarker, endMarker])
        polylinesRef.current.push(startMarker, endMarker)
      }

      pts.forEach(p => allBounds.push([p.lon, p.lat]))
    })

    // 自动缩放视野
    if (allBounds.length > 0) {
      if (selectedId) {
        const sel = routes.find(r => r.id === selectedId)
        if (sel?.trackPoints && sel.trackPoints.length > 0) {
          const bounds = new window.AMap.Bounds(
            [Math.min(...sel.trackPoints.map(p => p.lon)), Math.min(...sel.trackPoints.map(p => p.lat))],
            [Math.max(...sel.trackPoints.map(p => p.lon)), Math.max(...sel.trackPoints.map(p => p.lat))]
          )
          mapRef.current.setBounds(bounds, false, [40, 40, 40, 40])
        }
      } else {
        const bounds = new window.AMap.Bounds(
          [Math.min(...allBounds.map(b => b[0])), Math.min(...allBounds.map(b => b[1]))],
          [Math.max(...allBounds.map(b => b[0])), Math.max(...allBounds.map(b => b[1]))]
        )
        mapRef.current.setBounds(bounds, false, [40, 40, 40, 40])
      }
    }
  }, [routes, selectedId, colorMode, lineWidth, mapReady])

  if (loadError) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: 8 }}>
        <div style={{ textAlign: 'center', color: '#999' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
          <p>地图加载失败</p>
          <p style={{ fontSize: 12 }}>请检查 index.html 中的高德地图 API Key 是否正确</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
      {!mapReady && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: 8 }}>
          <span style={{ color: '#999' }}>地图加载中...</span>
        </div>
      )}
    </div>
  )
}
