import React, { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Mock data
const mockLogs = [
  { id: 1, user: '張三', card_id: '****1234', action: 'unlock', status: 'success', timestamp: '2024-03-20 10:30:15' },
  { id: 2, user: '李四', card_id: '****5678', action: 'unlock', status: 'success', timestamp: '2024-03-20 10:25:42' },
  { id: 3, user: '王五', card_id: '****9012', action: 'unlock', status: 'success', timestamp: '2024-03-20 10:15:33' },
  { id: 4, user: '未知', card_id: '****0000', action: 'unlock', status: 'failed', timestamp: '2024-03-20 10:10:21' },
  { id: 5, user: '張三', card_id: '****1234', action: 'unlock', status: 'success', timestamp: '2024-03-20 09:45:18' },
]

export const AccessLogsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div>
      <PageHeader
        title="存取記錄"
        description="查看門禁系統的所有存取記錄"
        actions={
          <Button variant="secondary" className="gap-2">
            <Download className="w-4 h-4" />
            匯出記錄
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          {/* Search */}
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

          {/* Logs Table - Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>時間</TableHead>
                  <TableHead>使用者</TableHead>
                  <TableHead>卡片 ID</TableHead>
                  <TableHead>動作</TableHead>
                  <TableHead>狀態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-text-secondary font-mono text-sm">
                      {log.timestamp}
                    </TableCell>
                    <TableCell className="font-medium">{log.user}</TableCell>
                    <TableCell className="font-mono text-sm">{log.card_id}</TableCell>
                    <TableCell>開門</TableCell>
                    <TableCell>
                      <Badge
                        variant={log.status === 'success' ? 'success' : 'error'}
                        size="sm"
                      >
                        {log.status === 'success' ? '成功' : '失敗'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Logs List - Mobile */}
          <div className="md:hidden space-y-4">
            {mockLogs.map((log) => (
              <div key={log.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-text-primary">{log.user}</h3>
                    <p className="text-sm text-text-secondary font-mono mt-1">
                      {log.timestamp}
                    </p>
                  </div>
                  <Badge
                    variant={log.status === 'success' ? 'success' : 'error'}
                    size="sm"
                  >
                    {log.status === 'success' ? '成功' : '失敗'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <span className="font-medium min-w-[70px]">卡片 ID:</span>
                    <span className="font-mono">{log.card_id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <span className="font-medium min-w-[70px]">動作:</span>
                    <span>開門</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Table Footer */}
          <div className="mt-4 text-sm text-text-secondary">
            顯示 1-{mockLogs.length} 筆，共 {mockLogs.length} 筆記錄
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
