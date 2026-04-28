import axios from 'axios'
import api from './api'

const authApi = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const authService = {
  login: async (username: string, password: string) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    return api.post('/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  logout: async () => {
    return api.post('/logout')
  },

  checkAuth: async () => {
    try {
      const response = await authApi.get('/me')
      return response.data
    } catch (error) {
      return null
    }
  },
}
