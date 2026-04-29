import React, { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Download, FileSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { adminService } from '@/services/adminService'
import type { AccessLog } from '@/types'
import { formatDateForFileName, formatDateTime } from '@/lib/dateTime'

export const AccessLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    void loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminService.getLogs()
      setLogs(data)
    } catch (err: any) {
      console.error('Failed to load logs:', err)
      setError(err.response?.data?.detail || '載入存取記錄失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const headers = ['時間', '使用者', '卡片 ID', '動作']
    const rows = filteredLogs.map(log => [
      formatDateTime(log.timestamp),
      log.user_name,
      log.rfid_uid.slice(-8),
      log.action === 'entry' ? '開門' : '註冊',
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `access_logs_${formatDateForFileName()}.csv`
    link.click()
  }

  const filteredLogs = logs.filter(log =>
    log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.rfid_uid.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div>
        <PageHeader
          eyebrow="Audit"
          title="存取記錄"
          description="查看門禁系統的所有存取記錄"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="py-8 text-center text-text-secondary">載入中...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          eyebrow="Audit"
          title="存取記錄"
          description="查看門禁系統的所有存取記錄"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="py-8 text-center">
              <p className="mb-4 text-red-600">{error}</p>
              <Button onClick={loadLogs}>重試</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Audit"
        title="存取記錄"
        description="查看門禁系統的所有存取記錄"
        actions={
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            匯出記錄
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                <FileSearch className="h-5 w-5" />
              </span>
              <div>
                <CardTitle>事件檢索</CardTitle>
                <CardDescription>支援依使用者名稱與卡片 UID 關鍵字快速縮小範圍。</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-text-secondary" />
                <Input
                  placeholder="搜尋使用者或卡片..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="mt-6 hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>時間</TableHead>
                  <TableHead>使用者</TableHead>
                  <TableHead>卡片 ID</TableHead>
                  <TableHead>動作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm text-text-secondary whitespace-nowrap">
                      {formatDateTime(log.timestamp, {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{log.user_name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.rfid_uid.slice(-8)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success" size="sm">
                        {log.action === 'entry' ? '開門' : '註冊'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 space-y-3 p-6 pt-0 md:hidden">
            {filteredLogs.map((log) => (
              <div key={log.id} className="rounded-[24px] border border-border/60 bg-white/80 p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-text-primary">{log.user_name}</h3>
                    <p className="mt-0.5 font-mono text-xs text-text-secondary">
                      {formatDateTime(log.timestamp, {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Badge variant="success" size="sm" className="ml-2 flex-shrink-0">
                    {log.action === 'entry' ? '開門' : '註冊'}
                  </Badge>
                </div>

                <div className="text-sm text-text-secondary">
                  卡片 ID：<span className="font-mono font-medium text-text-primary">{log.rfid_uid.slice(-8)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border px-6 pb-6 pt-4 text-sm text-text-secondary">
            顯示 1-{filteredLogs.length} 筆，共 {filteredLogs.length} 筆記錄
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
