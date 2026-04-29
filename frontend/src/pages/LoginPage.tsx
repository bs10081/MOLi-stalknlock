import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Form } from '@/components/ui/form'
import { authService } from '@/services/authService'
import { ShieldCheck, KeyRound, ArrowRight } from 'lucide-react'
import { useAppVersion } from '@/providers/AppVersionProvider'
import { formatVersionLabel } from '@/lib/version'

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { versionInfo } = useAppVersion()
  const redirectTarget = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await authService.login(username, password)
      navigate(redirectTarget, { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.detail || '帳號或密碼錯誤')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper showFooter={false} align="center" contentClassName="max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card variant="hero" className="hidden lg:block">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/12 bg-accent/[0.08] text-accent">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-3xl">門禁管理入口</CardTitle>
                <CardDescription>登入後即可掌握人員、卡片與門禁動態。</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] border border-border/70 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">目前版本</p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">{formatVersionLabel(versionInfo)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mx-auto w-full max-w-lg">
          <CardHeader className="gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/12 bg-accent/[0.08] text-accent">
                <KeyRound className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-3xl">管理員登入</CardTitle>
                <CardDescription>Makers' Open Lab for Innovation 門禁管理系統</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form onSubmit={handleSubmit} className="space-y-5">
              <Field>
                <FieldLabel htmlFor="username">帳號</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">密碼</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>

              {error && (
                <div className="rounded-[20px] border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="submit"
                  className="gap-2 self-end sm:ml-auto"
                  disabled={loading}
                >
                  {loading ? '登入中...' : '登入'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
