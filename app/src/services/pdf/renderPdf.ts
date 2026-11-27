import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'

// worker 由构建流程拷到站点根目录，见 rspack.config.ts
GlobalWorkerOptions.workerSrc = 'pdf.worker.min.mjs'

/** 与 120 DPI 等价；再高也会被服务端缩到约 1300×1300，白费时间和内存 */
const SCALE = 120 / 72
/** 单请求最多 28 张图：每张封顶 1024 token，加上 system 与工具声明仍在 32K 以内 */
export const MAX_PDF_PAGES = 28

/**
 * 把 PDF 按页光栅化成 JPEG。
 * 服务端对带文档（document 块）的请求有 32K token 上限，而图片是每张 1024 封顶，
 * 所以「一页一张图」既便宜又可预测。
 */
export const renderPdfToImages = async (
  file: File,
  onProgress?: (done: number, total: number) => void
): Promise<{ files: File[]; pages: number; truncated: boolean }> => {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = getDocument({ data })
  const doc = await loadingTask.promise
  try {
    const pages = doc.numPages
    const count = Math.min(pages, MAX_PDF_PAGES)
    const base = file.name.replace(/\.pdf$/i, '')
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('canvas 2d context unavailable')
    }
    const files: File[] = []
    for (let index = 1; index <= count; index += 1) {
      const page = await doc.getPage(index)
      const viewport = page.getViewport({ scale: SCALE })
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      // PDF 页面本身没有背景，先铺白，否则透明区域会变黑
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvas, viewport }).promise
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.82)
      )
      if (blob) {
        files.push(new File([blob], `${base} p${index}.jpg`, { type: 'image/jpeg' }))
      }
      page.cleanup()
      onProgress?.(index, count)
    }
    canvas.width = 0
    canvas.height = 0
    return { files, pages, truncated: count < pages }
  } finally {
    await loadingTask.destroy()
  }
}
