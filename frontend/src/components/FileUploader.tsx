import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadBatch } from '../api'

interface Props {
  onUploadSuccess: () => void
}

interface FileResult {
  file: string
  success: boolean
  error?: string
}

export default function FileUploader({ onUploadSuccess }: Props) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<FileResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return
      setUploading(true)
      setProgress(0)
      setResults([])
      setError(null)

      try {
        const res = await uploadBatch(acceptedFiles, setProgress)
        setResults(res.results)
        const anySuccess = res.results.some(r => r.success)
        if (anySuccess) onUploadSuccess()
      } catch (e: any) {
        setError(e?.response?.data?.error || '上传失败，请检查文件格式')
      } finally {
        setUploading(false)
        setProgress(0)
      }
    },
    [onUploadSuccess]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/gpx+xml': ['.gpx'],
      'application/vnd.garmin.tcx+xml': ['.tcx'],
      'application/vnd.google-earth.kml+xml': ['.kml'],
      'text/xml': ['.gpx', '.tcx', '.kml'],
      'application/xml': ['.gpx', '.tcx', '.kml'],
    },
    multiple: true,
    disabled: uploading,
  })

  return (
    <div style={{ padding: '16px' }}>
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? '#1677ff' : '#d9d9d9'}`,
          borderRadius: '12px',
          padding: '32px 24px',
          textAlign: 'center',
          background: isDragActive ? '#e6f4ff' : '#fafafa',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <input {...getInputProps()} />
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🚴</div>
        {uploading ? (
          <div>
            <p style={{ color: '#1677ff', fontWeight: 500 }}>上传中... {progress}%</p>
            <div style={{ background: '#e0e0e0', borderRadius: 4, height: 6, marginTop: 8 }}>
              <div
                style={{
                  background: '#1677ff',
                  width: `${progress}%`,
                  height: '100%',
                  borderRadius: 4,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        ) : isDragActive ? (
          <p style={{ color: '#1677ff', fontWeight: 500 }}>松开即可上传</p>
        ) : (
          <>
            <p style={{ fontSize: '15px', color: '#333', margin: '0 0 4px' }}>
              拖拽文件到此处，或点击选择文件
            </p>
            <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
              支持 GPX、TCX、KML 格式，可批量上传
            </p>
          </>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 12, color: '#ff4d4f', fontSize: 13 }}>❌ {error}</div>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {results.map((r, i) => (
            <div
              key={i}
              style={{
                fontSize: 13,
                padding: '4px 8px',
                borderRadius: 6,
                marginBottom: 4,
                background: r.success ? '#f6ffed' : '#fff2f0',
                color: r.success ? '#389e0d' : '#ff4d4f',
                border: `1px solid ${r.success ? '#b7eb8f' : '#ffccc7'}`,
              }}
            >
              {r.success ? '✅' : '❌'} {r.file}
              {r.error && <span style={{ marginLeft: 8, color: '#999' }}>{r.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
