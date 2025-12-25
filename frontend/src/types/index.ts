export interface User {
  id: string
  student_id: string
  name: string
  email?: string
  telegram_id?: string
  is_active: boolean
  card_count: number
  created_at: string
}

export interface Card {
  id: string
  rfid_uid: string
  nickname?: string
  user_id: string
  is_active: boolean
  created_at: string
}

export interface Admin {
  id: string
  username: string
  name: string
  created_at: string
}

export interface AccessLog {
  id: string
  user_id: string
  user_name: string
  rfid_uid: string
  action: 'entry' | 'register'
  timestamp: string
}

export interface ApiResponse<T = any> {
  message?: string
  detail?: string
  data?: T
}
