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

export interface AdminCard {
  id: string
  rfid_uid: string
  nickname?: string
  user_id?: string
  user_name?: string
  student_id?: string
  is_shared: boolean
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

export interface LockMode {
  always_lock: boolean
  mode_name: string
}

export interface DaytimeMode {
  daytime_mode_enabled: boolean
  is_daytime_hours: boolean
  is_daytime_unlocked: boolean
  first_unlock_user?: string
  first_unlock_time?: string
}

export interface DoorStatus {
  is_locked: boolean
  daytime_mode: DaytimeMode
  lock_mode: LockMode
}

export interface ApiResponse<T = any> {
  message?: string
  detail?: string
  data?: T
}
