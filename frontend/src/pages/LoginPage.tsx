import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { authService } from '@/services/authService'

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await authService.login(username, password)
      // 登入成功，重導向到註冊頁面
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || '登入失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper showHeader={false} showFooter={false}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-semibold mb-2">管理員登入</CardTitle>
          <p className="text-sm text-text-secondary">MOLi 實驗室門禁管理系統</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2">
                帳號
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                密碼
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-6"
              disabled={loading}
            >
              {loading ? '登入中...' : '登入'}
            </Button>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-danger">
                {error}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
