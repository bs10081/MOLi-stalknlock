import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

type RouteMetaDefinition = {
  title: string
  description: string
}

const APP_NAME = "Makers' Open Lab for Innovation 門禁系統"
const PREVIEW_IMAGE_PATH = '/site-preview.png'

const routeMetaDefinitions: Array<{
  match: (pathname: string) => boolean
  meta: RouteMetaDefinition
}> = [
  {
    match: (pathname) => pathname === '/',
    meta: {
      title: `${APP_NAME} | 首頁`,
      description: 'Makers\' Open Lab for Innovation 的 RFID 門禁系統首頁，提供管理入口、版本資訊與系統概覽。',
    },
  },
  {
    match: (pathname) => pathname === '/login',
    meta: {
      title: `${APP_NAME} | 管理員登入`,
      description: '登入管理後台，管理使用者、卡片綁定、門禁控制與存取記錄。',
    },
  },
  {
    match: (pathname) => pathname === '/dashboard',
    meta: {
      title: `${APP_NAME} | 後台總覽`,
      description: '查看門禁系統總覽、近期存取記錄、活躍使用者與設備狀態。',
    },
  },
  {
    match: (pathname) => pathname === '/dashboard/users',
    meta: {
      title: `${APP_NAME} | 使用者管理`,
      description: '管理後台使用者、建立綁定流程並檢視個別使用者的門禁資料。',
    },
  },
  {
    match: (pathname) => pathname === '/dashboard/personnel',
    meta: {
      title: `${APP_NAME} | 人員管理`,
      description: '批量管理人員資料、檢查帳號狀態並維護使用者名單。',
    },
  },
  {
    match: (pathname) => pathname === '/dashboard/cards',
    meta: {
      title: `${APP_NAME} | 卡片管理`,
      description: '管理 RFID 卡片、手動建立卡號、iOS 匯入與卡片綁定流程。',
    },
  },
  {
    match: (pathname) => pathname === '/dashboard/logs',
    meta: {
      title: `${APP_NAME} | 存取記錄`,
      description: '檢視門禁刷卡紀錄、綁定事件與近期門禁活動。',
    },
  },
  {
    match: (pathname) => pathname === '/dashboard/admins',
    meta: {
      title: `${APP_NAME} | 管理員管理`,
      description: '維護管理員帳號、更新名稱與密碼，管理後台權限入口。',
    },
  },
  {
    match: (pathname) => pathname === '/dashboard/door',
    meta: {
      title: `${APP_NAME} | 門禁控制`,
      description: '查看門鎖 runtime、設備健康、遠程開門事件與開發模式模擬刷卡工具。',
    },
  },
  {
    match: (pathname) => pathname === '/dashboard/settings',
    meta: {
      title: `${APP_NAME} | 系統設定`,
      description: '查看版本資訊、部署設定邊界與目前由環境變數管理的系統項目。',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/dashboard/'),
    meta: {
      title: `${APP_NAME} | 管理後台`,
      description: '門禁管理後台，整合使用者、卡片、設備控制與存取記錄。',
    },
  },
]

const fallbackMeta: RouteMetaDefinition = {
  title: `${APP_NAME} | 找不到頁面`,
  description: '這個路徑不存在，請回到首頁或重新確認目前的管理後台網址。',
}

const upsertMetaTag = (
  selector: string,
  attrs: Record<string, string>,
  content: string,
) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null

  if (!element) {
    element = document.createElement('meta')
    Object.entries(attrs).forEach(([key, value]) => {
      element!.setAttribute(key, value)
    })
    document.head.appendChild(element)
  }

  element.setAttribute('content', content)
}

export const RouteMeta = () => {
  const location = useLocation()

  useEffect(() => {
    const matched = routeMetaDefinitions.find((item) => item.match(location.pathname))
    const meta = matched?.meta ?? fallbackMeta
    const currentUrl = window.location.href
    const previewImage = `${window.location.origin}${PREVIEW_IMAGE_PATH}`

    document.title = meta.title

    upsertMetaTag('meta[name="description"]', { name: 'description' }, meta.description)
    upsertMetaTag('meta[property="og:title"]', { property: 'og:title' }, meta.title)
    upsertMetaTag('meta[property="og:description"]', { property: 'og:description' }, meta.description)
    upsertMetaTag('meta[property="og:type"]', { property: 'og:type' }, 'website')
    upsertMetaTag('meta[property="og:url"]', { property: 'og:url' }, currentUrl)
    upsertMetaTag('meta[property="og:image"]', { property: 'og:image' }, previewImage)
    upsertMetaTag('meta[property="og:site_name"]', { property: 'og:site_name' }, APP_NAME)
    upsertMetaTag('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image')
    upsertMetaTag('meta[name="twitter:title"]', { name: 'twitter:title' }, meta.title)
    upsertMetaTag('meta[name="twitter:description"]', { name: 'twitter:description' }, meta.description)
    upsertMetaTag('meta[name="twitter:image"]', { name: 'twitter:image' }, previewImage)
    upsertMetaTag('meta[name="application-name"]', { name: 'application-name' }, APP_NAME)
    upsertMetaTag('meta[name="apple-mobile-web-app-title"]', { name: 'apple-mobile-web-app-title' }, APP_NAME)
  }, [location.pathname])

  return null
}
