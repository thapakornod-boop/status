'use client'

import { useRef, useState } from 'react'

type Props = {
  onSign: (file: File) => void
  existingUrl?: string
}

export default function SignaturePad({ onSign, existingUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [saved, setSaved] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent)
    return {
      x: (point.clientX - rect.left) * (canvas.width / rect.width),
      y: (point.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    setHasDrawn(true)
  }

  const end = () => setIsDrawing(false)

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    setSaved(false)
    setPreviewUrl(null)
  }

  const confirmSign = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `signature-${Date.now()}.png`, { type: 'image/png' })
      setPreviewUrl(URL.createObjectURL(blob))
      setSaved(true)
      onSign(file)
    }, 'image/png')
  }

  if (saved && previewUrl) {
    return (
      <div>
        <div className="border-2 border-gray-200 rounded-xl bg-gray-50 p-3 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="ลายเซ็น" className="h-20" />
        </div>
        <button type="button" onClick={clearCanvas} className="text-sm text-gray-500 underline mt-1">
          เซ็นใหม่
        </button>
      </div>
    )
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={500}
        height={180}
        className="w-full border-2 border-dashed border-gray-300 rounded-xl bg-white touch-none"
        style={{ touchAction: 'none' }}
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={draw}
        onTouchEnd={end}
      />
      <p className="text-xs text-gray-400 mt-1">ลากนิ้วหรือเมาส์ในกรอบเพื่อเซ็นชื่อยอมรับ</p>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={clearCanvas}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500"
        >
          เคลียร์
        </button>
        <button
          type="button"
          onClick={confirmSign}
          disabled={!hasDrawn}
          className="flex-1 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium disabled:opacity-40"
        >
          ยืนยันลายเซ็น
        </button>
      </div>

      {existingUrl && !hasDrawn && (
        <p className="text-xs text-gray-400 mt-1">มีลายเซ็นบันทึกไว้แล้ว (เซ็นใหม่เพื่อแทนที่)</p>
      )}
    </div>
  )
}