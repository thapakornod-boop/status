'use client'

import { useRef, useState, useEffect } from 'react'

type Props = {
  onSign: (file: File) => void
  existingUrl?: string
}

export default function SignaturePad({ onSign, existingUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasDrawn = useRef(false)
  const [signedPreview, setSignedPreview] = useState<string | null>(null)
  const [resigning, setResigning] = useState(false)

  // ตั้งขนาด canvas ให้ตรงกับพื้นที่จริงบนจอ (กัน blur / พิกัดเพี้ยนตอนวาด)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(ratio, ratio)
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#1f2937'
    }
  }, [resigning])

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true
    hasDrawn.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const end = () => {
    drawing.current = false
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    hasDrawn.current = false
  }

  const confirmSignature = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn.current) return
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `signature-${Date.now()}.png`, { type: 'image/png' })
      setSignedPreview(URL.createObjectURL(blob))
      onSign(file)
      setResigning(false)
    }, 'image/png')
  }

  // มีลายเซ็นแล้ว (เคยเซ็นไว้ก่อนหน้า หรือเพิ่งเซ็นเสร็จ) และไม่ได้อยู่ในโหมดเซ็นใหม่
  if ((existingUrl || signedPreview) && !resigning) {
    return (
      <div className="border-2 border-gray-200 rounded-xl p-3 bg-gray-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signedPreview ?? existingUrl}
          alt="ลายเซ็นยืนยันรับสินค้า"
          className="h-20 mx-auto"
        />
        <button
          type="button"
          onClick={() => {
            setSignedPreview(null)
            setResigning(true)
            setTimeout(clear, 0)
          }}
          className="w-full text-xs text-gray-400 underline mt-2"
        >
          เซ็นใหม่
        </button>
      </div>
    )
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full h-40 rounded-xl border-2 border-dashed border-gray-300 bg-white touch-none"
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-gray-400">เซ็นด้วยนิ้วหรือลากเมาส์ในกรอบด้านบน</p>
        <div className="flex gap-3">
          <button type="button" onClick={clear} className="text-xs text-gray-400 underline">
            ล้าง
          </button>
          <button
            type="button"
            onClick={confirmSignature}
            className="text-xs font-semibold text-gray-800 underline"
          >
            ยืนยันลายเซ็น
          </button>
        </div>
      </div>
    </div>
  )
}