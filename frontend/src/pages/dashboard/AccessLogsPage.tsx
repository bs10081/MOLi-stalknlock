import React, { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { adminService } from '@/services/adminService'
import type { AccessLog } from '@/types'

export const AccessLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadLogs()
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
      new Date(log.timestamp).toLocaleString(),
      log.user_name,
      log.rfid_uid.slice(-8),
      log.action === 'entry' ? '開門' : '註冊'
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `access_logs_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const filteredLogs = logs.filter(log =>
    log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.rfid_uid.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div>
        <PageHeader
          title="存取記錄"
          description="查看門禁系統的所有存取記錄"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-text-secondary">
              載入中...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="存取記錄"
          description="查看門禁系統的所有存取記錄"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
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
        title="存取記錄"
        description="查看門禁系統的所有存取記錄"
        actions={
          <Button variant="secondary" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            匯出記錄
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <Input
                placeholder="搜尋使用者或卡片..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
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
                    <TableCell className="text-text-secondary font-mono text-sm whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('zh-TW', {
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

          <div className="md:hidden space-y-3">
            {filteredLogs.map((log) => (
              <div key={log.id} className="bg-bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary text-base truncate">{log.user_name}</h3>
                    <p className="text-xs text-text-secondary font-mono mt-0.5">
                      {new Date(log.timestamp).toLocaleString('zh-TW', {
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

          <div className="mt-4 text-sm text-text-secondary">
            顯示 1-{filteredLogs.length} 筆，共 {filteredLogs.length} 筆記錄
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
