import Loading from './components/Loading'
// ProtectedRoute removed for most pages to allow anonymous usage; only login-required actions will be gated in service layer
import './index.css'
import { ErrorBook } from './pages/ErrorBook'
import { FriendLinks } from './pages/FriendLinks'
import Login from './pages/Login'
import MobilePage from './pages/Mobile'
import ProgressTest from './pages/ProgressTest'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import TypingPage from './pages/Typing'
import { isOpenDarkModeAtom } from '@/store'
import { isAuthenticatedAtom } from '@/store/authSlice'
import { Analytics } from '@vercel/analytics/react'
import 'animate.css'
import { useAtomValue } from 'jotai'
import { AlertCircle } from 'lucide-react'
import mixpanel from 'mixpanel-browser'
import process from 'process'
import React, { Suspense, lazy, useEffect, useState } from 'react'
import 'react-app-polyfill/stable'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

const AnalysisPage = lazy(() => import('./pages/Analysis'))
const GalleryPage = lazy(() => import('./pages/Gallery-N'))

if (process.env.NODE_ENV === 'production') {
  // for prod
  mixpanel.init('bdc492847e9340eeebd53cc35f321691')
} else {
  // for dev
  mixpanel.init('5474177127e4767124c123b2d7846e2a', { debug: true })
}

function Root() {
  const darkMode = useAtomValue(isOpenDarkModeAtom)
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  useEffect(() => {
    darkMode ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark')
  }, [darkMode])

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <React.StrictMode>
      <BrowserRouter basename={REACT_APP_DEPLOY_ENV === 'pages' ? '/qwerty-learner' : ''}>
        <Suspense fallback={<Loading />}>
          <Routes>
            {isMobile ? (
              <Route path="/*" element={<Navigate to="/mobile" />} />
            ) : (
              <>
                {/* Public routes - no authentication required */}
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Protected routes - authentication required */}
                <Route index element={<TypingPage />} />
                <Route path="/progress-test" element={<ProgressTest />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/analysis" element={<AnalysisPage />} />
                <Route path="/error-book" element={<ErrorBook />} />
                <Route path="/friend-links" element={<FriendLinks />} />
                <Route path="/*" element={<Navigate to="/" />} />
              </>
            )}
            <Route path="/mobile" element={<MobilePage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      {/* Guest notice callout */}
      {!isAuthenticated && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-50 flex max-w-md items-start gap-3 rounded-lg border-l-4 border-orange-500 bg-orange-50 p-4 shadow-lg dark:border-orange-400 dark:bg-orange-950"
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-orange-600 dark:text-orange-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-600 dark:text-orange-100">
              当前为游客模式，进度仅保存在本地，未同步到云端。
              <br />请
              <a
                href="/login"
                className="mx-1 font-semibold text-orange-700 underline hover:text-orange-900 dark:text-orange-300 dark:hover:text-orange-100"
              >
                登录
              </a>
              以保存您的学习进度。
            </p>
          </div>
        </div>
      )}
      <Analytics />
    </React.StrictMode>
  )
}

const container = document.getElementById('root')

container && createRoot(container).render(<Root />)
