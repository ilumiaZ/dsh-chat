import { create } from 'zustand'

/**
 * 拆分后还没挂到输入框的 PDF 分段。
 * 服务端对带文档的请求有 32K token 上限，一次只能带一段，所以剩下的先放内存里，
 * 由输入框上的「下一节」按钮按需取用。只保留最近一次拆分的结果。
 */
export const usePendingParts = create<{ files: File[] }>(() => ({ files: [] }))

export const setPendingParts = (files: File[]) => {
  usePendingParts.setState({ files })
}

export const takeNextPart = (): File | undefined => {
  const { files } = usePendingParts.getState()
  const [next, ...rest] = files
  if (!next) {
    return undefined
  }
  usePendingParts.setState({ files: rest })
  return next
}

export const clearPendingParts = () => {
  usePendingParts.setState({ files: [] })
}

/** 分段的页码范围，用于按钮文案 */
export const getPartLabel = (file: File) => {
  const match = /\((\d+)-(\d+)\)\.pdf$/i.exec(file.name)
  return match ? `${match[1]}–${match[2]}` : file.name
}
