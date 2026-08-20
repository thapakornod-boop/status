'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  CaseType,
  TABLE_BY_TYPE,
  ACCENT_BY_TYPE,
  TYPE_LABEL,
  TOTAL_STEPS,
  STEPS,
  EmployeeRole,
  ROLE_LABEL,
  getQueueStepNumbers,
} from '@/lib/caseSteps'
import {
  FaArrowLeft,
  FaBoxOpen,
  FaChevronRight,
  FaClock,
  FaSearch,
  FaWarehouse,
  FaFileInvoice,
  FaCheckCircle,
  FaClipboardList,
} from 'react-icons/fa'

type QueueRole = 'wh' | 'admin'

type Employee = {
  id: string
  employee_id: string
  name: string
  role: EmployeeRole
}

type QueueRow = {
  id: string
  case_number: string | null
  current_step: number
  created_at: string
  stores: { store_code: string; store_name: string } | null
}

type IconType = ComponentType<{ size?: number; className?: string }>

const ROLE_ICON: Record<QueueRole, IconType> = {
  wh: FaWarehouse,
  admin: FaFileInvoice,
}

const ROLE_TITLE: Record<QueueRole, string> = {
  wh: 'คิวงานคลัง',
  admin: 'คิวออก CN',
}

const ROLE_EMPTY_TEXT: Record<QueueRole, string> = {
  wh: 'เมื่อมีเคสมาถึงขั้นตอนนับสินค้ากระทบ SRN รายการจะแสดงที่นี่',
  admin: 'เมื่อมีเคสมาถึงขั้นตอนออก CN รายการจะแสดงที่นี่',
}

export default function RoleQueue({ role }: { role: QueueRole }) {
  const params = useParams<{ type: string }>()
  const router = useRouter()

  const type = params.type as CaseType
  const table = TABLE_BY_TYPE[type]
  const accent = ACCENT_BY_TYPE[type]
  const totalSteps = TOTAL_STEPS[type]
  const RoleIcon = ROLE_ICON[role]

  // step number ที่ role นี้รับผิดชอบ สำหรับ case type นี้ (มาจาก caseSteps.ts จุดเดียว)
  const targetStep = useMemo(() => {
    const steps = type ? getQueueStepNumbers(type, role) : []
    return steps[0] ?? null
  }, [type, role])

  const stepDef =
    type && targetStep ? STEPS[type][targetStep - 2] : null

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [rows, setRows] = useState<QueueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const raw = localStorage.getItem('employee')

    if (!raw) {
      router.push('/login')
      return
    }

    try {
      setEmployee(JSON.parse(raw))
    } catch {
      localStorage.removeItem('employee')
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    if (!table || !targetStep) return

    setLoading(true)

    supabase
      .from(table)
      .select(
        'id, case_number, current_step, created_at, stores(store_code, store_name)'
      )
      .eq('status', 'in_progress')
      .eq('current_step', targetStep)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setRows((data as unknown as QueueRow[]) ?? [])
        setLoading(false)
      })
  }, [table, targetStep])

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows

    const q = search.trim().toLowerCase()

    return rows.filter(
      (r) =>
        r.case_number?.toLowerCase().includes(q) ||
        r.stores?.store_name?.toLowerCase().includes(q) ||
        r.stores?.store_code?.toLowerCase().includes(q)
    )
  }, [rows, search])

  if (!table || !targetStep) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8fc] px-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-600">
            ไม่พบขั้นตอนสำหรับบทบาทนี้ในเคสประเภทนี้
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f8fc]">

      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 h-[450px] w-[450px] rounded-full blur-3xl opacity-40"
          style={{ backgroundColor: `${accent}18` }}
        />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-slate-200/40 blur-3xl" />
        <div
          className="
            absolute inset-0 opacity-[0.025]
            [background-image:linear-gradient(#64748b_1px,transparent_1px),linear-gradient(90deg,#64748b_1px,transparent_1px)]
            [background-size:40px_40px]
          "
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/select')}
              className="
                flex h-10 w-10 items-center justify-center
                rounded-xl border border-gray-200
                bg-white text-gray-500
                shadow-sm transition
                hover:-translate-x-0.5 hover:border-gray-300 hover:text-gray-800
              "
            >
              <FaArrowLeft size={14} />
            </button>

            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                boxShadow: `0 10px 30px ${accent}30`,
              }}
            >
              <RoleIcon size={19} />
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gray-400">
                {ROLE_TITLE[role]} · {TYPE_LABEL[type]}
              </p>
              <h1 className="text-base font-bold text-gray-800 sm:text-lg">
                {stepDef?.title ?? '-'}
              </h1>
            </div>
          </div>

          {employee && (
            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-700">
                  {employee.name}
                </p>
                <p className="text-[10px] text-gray-400">
                  {ROLE_LABEL[employee.role]}
                </p>
              </div>

              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {employee.name?.charAt(0) ?? '?'}
              </div>
            </div>
          )}

        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* Hero */}
        <div className="mb-6">
          <div
            className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ color: accent, backgroundColor: `${accent}12` }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: accent }}
            />
            รอดำเนินการที่ขั้นตอนที่ {targetStep} / {totalSteps}
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-gray-800 sm:text-3xl">
            {ROLE_TITLE[role]} — {TYPE_LABEL[type]}
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            เลือกเคสที่ต้องดำเนินการต่อ ระบบจะพาไปหน้ากรอกข้อมูลของขั้นตอนนี้
          </p>
        </div>

        {/* Search */}
        <div className="mb-5 flex gap-2">
          <div className="relative flex-1">
            <FaSearch
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
              size={14}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาด้วยเลขเคส หรือชื่อร้านค้า"
              className="
                w-full rounded-2xl border border-gray-200
                bg-white py-3.5 pl-11 pr-4 text-sm text-gray-800
                shadow-sm outline-none transition
                focus:border-gray-300
              "
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-xs font-bold text-gray-500 shadow-sm">
            <FaClipboardList size={12} />
            {filteredRows.length} เคส
          </div>
        </div>

        {/* List */}
        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur">

          {loading ? (

            <div className="space-y-3 p-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-gray-100 p-5">
                  <div className="h-4 w-32 rounded bg-gray-100" />
                  <div className="mt-3 h-3 w-56 rounded bg-gray-100" />
                </div>
              ))}
            </div>

          ) : filteredRows.length === 0 ? (

            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-50 text-gray-300">
                <FaCheckCircle size={25} />
              </div>

              <p className="mt-4 text-sm font-semibold text-gray-600">
                ไม่มีเคสรอดำเนินการ
              </p>

              <p className="mt-1 text-xs text-gray-400">
                {ROLE_EMPTY_TEXT[role]}
              </p>
            </div>

          ) : (

            <div className="divide-y divide-gray-100">
              {filteredRows.map((r) => (
                <button
                  key={r.id}
                  onClick={() => router.push(`/case/${type}/${r.id}`)}
                  className="
                    group flex w-full items-center gap-4
                    p-5 text-left transition-all duration-300
                    hover:bg-gray-50/80
                    sm:p-6
                  "
                >
                  <div
                    className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:flex"
                    style={{ color: accent, backgroundColor: `${accent}10` }}
                  >
                    <FaBoxOpen size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-700">
                        {r.case_number ?? '-'}
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600">
                        <FaClock size={9} />
                        รอดำเนินการ
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-sm font-bold text-gray-800">
                        {r.stores?.store_name ?? '-'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {r.stores?.store_code ?? '-'}
                      </span>
                    </div>
                  </div>

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-300 transition-all group-hover:translate-x-1 group-hover:bg-white group-hover:text-gray-500">
                    <FaChevronRight size={12} />
                  </div>
                </button>
              ))}
            </div>

          )}

        </section>

      </div>

    </main>
  )
}