'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaRegUserCircle } from 'react-icons/fa'
import { FaTruck } from 'react-icons/fa6'
// npm install react-icons

type Employee = {
  employee_id: string
  name: string
  role: string
}

export default function SelectSidePage() {
  const router = useRouter()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [hovered, setHovered] = useState<'sales' | 'transport' | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('employee')
    if (!raw) {
      router.push('/login')
      return
    }
    setEmployee(JSON.parse(raw))
  }, [router])

  const goTo = (type: 'sales' | 'transport') => {
    router.push(`/case/${type}`)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      {/* Greeting */}
      <div className="text-center mb-8">
        <p className="text-sm text-gray-400">
          สวัสดีครับ{employee ? ` ${employee.name}` : ''}
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mt-1">
          เลือกฝั่งที่จะไปรับของเสีย
        </h1>
      </div>

      {/* Two-side selector */}
      <div className="relative w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-0">
        {/* Sales card */}
        <button
          onClick={() => goTo('sales')}
          onMouseEnter={() => setHovered('sales')}
          onMouseLeave={() => setHovered(null)}
          className={`group relative overflow-hidden rounded-3xl sm:rounded-r-none
                      px-8 py-14 flex flex-col items-center justify-center gap-4
                      border-2 transition-all duration-300
                      ${hovered === 'sales'
                        ? 'border-[#3B9EE8] bg-[#3B9EE8] scale-[1.02] shadow-xl z-10'
                        : 'border-gray-200 bg-white shadow-sm'}`}
        >
          <FaRegUserCircle
            size={44}
            className={hovered === 'sales' ? 'text-white' : 'text-[#3B9EE8]'}
          />
          <div className="text-center">
            <p
              className={`text-lg font-semibold transition-colors duration-300 ${
                hovered === 'sales' ? 'text-white' : 'text-gray-800'
              }`}
            >
              เซลล์
            </p>
            <p
              className={`text-xs mt-1 transition-colors duration-300 ${
                hovered === 'sales' ? 'text-white/80' : 'text-gray-400'
              }`}
            >
              ไปรับของหมดอายุจากร้านค้าเอง
            </p>
          </div>
        </button>

        {/* Center divider badge (desktop only) */}
        <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                        w-12 h-12 rounded-full bg-gray-50 border-2 border-gray-200
                        items-center justify-center text-xs font-semibold text-gray-400 z-20">
          OR
        </div>

        {/* Transport card */}
        <button
          onClick={() => goTo('transport')}
          onMouseEnter={() => setHovered('transport')}
          onMouseLeave={() => setHovered(null)}
          className={`group relative overflow-hidden rounded-3xl sm:rounded-l-none
                      px-8 py-14 flex flex-col items-center justify-center gap-4
                      border-2 transition-all duration-300
                      ${hovered === 'transport'
                        ? 'border-[#F2994A] bg-[#F2994A] scale-[1.02] shadow-xl z-10'
                        : 'border-gray-200 bg-white shadow-sm'}`}
        >
          <FaTruck
            size={40}
            className={hovered === 'transport' ? 'text-white' : 'text-[#F2994A]'}
          />
          <div className="text-center">
            <p
              className={`text-lg font-semibold transition-colors duration-300 ${
                hovered === 'transport' ? 'text-white' : 'text-gray-800'
              }`}
            >
              ขนส่ง
            </p>
            <p
              className={`text-xs mt-1 transition-colors duration-300 ${
                hovered === 'transport' ? 'text-white/80' : 'text-gray-400'
              }`}
            >
              ให้บริษัทขนส่งไปรับของแทน
            </p>
          </div>
        </button>
      </div>

      <p className="text-xs text-gray-300 mt-8">แตะการ์ดเพื่อเลือก</p>
    </main>
  )
}