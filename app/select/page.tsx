'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FaRegUserCircle,
  FaTruck,
  FaArrowRight,
  FaBoxOpen,
  FaChevronRight,
} from 'react-icons/fa'

type Employee = {
  employee_id: string
  name: string
  role: string
}

export default function SelectSidePage() {
  const router = useRouter()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [hovered, setHovered] = useState<'sales' | 'transport' | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('employee')

    if (!raw) {
      router.push('/login')
      return
    }

    try {
      setEmployee(JSON.parse(raw))
      setTimeout(() => setMounted(true), 50)
    } catch {
      localStorage.removeItem('employee')
      router.push('/login')
    }
  }, [router])

  const goTo = (type: 'sales' | 'transport') => {
    router.push(`/case/${type}`)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f8fc] flex flex-col items-center justify-center px-4 py-10">

      {/* ================= BACKGROUND DECORATION ================= */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* Blue glow */}
        <div
          className="
            absolute -top-32 -left-32
            w-[420px] h-[420px]
            rounded-full
            bg-[#3B9EE8]/10
            blur-3xl
            animate-pulse
          "
        />

        {/* Orange glow */}
        <div
          className="
            absolute -bottom-40 -right-32
            w-[450px] h-[450px]
            rounded-full
            bg-[#F2994A]/10
            blur-3xl
            animate-pulse
          "
        />

        {/* Small floating circles */}
        <div className="absolute top-[18%] right-[12%] w-3 h-3 rounded-full bg-[#3B9EE8]/20 animate-bounce" />
        <div className="absolute bottom-[20%] left-[10%] w-4 h-4 rounded-full bg-[#F2994A]/20 animate-bounce [animation-delay:500ms]" />

        {/* Grid */}
        <div
          className="
            absolute inset-0
            opacity-[0.025]
            [background-image:linear-gradient(#64748b_1px,transparent_1px),linear-gradient(90deg,#64748b_1px,transparent_1px)]
            [background-size:40px_40px]
          "
        />
      </div>

      {/* ================= CONTENT ================= */}

      <div
        className={`
          relative z-10 w-full max-w-4xl
          transition-all duration-700
          ${mounted
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-6'
          }
        `}
      >

        {/* ================= HEADER ================= */}

        <div className="text-center mb-8 md:mb-10">

          {/* Small badge */}
          <div
            className="
              inline-flex items-center gap-2
              px-4 py-2 mb-4
              rounded-full
              bg-white/80
              border border-gray-200
              shadow-sm
              backdrop-blur-md
            "
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>

            <span className="text-xs font-medium text-gray-500">
              ระบบรับของเสีย
            </span>
          </div>

          {/* Greeting */}
          <p className="text-sm text-gray-400 mb-1">
            สวัสดีครับ
          </p>

          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-gray-800">
            {employee?.name || 'กำลังโหลด...'}
          </h1>

          {/* Subtitle */}
          <p className="text-sm md:text-base text-gray-400 mt-3">
            เลือกช่องทางสำหรับการรับของเสีย
          </p>

          {/* Employee ID */}
          {employee && (
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-400">
              <span className="px-2.5 py-1 rounded-md bg-gray-100">
                ID: {employee.employee_id}
              </span>

              <span className="px-2.5 py-1 rounded-md bg-gray-100">
                {employee.role}
              </span>
            </div>
          )}
        </div>

        {/* ================= SELECT CARDS ================= */}

        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-0">

          {/* ================= SALES ================= */}

          <button
            onClick={() => goTo('sales')}
            onMouseEnter={() => setHovered('sales')}
            onMouseLeave={() => setHovered(null)}
            className={`
              group relative overflow-hidden
              min-h-[300px]
              md:min-h-[360px]
              p-8 md:p-10
              flex flex-col items-center justify-center
              text-center
              rounded-3xl md:rounded-r-none
              border
              transition-all duration-500
              outline-none
              ${
                hovered === 'sales'
                  ? `
                    bg-gradient-to-br from-[#3B9EE8] to-[#237FC9]
                    border-[#3B9EE8]
                    shadow-[0_25px_70px_-20px_rgba(59,158,232,0.65)]
                    md:scale-[1.035]
                    z-20
                  `
                  : `
                    bg-white/85
                    border-gray-200/80
                    shadow-[0_15px_40px_-25px_rgba(0,0,0,0.25)]
                    hover:border-[#3B9EE8]/40
                  `
              }
            `}
          >

            {/* Decorative circle */}
            <div
              className={`
                absolute -top-20 -right-20
                w-48 h-48 rounded-full
                border-[30px]
                transition-all duration-700
                ${
                  hovered === 'sales'
                    ? 'border-white/10 scale-110'
                    : 'border-[#3B9EE8]/5'
                }
              `}
            />

            {/* Bottom glow */}
            <div
              className={`
                absolute -bottom-24 -left-16
                w-48 h-48
                rounded-full
                blur-3xl
                transition-opacity duration-500
                ${
                  hovered === 'sales'
                    ? 'bg-white/10 opacity-100'
                    : 'opacity-0'
                }
              `}
            />

            {/* Icon */}
            <div
              className={`
                relative z-10
                w-24 h-24
                rounded-[28px]
                flex items-center justify-center
                transition-all duration-500
                ${
                  hovered === 'sales'
                    ? `
                      bg-white/20
                      text-white
                      rotate-3
                      scale-110
                      shadow-lg
                    `
                    : `
                      bg-[#3B9EE8]/10
                      text-[#3B9EE8]
                    `
                }
              `}
            >
              <FaRegUserCircle
                size={48}
                className={`
                  transition-transform duration-500
                  ${hovered === 'sales' ? 'scale-110' : ''}
                `}
              />

              {/* Tiny box icon */}
              <div
                className={`
                  absolute -right-2 -bottom-2
                  w-8 h-8 rounded-xl
                  flex items-center justify-center
                  shadow-md
                  transition-all duration-500
                  ${
                    hovered === 'sales'
                      ? 'bg-white text-[#3B9EE8]'
                      : 'bg-[#3B9EE8] text-white'
                  }
                `}
              >
                <FaBoxOpen size={14} />
              </div>
            </div>

            {/* Text */}
            <div className="relative z-10 mt-6">

              <p
                className={`
                  text-2xl font-bold
                  transition-colors duration-300
                  ${
                    hovered === 'sales'
                      ? 'text-white'
                      : 'text-gray-800'
                  }
                `}
              >
                เซลล์
              </p>

              <p
                className={`
                  text-sm mt-2 max-w-[250px]
                  leading-relaxed
                  transition-colors duration-300
                  ${
                    hovered === 'sales'
                      ? 'text-white/80'
                      : 'text-gray-400'
                  }
                `}
              >
                ไปรับของหมดอายุ
                <br />
                จากร้านค้าด้วยตัวเอง
              </p>

            </div>

            {/* Bottom action */}
            <div
              className={`
                relative z-10
                mt-7
                inline-flex items-center gap-2
                text-xs font-semibold
                transition-all duration-300
                ${
                  hovered === 'sales'
                    ? 'text-white translate-x-1'
                    : 'text-[#3B9EE8]'
                }
              `}
            >
              เลือกฝั่งนี้
              <FaArrowRight
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </div>

          </button>

          {/* ================= CENTER OR ================= */}

          <div
            className="
              hidden md:flex
              absolute
              left-1/2 top-1/2
              -translate-x-1/2 -translate-y-1/2
              z-30
              w-14 h-14
              rounded-full
              bg-white
              border-[6px]
              border-[#f5f8fc]
              shadow-lg
              items-center justify-center
            "
          >
            <span className="text-[10px] font-bold text-gray-400">
              OR
            </span>
          </div>

          {/* ================= TRANSPORT ================= */}

          <button
            onClick={() => goTo('transport')}
            onMouseEnter={() => setHovered('transport')}
            onMouseLeave={() => setHovered(null)}
            className={`
              group relative overflow-hidden
              min-h-[300px]
              md:min-h-[360px]
              p-8 md:p-10
              flex flex-col items-center justify-center
              text-center
              rounded-3xl md:rounded-l-none
              border
              transition-all duration-500
              outline-none
              ${
                hovered === 'transport'
                  ? `
                    bg-gradient-to-br from-[#F2994A] to-[#E77D25]
                    border-[#F2994A]
                    shadow-[0_25px_70px_-20px_rgba(242,153,74,0.65)]
                    md:scale-[1.035]
                    z-20
                  `
                  : `
                    bg-white/85
                    border-gray-200/80
                    shadow-[0_15px_40px_-25px_rgba(0,0,0,0.25)]
                    hover:border-[#F2994A]/40
                  `
              }
            `}
          >

            {/* Decorative circle */}
            <div
              className={`
                absolute -bottom-24 -right-20
                w-52 h-52 rounded-full
                border-[30px]
                transition-all duration-700
                ${
                  hovered === 'transport'
                    ? 'border-white/10 scale-110'
                    : 'border-[#F2994A]/5'
                }
              `}
            />

            {/* Top glow */}
            <div
              className={`
                absolute -top-24 -left-16
                w-48 h-48
                rounded-full
                blur-3xl
                transition-opacity duration-500
                ${
                  hovered === 'transport'
                    ? 'bg-white/10 opacity-100'
                    : 'opacity-0'
                }
              `}
            />

            {/* Icon */}
            <div
              className={`
                relative z-10
                w-24 h-24
                rounded-[28px]
                flex items-center justify-center
                transition-all duration-500
                ${
                  hovered === 'transport'
                    ? `
                      bg-white/20
                      text-white
                      -rotate-3
                      scale-110
                      shadow-lg
                    `
                    : `
                      bg-[#F2994A]/10
                      text-[#F2994A]
                    `
                }
              `}
            >
              <FaTruck
                size={46}
                className={`
                  transition-transform duration-500
                  ${hovered === 'transport' ? 'scale-110' : ''}
                `}
              />

              {/* Status dot */}
              <div
                className={`
                  absolute -right-2 -bottom-2
                  w-8 h-8 rounded-xl
                  flex items-center justify-center
                  shadow-md
                  transition-all duration-500
                  ${
                    hovered === 'transport'
                      ? 'bg-white text-[#F2994A]'
                      : 'bg-[#F2994A] text-white'
                  }
                `}
              >
                <FaChevronRight size={12} />
              </div>
            </div>

            {/* Text */}
            <div className="relative z-10 mt-6">

              <p
                className={`
                  text-2xl font-bold
                  transition-colors duration-300
                  ${
                    hovered === 'transport'
                      ? 'text-white'
                      : 'text-gray-800'
                  }
                `}
              >
                ขนส่ง
              </p>

              <p
                className={`
                  text-sm mt-2 max-w-[250px]
                  leading-relaxed
                  transition-colors duration-300
                  ${
                    hovered === 'transport'
                      ? 'text-white/80'
                      : 'text-gray-400'
                  }
                `}
              >
                ให้บริษัทขนส่ง
                <br />
                ไปรับของแทน
              </p>

            </div>

            {/* Bottom action */}
            <div
              className={`
                relative z-10
                mt-7
                inline-flex items-center gap-2
                text-xs font-semibold
                transition-all duration-300
                ${
                  hovered === 'transport'
                    ? 'text-white translate-x-1'
                    : 'text-[#F2994A]'
                }
              `}
            >
              เลือกฝั่งนี้
              <FaArrowRight
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </div>

          </button>

        </div>

        {/* ================= FOOTER ================= */}

        <div className="flex flex-col items-center mt-8 gap-2">

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            แตะหรือคลิกการ์ดเพื่อดำเนินการต่อ
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          </div>

          <p className="text-[10px] text-gray-300">
            Waste Collection System
          </p>

        </div>

      </div>

    </main>
  )
}