import api from './api'

export interface RegistrationStatus {
  bound: boolean
  binding_in_progress?: boolean
  card_count?: number
  initial_count?: number
  step?: number
  status_message?: string
}

export const registerService = {
  register: async (studentId: string, name: string) => {
    const formData = new FormData()
    formData.append('student_id', studentId)
    formData.append('name', name)
    return api.post('/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // 新增用戶並綁定卡片（支援 email、telegram_id、nickname）
  registerUser: async (studentId: string, name: string, email?: string, telegramId?: string, nickname?: string) => {
    const formData = new FormData()
    formData.append('student_id', studentId)
    formData.append('name', name)
    if (email) formData.append('email', email)
    if (telegramId) formData.append('telegram_id', telegramId)
    if (nickname) formData.append('nickname', nickname)
    return api.post('/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  checkStatus: async (studentId: string) => {
    const response = await api.get<RegistrationStatus>(`/check_status/${studentId}`)
    return response.data
  },

  // 別名方法，與 checkStatus 功能相同
  checkBindingStatus: async (studentId: string) => {
    const response = await api.get<RegistrationStatus>(`/check_status/${studentId}`)
    return response.data
  },
}
