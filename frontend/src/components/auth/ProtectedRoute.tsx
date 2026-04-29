import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { authService } from '@/services/authService'

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

export const ProtectedRoute: React.FC = () => {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const location = useLocation()

  useEffect(() => {
    let active = true

    const verifyAuth = async () => {
      const admin = await authService.checkAuth()
      if (!active) return
      setStatus(admin ? 'authenticated' : 'unauthenticated')
    }

    void verifyAuth()

    return () => {
      active = false
    }
  }, [])

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <Spinner className="mb-2" />
            <CardTitle className="text-2xl">正在驗證登入狀態</CardTitle>
            <CardDescription>我們正在確認這個管理工作階段是否仍然有效。</CardDescription>
          </CardHeader>
          <CardContent className="pb-8 text-center text-sm text-text-secondary">
            成功後會直接進入對應的後台頁面。
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
