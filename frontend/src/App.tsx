import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { RouteMeta } from './components/meta/RouteMeta'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { OverviewPage } from './pages/dashboard/OverviewPage'
import { PersonnelPage } from './pages/dashboard/PersonnelPage'
import { UsersPage } from './pages/dashboard/UsersPage'
import { AdminsPage } from './pages/dashboard/AdminsPage'
import { CardsPage } from './pages/dashboard/CardsPage'
import { AccessLogsPage } from './pages/dashboard/AccessLogsPage'
import { DoorControlPage } from './pages/dashboard/DoorControlPage'
import { SettingsPage } from './pages/dashboard/SettingsPage'

function App() {
  return (
    <Router basename="/admin">
      <RouteMeta />
      <Routes>
        {/* 公開頁面 */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          {/* Dashboard 頁面（帶 Sidebar 佈局）*/}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="personnel" element={<PersonnelPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="cards" element={<CardsPage />} />
            <Route path="logs" element={<AccessLogsPage />} />
            <Route path="admins" element={<AdminsPage />} />
            <Route path="door" element={<DoorControlPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="*"
              element={
                <NotFoundPage
                  title="找不到這個後台頁面"
                  description="這個管理路由不存在，請從側邊導覽重新進入正確頁面。"
                  primaryHref="/dashboard"
                  primaryLabel="回到總覽"
                  secondaryHref="/dashboard/users"
                  secondaryLabel="前往使用者管理"
                  embedded
                />
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  )
}

export default App
