import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { OverviewPage } from './pages/dashboard/OverviewPage'
import { UsersPage } from './pages/dashboard/UsersPage'
import { AdminsPage } from './pages/dashboard/AdminsPage'
import { CardsPage } from './pages/dashboard/CardsPage'
import { AccessLogsPage } from './pages/dashboard/AccessLogsPage'
import { DoorControlPage } from './pages/dashboard/DoorControlPage'
import { SettingsPage } from './pages/dashboard/SettingsPage'

function App() {
  return (
    <Router>
      <Routes>
        {/* 公開頁面 */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Dashboard 頁面（帶 Sidebar 佈局）*/}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="cards" element={<CardsPage />} />
          <Route path="logs" element={<AccessLogsPage />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="door" element={<DoorControlPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
