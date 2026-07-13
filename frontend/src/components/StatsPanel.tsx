import React, { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { getStats } from '../api'
import type { RouteStats } from '../types'

const COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1']

export default function StatsPanel() {
  const [stats, setStats] = useState<RouteStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 24, color: '#999', textAlign: 'center' }}>加载中...</div>
  if (!stats) return null

  const { total, monthly } = stats

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 总计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <SummaryCard icon="🚴" label="总活动" value={`${total.count} 次`} color="#1677ff" />
        <SummaryCard icon="📍" label="总里程" value={`${total.distanceKm} km`} color="#52c41a" />
        <SummaryCard icon="⏱️" label="总时长" value={`${total.durationHours} 小时`} color="#fa8c16" />
        <SummaryCard icon="⛰️" label="总爬升" value={`${total.elevationGainM} m`} color="#722ed1" />
      </div>

      {/* 月度里程柱状图 */}
      {monthly.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, color: '#555' }}>月度里程（km）</h4>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={[...monthly].reverse()} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} width={36} />
              <Tooltip
                formatter={(v: any) => [`${v} km`, '里程']}
                labelFormatter={l => `${l} 月`}
              />
              <Bar dataKey="distanceKm" radius={[3, 3, 0, 0]}>
                {monthly.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 月度次数 */}
      {monthly.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, color: '#555' }}>月度次数</h4>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={[...monthly].reverse()} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} width={24} allowDecimals={false} />
              <Tooltip formatter={(v: any) => [`${v} 次`, '活动次数']} />
              <Bar dataKey="count" fill="#13c2c2" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${color}30`,
      borderRadius: 10,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 11, color: '#999' }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 600, color }}>{value}</span>
    </div>
  )
}
