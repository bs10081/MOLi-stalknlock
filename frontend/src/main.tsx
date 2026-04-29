import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppVersionProvider } from './providers/AppVersionProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppVersionProvider>
      <App />
    </AppVersionProvider>
  </StrictMode>,
)
