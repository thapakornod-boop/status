'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  onCapture: (file: File) => void
  existingUrl?: string
}

export default function CameraCapture({ onCapture, existingUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [active, setActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // จุดสำคัญที่แก้: แนบ stream เข้า <video> ใน useEffect ที่ผูกกับ `active`
  // แทนที่จะใช้ setTimeout(0) เพราะ useEffect การันตีว่า <video> mount เสร็จแล้วจริง
  // (setTimeout(0) เคยทำให้จอดำ เพราะบางจังหวะ videoRef.current ยังเป็น null อยู่)
  useEffect(() => {
    if (!active || !videoRef.current || !streamRef.current) return

    const video = videoRef.current
    video.srcObject = streamRef.current
    video.muted = true

    const handleLoadedMetadata = () => {
      video
        .play()
        .then(() => console.log('[CameraCapture] ✅ video.play() สำเร็จ'))
        .catch((playErr) => {
          console.error('[CameraCapture] video.play() error:', playErr)
          setErr('เปิดวิดีโอไม่สำเร็จ ลองแตะปุ่มเปิดกล้องอีกครั้ง')
        })
    }
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata)
  }, [active])

  const startCamera = async () => {
    setErr('')
    console.log('[CameraCapture] เริ่มขอกล้อง...')
    console.log('[CameraCapture] secure context:', window.isSecureContext)
    console.log('[CameraCapture] protocol:', location.protocol, '| host:', location.host)

    // เผื่อมี stream เก่าค้างอยู่ (เช่นจาก hot reload ตอน dev) ปล่อยก่อนขอใหม่
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      console.error('[CameraCapture] navigator.mediaDevices.getUserMedia ไม่มีอยู่เลย')
      setErr('เบราว์เซอร์นี้ไม่รองรับกล้อง หรือหน้าเว็บไม่ได้เปิดผ่าน HTTPS/localhost')
      return
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cams = devices.filter((d) => d.kind === 'videoinput')
      console.log(
        '[CameraCapture] พบกล้อง',
        cams.length,
        'ตัว:',
        cams.map((c) => c.label || '(ไม่มีชื่อ - ยังไม่ได้ allow)')
      )
    } catch (enumErr) {
      console.error('[CameraCapture] enumerateDevices error:', enumErr)
    }

    // ลองแบบเจาะจงกล้องหลังก่อน ถ้าพังค่อย fallback เป็นขอกล้องแบบเรียบง่ายสุด
    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      { video: true, audio: false },
    ]

    let lastError: any = null
    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        console.log(
          '[CameraCapture] ✅ getUserMedia สำเร็จ, tracks:',
          stream.getVideoTracks().map((t) => t.label)
        )
        streamRef.current = stream
        setActive(true) // useEffect ด้านบนจะแนบ stream เข้า <video> ต่อเอง
        return
      } catch (e: any) {
        lastError = e
        console.error('[CameraCapture] ❌ attempt failed:', constraints, e?.name, e?.message)
      }
    }

    const name = lastError?.name
    setErr(`เปิดกล้องไม่ได้ (${name ?? 'unknown'}: ${lastError?.message ?? ''}) ลองใช้ปุ่มสำรองด้านล่างแทนได้`)
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setActive(false)
  }

  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
    onCapture(file)
  }

  const capture = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
        setPreviewUrl(URL.createObjectURL(blob))
        onCapture(file)
        stopCamera()
      },
      'image/jpeg',
      0.9
    )
  }

  const retake = () => {
    setPreviewUrl(null)
    startCamera()
  }

  return (
    <div>
      {err && (
        <div className="mb-2">
          <p className="text-xs text-red-500 mb-2">{err}</p>
          {/* fallback: เบราว์เซอร์เปิดกล้องเองผ่านปุ่มนี้ ใช้ตอน getUserMedia ใช้ไม่ได้ */}
          <label className="w-full py-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 text-sm text-amber-700 flex items-center justify-center gap-2 cursor-pointer">
            📷 ใช้กล้องของเบราว์เซอร์แทน (สำรอง)
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFallbackFile}
              className="hidden"
            />
          </label>
        </div>
      )}

      {!active && !previewUrl && (
        <button
          type="button"
          onClick={startCamera}
          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 flex items-center justify-center gap-2"
        >
          📷 แตะเพื่อเปิดกล้องถ่ายรูป
        </button>
      )}

      {active && (
        <div className="space-y-2">
          <video
            ref={videoRef}
            className="w-full rounded-xl bg-black"
            playsInline
            muted
            autoPlay
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={capture}
              className="flex-1 py-2.5 rounded-xl bg-gray-800 text-white text-sm font-medium"
            >
              ถ่ายรูป
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {previewUrl && !active && (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="ตัวอย่างรูปที่ถ่าย" className="w-full rounded-xl" />
          <button
            type="button"
            onClick={retake}
            className="text-sm font-medium text-gray-500 underline"
          >
            ถ่ายใหม่
          </button>
        </div>
      )}

      {!previewUrl && !active && existingUrl && (
        <div className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={existingUrl} alt="รูปที่บันทึกไว้แล้ว" className="w-full rounded-xl opacity-80" />
          <p className="text-xs text-gray-400 mt-1">มีรูปแล้ว (ถ่ายใหม่เพื่อแทนที่)</p>
        </div>
      )}
    </div>
  )
}