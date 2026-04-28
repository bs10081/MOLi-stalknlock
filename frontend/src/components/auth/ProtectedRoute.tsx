import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
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
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <Spinner className="mx-auto mb-4" />
            <p className="text-sm text-text-secondary">正在驗證管理員登入狀態...</p>
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
