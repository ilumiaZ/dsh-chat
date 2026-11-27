import { useEffect, useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import styles from './PreviewOverlay.module.css'

type Preview = { url: string; name: string; ownedUrl: boolean }

let current: Preview | null = null
const listeners = new Set<(value: Preview | null) => void>()
const publish = () => {
  for (const listener of listeners) {
    listener(current)
  }
}

const release = (preview: Preview) => {
  if (preview.ownedUrl) {
    URL.revokeObjectURL(preview.url)
  }
}

const closePreview = () => {
  if (!current) {
    return
  }
  release(current)
  current = null
  publish()
}

/**
 * 应用内预览图片。Android WebView 不支持 window.open / target=_blank，
 * 用新窗口打开会停在空白页且退不出来，所以统一改成本地覆盖层。
 */
export const openPreview = async (url: string, name: string) => {
  // 复制一份 blob：原组件卸载时会回收自己的 object URL
  let owned = false
  let src = url
  if (url.startsWith('blob:')) {
    try {
      src = URL.createObjectURL(await (await fetch(url)).blob())
      owned = true
    } catch {
      // 拿不到原件时退回原地址
    }
  }
  if (current) {
    release(current)
  }
  current = { url: src, name, ownedUrl: owned }
  // 压一条历史记录，返回键就能关掉预览而不是退出应用
  history.pushState({ preview: true }, '')
  publish()
}

const requestClose = () => {
  if (history.state?.preview) {
    // 触发 popstate，由下面统一关闭
    history.back()
  } else {
    closePreview()
  }
}

window.addEventListener('popstate', () => {
  if (current) {
    closePreview()
  }
})

export const PreviewOverlay = () => {
  const t = useTranslate()
  const [preview, setPreview] = useState<Preview | null>(current)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    listeners.add(setPreview)
    return () => {
      listeners.delete(setPreview)
    }
  }, [])

  useEffect(() => {
    setFailed(false)
  }, [preview?.url])

  if (!preview) {
    return null
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={preview.name}
      onClick={requestClose}
    >
      <button
        type="button"
        className={styles.close}
        aria-label={t('close')}
        onClick={(event) => {
          event.stopPropagation()
          requestClose()
        }}
      >
        ×
      </button>
      {failed ? (
        <div className={styles.fallback} onClick={(event) => event.stopPropagation()}>
          <div className={styles.fileName}>{preview.name}</div>
          <div className={styles.hint}>{t('previewUnsupported')}</div>
        </div>
      ) : (
        <img
          className={styles.image}
          src={preview.url}
          alt={preview.name}
          onClick={(event) => event.stopPropagation()}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
