'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TOTAL_STEPS } from '@/lib/caseSteps'
import {
  FaArrowLeft,
  FaArrowRight,
  FaBoxOpen,
  FaBuilding,
  FaCheckCircle,
  FaClipboardList,
  FaClock,
  FaSearch,
  FaStore,
  FaTruck,
  FaPlus,
  FaTimesCircle,
  FaChevronRight,
} from 'react-icons/fa'

type Store = {
  id: string
  store_code: string
  store_name: string
  seller_code: string | null
}

type TransportCompany = {
  id: string
  name: string
}

type Employee = {
  id: string
  employee_id: string
  name: string
  role: string
}

type MyCase = {
  id: string
  case_number: string | null
  current_step: number
  stores: { store_code: string; store_name: string } | null
}

type CaseRow = {
  id: string
  case_number: string | null
  current_step: number
  status: string
  cancelled_reason: string | null
  cn_usage_status: string
  created_at: string
  created_by_employee_id?: string | null
  stores: { store_code: string; store_name: string } | null
  transport_companies?: { name: string } | null
}

type PendingCase = {
  id: string
  case_number: string | null
  current_step: number
}

const CASE_CONFIG = {
  sales: {
    label: 'เซลล์',
    table: 'case1_sales_pickup',
    totalSteps: TOTAL_STEPS.sales,
    accent: '#3B9EE8',
    hasTransport: false,
    icon: FaStore,
    description: 'รับของเสียจากร้านค้าโดยเซลล์',
  },
  transport: {
    label: 'ขนส่ง',
    table: 'case2_transport_pickup',
    totalSteps: TOTAL_STEPS.transport,
    accent: '#F2994A',
    hasTransport: true,
    icon: FaTruck,
    description: 'รับของเสียผ่านบริษัทขนส่ง',
  },
} as const

type CaseType = keyof typeof CASE_CONFIG

export default function CasePage() {
  const params = useParams<{ type: string }>()
  const router = useRouter()

  const type = params.type as CaseType
  const config = CASE_CONFIG[type]
  const Icon = config?.icon ?? FaBoxOpen

  const [tab, setTab] = useState<'form' | 'status'>('form')

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [myCases, setMyCases] = useState<MyCase[]>([])
  const [loadingMyCases, setLoadingMyCases] = useState(true)
  const [showMyCasesDropdown, setShowMyCasesDropdown] = useState(false)
  const myCasesRef = useRef<HTMLDivElement>(null)

  const [stores, setStores] = useState<Store[]>([])
  const [transports, setTransports] = useState<TransportCompany[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [selectedTransportId, setSelectedTransportId] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [rows, setRows] = useState<CaseRow[]>([])
  const [loadingRows, setLoadingRows] = useState(false)
  const [searchNumber, setSearchNumber] = useState('')

  const [pendingCase, setPendingCase] = useState<PendingCase | null>(null)
  const [checkingPending, setCheckingPending] = useState(false)

  useEffect(() => {
    if (!config) router.push('/select')
  }, [config, router])

  // อ่าน employee จาก localStorage + กัน role head เข้าหน้านี้
  // (หน้านี้คือหน้าจัดการของ sales/wh/transport/admin เท่านั้น
  // head มีหน้า /dashboard แยกต่างหากสำหรับดูภาพรวมทุกเคส)
  useEffect(() => {
    const raw = localStorage.getItem('employee')

    if (!raw) {
      router.push('/login')
      return
    }

    try {
      const emp = JSON.parse(raw)
      if (emp.role === 'head') {
        router.push('/dashboard')
        return
      }
      setEmployee(emp)
    } catch {
      localStorage.removeItem('employee')
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    if (!config || !employee?.id) return

    setLoadingMyCases(true)

    supabase
      .from(config.table)
      .select('id, case_number, current_step, stores(store_code, store_name)')
      .eq('created_by_employee_id', employee.id)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMyCases((data as unknown as MyCase[]) ?? [])
        setLoadingMyCases(false)
      })
  }, [config, employee])

  useEffect(() => {
    if (!config) return

    supabase
      .from('stores')
      .select('id, store_code, store_name, seller_code')
      .order('store_code')
      .then(({ data }) => setStores(data ?? []))

    if (config.hasTransport) {
      supabase
        .from('transport_companies')
        .select('id, name')
        .order('name')
        .then(({ data }) => setTransports(data ?? []))
    }
  }, [config])

  useEffect(() => {
    if (!config || tab !== 'status' || !employee?.id) return

    setLoadingRows(true)

    const selectStr = config.hasTransport
      ? 'id, case_number, current_step, status, cancelled_reason, cn_usage_status, created_at, created_by_employee_id, stores(store_code, store_name), transport_companies(name)'
      : 'id, case_number, current_step, status, cancelled_reason, cn_usage_status, created_at, created_by_employee_id, stores(store_code, store_name)'

    supabase
      .from(config.table)
      .select(selectStr)
      // แสดงเฉพาะเคสที่พนักงานคนนี้เป็นคนสร้างเท่านั้น
      .eq('created_by_employee_id', employee.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRows((data as unknown as CaseRow[]) ?? [])
        setLoadingRows(false)
      })
  }, [tab, config, employee])

  useEffect(() => {
    setPendingCase(null)

    if (!config || !selectedStoreId) return

    setCheckingPending(true)

    supabase
      .from(config.table)
      .select('id, case_number, current_step')
      .eq('store_id', selectedStoreId)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setPendingCase(data ?? null)
        setCheckingPending(false)
      })
  }, [selectedStoreId, config])

  // ปิด dropdown "ทำเคสต่อ" เมื่อคลิกนอกกล่อง
  useEffect(() => {
    if (!showMyCasesDropdown) return

    const handleClickOutside = (e: MouseEvent) => {
      if (myCasesRef.current && !myCasesRef.current.contains(e.target as Node)) {
        setShowMyCasesDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMyCasesDropdown])

  const handleSearchCaseNumber = async () => {
    if (!config || !searchNumber.trim()) return

    setCreateError('')

    const { data } = await supabase
      .from(config.table)
      .select('id')
      .eq('case_number', searchNumber.trim().toUpperCase())
      .maybeSingle()

    if (data) {
      router.push(`/case/${type}/${data.id}`)
    } else {
      setCreateError('ไม่พบเลขเคสนี้ครับ')
    }
  }

  const selectedStore = useMemo(
    () => stores.find((s) => s.id === selectedStoreId) ?? null,
    [stores, selectedStoreId]
  )

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === 'in_progress').length
    const completed = rows.filter((r) => r.status === 'completed').length
    const cancelled = rows.filter((r) => r.status === 'cancelled').length

    return {
      total: rows.length,
      active,
      completed,
      cancelled,
    }
  }, [rows])

  const handleCreate = async () => {
    setCreateError('')

    if (!selectedStoreId) {
      setCreateError('กรุณาเลือกร้านค้าก่อนครับ')
      return
    }

    if (config.hasTransport && !selectedTransportId) {
      setCreateError('กรุณาเลือกขนส่งก่อนครับ')
      return
    }

    setCreating(true)

    const payload: Record<string, unknown> = {
      store_id: selectedStoreId,
      created_by_employee_id: employee?.id ?? null,
    }

    if (config.hasTransport) {
      payload.transport_id = selectedTransportId
    }

    const { data, error } = await supabase
      .from(config.table)
      .insert(payload)
      .select('id')
      .single()

    setCreating(false)

    if (error || !data) {
      setCreateError('สร้างรายการไม่สำเร็จ ลองใหม่อีกครั้งครับ')
      return
    }

    router.push(`/case/${type}/${data.id}`)
  }

  if (!config) return null

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f8fc]">

      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 h-[450px] w-[450px] rounded-full blur-3xl opacity-40"
          style={{ backgroundColor: `${config.accent}18` }}
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

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
              className="
                flex h-11 w-11 items-center justify-center
                rounded-2xl text-white shadow-lg
              "
              style={{
                background: `linear-gradient(135deg, ${config.accent}, ${config.accent}cc)`,
                boxShadow: `0 10px 30px ${config.accent}30`,
              }}
            >
              <Icon size={20} />
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gray-400">
                Waste Collection
              </p>

              <h1 className="text-base font-bold text-gray-800 sm:text-lg">
                {config.label}
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
                  {employee.employee_id}
                </p>
              </div>

              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: config.accent }}
              >
                {employee.name?.charAt(0) ?? '?'}
              </div>
            </div>
          )}

        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* Hero */}
        <div className="mb-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

          <div>
            <div
              className="mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                color: config.accent,
                backgroundColor: `${config.accent}12`,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: config.accent }}
              />
              {config.description}
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-gray-800 sm:text-3xl">
              จัดการรายการรับของเสีย
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              สร้างเคสใหม่ ทำรายการต่อ หรือดูสถานะย้อนหลัง
            </p>
          </div>

          {/* Tab */}
          <div className="flex rounded-2xl border border-gray-200/80 bg-white/80 p-1.5 shadow-sm backdrop-blur">
            <button
              onClick={() => setTab('form')}
              className={`
                flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold
                transition-all duration-300
                ${tab === 'form'
                  ? 'text-white shadow-md'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'}
              `}
              style={tab === 'form' ? { backgroundColor: config.accent } : {}}
            >
              <FaPlus size={12} />
              สร้างรายการ
            </button>

            <button
              onClick={() => setTab('status')}
              className={`
                flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold
                transition-all duration-300
                ${tab === 'status'
                  ? 'text-white shadow-md'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'}
              `}
              style={tab === 'status' ? { backgroundColor: config.accent } : {}}
            >
              <FaClipboardList size={12} />
              สถานะ
            </button>
          </div>

        </div>

        {/* Stats */}
        {tab === 'status' && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">

            <StatCard
              icon={<FaClipboardList />}
              label="ทั้งหมด"
              value={stats.total}
              accent={config.accent}
            />

            <StatCard
              icon={<FaClock />}
              label="กำลังทำ"
              value={stats.active}
              accent="#3B9EE8"
            />

            <StatCard
              icon={<FaCheckCircle />}
              label="เสร็จแล้ว"
              value={stats.completed}
              accent="#22c55e"
            />

            <StatCard
              icon={<FaTimesCircle />}
              label="ยกเลิก"
              value={stats.cancelled}
              accent="#ef4444"
            />

          </div>
        )}

        {tab === 'form' ? (

          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">

            {/* Main form */}
            <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur">

              <div
                className="h-1.5 w-full"
                style={{
                  background: `linear-gradient(90deg, ${config.accent}, ${config.accent}55)`,
                }}
              />

              <div className="p-5 sm:p-7">

                {/* Continue cases */}
                {!loadingMyCases && myCases.length > 0 && (
                  <div className="mb-7">

                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          ทำเคสต่อ
                        </p>
                        <p className="text-xs text-gray-400">
                          มี {myCases.length} เคสที่คุณกำลังดำเนินการ
                        </p>
                      </div>

                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                        style={{
                          color: config.accent,
                          backgroundColor: `${config.accent}12`,
                        }}
                      >
                        {myCases.length} เคส
                      </span>
                    </div>

                    {/* Custom dropdown แทน native select */}
                    <div className="relative" ref={myCasesRef}>
                      <button
                        type="button"
                        onClick={() => setShowMyCasesDropdown((v) => !v)}
                        className={`
                          flex w-full items-center justify-between gap-3
                          rounded-2xl border bg-gray-50
                          px-4 py-3.5 text-sm text-gray-700
                          outline-none transition
                          hover:bg-white
                          ${showMyCasesDropdown
                            ? 'border-gray-300 bg-white'
                            : 'border-gray-200'}
                        `}
                      >
                        <span className="flex items-center gap-2.5 text-gray-500">
                          <FaClipboardList size={13} className="shrink-0 text-gray-300" />
                          เลือกเคสเพื่อทำต่อ
                        </span>

                        <FaChevronRight
                          className={`shrink-0 text-gray-300 transition-transform duration-200 ${
                            showMyCasesDropdown ? '-rotate-90' : 'rotate-90'
                          }`}
                          size={12}
                        />
                      </button>

                      {showMyCasesDropdown && (
                        <div
                          className="
                            absolute z-30 mt-2 w-full
                            overflow-hidden rounded-2xl border border-gray-100
                            bg-white shadow-xl shadow-gray-900/10
                          "
                        >
                          <div className="max-h-72 overflow-y-auto py-1.5">
                            {myCases.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setShowMyCasesDropdown(false)
                                  router.push(`/case/${type}/${c.id}`)
                                }}
                                className="
                                  flex w-full items-center justify-between gap-3
                                  px-4 py-3 text-left transition
                                  hover:bg-gray-50
                                "
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold text-gray-800">
                                    {c.case_number ?? '(ไม่มีเลขเคส)'}
                                  </p>
                                  <p className="mt-0.5 truncate text-[11px] text-gray-400">
                                    {c.stores?.store_name ?? '-'}
                                  </p>
                                </div>

                                <span
                                  className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
                                  style={{
                                    color: config.accent,
                                    backgroundColor: `${config.accent}12`,
                                  }}
                                >
                                  {c.current_step}/{config.totalSteps}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* Search */}
                <div className="mb-7">
                  <div className="mb-3">
                    <p className="text-sm font-bold text-gray-800">
                      ค้นหาเคส
                    </p>
                    <p className="text-xs text-gray-400">
                      ใช้เลขเคสเพื่อเปิดรายการที่มีอยู่
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <FaSearch
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
                        size={14}
                      />

                      <input
                        type="text"
                        value={searchNumber}
                        onChange={(e) => setSearchNumber(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSearchCaseNumber()
                          }
                        }}
                        placeholder="เช่น SL-202608-0001"
                        className="
                          w-full rounded-2xl border border-gray-200
                          bg-gray-50 py-3.5 pl-11 pr-4 text-sm text-gray-800
                          outline-none transition
                          focus:border-gray-300 focus:bg-white
                        "
                      />
                    </div>

                    <button
                      onClick={handleSearchCaseNumber}
                      className="
                        rounded-2xl px-5 text-sm font-bold
                        text-white shadow-sm transition
                        hover:-translate-y-0.5 hover:shadow-md
                        active:translate-y-0
                      "
                      style={{ backgroundColor: config.accent }}
                    >
                      ค้นหา
                    </button>
                  </div>
                </div>

                <div className="mb-6 border-t border-gray-100 pt-7">

                  {/* Step indicator */}
                  <div className="mb-6 flex items-center gap-3">

                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
                      style={{
                        backgroundColor: config.accent,
                        boxShadow: `0 10px 25px ${config.accent}30`,
                      }}
                    >
                      <FaStore size={19} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: config.accent }}
                        >
                          STEP 01
                        </span>

                        <span className="text-[10px] text-gray-300">
                          / {config.totalSteps}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-gray-800">
                        เลือกร้านค้า
                      </h3>

                      <p className="text-xs text-gray-400">
                        เลือกร้านค้าที่ต้องการรับของเสีย
                      </p>
                    </div>

                  </div>

                  {/* Store select */}
                  <div className="mb-5">

                    <label className="mb-2 block text-xs font-bold text-gray-600">
                      รหัสร้านค้า
                      <span className="ml-1 text-red-400">*</span>
                    </label>

                    <div className="relative">
                      <FaBuilding
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
                        size={14}
                      />

                      <select
                        value={selectedStoreId}
                        onChange={(e) => setSelectedStoreId(e.target.value)}
                        className="
                          w-full appearance-none rounded-2xl
                          border border-gray-200 bg-gray-50
                          px-4 py-4 pl-11 pr-10
                          text-sm text-gray-800 outline-none
                          transition focus:bg-white
                        "
                      >
                        <option value="">
                          -- เลือกรหัสร้านค้า --
                        </option>

                        {stores.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.store_code} — {s.store_name}
                          </option>
                        ))}
                      </select>

                      <FaChevronRight
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-300"
                        size={12}
                      />
                    </div>

                  </div>

                  {/* Selected store */}
                  {selectedStore && (
                    <div
                      className="mb-5 overflow-hidden rounded-2xl border p-4"
                      style={{
                        borderColor: `${config.accent}25`,
                        backgroundColor: `${config.accent}08`,
                      }}
                    >
                      <div className="flex items-start gap-3">

                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            color: config.accent,
                            backgroundColor: `${config.accent}15`,
                          }}
                        >
                          <FaStore size={16} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                            ร้านค้าที่เลือก
                          </p>

                          <p className="mt-0.5 truncate text-sm font-bold text-gray-800">
                            {selectedStore.store_name}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-2">
                            <span className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-gray-500">
                              {selectedStore.store_code}
                            </span>

                            <span className="rounded-md bg-white px-2 py-1 text-[10px] text-gray-400">
                              Seller: {selectedStore.seller_code || '-'}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Pending */}
                  {checkingPending && (
                    <div className="mb-5 flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
                      <span className="text-xs text-gray-400">
                        กำลังตรวจสอบเคสค้าง...
                      </span>
                    </div>
                  )}

                  {pendingCase && (
                    <div className="mb-5 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">

                      <div className="flex items-start gap-3 p-4">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                          <FaClock size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-amber-900">
                              มีเคสที่ยังดำเนินการอยู่
                            </p>

                            <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              {pendingCase.case_number ?? 'ไม่มีเลขเคส'}
                            </span>
                          </div>

                          <p className="mt-1 text-xs leading-relaxed text-amber-700">
                            เคสนี้อยู่ที่ขั้นตอน {pendingCase.current_step} /{' '}
                            {config.totalSteps} สามารถทำต่อได้เลย
                          </p>

                          <button
                            onClick={() =>
                              router.push(`/case/${type}/${pendingCase.id}`)
                            }
                            className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-amber-800 transition hover:gap-3"
                          >
                            ทำเคสนี้ต่อ
                            <FaArrowRight size={10} />
                          </button>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Transport */}
                  {config.hasTransport && (
                    <div className="mb-5">

                      <label className="mb-2 block text-xs font-bold text-gray-600">
                        บริษัทขนส่ง
                        <span className="ml-1 text-red-400">*</span>
                      </label>

                      <div className="relative">
                        <FaTruck
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
                          size={14}
                        />

                        <select
                          value={selectedTransportId}
                          onChange={(e) => setSelectedTransportId(e.target.value)}
                          className="
                            w-full appearance-none rounded-2xl
                            border border-gray-200 bg-gray-50
                            px-4 py-4 pl-11 pr-10
                            text-sm text-gray-800 outline-none
                            transition focus:bg-white
                          "
                        >
                          <option value="">
                            -- เลือกขนส่ง --
                          </option>

                          {transports.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>

                        <FaChevronRight
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-300"
                          size={12}
                        />
                      </div>

                    </div>
                  )}

                  {createError && (
                    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
                      <FaTimesCircle className="mt-0.5 shrink-0 text-red-400" />

                      <p className="text-sm font-medium text-red-600">
                        {createError}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="
                      group flex w-full items-center justify-center gap-3
                      rounded-2xl py-4
                      text-sm font-bold text-white
                      shadow-lg transition-all duration-300
                      hover:-translate-y-0.5 hover:shadow-xl
                      disabled:cursor-not-allowed disabled:opacity-60
                    "
                    style={{
                      background: `linear-gradient(135deg, ${config.accent}, ${config.accent}dd)`,
                      boxShadow: `0 15px 35px ${config.accent}30`,
                    }}
                  >
                    {creating ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        กำลังสร้างรายการ...
                      </>
                    ) : (
                      <>
                        <FaPlus size={12} />

                        {pendingCase
                          ? 'สร้างเคสใหม่แยกต่างหาก'
                          : 'เริ่มทำรายการ'}

                        <FaArrowRight
                          className="transition-transform group-hover:translate-x-1"
                          size={12}
                        />
                      </>
                    )}
                  </button>

                </div>

              </div>
            </section>

            {/* Side information */}
            <aside className="space-y-4">

              <div
                className="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl"
                style={{
                  background: `linear-gradient(145deg, ${config.accent}, ${config.accent}cc)`,
                  boxShadow: `0 25px 60px ${config.accent}25`,
                }}
              >
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full border-[25px] border-white/10" />
                <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

                <div className="relative">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                    <Icon size={22} />
                  </div>

                  <p className="text-xs font-medium text-white/70">
                    WORKFLOW
                  </p>

                  <h3 className="mt-1 text-xl font-bold">
                    {config.label}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-white/75">
                    กระบวนการรับของเสียทั้งหมด {config.totalSteps} ขั้นตอน
                    ตั้งแต่เลือกร้านค้าจนถึงการปิดเคส
                  </p>

                  <div className="mt-5 flex items-center gap-2">
                    {Array.from({ length: config.totalSteps }).map((_, i) => (
                      <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full bg-white/20"
                      />
                    ))}
                  </div>

                  <p className="mt-2 text-[10px] text-white/60">
                    STEP 01 → STEP {String(config.totalSteps).padStart(2, '0')}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200/70 bg-white/80 p-5 shadow-sm backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                    <FaClipboardList size={15} />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      คำแนะนำ
                    </p>
                    <p className="text-xs text-gray-400">
                      ก่อนเริ่มรายการ
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">

                  {[
                    'ตรวจสอบร้านค้าให้ถูกต้อง',
                    'หากมีเคสค้าง ให้ทำเคสเดิมต่อ',
                    'เตรียมรูปภาพหรือเอกสารที่เกี่ยวข้อง',
                  ].map((text, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3"
                    >
                      <div
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                        style={{ backgroundColor: config.accent }}
                      >
                        {index + 1}
                      </div>

                      <p className="text-xs leading-relaxed text-gray-500">
                        {text}
                      </p>
                    </div>
                  ))}

                </div>
              </div>

            </aside>

          </div>

        ) : (

          <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur">

            <div className="border-b border-gray-100 px-5 py-5 sm:px-7">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    รายการทั้งหมด
                  </h3>

                  <p className="mt-1 text-xs text-gray-400">
                    คลิกที่รายการเพื่อเปิดรายละเอียดและดำเนินการต่อ
                  </p>
                </div>

                <div
                  className="hidden h-11 w-11 items-center justify-center rounded-2xl sm:flex"
                  style={{
                    color: config.accent,
                    backgroundColor: `${config.accent}10`,
                  }}
                >
                  <ClipboardIcon />
                </div>
              </div>
            </div>

            {loadingRows ? (

              <div className="space-y-3 p-5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-2xl border border-gray-100 p-5"
                  >
                    <div className="h-4 w-32 rounded bg-gray-100" />
                    <div className="mt-3 h-3 w-56 rounded bg-gray-100" />
                    <div className="mt-4 h-2 w-full rounded bg-gray-100" />
                  </div>
                ))}
              </div>

            ) : rows.length === 0 ? (

              <div className="px-6 py-16 text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-50 text-gray-300">
                  <FaClipboardList size={25} />
                </div>

                <p className="mt-4 text-sm font-semibold text-gray-600">
                  ยังไม่มีรายการ
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  เมื่อสร้างเคส รายการจะแสดงที่นี่
                </p>

              </div>

            ) : (

              <div className="divide-y divide-gray-100">

                {rows.map((r) => (
                  <CaseCard
                    key={r.id}
                    row={r}
                    config={config}
                    onClick={() => router.push(`/case/${type}/${r.id}`)}
                  />
                ))}

              </div>

            )}

          </section>

        )}

      </div>

    </main>
  )
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            color: accent,
            backgroundColor: `${accent}12`,
          }}
        >
          {icon}
        </div>

        <span className="text-xl font-bold text-gray-800">
          {value}
        </span>
      </div>

      <p className="mt-3 text-[11px] font-medium text-gray-400">
        {label}
      </p>
    </div>
  )
}

function ClipboardIcon() {
  return <FaClipboardList size={18} />
}

function CaseCard({
  row,
  config,
  onClick,
}: {
  row: CaseRow
  config: (typeof CASE_CONFIG)[CaseType]
  onClick: () => void
}) {
  const isCancelled = row.status === 'cancelled'
  const isCompleted = row.status === 'completed'

  const progress = Math.min(
    100,
    Math.max(0, (row.current_step / config.totalSteps) * 100)
  )

  const statusConfig = isCancelled
    ? {
        label: 'ยกเลิก',
        bg: 'bg-red-50',
        text: 'text-red-500',
        icon: <FaTimesCircle />,
      }
    : isCompleted
      ? {
          label: 'เสร็จสิ้น',
          bg: 'bg-emerald-50',
          text: 'text-emerald-600',
          icon: <FaCheckCircle />,
        }
      : {
          label: 'กำลังทำ',
          bg: 'bg-blue-50',
          text: 'text-blue-600',
          icon: <FaClock />,
        }

  return (
    <button
      onClick={onClick}
      className={`
        group w-full text-left
        p-5 sm:p-6
        transition-all duration-300
        hover:bg-gray-50/80
        ${isCancelled ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-start gap-4">

        <div
          className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:flex"
          style={{
            color: config.accent,
            backgroundColor: `${config.accent}10`,
          }}
        >
          <FaBoxOpen size={18} />
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-gray-700">
              {row.case_number ?? '-'}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusConfig.bg} ${statusConfig.text}`}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-bold text-gray-800">
              {row.stores?.store_name ?? '-'}
            </span>

            <span className="text-xs text-gray-400">
              {row.stores?.store_code ?? '-'}
            </span>

            {config.hasTransport && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <FaTruck size={9} />
                {row.transport_companies?.name ?? '-'}
              </span>
            )}
          </div>

          <div className="mt-4">

            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-medium text-gray-400">
                ความคืบหน้า
              </span>

              <span
                className="text-[10px] font-bold"
                style={{ color: config.accent }}
              >
                ขั้นตอน {row.current_step}/{config.totalSteps}
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  backgroundColor: isCancelled
                    ? '#ef4444'
                    : isCompleted
                      ? '#22c55e'
                      : config.accent,
                }}
              />
            </div>

          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">

            <span className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-[10px] text-gray-400">
              CN:{' '}
              <span className="font-semibold text-gray-600">
                {row.cn_usage_status || 'ยังไม่มีข้อมูล'}
              </span>
            </span>

            {isCancelled && row.cancelled_reason && (
              <span className="truncate rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] text-red-400">
                เหตุผล: {row.cancelled_reason}
              </span>
            )}

          </div>

        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-300 transition-all group-hover:translate-x-1 group-hover:bg-white group-hover:text-gray-500">
          <FaChevronRight size={12} />
        </div>

      </div>
    </button>
  )
}