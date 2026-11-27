import { PDFDocument } from 'pdf-lib'

/** 目标每份的页数：服务端对单条消息里的文档有 32K token 上限，12 页留了足够余量 */
const PAGES_PER_PART = 12
/** 超过这个体积就考虑拆分，即使页数不多（图文混排的页面 token 更密） */
const SPLIT_SIZE_MB = 4
/** 单请求最多引用 20 个文档，拆出来的份数不超过这个数 */
const MAX_PARTS = 20

const MB = 1024 * 1024

const isPdf = (file: File) => file.name.toLowerCase().endsWith('.pdf')

const partName = (name: string, from: number, to: number) =>
  `${name.replace(/\.pdf$/i, '')} (${from}-${to}).pdf`

const ranges = (total: number, size: number) => {
  const count = Math.min(MAX_PARTS, Math.max(1, Math.ceil(total / size)))
  const result: { from: number; to: number }[] = []
  let page = 1
  for (let index = 0; index < count; index += 1) {
    const remainingPages = total - page + 1
    const remainingParts = count - index
    const take = Math.ceil(remainingPages / remainingParts)
    result.push({ from: page, to: page + take - 1 })
    page += take
  }
  return result
}

/**
 * 把 PDF 按页拆成多份，绕开服务端「单条消息里的文档 32K token」的限制。
 * 只对 PDF 生效；拆分失败时退回原文件，由调用方按原样上传。
 */
export const splitPdfIfNeeded = async (file: File): Promise<File[]> => {
  if (!isPdf(file) || file.size <= SPLIT_SIZE_MB * MB) {
    return [file]
  }
  let source: PDFDocument
  try {
    source = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()), {
      ignoreEncryption: true,
      updateMetadata: false,
    })
  } catch {
    return [file]
  }
  const total = source.getPageCount()
  if (total <= 1) {
    return [file]
  }
  const plan = ranges(total, PAGES_PER_PART)
  if (plan.length <= 1) {
    return [file]
  }
  const parts: File[] = []
  for (const { from, to } of plan) {
    const target = await PDFDocument.create()
    const indexes: number[] = []
    for (let page = from; page <= to; page += 1) {
      indexes.push(page - 1)
    }
    const copied = await target.copyPages(source, indexes)
    for (const page of copied) {
      target.addPage(page)
    }
    const bytes = await target.save()
    parts.push(
      new File([bytes as BlobPart], partName(file.name, from, to), { type: 'application/pdf' })
    )
  }
  return parts
}

/** 批量处理：只要有一个 PDF 被拆开，就返回拆后的列表 */
export const splitAttachments = async (files: File[]): Promise<File[]> => {
  const result: File[] = []
  for (const file of files) {
    result.push(...(await splitPdfIfNeeded(file)))
  }
  return result
}
