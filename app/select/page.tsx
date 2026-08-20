'use client'

import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { useRouter } from 'next/navigation'
import {
  FaRegUserCircle,
  FaTruck,
  FaArrowRight,
  FaBoxOpen,
  FaChevronRight,
  FaWarehouse,
  FaFileInvoice,
} from 'react-icons/fa'
import { EmployeeRole } from '@/lib/caseSteps'

type Employee = {
  employee_id: string
  name: string
  role: EmployeeRole
}

type IconType = ComponentType<{ size?: number; className?: string }>

type SelectCard = {
  key: string
  title: string
  description: string
  icon: IconType
  badgeIcon: IconType
  accent: string
  accentTo: string
  href: string
}

const BLUE = { from: '#3B9EE8', to: '#237FC9' }
const ORANGE = { from: '#F2994A', to: '#E77D25' }

// เพิ่ม/แก้เมนูของแต่ละ role ได้ที่นี่ที่เดียว
function getCardsForRole(role: EmployeeRole | undefined): SelectCard[] {
  switch (role) {
    case 'sales':
      return [
        {
          key: 'sales',
          title: 'เซลล์',
          description: 'ไปรับของหมดอายุ\nจากร้านค้าด้วยตัวเอง',
          icon: FaRegUserCircle,
          badgeIcon: FaBoxOpen,
          accent: BLUE.from,
          accentTo: BLUE.to,
          href: '/case/sales',
        },
      ]

    case 'transport':
      return [
        {
          key: 'transport',
          title: 'ขนส่ง',
          description: 'ให้บริษัทขนส่ง\nไปรับของแทน',
          icon: FaTruck,
          badgeIcon: FaChevronRight,
          accent: ORANGE.from,
          accentTo: ORANGE.to,
          href: '/case/transport',
        },
      ]

    case 'wh':
      return [
        {
          key: 'sales-wh',
          title: 'คิวคลัง (เซลล์)',
          description: 'นับสินค้ากระทบ SRN\nจากสายเซลล์',
          icon: FaWarehouse,
          badgeIcon: FaBoxOpen,
          accent: BLUE.from,
          accentTo: BLUE.to,
          href: '/case/sales/wh',
        },
        {
          key: 'transport-wh',
          title: 'คิวคลัง (ขนส่ง)',
          description: 'นับสินค้ากระทบ SRN\nจากสายขนส่ง',
          icon: FaWarehouse,
          badgeIcon: FaChevronRight,
          accent: ORANGE.from,
          accentTo: ORANGE.to,
          href: '/case/transport/wh',
        },
      ]

    case 'admin':
      return [
        {
          key: 'sales-admin',
          title: 'คิวออก CN (เซลล์)',
          description: 'ออกเอกสาร CN\nให้สายเซลล์',
          icon: FaFileInvoice,
          badgeIcon: FaBoxOpen,
          accent: BLUE.from,
          accentTo: BLUE.to,
          href: '/case/sales/lg',
        },
        {
          key: 'transport-admin',
          title: 'คิวออก CN (ขนส่ง)',
          description: 'ออกเอกสาร CN\nให้สายขนส่ง',
          icon: FaFileInvoice,
          badgeIcon: FaChevronRight,
          accent: ORANGE.from,
          accentTo: ORANGE.to,
          href: '/case/transport/lg',
        },
      ]

    default:
      return []
  }
}

export default function SelectSidePage() {
  const router = useRouter()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
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

  const cards = getCardsForRole(employee?.role)

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f8fc] flex flex-col items-center justify-center px-4 py-10">

      {/* ================= BACKGROUND DECORATION ================= */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-[#3B9EE8]/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-32 w-[450px] h-[450px] rounded-full bg-[#F2994A]/10 blur-3xl animate-pulse" />
        <div className="absolute top-[18%] right-[12%] w-3 h-3 rounded-full bg-[#3B9EE8]/20 animate-bounce" />
        <div className="absolute bottom-[20%] left-[10%] w-4 h-4 rounded-full bg-[#F2994A]/20 animate-bounce [animation-delay:500ms]" />
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
          ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
        `}
      >

        {/* ================= HEADER ================= */}

        <div className="text-center mb-8 md:mb-10">

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

          <p className="text-sm text-gray-400 mb-1">สวัสดีครับ</p>

          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-gray-800">
            {employee?.name || 'กำลังโหลด...'}
          </h1>

          <p className="text-sm md:text-base text-gray-400 mt-3">
            {cards.length > 0
              ? 'เลือกช่องทางสำหรับการรับของเสีย'
              : 'ยังไม่มีเมนูสำหรับบทบาทนี้'}
          </p>

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

        {cards.length === 0 ? (

          <div className="rounded-3xl border border-gray-200 bg-white/85 p-10 text-center text-sm text-gray-400 shadow-sm">
            บทบาทของคุณยังไม่ได้ตั้งค่าเมนูในหน้านี้ กรุณาติดต่อผู้ดูแลระบบ
          </div>

        ) : cards.length === 1 ? (

          <div className="flex justify-center">
            <SelectCardButton
              card={cards[0]}
              hovered={hovered === cards[0].key}
              onEnter={() => setHovered(cards[0].key)}
              onLeave={() => setHovered(null)}
              onClick={() => router.push(cards[0].href)}
              wide
            />
          </div>

        ) : (

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-0">

            {cards.map((card, i) => (
              <SelectCardButton
                key={card.key}
                card={card}
                hovered={hovered === card.key}
                onEnter={() => setHovered(card.key)}
                onLeave={() => setHovered(null)}
                onClick={() => router.push(card.href)}
                roundedSide={i === 0 ? 'left' : 'right'}
              />
            ))}

            <div
              className="
                hidden md:flex
                absolute left-1/2 top-1/2
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
              <span className="text-[10px] font-bold text-gray-400">OR</span>
            </div>

          </div>

        )}

        {/* ================= FOOTER ================= */}

        <div className="flex flex-col items-center mt-8 gap-2">

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            แตะหรือคลิกการ์ดเพื่อดำเนินการต่อ
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          </div>

          <p className="text-[10px] text-gray-300">Waste Collection System</p>

        </div>

      </div>

    </main>
  )
}

/* =========================================================
   SELECT CARD BUTTON (ใช้ร่วมกันทุก role)
========================================================= */

function SelectCardButton({
  card,
  hovered,
  onEnter,
  onLeave,
  onClick,
  roundedSide,
  wide,
}: {
  card: SelectCard
  hovered: boolean
  onEnter: () => void
  onLeave: () => void
  onClick: () => void
  roundedSide?: 'left' | 'right'
  wide?: boolean
}) {
  const Icon = card.icon
  const Badge = card.badgeIcon

  return (
    <button
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`
        group relative overflow-hidden
        min-h-[300px] md:min-h-[360px]
        p-8 md:p-10
        flex flex-col items-center justify-center text-center
        rounded-3xl
        ${roundedSide === 'left' ? 'md:rounded-r-none' : ''}
        ${roundedSide === 'right' ? 'md:rounded-l-none' : ''}
        ${wide ? 'w-full max-w-md' : ''}
        border transition-all duration-500 outline-none
        ${
          hovered
            ? 'border-transparent md:scale-[1.035] z-20'
            : 'bg-white/85 border-gray-200/80 shadow-[0_15px_40px_-25px_rgba(0,0,0,0.25)]'
        }
      `}
      style={
        hovered
          ? {
              background: `linear-gradient(135deg, ${card.accent}, ${card.accentTo})`,
              boxShadow: `0 25px 70px -20px ${card.accent}aa`,
            }
          : undefined
      }
    >

      {/* Decorative circle */}
      <div
        className={`
          absolute -top-20 -right-20
          w-48 h-48 rounded-full
          border-[30px]
          transition-all duration-700
          ${hovered ? 'border-white/10 scale-110' : ''}
        `}
        style={!hovered ? { borderColor: `${card.accent}0d` } : undefined}
      />

      {/* Bottom glow */}
      <div
        className={`
          absolute -bottom-24 -left-16
          w-48 h-48 rounded-full blur-3xl
          transition-opacity duration-500
          ${hovered ? 'bg-white/10 opacity-100' : 'opacity-0'}
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
          ${hovered ? 'bg-white/20 text-white rotate-3 scale-110 shadow-lg' : ''}
        `}
        style={
          !hovered
            ? { backgroundColor: `${card.accent}1a`, color: card.accent }
            : undefined
        }
      >
        <Icon size={44} className={hovered ? 'scale-110' : ''} />

        <div
          className="
            absolute -right-2 -bottom-2
            w-8 h-8 rounded-xl
            flex items-center justify-center
            shadow-md
            transition-all duration-500
          "
          style={{
            backgroundColor: hovered ? 'white' : card.accent,
            color: hovered ? card.accent : 'white',
          }}
        >
          <Badge size={14} />
        </div>
      </div>

      {/* Text */}
      <div className="relative z-10 mt-6">
        <p
          className={`
            text-2xl font-bold transition-colors duration-300
            ${hovered ? 'text-white' : 'text-gray-800'}
          `}
        >
          {card.title}
        </p>

        <p
          className={`
            text-sm mt-2 max-w-[250px]
            leading-relaxed whitespace-pre-line
            transition-colors duration-300
            ${hovered ? 'text-white/80' : 'text-gray-400'}
          `}
        >
          {card.description}
        </p>
      </div>

      {/* Bottom action */}
      <div
        className={`
          relative z-10 mt-7
          inline-flex items-center gap-2
          text-xs font-semibold
          transition-all duration-300
          ${hovered ? 'text-white translate-x-1' : ''}
        `}
        style={!hovered ? { color: card.accent } : undefined}
      >
        เลือกเมนูนี้
        <FaArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
      </div>

    </button>
  )
}