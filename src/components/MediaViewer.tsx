import { useEffect, useState } from 'react'
import type { MediaAttachment } from '../types'

interface MediaViewerProps {
  attachments: MediaAttachment[]
  initialIndex: number
  onClose: () => void
}

export function MediaViewer({ attachments, initialIndex, onClose }: MediaViewerProps) {
  const [index, setIndex] = useState(initialIndex)
  const media = attachments[index]
  const hasPrev = index > 0
  const hasNext = index < attachments.length - 1

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) setIndex((i) => i - 1)
      if (e.key === 'ArrowRight' && hasNext) setIndex((i) => i + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hasPrev, hasNext, onClose])

  return (
    <div
      className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[60]"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3"
        onClick={(e) => e.stopPropagation()}
        style={{ color: 'white' }}
      >
        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {attachments.length > 1 && `${index + 1} / ${attachments.length}`}
        </span>
        {media.description && (
          <p className="text-xs max-w-md truncate px-4" style={{ color: 'rgba(255,255,255,0.7)' }}>{media.description}</p>
        )}
        <button
          onClick={onClose}
          className="transition-colors hover:opacity-100 opacity-70"
          aria-label="閉じる"
          style={{ color: 'white' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Media */}
      <div className="flex items-center justify-center w-full h-full px-16 py-14">
        {media.type === 'image' ? (
          <img
            src={media.url || media.preview_url}
            alt={media.description ?? ''}
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
        ) : media.type === 'video' || media.type === 'gifv' ? (
          <video
            src={media.url}
            controls
            autoPlay
            loop={media.type === 'gifv'}
            className="max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="text-gray-400" onClick={(e) => e.stopPropagation()}>{media.type}</div>
        )}
      </div>

      {/* Prev / Next */}
      {hasPrev && (
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 rounded-full p-2 transition-colors"
          style={{ color: 'white' }}
          onClick={(e) => { e.stopPropagation(); setIndex((i) => i - 1) }}
          aria-label="前の画像"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {hasNext && (
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black/90 rounded-full p-2 transition-colors"
          style={{ color: 'white' }}
          onClick={(e) => { e.stopPropagation(); setIndex((i) => i + 1) }}
          aria-label="次の画像"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
