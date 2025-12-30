import api from './api'

export interface BindingStatus {
  bound: boolean
  binding_in_progress?: boolean
  card_count?: number
  initial_count?: number
  step?: number
  status_message?: string
}

export const cardBindingService = {
  /**
   * 為使用者啟動卡片綁定（管理員專用）
   * 支援新增使用者並綁定卡片，或為現有使用者綁定新卡片
   */
  startBinding: async (
    studentId: string,
    name: string,
    email?: string,
    telegramId?: string,
    nickname?: string
  ) => {
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

  /**
   * 檢查卡片綁定狀態
   * 用於輪詢綁定進度
   */
  checkStatus: async (studentId: string) => {
    const response = await api.get<BindingStatus>(`/check_status/${studentId}`)
    return response.data
  },
}
