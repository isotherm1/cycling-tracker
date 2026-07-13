import React, { useState } from 'react'
import { apiLogin, apiRegister } from '../api'
import { saveAuth } from '../auth'

interface Props {
  onSuccess: () => void
}

export default function AuthPage({ onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = mode === 'login'
        ? await apiLogin(email, password)
        : await apiRegister(email, password, nickname || undefined)
      saveAuth(result.token, result.user)
      onSuccess()
    } catch (err: any) {
      setError(err?.response?.data?.error || '请求失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #e0f0ff 0%, #f0e8ff 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 36px', width: 380,
        boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🚴</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111' }}>骑行轨迹</div>
          <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>运动数据可视化平台</div>
        </div>

        {/* Tab */}
        <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 8, padding: 3, marginBottom: 24 }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(null) }}
              style={{
                flex: 1, padding: '7px 0', border: 'none', borderRadius: 6, cursor: 'pointer',
                fontSize: 14, fontWeight: 500, transition: 'all 0.15s',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#1677ff' : '#666',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}>
              {m === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>昵称（选填）</label>
              <input
                value={nickname} onChange={e => setNickname(e.target.value)}
                placeholder="你的骑行昵称"
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>邮箱</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>密码{mode === 'register' && <span style={{ color: '#999', fontWeight: 400 }}>（至少6位）</span>}</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={6}
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ marginBottom: 14, padding: '8px 12px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6, color: '#ff4d4f', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '11px 0', border: 'none', borderRadius: 8,
              background: loading ? '#91caff' : '#1677ff', color: '#fff',
              fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}>
            {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#bbb', marginTop: 24, marginBottom: 0 }}>
          数据仅属于你，不对任何第三方共享
        </p>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #d9d9d9', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', transition: 'border 0.15s',
  color: '#222',
}
