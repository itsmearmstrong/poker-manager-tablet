import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installAndroidBackHandler } from './utils/androidBack.ts'

// GameState is JSON-safe; Android 7's Chromium 63 predates structuredClone.
if (typeof window.structuredClone !== 'function') {
  window.structuredClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T
}

installAndroidBackHandler()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
