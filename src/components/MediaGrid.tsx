import { useState } from 'react'
import { MediaViewer } from './MediaViewer'
import type { MediaAttachment } from '../types'

interface MediaGridProps {
  attachments: MediaAttachment[]
  sensitive: boolean
  /** detail view では最初から非ぼかしにする */
  forceReveal?: boolean
  thumbnailHeight?: string
}

export function MediaGrid({ attachments, sensitive, forceReveal, thumbnailHeight = 'h-32' }: MediaGridProps) {
  const [revealed, setRevealed] = useState(!sensitive || !!forceReveal)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  if (attachments.length === 0) return null

  const handleClick = (i: number) => {
    if (!revealed) {
      setRevealed(true)
    } else {
      setViewerIndex(i)
    }
  }

  return (
    <>
      <div className="mt-2 relative">
        <div className={`grid gap-1 ${attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} rounded overflow-hidden`}>
          {attachments.map((media, i) => (
            <button
              key={media.id}
              className={`block bg-gray-700 overflow-hidden ${!revealed ? 'cursor-pointer' : media.type === 'image' || media.type === 'video' || media.type === 'gifv' ? 'cursor-zoom-in' : 'cursor-default'}`}
              onClick={() => handleClick(i)}
              tabIndex={-1}
            >
              {media.type === 'image' ? (
                <img
                  src={media.preview_url || media.url}
                  alt={revealed ? (media.description ?? '') : ''}
                  className={`w-full ${thumbnailHeight} object-cover ${!revealed ? 'blur-xl scale-110' : ''} transition-[filter] duration-200`}
                  loading="lazy"
                />
              ) : media.type === 'video' || media.type === 'gifv' ? (
                <div className={`w-full ${thumbnailHeight} flex items-center justify-center bg-gray-800 relative`}>
                  {media.preview_url && (
                    <img
                      src={media.preview_url}
                      alt=""
                      className={`absolute inset-0 w-full h-full object-cover ${!revealed ? 'blur-xl scale-110' : ''} transition-[filter] duration-200`}
                    />
                  )}
                  {revealed && (
                    <div className="relative z-10 bg-black/50 rounded-full p-2">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`w-full ${thumbnailHeight} flex items-center justify-center text-gray-400 text-xs`}>
                  {media.type}
                </div>
              )}
            </button>
          ))}
        </div>

        {!revealed && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer rounded"
            onClick={() => setRevealed(true)}
          >
            <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            <span className="text-white/90 text-xs font-medium">クリックして表示</span>
          </div>
        )}
      </div>

      {viewerIndex !== null && (
        <MediaViewer
          attachments={attachments}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  )
}
