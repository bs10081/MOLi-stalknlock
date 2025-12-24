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

  checkStatus: async (studentId: string) => {
    const response = await api.get<RegistrationStatus>(`/check_status/${studentId}`)
    return response.data
  },
}
