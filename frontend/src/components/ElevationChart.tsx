import React, { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import type { TrackPoint } from '../types'

interface Props {
  trackPoints: TrackPoint[]
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12 }}>
      <div>距离：{d.distanceKm} km</div>
      <div>海拔：{d.elevation} m</div>
      {d.heartRate && <div>心率：{d.heartRate} bpm</div>}
      {d.speed && <div>速度：{d.speed.toFixed(1)} km/h</div>}
    </div>
  )
}

export default function ElevationChart({ trackPoints }: Props) {
  const data = useMemo(() => {
    const result: { distanceKm: string; elevation: number; heartRate: number | null; speed: number | null }[] = []
    let cumDist = 0
    // 每隔若干点采样，避免数据量过大
    const step = Math.max(1, Math.floor(trackPoints.length / 500))

    for (let i = 0; i < trackPoints.length; i += step) {
      const pt = trackPoints[i]
      if (i > 0) {
        const prev = trackPoints[i - step] || trackPoints[i - 1]
        cumDist += haversine(prev.lat, prev.lon, pt.lat, pt.lon)
      }
      if (pt.elevation != null) {
        result.push({
          distanceKm: (cumDist / 1000).toFixed(2),
          elevation: Math.round(pt.elevation),
          heartRate: pt.heart_rate,
          speed: pt.speed,
        })
      }
    }
    return result
  }, [trackPoints])

  if (data.length === 0) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 13 }}>
        暂无海拔数据
      </div>
    )
  }

  const elevations = data.map(d => d.elevation)
  const minEle = Math.min(...elevations)
  const maxEle = Math.max(...elevations)
  const padding = Math.max(10, (maxEle - minEle) * 0.1)

  return (
    <div>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 4, display: 'flex', gap: 16 }}>
        <span>最低：{minEle} m</span>
        <span>最高：{maxEle} m</span>
        <span>爬升：{Math.round(data.reduce((acc, d, i) => i > 0 && d.elevation > data[i-1].elevation ? acc + d.elevation - data[i-1].elevation : acc, 0))} m</span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="eleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1677ff" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#1677ff" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="distanceKm"
            tickFormatter={v => `${v}km`}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minEle - padding, maxEle + padding]}
            tickFormatter={v => `${v}m`}
            tick={{ fontSize: 11 }}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#1677ff"
            strokeWidth={2}
            fill="url(#eleGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
