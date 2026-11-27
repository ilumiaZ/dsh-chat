import { createRoot } from 'react-dom/client'
import { App } from './app/App.js'
import { setupTheme } from './app/theme.js'
import { PreviewOverlay, openPreview } from './components/files/PreviewOverlay.js'
import { ensureKatex } from './services/markdown/katex.js'
import './app/theme.css'
import './app/global.css'

/**
 * Capacitor 的 WebView 不支持 target=_blank / window.open：点开会在空白页停住，
 * 而且没有退出按钮。这里统一接管，图片走应用内预览，外链交给系统浏览器。
 */
const openExternal = async (url: string) => {
  const capacitor = (
    window as unknown as {
      Capacitor?: { Plugins?: Record<string, { open?: (options: { url: string }) => unknown }> }
    }
  ).Capacitor
  const browser = capacitor?.Plugins?.Browser
  if (browser?.open) {
    try {
      await browser.open({ url })
      return
    } catch {
      // 插件不可用时退回默认跳转
    }
  }
  window.location.href = url
}

document.addEventListener(
  'click',
  (event) => {
    const target = event.target as Element | null
    const anchor = target?.closest?.('a[target="_blank"]') as HTMLAnchorElement | null
    if (!anchor) {
      return
    }
    const href = anchor.getAttribute('href')
    if (!href) {
      return
    }
    event.preventDefault()
    if (href.startsWith('blob:') || href.startsWith('data:')) {
      const name = anchor.getAttribute('aria-label') ?? anchor.textContent ?? ''
      void openPreview(href, name)
      return
    }
    void openExternal(href)
  },
  true
)

ensureKatex()
setupTheme()

createRoot(document.getElementById('root') as HTMLElement).render(
  <>
    <App />
    <PreviewOverlay />
  </>
)
