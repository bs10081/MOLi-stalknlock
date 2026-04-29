import React from 'react'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, Users, Clock, Unlock, ChevronRight, ArrowRight, Fingerprint, Sparkles } from 'lucide-react'
import { useAppVersion } from '@/providers/AppVersionProvider'
import { formatVersionLabel } from '@/lib/version'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { versionInfo } = useAppVersion()

  const features = [
    {
      icon: Shield,
      title: '存取控制',
      description: '支援 RFID 卡片多卡綁定，靈活的門禁管理',
    },
    {
      icon: Users,
      title: '使用者管理',
      description: '完整的使用者資料管理與卡片綁定功能',
    },
    {
      icon: Clock,
      title: '存取記錄',
      description: '即時查看門禁使用記錄與統計資料',
    },
    {
      icon: Unlock,
      title: '遠程控制',
      description: '管理員可透過後台進行遠程開門操作',
    },
  ]

  return (
    <PageWrapper contentClassName="max-w-6xl">
      <div className="space-y-8">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card variant="hero">
            <CardHeader className="gap-4 pb-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="info">COSS Console</Badge>
                <Badge variant="outline">{formatVersionLabel(versionInfo)}</Badge>
              </div>
              <div className="space-y-3">
                <CardTitle className="text-3xl leading-tight sm:text-4xl xl:text-5xl">
                  Makers' Open Lab for Innovation
                </CardTitle>
                <CardDescription className="max-w-2xl text-base sm:text-lg">
                  以 RFID、綁定工作流、存取紀錄與遠端開門組成的實驗室門禁控制台。這次前端重構把公開頁、管理後台與版本資訊都收斂到同一套 COSS UI 語言。
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Surface</p>
                  <p className="mt-2 text-2xl font-semibold text-text-primary">Admin UI</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Reader</p>
                  <p className="mt-2 text-2xl font-semibold text-text-primary">RFID / NFC</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Flow</p>
                  <p className="mt-2 text-2xl font-semibold text-text-primary">Bind · Audit · Unlock</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate('/login')} className="gap-2">
                  管理員登入
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  直接進入後台
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card variant="subtle">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/12 bg-accent/[0.08] text-accent">
                  <Fingerprint className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-2xl">Access posture</CardTitle>
                  <CardDescription>目前公開頁也會顯示實際部署版本與統一設計語言。</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[24px] border border-border/60 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Current release</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{formatVersionLabel(versionInfo)}</p>
              </div>
              <div className="space-y-3 text-sm text-text-secondary">
                <div className="flex items-start gap-3 rounded-[24px] border border-border/60 bg-white/72 p-4">
                  <Sparkles className="mt-0.5 h-4.5 w-4.5 text-accent" />
                  <p>公開頁、登入頁與管理後台共用同一條版本資料流與共享 primitives。</p>
                </div>
                <div className="flex items-start gap-3 rounded-[24px] border border-border/60 bg-white/72 p-4">
                  <ArrowRight className="mt-0.5 h-4.5 w-4.5 text-accent" />
                  <p>所有主要工作流都集中在 `/admin/dashboard/*`，用單一 shell 管理使用者、卡片、記錄與設備控制。</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} variant="outline" className="transition-transform duration-200 hover:-translate-y-0.5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl border border-accent/12 bg-accent/[0.08] p-3 text-accent">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1 font-semibold">{feature.title}</h3>
                      <p className="text-sm text-text-secondary">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">目前前端重構結果</CardTitle>
            <CardDescription>共享版型已經把設計風格、狀態資訊與版本可見性統一到同一個入口。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="p-4 text-center">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                </div>
                <div className="text-sm font-medium">運行中</div>
                <div className="mt-1 text-xs text-text-secondary">系統正常</div>
              </div>
              <div className="p-4 text-center">
                <div className="mb-2 text-lg font-semibold text-accent">React</div>
                <div className="text-sm text-text-secondary">前端框架</div>
              </div>
              <div className="p-4 text-center">
                <div className="mb-2 text-lg font-semibold text-accent">COSS UI</div>
                <div className="text-sm text-text-secondary">設計系統</div>
              </div>
              <div className="p-4 text-center">
                <div className="mb-2 text-lg font-semibold text-accent">FastAPI</div>
                <div className="text-sm text-text-secondary">後端 API</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
