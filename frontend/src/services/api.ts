import axios from 'axios'

const api = axios.create({
  baseURL: '',  // 直接連接後端，不使用 proxy
  withCredentials: true, // 自動攜帶 cookie
  headers: {
    'Content-Type': 'application/json',
  },
})

// 回應攔截器處理 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const loginPath = '/admin/login'
      // 重導向到登入頁
      if (window.location.pathname !== loginPath) {
        window.location.replace(loginPath)
      }
    }
    return Promise.reject(error)
  }
)

export default api
