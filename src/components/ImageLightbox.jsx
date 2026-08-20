import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, ImageOff } from 'lucide-react'

export default function ImageLightbox({ images = [], index = 0, onClose }) {
  const [current, setCurrent] = useState(index || 0)
  const [scale, setScale] = useState(1)
  const [error, setError] = useState(false)

  const safeImages = images.filter(Boolean)
  const src = safeImages[current]

  const prev = useCallback(() => { setCurrent((c) => Math.max(0, c - 1)); setScale(1); setError(false) }, [])
  const next = useCallback(() => { setCurrent((c) => Math.min(safeImages.length - 1, c + 1)); setScale(1); setError(false) }, [safeImages.length])
  const zoomIn = useCallback(() => setScale((s) => Math.min(3, s + 0.3)), [])
  const zoomOut = useCallback(() => setScale((s) => Math.max(0.4, s - 0.3)), [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.()
      if (e.key === 'ArrowLeft' && safeImages.length > 1) prev()
      if (e.key === 'ArrowRight' && safeImages.length > 1) next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next, safeImages.length])

  useEffect(() => { setCurrent(index || 0); setScale(1); setError(false) }, [index])
  useEffect(() => { if (safeImages.length === 0) onClose?.() }, [safeImages.length, onClose])

  if (safeImages.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,.92)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        animation: 'lbFadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', background: 'linear-gradient(180deg, rgba(0,0,0,.6), transparent)',
        zIndex: 10,
      }}>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
          {safeImages.length > 1 ? `${current + 1} / ${safeImages.length}` : ''}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={(e) => { e.stopPropagation(); zoomOut() }} style={toolBtn} title="Zoom out"><ZoomOut size={18} /></button>
          <button onClick={(e) => { e.stopPropagation(); zoomIn() }} style={toolBtn} title="Zoom in"><ZoomIn size={18} /></button>
          <a href={src} download target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={toolBtn}><Download size={18} /></a>
          <button onClick={onClose} style={{ ...toolBtn, background: 'rgba(239,68,68,.8)' }} title="Close (Esc)"><X size={18} /></button>
        </div>
      </div>

      {/* Image or error */}
      {error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,.5)' }}>
          <ImageOff size={48} />
          <span style={{ fontSize: 14 }}>Failed to load image</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', wordBreak: 'break-all', maxWidth: 400 }}>{src}</span>
        </div>
      ) : (
        <img
          src={src}
          alt=""
          onClick={(e) => e.stopPropagation()}
          onError={() => setError(true)}
          style={{
            maxWidth: '85vw', maxHeight: '80vh', objectFit: 'contain',
            borderRadius: 8, transform: `scale(${scale})`,
            transition: 'transform 0.2s ease', cursor: scale > 1 ? 'grab' : 'zoom-in',
          }}
        />
      )}

      {/* Nav arrows */}
      {safeImages.length > 1 && current > 0 && (
        <button onClick={(e) => { e.stopPropagation(); prev() }} style={{ ...navBtn, left: 16 }}>
          <ChevronLeft size={28} />
        </button>
      )}
      {safeImages.length > 1 && current < safeImages.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); next() }} style={{ ...navBtn, right: 16 }}>
          <ChevronRight size={28} />
        </button>
      )}

      <style>{`
        @keyframes lbFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  )
}

const toolBtn = {
  background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8,
  padding: 8, color: '#fff', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)',
  transition: 'background 0.15s',
}

const navBtn = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
  background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%',
  width: 48, height: 48, color: '#fff', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  backdropFilter: 'blur(8px)', transition: 'background 0.2s', zIndex: 10,
}
