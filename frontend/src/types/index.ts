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
  student_id?: string
  rfid_uid: string
  action: 'entry' | 'register'
  timestamp: string
}

export type DoorAccessMode = 'normal' | 'always_locked' | 'first_scan_hold'
export type DoorSchedulePhase = 'inactive' | 'locked_window' | 'waiting_for_first_scan' | 'held_open'

export interface DoorStatus {
  door_state: 'locked' | 'unlocking' | 'held_open'
  gpio_available: boolean
  lock_duration_seconds: number
  lock_pin: number
  lock_active_level: number
  unlock_until?: string | null
  last_unlock_started_at?: string | null
  last_unlock_finished_at?: string | null
  hold_open_started_at?: string | null
  dev_mode: boolean
  rfid_reader_mode: 'dev' | 'hardware'
  rfid_device_connected: boolean
  rfid_device_path?: string | null
  can_simulate_scan: boolean
  last_remote_unlock_at?: string | null
  last_remote_unlock_by?: string | null
  remote_unlock_count: number
  access_mode: DoorAccessMode
  schedule_lock_time: string
  schedule_first_unlock_time: string
  schedule_phase: DoorSchedulePhase
  schedule_hold_date?: string | null
  schedule_hold_started_at?: string | null
}

export interface DoorEvent {
  id: number
  admin_id?: string | null
  admin_name: string
  action: 'remote_unlock' | 'simulate_scan' | string
  source: string
  result: string
  description?: string | null
  created_at: string
}

export interface ApiResponse<T = any> {
  message?: string
  detail?: string
  data?: T
}

export interface VersionInfo {
  version: string
  git_sha?: string
  built_at?: string
}
