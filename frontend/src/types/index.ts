export interface TrackPoint {
  lat: number
  lon: number
  elevation: number | null
  time: string | null
  heart_rate: number | null
  cadence: number | null
  speed: number | null
  point_order: number
}

export interface Route {
  id: number
  name: string
  sport_type: 'cycling' | 'running' | 'hiking' | 'swimming'
  date: string
  distance: number       // 米
  distanceKm: string     // 格式化后的 km
  duration: number       // 秒
  durationFormatted: string
  elevation_gain: number
  avg_speed: number
  max_speed: number
  avg_heart_rate: number | null
  max_heart_rate: number | null
  calories: number | null
  file_type: string
  original_filename: string
  created_at: string
  trackPoints?: TrackPoint[]
}

export interface RouteStats {
  total: {
    count: number
    distanceKm: string
    durationHours: string
    elevationGainM: number
  }
  monthly: {
    month: string
    count: number
    distanceKm: string
    durationHours: string
  }[]
  bySport: {
    sport_type: string
    count: number
    distance: number
  }[]
}

export type ColorMode = 'solid' | 'speed' | 'heartrate' | 'elevation'

export type MapStyle = 'normal' | 'grey' | 'dark' | 'fresh' | 'satellite'

export const MAP_STYLE_OPTIONS: { value: MapStyle; label: string }[] = [
  { value: 'normal',    label: '标准' },
  { value: 'grey',      label: '灰色' },
  { value: 'dark',      label: '暗黑' },
  { value: 'fresh',     label: '清新' },
  { value: 'satellite', label: '卫星' },
]

export const AMAP_STYLE_MAP: Record<MapStyle, string> = {
  normal:    'amap://styles/normal',
  grey:      'amap://styles/grey',
  dark:      'amap://styles/dark',
  fresh:     'amap://styles/fresh',
  satellite: 'amap://styles/satellite',
}
