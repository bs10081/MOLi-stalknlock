import api from './api'

export const cardService = {
  createCard: async (userId: string, rfidUid: string, nickname?: string) => {
    const formData = new FormData()
    formData.append('user_id', userId)
    formData.append('rfid_uid', rfidUid)
    if (nickname !== undefined) formData.append('nickname', nickname || '')
    return api.post('/admin/cards', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  startBinding: async (userId: string) => {
    const formData = new FormData()
    formData.append('user_id', userId)
    return api.post('/admin/cards/bind', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  checkBindingStatus: async (studentId: string) => {
    return api.get(`/check_status/${studentId}`)
  },
}
