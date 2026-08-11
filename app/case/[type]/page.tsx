'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
  cn_usage_status: string
  created_at: string
  stores: { store_code: string; store_name: string } | null
  transport_companies?: { name: string } | null
}

// เคสที่ทำค้างไว้ของร้านที่เลือก (ยังไม่ completed)
type PendingCase = {
  id: string
  case_number: string | null
  current_step: number
}

// ตั้งค่าความต่างของแต่ละเคสไว้ที่เดียว เพิ่ม/แก้ทีหลังง่าย
const CASE_CONFIG = {
  sales: {
    label: 'เซลล์',
    table: 'case1_sales_pickup',
    totalSteps: 7,
    accent: '#3B9EE8',
    hasTransport: false,
  },
  transport: {
    label: 'ขนส่ง',
    table: 'case2_transport_pickup',
    totalSteps: 12,
    accent: '#F2994A',
    hasTransport: true,
  },
} as const

type CaseType = keyof typeof CASE_CONFIG

export default function CasePage() {
  const params = useParams<{ type: string }>()
  const router = useRouter()
  const type = params.type as CaseType
  const config = CASE_CONFIG[type]

  const [tab, setTab] = useState<'form' | 'status'>('form') // ฟอร์มขึ้นก่อนเสมอ

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [myCases, setMyCases] = useState<MyCase[]>([])
  const [loadingMyCases, setLoadingMyCases] = useState(true)

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

  // เผื่อ type ใน url ไม่ถูกต้อง เช่น /case/foo
  useEffect(() => {
    if (!config) router.push('/select')
  }, [config, router])

  // อ่าน employee จาก localStorage (เก็บตอน login)
  useEffect(() => {
    const raw = localStorage.getItem('employee')
    if (!raw) {
      router.push('/login')
      return
    }
    setEmployee(JSON.parse(raw))
  }, [router])

  // ดึงเคสของตัวเองที่ยังไม่ completed มาทำ dropdown
  useEffect(() => {
    if (!config || !employee?.id) return
    setLoadingMyCases(true)
    supabase
      .from(config.table)
      .select('id, case_number, current_step, stores(store_code, store_name)')
      .eq('created_by_employee_id', employee.id)
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMyCases((data as unknown as MyCase[]) ?? [])
        setLoadingMyCases(false)
      })
  }, [config, employee])

  // โหลด store dropdown (+ transport company ถ้าจำเป็น)
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

  // โหลดรายการสถานะเมื่อสลับไปแท็บ "สถานะ"
  useEffect(() => {
    if (!config || tab !== 'status') return
    setLoadingRows(true)
    const selectStr = config.hasTransport
      ? 'id, case_number, current_step, status, cn_usage_status, created_at, stores(store_code, store_name), transport_companies(name)'
      : 'id, case_number, current_step, status, cn_usage_status, created_at, stores(store_code, store_name)'

    supabase
      .from(config.table)
      .select(selectStr)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRows((data as unknown as CaseRow[]) ?? [])
        setLoadingRows(false)
      })
  }, [tab, config])

  // พอเลือกร้านค้าปุ๊บ เช็คว่าร้านนี้มีเคสทำค้างไว้ (ยังไม่ completed) อยู่ไหม
  useEffect(() => {
    setPendingCase(null)
    if (!config || !selectedStoreId) return

    setCheckingPending(true)
    supabase
      .from(config.table)
      .select('id, case_number, current_step')
      .eq('store_id', selectedStoreId)
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setPendingCase(data ?? null)
        setCheckingPending(false)
      })
  }, [selectedStoreId, config])

  const handleSearchCaseNumber = async () => {
    if (!config || !searchNumber.trim()) return
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
    if (config.hasTransport) payload.transport_id = selectedTransportId

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

    // ไปหน้าฟอร์ม step ถัดไปของ record นี้ (ทำต่อในสเต็ปถัดไป)
    router.push(`/case/${type}/${data.id}`)
  }

  if (!config) return null

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-4 flex items-center gap-3">
        <button
          onClick={() => router.push('/select')}
          className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
        >
          ←
        </button>
        <div>
          <p className="text-xs text-gray-400">ฝั่ง</p>
          <p className="font-semibold" style={{ color: config.accent }}>
            {config.label}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-0 py-8">
        {/* Toggle */}
        <div className="flex bg-white rounded-xl border border-gray-200 p-1 mb-6 w-fit mx-auto">
          <button
            onClick={() => setTab('form')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'form' ? 'text-white' : 'text-gray-500'
            }`}
            style={tab === 'form' ? { backgroundColor: config.accent } : {}}
          >
            ฟอร์ม
          </button>
          <button
            onClick={() => setTab('status')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'status' ? 'text-white' : 'text-gray-500'
            }`}
            style={tab === 'status' ? { backgroundColor: config.accent } : {}}
          >
            สถานะ
          </button>
        </div>

        {tab === 'form' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            {/* เคสของฉันที่ทำค้างไว้ */}
            {!loadingMyCases && myCases.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  เคสของฉันที่ทำค้างไว้ ({myCases.length})
                </label>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) router.push(`/case/${type}/${e.target.value}`)
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 text-gray-800"
                  style={{ borderColor: config.accent }}
                >
                  <option value="">-- เลือกเคสเพื่อทำต่อ --</option>
                  {myCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.case_number ?? '(ไม่มีเลขเคส)'} · {c.stores?.store_name ?? '-'} · ขั้นตอน{' '}
                      {c.current_step}/{config.totalSteps}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ค้นหาเคสเก่าด้วยเลขเคส */}
      

            <p className="text-xs text-gray-400 mb-1">ขั้นตอนที่ 1 / {config.totalSteps}</p>
            <h2 className="text-lg font-semibold text-gray-800 mb-6">เลือกร้านค้า</h2>

            <label className="block text-sm font-medium text-gray-600 mb-1">รหัสร้านค้า</label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none
                         focus:ring-2 focus:ring-[#3B9EE8] focus:border-transparent text-gray-800 mb-4"
            >
              <option value="">-- เลือกรหัสร้านค้า --</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.store_code} — {s.store_name}
                </option>
              ))}
            </select>

            {selectedStore && (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3 mb-4 space-y-1">
                <p>ชื่อร้านค้า: {selectedStore.store_name}</p>
                <p>Seller code: {selectedStore.seller_code || '-'}</p>
              </div>
            )}

            {checkingPending && (
              <p className="text-xs text-gray-400 mb-4">กำลังเช็คเคสค้าง...</p>
            )}

            {pendingCase && (
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 mb-4">
                <p className="text-sm font-medium text-amber-800">
                  ⚠️ ร้านนี้มีเคสทำค้างอยู่ ({pendingCase.case_number ?? '—'})
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  อยู่ที่ขั้นตอน {pendingCase.current_step} / {config.totalSteps} — ทำต่อได้เลย ไม่ต้องสร้างเคสใหม่
                </p>
                <button
                  onClick={() => router.push(`/case/${type}/${pendingCase.id}`)}
                  className="mt-2 text-sm font-semibold text-amber-800 underline"
                >
                  ทำเคสนี้ต่อ →
                </button>
              </div>
            )}

            {config.hasTransport && (
              <>
                <label className="block text-sm font-medium text-gray-600 mb-1">ชื่อขนส่ง</label>
                <select
                  value={selectedTransportId}
                  onChange={(e) => setSelectedTransportId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none
                             focus:ring-2 focus:ring-[#F2994A] focus:border-transparent text-gray-800 mb-4"
                >
                  <option value="">-- เลือกขนส่ง --</option>
                  {transports.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {createError && (
              <p className="text-sm text-red-500 text-center bg-red-50 py-2 px-4 rounded-lg mb-4">
                {createError}
              </p>
            )}

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-3 rounded-xl text-white font-semibold transition disabled:opacity-60"
              style={{ backgroundColor: config.accent }}
            >
              {creating
                ? 'กำลังสร้างรายการ...'
                : pendingCase
                ? 'สร้างเคสใหม่แยกต่างหาก'
                : 'เริ่มทำรายการ'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loadingRows ? (
              <p className="text-center text-gray-400 py-10 text-sm">กำลังโหลด...</p>
            ) : rows.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">ยังไม่มีรายการ</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-400">
                    <th className="px-4 py-3 font-medium">เลขเคส</th>
                    <th className="px-4 py-3 font-medium">รหัสร้านค้า</th>
                    <th className="px-4 py-3 font-medium">ร้านค้า</th>
                    {config.hasTransport && <th className="px-4 py-3 font-medium">ขนส่ง</th>}
                    <th className="px-4 py-3 font-medium">ขั้นตอน</th>
                    <th className="px-4 py-3 font-medium">สถานะ CN</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => router.push(`/case/${type}/${r.id}`)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                        {r.case_number ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.stores?.store_code}</td>
                      <td className="px-4 py-3 text-gray-700">{r.stores?.store_name}</td>
                      {config.hasTransport && (
                        <td className="px-4 py-3 text-gray-700">
                          {r.transport_companies?.name ?? '-'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-700">
                        {r.current_step} / {config.totalSteps}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            r.cn_usage_status === 'มีการนำมาใช้แล้ว'
                              ? 'bg-green-50 text-green-600'
                              : 'bg-yellow-50 text-yellow-600'
                          }`}
                        >
                          {r.cn_usage_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </main>
  )
}