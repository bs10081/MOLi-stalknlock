import React, { useEffect, useState } from 'react'
import { Activity, Cpu, DoorOpen, Lock, RefreshCw, ScanLine, ShieldAlert, Radio } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { adminService } from '@/services/adminService'
import type { AccessLog, DoorAccessMode, DoorEvent, DoorStatus } from '@/types'
import { formatDateTime, formatTime } from '@/lib/dateTime'
import { cn } from '@/lib/utils'

type FeedbackTone = 'success' | 'error'

const formatDateTimeLabel = (value?: string | null) => (value ? formatDateTime(value, { second: '2-digit' }) : '尚無紀錄')
const formatTimeOnly = (value?: string | null) => (value ? formatTime(value) : '尚無紀錄')

const FeedbackNotice: React.FC<{
  tone: FeedbackTone
  message: string
  className?: string
}> = ({ tone, message, className }) => (
  <div
    className={cn(
      'rounded-[24px] border px-4 py-3 text-sm',
      tone === 'error'
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800',
      className,
    )}
  >
    {message}
  </div>
)

const getDoorStateVariant = (status?: DoorStatus | null) =>
  status?.door_state === 'unlocking' || status?.door_state === 'held_open'
    ? 'success'
    : status?.access_mode === 'always_locked'
      ? 'warning'
      : 'outline'

const getDoorStateLabel = (status?: DoorStatus | null) => {
  if (status?.door_state === 'held_open') {
    return '保持解鎖中'
  }

  if (status?.door_state === 'unlocking') {
    return '暫時解鎖中'
  }

  if (status?.access_mode === 'always_locked') {
    return '永久上鎖中'
  }

  return '目前上鎖'
}

const getAccessModeLabel = (status?: DoorStatus | null) => {
  if (status?.access_mode === 'always_locked') {
    return '永久上鎖'
  }

  if (status?.access_mode === 'first_scan_hold') {
    return '每日首刷常開'
  }

  return '一般通行'
}

const getSchedulePhaseLabel = (status?: DoorStatus | null) => {
  if (status?.access_mode !== 'first_scan_hold') {
    return '未啟用'
  }

  if (status.schedule_phase === 'held_open') {
    return '今日已常開'
  }

  if (status.schedule_phase === 'waiting_for_first_scan') {
    return '等待首刷'
  }

  return '上鎖時段'
}

const getModeSummary = (status?: DoorStatus | null) => {
  if (!status) {
    return '載入中...'
  }

  if (status.access_mode === 'always_locked') {
    return '所有刷卡會先維持鎖定，僅保留管理端協助開門。'
  }

  if (status.access_mode === 'first_scan_hold') {
    if (status.schedule_phase === 'held_open') {
      return `今天已進入常開狀態，預計 ${status.schedule_lock_time} 自動恢復上鎖。`
    }

    if (status.schedule_phase === 'waiting_for_first_scan') {
      return `已進入首刷常開等待時段，下一張有效卡會讓門保持解鎖直到 ${status.schedule_lock_time}。`
    }

    return `目前仍在上鎖時段，會在 ${status.schedule_first_unlock_time} 後等待第一張有效卡切換常開。`
  }

  return `合法卡片會依目前設定短暫開門 ${status.lock_duration_seconds} 秒。`
}

const getDoorStateDetail = (status?: DoorStatus | null, unlockCountdownSeconds = 0) => {
  if (!status) {
    return '載入中...'
  }

  if (status.door_state === 'held_open') {
    if (status.access_mode === 'first_scan_hold') {
      return `今日常開進行中，預計 ${status.schedule_lock_time} 自動恢復上鎖。`
    }
    return '門目前維持解鎖中。'
  }

  if (status.door_state === 'unlocking') {
    return `預計 ${unlockCountdownSeconds} 秒後自動上鎖`
  }

  if (status.access_mode === 'always_locked') {
    return '目前所有刷卡都不會直接開門。'
  }

  if (status.access_mode === 'first_scan_hold' && status.schedule_phase === 'waiting_for_first_scan') {
    return `等待 ${status.schedule_first_unlock_time} 後的第一張有效卡切換為常開。`
  }

  if (status.access_mode === 'first_scan_hold' && status.schedule_phase === 'locked_window') {
    return `目前為上鎖時段，預計 ${status.schedule_first_unlock_time} 後進入首刷常開等待。`
  }

  return `每次開門會維持 ${status.lock_duration_seconds ?? '...'} 秒`
}

const getEventLabel = (event: DoorEvent) => {
  if (event.action === 'remote_unlock') {
    return '遠端開門'
  }

  if (event.action === 'simulate_scan') {
    return '測試刷卡'
  }

  if (event.action === 'door_settings_updated') {
    return '模式更新'
  }

  if (event.action === 'schedule_auto_lock') {
    return '自動上鎖'
  }

  if (event.action === 'schedule_hold_open') {
    return '首刷常開'
  }

  if (event.action === 'always_locked_enforced') {
    return '永久上鎖'
  }

  return event.action
}

export const DoorControlPage: React.FC = () => {
  const [status, setStatus] = useState<DoorStatus | null>(null)
  const [events, setEvents] = useState<DoorEvent[]>([])
  const [recentLogs, setRecentLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isSimulating, setIsSimulating] = useState(false)
  const [isSavingMode, setIsSavingMode] = useState(false)
  const [scanInput, setScanInput] = useState('')
  const [modeForm, setModeForm] = useState<DoorAccessMode>('normal')
  const [scheduleLockTime, setScheduleLockTime] = useState('22:00')
  const [scheduleFirstUnlockTime, setScheduleFirstUnlockTime] = useState('09:00')
  const [modeDirty, setModeDirty] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [modeFeedback, setModeFeedback] = useState<{ tone: FeedbackTone, message: string } | null>(null)
  const [doorFeedback, setDoorFeedback] = useState<{ tone: FeedbackTone, message: string } | null>(null)
  const [scanFeedback, setScanFeedback] = useState<{ tone: FeedbackTone, message: string } | null>(null)

  const loadDoorConsole = async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const [doorStatus, doorEvents, logs] = await Promise.all([
        adminService.getDoorStatus(),
        adminService.getDoorEvents(8),
        adminService.getLogs(6),
      ])

      setStatus(doorStatus)
      setEvents(doorEvents)
      setRecentLogs(logs)
      setPageError(null)
    } catch (err: any) {
      console.error('Failed to load door console:', err)
      setPageError(err.response?.data?.detail || '載入門禁控制資料失敗')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const refreshDoorStatusOnly = async () => {
    try {
      const doorStatus = await adminService.getDoorStatus()
      setStatus(doorStatus)
    } catch (err) {
      console.error('Failed to refresh door status:', err)
    }
  }

  useEffect(() => {
    void loadDoorConsole()
  }, [])

  useEffect(() => {
    const intervalMs = status?.door_state === 'unlocking' ? 1000 : 8000
    const timer = window.setInterval(() => {
      void refreshDoorStatusOnly()
    }, intervalMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [status?.door_state])

  useEffect(() => {
    if (!status || modeDirty) {
      return
    }

    setModeForm(status.access_mode)
    setScheduleLockTime(status.schedule_lock_time || '22:00')
    setScheduleFirstUnlockTime(status.schedule_first_unlock_time || '09:00')
  }, [status, modeDirty])

  const handleUnlock = async () => {
    try {
      setIsUnlocking(true)
      setDoorFeedback(null)
      setPageError(null)
      const response = await adminService.unlockDoor()
      setDoorFeedback({
        tone: 'success',
        message: response.data?.message || '已送出遠端開門請求',
      })
      await loadDoorConsole(true)

      window.setTimeout(() => {
        void refreshDoorStatusOnly()
      }, 300)
    } catch (err: any) {
      console.error('Failed to unlock door:', err)
      setDoorFeedback({
        tone: 'error',
        message: err.response?.data?.detail || '遠端開門失敗',
      })
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleSimulateScan = async (cardUid?: string) => {
    const nextUid = (cardUid ?? scanInput).trim()
    if (!nextUid) {
      setScanFeedback({
        tone: 'error',
        message: '請先輸入要測試的卡片編號',
      })
      return
    }

    try {
      setIsSimulating(true)
      setScanFeedback(null)
      setPageError(null)
      const response = await adminService.simulateDoorScan(nextUid)
      setScanFeedback({
        tone: 'success',
        message: response.data?.message || `已送出測試刷卡：${nextUid}`,
      })
      setScanInput(nextUid === scanInput.trim() ? '' : scanInput)
      await loadDoorConsole(true)
    } catch (err: any) {
      console.error('Failed to simulate card scan:', err)
      setScanFeedback({
        tone: 'error',
        message: err.response?.data?.detail || '測試刷卡失敗',
      })
    } finally {
      setIsSimulating(false)
    }
  }

  const handleModeSelect = (nextMode: DoorAccessMode) => {
    setModeForm(nextMode)
    setModeDirty(true)
    setModeFeedback(null)
  }

  const resetModeForm = () => {
    if (!status) {
      return
    }

    setModeForm(status.access_mode)
    setScheduleLockTime(status.schedule_lock_time || '22:00')
    setScheduleFirstUnlockTime(status.schedule_first_unlock_time || '09:00')
    setModeDirty(false)
    setModeFeedback(null)
  }

  const handleSaveDoorSettings = async () => {
    try {
      setIsSavingMode(true)
      setModeFeedback(null)
      setPageError(null)
      const response = await adminService.updateDoorSettings(
        modeForm,
        scheduleLockTime,
        scheduleFirstUnlockTime,
      )
      setModeFeedback({
        tone: 'success',
        message: response.data?.message || '門禁模式已更新',
      })
      setModeDirty(false)
      await loadDoorConsole(true)
    } catch (err: any) {
      console.error('Failed to update door settings:', err)
      setModeFeedback({
        tone: 'error',
        message: err.response?.data?.detail || '更新門禁模式失敗',
      })
    } finally {
      setIsSavingMode(false)
    }
  }

  const quickScanSuggestions = Array.from(
    new Map(recentLogs.map((log) => [log.rfid_uid, log])).values()
  ).slice(0, 3)

  const unlockCountdownSeconds = status?.unlock_until
    ? Math.max(0, Math.ceil((new Date(status.unlock_until).getTime() - Date.now()) / 1000))
    : 0
  const hasModeChanges = Boolean(
    status && (
      modeForm !== status.access_mode
      || scheduleLockTime !== status.schedule_lock_time
      || scheduleFirstUnlockTime !== status.schedule_first_unlock_time
    )
  )
  const isDoorOpen = status?.door_state === 'unlocking' || status?.door_state === 'held_open'
  const doorModeOptions: Array<{
    mode: DoorAccessMode
    title: string
    description: string
    caption: string
    icon: React.ReactNode
  }> = [
    {
      mode: 'normal',
      title: '一般通行',
      description: '適合平常開放節奏，讓合法卡片依設定時間完成通行。',
      caption: '刷卡後短暫開門',
      icon: <DoorOpen className="h-5 w-5" />,
    },
    {
      mode: 'always_locked',
      title: '永久上鎖',
      description: '暫停所有刷卡開門，只保留管理端協助現場進出。',
      caption: '僅保留管理端協助',
      icon: <Lock className="h-5 w-5" />,
    },
    {
      mode: 'first_scan_hold',
      title: '每日首刷常開',
      description: '指定時間後的第一張有效卡，會讓門一路保持解鎖到收門時間。',
      caption: '首刷後維持解鎖',
      icon: <Activity className="h-5 w-5" />,
    },
  ]

  if (loading && !status) {
    return (
      <div>
        <PageHeader
          eyebrow="現場控制"
          title="門禁控制"
          description="在同一個控制台裡掌握門況、通行規則與現場支援節奏。"
        />
        <div className="py-10 text-center text-text-secondary">載入中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="現場控制"
        title="門禁控制"
        description="把門況、通行方式與現場支援工具整理在同一個控制台裡。"
        meta={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={getDoorStateVariant(status)}>{getDoorStateLabel(status)}</Badge>
            <Badge variant={status?.dev_mode ? 'warning' : 'outline'}>
              {status?.dev_mode ? '開發模式' : '正式環境'}
            </Badge>
          </div>
        }
      />

      {pageError && <FeedbackNotice tone="error" message={pageError} />}

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)] xl:items-start">
        <Card
          variant="hero"
          className="order-1 min-w-0 overflow-hidden xl:order-none xl:col-start-1 xl:row-start-1 xl:self-start"
        >
          <CardHeader className="pb-4">
            <CardTitle>即時門況</CardTitle>
            <CardDescription>先看門目前是上鎖、暫時開門，還是已進入常開，現場判斷會更快。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[28px] border border-border/70 bg-muted/30 p-5 shadow-[0_18px_36px_-28px_rgba(17,17,17,0.12)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <span className={cn(
                    'inline-flex size-16 shrink-0 items-center justify-center rounded-[26px]',
                    isDoorOpen
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  )}>
                    {isDoorOpen ? (
                      <DoorOpen className="h-8 w-8" />
                    ) : (
                      <Lock className="h-8 w-8" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getDoorStateVariant(status)} size="lg">
                        {getDoorStateLabel(status)}
                      </Badge>
                      <Badge variant={status?.dev_mode ? 'warning' : 'outline'}>
                        {status?.dev_mode ? '測試環境' : '正式運行'}
                      </Badge>
                    </div>
                    <div className="min-w-0">
                      <p className="break-words text-3xl font-semibold tracking-tight text-text-primary">
                        {isDoorOpen ? '目前可通行' : '目前維持鎖定'}
                      </p>
                      <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-text-secondary">
                        {getDoorStateDetail(status, unlockCountdownSeconds)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap lg:justify-end">
                  <Button
                    size="lg"
                    className="w-full gap-2 sm:w-auto"
                    loading={isUnlocking}
                    disabled={status?.door_state === 'unlocking' || status?.door_state === 'held_open'}
                    onClick={handleUnlock}
                  >
                    <DoorOpen className="h-5 w-5" />
                    {status?.door_state === 'held_open'
                      ? '目前維持解鎖'
                      : status?.door_state === 'unlocking'
                        ? '開門進行中'
                        : '遠端開門'}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full gap-2 sm:w-auto"
                    loading={refreshing}
                    onClick={() => void loadDoorConsole(true)}
                  >
                    <RefreshCw className="h-5 w-5" />
                    重新整理
                  </Button>
                </div>
              </div>
            </div>

            {doorFeedback && (
              <FeedbackNotice tone={doorFeedback.tone} message={doorFeedback.message} />
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-border/70 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">最近開始開門</p>
                <p className="mt-2 break-words text-sm font-semibold text-text-primary">{formatDateTimeLabel(status?.last_unlock_started_at)}</p>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">最近完成開門</p>
                <p className="mt-2 break-words text-sm font-semibold text-text-primary">{formatDateTimeLabel(status?.last_unlock_finished_at)}</p>
              </div>
              <div className="rounded-[22px] border border-border/70 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">協助開門次數</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{status?.remote_unlock_count ?? 0}</p>
                <p className="mt-1 break-words text-xs leading-5 text-text-secondary">
                  {status?.last_remote_unlock_by
                    ? `最近一次操作者：${status.last_remote_unlock_by}`
                    : '目前尚無遠端開門事件'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="order-2 min-w-0 space-y-6 self-start xl:order-none xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>通行模式</CardTitle>
              <CardDescription>依現場的開放方式切換規則，需要時也能快速收回到更保守的門禁策略。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[24px] border border-border/60 bg-muted/28 p-4">
                <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">目前生效</p>
                    <p className="mt-2 break-words text-xl font-semibold text-text-primary">{getAccessModeLabel(status)}</p>
                  </div>
                  <Badge className="self-start shrink-0 whitespace-nowrap sm:self-auto" variant={getDoorStateVariant(status)}>
                    {getSchedulePhaseLabel(status)}
                  </Badge>
                </div>
                <p className="mt-3 break-words text-sm leading-6 text-text-secondary">{getModeSummary(status)}</p>
              </div>

              <div className="space-y-2.5">
                {doorModeOptions.map((option) => (
                  <button
                    key={option.mode}
                    type="button"
                    onClick={() => handleModeSelect(option.mode)}
                    className={cn(
                      'w-full rounded-[22px] border px-4 py-3.5 text-left transition-all',
                      modeForm === option.mode
                        ? 'border-text-primary bg-text-primary/[0.03] shadow-[0_16px_34px_-28px_rgba(17,17,17,0.18)]'
                        : 'border-border/60 bg-white hover:border-text-primary/18 hover:bg-muted/35'
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span className={cn(
                        'inline-flex size-10 shrink-0 items-center justify-center rounded-[16px]',
                        status?.access_mode === option.mode
                          ? 'bg-accent/[0.08] text-accent'
                          : modeForm === option.mode
                            ? 'bg-accent/[0.08] text-accent'
                            : 'bg-muted/70 text-text-secondary'
                      )}>
                        {option.icon}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="break-words text-base font-semibold text-text-primary">{option.title}</p>
                          <span
                            className={cn(
                              'inline-flex self-start shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap sm:self-auto',
                              status?.access_mode === option.mode
                                ? 'border border-text-primary/10 bg-text-primary/[0.06] text-text-primary'
                                : modeForm === option.mode
                                  ? 'border border-accent/12 bg-accent/[0.08] text-accent'
                                  : 'border border-border/70 bg-white/82 text-text-secondary'
                            )}
                          >
                            {status?.access_mode === option.mode
                              ? '使用中'
                              : modeForm === option.mode
                                ? '待套用'
                              : '切換'}
                          </span>
                        </div>
                        <p className="mt-2 break-words text-sm leading-6 text-text-secondary">{option.description}</p>
                        <p className="mt-2 break-words text-xs font-medium tracking-[0.06em] text-text-secondary">{option.caption}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {modeFeedback && (
                <FeedbackNotice tone={modeFeedback.tone} message={modeFeedback.message} />
              )}

              <div className="rounded-[24px] border border-border/60 bg-white p-4">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">每日上鎖時間</label>
                      <Input
                        nativeInput
                        type="time"
                        value={scheduleLockTime}
                        onChange={(event) => {
                          setScheduleLockTime(event.target.value)
                          setModeDirty(true)
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-primary">首刷常開開始時間</label>
                      <Input
                        nativeInput
                        type="time"
                        value={scheduleFirstUnlockTime}
                        onChange={(event) => {
                          setScheduleFirstUnlockTime(event.target.value)
                          setModeDirty(true)
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-md text-xs leading-6 text-text-secondary">
                      {modeForm === 'first_scan_hold'
                        ? '建議把開始時間設在白天開放時段，並確保它早於每日上鎖時間。'
                        : modeForm === 'always_locked'
                          ? '切到永久上鎖後，現場仍可透過左欄的遠端開門處理特殊情況。'
                        : '一般通行模式會依門鎖設定短暫開門，不會進入常開狀態。'}
                    </p>

                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        disabled={!hasModeChanges}
                        onClick={resetModeForm}
                      >
                        還原
                      </Button>
                      <Button
                        className="w-full gap-2 sm:w-auto"
                        loading={isSavingMode}
                        disabled={!hasModeChanges}
                        onClick={handleSaveDoorSettings}
                      >
                        套用模式
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="subtle">
            <CardHeader className="pb-3">
              <CardTitle>最近控制事件</CardTitle>
              <CardDescription>回看協助開門、模式切換與測試操作，交接現場時會更有脈絡。</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length > 0 ? (
                <div className="space-y-2.5">
                  {events.map((event) => (
                    <div key={event.id} className="rounded-[20px] border border-border/60 bg-white/82 px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={event.action === 'remote_unlock' ? 'warning' : 'info'}>
                              {getEventLabel(event)}
                            </Badge>
                            <Badge variant={event.result === 'accepted' ? 'success' : 'error'}>
                              {event.result}
                            </Badge>
                          </div>
                          <p className="break-words font-medium text-text-primary">{event.description || getEventLabel(event)}</p>
                          <p className="break-words text-xs text-text-secondary">操作者：{event.admin_name}</p>
                        </div>
                        <div className="min-w-0 self-start text-left text-xs text-text-secondary sm:self-auto sm:text-right">
                          <p className="break-words">{formatDateTimeLabel(event.created_at)}</p>
                          <p className="mt-1 break-words uppercase tracking-[0.12em]">{event.source}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-text-secondary">目前尚無門禁控制事件</div>
              )}
            </CardContent>
          </Card>

          {status?.can_simulate_scan && (
            <Card variant="outline">
              <CardHeader className="pb-3">
                <CardTitle>測試刷卡</CardTitle>
                <CardDescription>演練卡片流程時，先在這裡快速驗證門禁反應與紀錄是否正常。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">卡片編號</label>
                  <Input
                    nativeInput
                    value={scanInput}
                    placeholder="例如 TEST123456"
                    onChange={(event) => setScanInput(event.target.value)}
                  />
                  <p className="text-xs text-text-secondary">
                    可輸入已綁定卡片確認通行，也可輸入未綁定卡片檢查拒絕流程。
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    className="w-full gap-2 sm:w-auto"
                    loading={isSimulating}
                    onClick={() => void handleSimulateScan()}
                  >
                    <ScanLine className="h-4.5 w-4.5" />
                    模擬刷卡
                  </Button>
                  <Button className="w-full sm:w-auto" variant="outline" onClick={() => setScanInput('')}>
                    清除
                  </Button>
                </div>

                {scanFeedback && (
                  <FeedbackNotice tone={scanFeedback.tone} message={scanFeedback.message} />
                )}

                {quickScanSuggestions.length > 0 && (
                  <div className="space-y-3 rounded-[20px] border border-border/60 bg-muted/40 p-4">
                    <p className="text-sm font-medium text-text-primary">快速帶入最近使用的卡片</p>
                    <div className="flex flex-wrap gap-2">
                      {quickScanSuggestions.map((log) => (
                        <Button
                          key={log.id}
                          variant="outline"
                          size="sm"
                          onClick={() => setScanInput(log.rfid_uid)}
                        >
                          {log.user_name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        <div className="order-3 min-w-0 space-y-6 xl:order-none xl:col-start-1 xl:row-start-2">
          <Card variant="subtle">
            <CardHeader className="pb-3">
              <CardTitle>今日通行節奏</CardTitle>
              <CardDescription>快速確認今天是一般通行、等待首刷，還是已進入常開。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-border/60 bg-white/84 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">目前模式</p>
                  <p className="mt-2 break-words text-lg font-semibold text-text-primary">{getAccessModeLabel(status)}</p>
                </div>
                <div className="rounded-[20px] border border-border/60 bg-white/84 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">排程狀態</p>
                  <p className="mt-2 break-words text-lg font-semibold text-text-primary">{getSchedulePhaseLabel(status)}</p>
                </div>
              </div>

              <div className="rounded-[22px] border border-border/60 bg-white/84 p-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">首刷常開開始 {status?.schedule_first_unlock_time || '09:00'}</Badge>
                  <Badge variant="outline">每日上鎖 {status?.schedule_lock_time || '22:00'}</Badge>
                </div>
                <p className="mt-3 break-words text-sm leading-6 text-text-secondary">{getModeSummary(status)}</p>
              </div>
            </CardContent>
          </Card>

          <Card variant="subtle">
            <CardHeader className="pb-3">
              <CardTitle>設備健康摘要</CardTitle>
              <CardDescription>從門鎖、讀卡器到回應時間，都用同一個視角快速掌握。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-3 rounded-[20px] border border-border/60 bg-white/82 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Cpu className="h-5 w-5 text-primary" />
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary">門鎖控制</p>
                    <p className="break-words text-xs text-text-secondary">GPIO {status?.lock_pin ?? '-'} / 觸發電平 {status?.lock_active_level ?? '-'}</p>
                  </div>
                </div>
                <Badge className="self-start shrink-0 whitespace-nowrap sm:self-auto" variant={status?.gpio_available ? 'success' : 'warning'}>
                  {status?.gpio_available ? '硬體可用' : '模擬模式'}
                </Badge>
              </div>

              <div className="flex flex-col gap-3 rounded-[20px] border border-border/60 bg-white/82 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Radio className="h-5 w-5 text-primary" />
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary">讀卡設備</p>
                    <p className="break-words text-xs text-text-secondary">
                      {status?.rfid_reader_mode === 'dev'
                        ? '目前使用測試刷卡流程'
                        : status?.rfid_device_path || '等待硬體初始化'}
                    </p>
                  </div>
                </div>
                <Badge
                  className="self-start shrink-0 whitespace-nowrap sm:self-auto"
                  variant={status?.rfid_device_connected ? 'success' : 'warning'}
                >
                  {status?.rfid_reader_mode === 'dev'
                    ? '測試模式'
                    : status?.rfid_device_connected
                      ? '已連線'
                      : '未連線'}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[20px] border border-border/60 bg-white/82 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">開門維持時間</p>
                  <p className="mt-2 text-2xl font-semibold text-text-primary">{status?.lock_duration_seconds ?? '-'}s</p>
                </div>
                <div className="rounded-[20px] border border-border/60 bg-white/82 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">最近協助開門</p>
                  <p className="mt-2 break-words text-sm font-semibold text-text-primary">{formatDateTimeLabel(status?.last_remote_unlock_at)}</p>
                </div>
                <div className="rounded-[20px] border border-border/60 bg-white/82 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">門況</p>
                  <p className="mt-2 break-words text-sm font-semibold text-text-primary">{getDoorStateLabel(status)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="subtle">
            <CardHeader className="pb-3">
              <CardTitle>最近存取記錄</CardTitle>
              <CardDescription>確認最近的刷卡進出是否符合預期，也方便回頭追蹤現場反應。</CardDescription>
            </CardHeader>
            <CardContent>
              {recentLogs.length > 0 ? (
                <div className="space-y-2.5">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex flex-col gap-3 rounded-[20px] border border-border/60 bg-white/82 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary">{log.user_name}</p>
                        <p className="break-words text-xs text-text-secondary">
                          {log.student_id ? `${log.student_id} · ` : ''}卡片 {log.rfid_uid.slice(-8)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        {status?.can_simulate_scan && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => void handleSimulateScan(log.rfid_uid)}
                          >
                            重播這張卡
                          </Button>
                        )}
                        <div className="text-left sm:text-right">
                          <p className="break-words text-sm text-text-secondary">{formatTimeOnly(log.timestamp)}</p>
                          <Badge variant={log.action === 'entry' ? 'success' : 'info'}>
                            {log.action === 'entry' ? '開門' : '綁定'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-text-secondary">暫無存取記錄</div>
              )}
            </CardContent>
          </Card>

          <Card variant="outline" className="border-yellow-200 bg-yellow-50/88">
            <CardHeader className="pb-3">
              <CardTitle>現場提醒</CardTitle>
              <CardDescription>協助現場前，先快速確認這幾件事，處理起來會更穩。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 rounded-[20px] border border-yellow-200 bg-white/84 p-4">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-yellow-700" />
                <p className="text-sm text-yellow-900">
                  協助開門會立即觸發門鎖，系統也會同步留下紀錄，方便後續追蹤與交接。
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-[20px] border border-yellow-200 bg-white/84 p-4">
                <Activity className="mt-0.5 h-5 w-5 shrink-0 text-yellow-700" />
                <p className="text-sm text-yellow-900">
                  測試刷卡只會在開發模式提供，正式環境不會顯示這個入口。
                </p>
              </div>
              <div className="rounded-[20px] border border-yellow-200 bg-white/84 p-4 text-sm leading-6 text-yellow-900">
                若你正在協助排查，建議同時比對「最近控制事件」與「最近存取記錄」，會更快看出問題是在指令、卡片還是讀卡流程。
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
