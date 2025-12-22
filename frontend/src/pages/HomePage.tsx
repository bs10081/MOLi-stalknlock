import React from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const HomePage: React.FC = () => {
  return (
    <PageWrapper>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>MOLi 門禁系統</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-text-secondary">
            註冊頁面施工中...
          </p>
        </CardContent>
      </Card>
    </PageWrapper>
  )
}
