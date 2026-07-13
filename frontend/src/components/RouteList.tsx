import React, { useState } from 'react'
import type { Route } from '../types'
import { deleteRoute, renameRoute } from '../api'
import dayjs from 'dayjs'

interface Props {
  routes: Route[]
  selectedId: number | null
  onSelect: (route: Route) => void
  onDeleted: () => void
}

const SPORT_ICON: Record<string, string> = {
  cycling: '🚴',
  running: '🏃',
  hiking: '🥾',
  swimming: '🏊',
}

export default function RouteList({ routes, selectedId, onSelect, onDeleted }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleRename = async (id: number) => {
    if (!editName.trim()) return
    await renameRoute(id, editName.trim())
    setEditingId(null)
    onDeleted() // 刷新列表
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除这条路线？')) return
    setDeletingId(id)
    try {
      await deleteRoute(id)
      onDeleted()
    } finally {
      setDeletingId(null)
    }
  }

  if (routes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#bbb' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🚴</div>
        <p style={{ margin: 0 }}>还没有骑行记录</p>
        <p style={{ margin: '4px 0 0', fontSize: 12 }}>上传 GPX/TCX/KML 文件开始吧</p>
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', maxHeight: '100%' }}>
      {routes.map(route => {
        const isSelected = route.id === selectedId
        return (
          <div
            key={route.id}
            onClick={() => onSelect(route)}
            style={{
              padding: '10px 14px',
              cursor: 'pointer',
              borderBottom: '1px solid #f0f0f0',
              background: isSelected ? '#e6f4ff' : '#fff',
              borderLeft: isSelected ? '3px solid #1677ff' : '3px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === route.id ? (
                  <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(route.id); if (e.key === 'Escape') setEditingId(null) }}
                      autoFocus
                      style={{ flex: 1, fontSize: 13, padding: '2px 6px', border: '1px solid #1677ff', borderRadius: 4 }}
                    />
                    <button onClick={() => handleRename(route.id)} style={btnStyle('#1677ff')}>✓</button>
                    <button onClick={() => setEditingId(null)} style={btnStyle('#999')}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>{SPORT_ICON[route.sport_type] || '🏅'}</span>
                    <span style={{ fontWeight: 500, fontSize: 14, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {route.name}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  {dayjs(route.date).format('YYYY年MM月DD日')}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                  <StatTag label="距离" value={`${route.distanceKm} km`} color="#1677ff" />
                  <StatTag label="时长" value={route.durationFormatted} color="#52c41a" />
                  {route.elevation_gain > 0 && (
                    <StatTag label="爬升" value={`${route.elevation_gain} m`} color="#fa8c16" />
                  )}
                  {route.avg_speed > 0 && (
                    <StatTag label="均速" value={`${route.avg_speed} km/h`} color="#722ed1" />
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 4, marginLeft: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => { setEditingId(route.id); setEditName(route.name) }}
                  title="重命名"
                  style={iconBtnStyle}
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(route.id)}
                  disabled={deletingId === route.id}
                  title="删除"
                  style={{ ...iconBtnStyle, color: '#ff4d4f' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatTag({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span style={{ fontSize: 11, color, background: color + '15', borderRadius: 4, padding: '1px 6px', border: `1px solid ${color}30` }}>
      {label} {value}
    </span>
  )
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  padding: '2px 4px',
  borderRadius: 4,
  lineHeight: 1,
}

function btnStyle(color: string): React.CSSProperties {
  return {
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '2px 8px',
    cursor: 'pointer',
    fontSize: 12,
  }
}
