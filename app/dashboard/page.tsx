'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CaseProgressBar from '@/components/CaseProgressBar'

import {
  TABLE_BY_TYPE,
  ITEMS_TABLE_BY_TYPE,
  TYPE_LABEL,
  STEPS,
  CaseType,
  EmployeeRole,
  FieldDef,
} from '@/lib/caseSteps'

// ============================================================
// DESIGN TOKENS
// ============================================================

const C = {
  primary: '#6366F1',
  primaryHover: '#4F46E5',

  sales: '#3B9EE8',
  transport: '#F2994A',

  neutral: '#9CA3AF',

  bg: '#F6F7FB',
  surface: '#FFFFFF',

  textPrimary: '#111827',
  textSecondary: '#6B7280',

  border: '#E5E7EB',

  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
}

const displayFont = {
  fontFamily: "'General Sans', sans-serif",
}

const bodyFont = {
  fontFamily: "'DM Sans', sans-serif",
}

// ============================================================
// TYPES
// ============================================================

type Employee = {
  id: string
  employee_id: string
  name: string
  role: EmployeeRole
}

type CaseRow = {
  id: string
  type: CaseType
  case_number: string | null
  current_step: number
  status: string
  cn_usage_status: string
  created_at: string
  cancelled_reason: string | null

  store_code: string
  store_name: string

  seller_code: string | null
  transport_name: string | null
  creator_name: string | null
}

type ItemRow = {
  item_code: string
  amount: number
}

type FilterTab =
  | 'all'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

// ============================================================
// STATUS
// ============================================================

const STATUS_CHIP: Record<
  string,
  {
    label: string
    bg: string
    text: string
    dot: string
  }
> = {
  in_progress: {
    label: 'กำลังทำ',
    bg: '#EEF2FF',
    text: C.primary,
    dot: C.primary,
  },

  completed: {
    label: 'สำเร็จ',
    bg: '#ECFDF5',
    text: C.success,
    dot: C.success,
  },

  cancelled: {
    label: 'ยกเลิก',
    bg: '#FEF2F2',
    text: C.error,
    dot: C.error,
  },
}

// ============================================================
// DATE
// ============================================================

function formatDate(iso: string) {
  const d = new Date(iso)

  return (
    d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    }) +
    ' ' +
    d.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    })
  )
}

// ============================================================
// FIELD VALUE
// ============================================================

function FieldValue({
  field,
  value,
}: {
  field: FieldDef
  value: any
}) {
  if (
    field.type === 'photo' ||
    field.type === 'signature'
  ) {
    if (!value) {
      return (
        <div
          className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-3"
          style={{
            borderColor: C.border,
            backgroundColor: '#FAFAFA',
          }}
        >
          <span className="text-sm">🖼️</span>

          <p
            className="text-xs"
            style={{
              color: C.neutral,
              ...bodyFont,
            }}
          >
            ยังไม่มีรูป
          </p>
        </div>
      )
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={value}
        alt={field.label}
        className="w-full max-w-[260px] rounded-xl border object-cover shadow-sm"
        style={{
          borderColor: C.border,
        }}
      />
    )
  }

  if (field.type === 'checkbox') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{
          backgroundColor: value
            ? '#ECFDF5'
            : '#F3F4F6',

          color: value
            ? C.success
            : C.neutral,

          ...bodyFont,
        }}
      >
        <span>{value ? '✓' : '○'}</span>

        {value
          ? 'ยืนยันแล้ว'
          : 'ยังไม่ยืนยัน'}
      </span>
    )
  }

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return (
      <p
        className="text-sm"
        style={{
          color: C.neutral,
          ...bodyFont,
        }}
      >
        -
      </p>
    )
  }

  return (
    <p
      className="break-words text-sm leading-6"
      style={{
        color: C.textPrimary,
        ...bodyFont,
      }}
    >
      {String(value)}
    </p>
  )
}

// ============================================================
// ICON-LIKE COMPONENTS
// ============================================================

function SalesIcon() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sm">
      👤
    </div>
  )
}

function TransportIcon() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-sm">
      🚚
    </div>
  )
}

// ============================================================
// DASHBOARD
// ============================================================

export default function DashboardPage() {
  const router = useRouter()

  const [employee, setEmployee] =
    useState<Employee | null>(null)

  const [rows, setRows] =
    useState<CaseRow[]>([])

  const [loading, setLoading] =
    useState(true)

  const [selectedId, setSelectedId] =
    useState('')

  const [tab, setTab] =
    useState<FilterTab>('in_progress')

  const [search, setSearch] =
    useState('')

  const [selectedDetail, setSelectedDetail] =
    useState<Record<string, any> | null>(null)

  const [selectedItems, setSelectedItems] =
    useState<ItemRow[]>([])

  const [loadingDetail, setLoadingDetail] =
    useState(false)

  // ============================================================
  // CHECK AUTH
  // ============================================================

  useEffect(() => {
    const raw =
      localStorage.getItem('employee')

    if (!raw) {
      router.push('/login')
      return
    }

    const emp: Employee =
      JSON.parse(raw)

    if (emp.role !== 'head') {
      router.push('/select')
      return
    }

    setEmployee(emp)
  }, [router])

  // ============================================================
  // LOAD CASES
  // ============================================================

  useEffect(() => {
    if (!employee) return

    const load = async () => {
      setLoading(true)

      const types: CaseType[] = [
        'sales',
        'transport',
      ]

      const all: CaseRow[] = []

      for (const type of types) {
        const selectStr =
          type === 'transport'
            ? 'id, case_number, current_step, status, cn_usage_status, created_at, cancelled_reason, stores(store_code, store_name, seller_code), transport_companies(name), employees:created_by_employee_id(name)'
            : 'id, case_number, current_step, status, cn_usage_status, created_at, cancelled_reason, stores(store_code, store_name, seller_code), employees:created_by_employee_id(name)'

        const {
          data,
          error,
        } = await supabase
          .from(TABLE_BY_TYPE[type])
          .select(selectStr)
          .order('created_at', {
            ascending: false,
          })

        if (error) {
          console.error(
            `โหลด ${type} ไม่สำเร็จ:`,
            error
          )
        }

        for (const r of
          (data as any[]) ?? []) {
          all.push({
            id: r.id,
            type,

            case_number:
              r.case_number,

            current_step:
              r.current_step,

            status:
              r.status,

            cn_usage_status:
              r.cn_usage_status,

            created_at:
              r.created_at,

            cancelled_reason:
              r.cancelled_reason,

            store_code:
              r.stores?.store_code ?? '-',

            store_name:
              r.stores?.store_name ?? '-',

            seller_code:
              r.stores?.seller_code ?? null,

            transport_name:
              r.transport_companies?.name ??
              null,

            creator_name:
              r.employees?.name ?? null,
          })
        }
      }

      all.sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      )

      setRows(all)
      setLoading(false)
    }

    load()
  }, [employee])

  // ============================================================
  // LOAD SELECTED DETAIL
  // ============================================================

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null)
      setSelectedItems([])
      return
    }

    const row = rows.find(
      (r) => r.id === selectedId
    )

    if (!row) return

    const load = async () => {
      setLoadingDetail(true)

      const {
        data,
      } = await supabase
        .from(TABLE_BY_TYPE[row.type])
        .select('*')
        .eq('id', selectedId)
        .single()

      setSelectedDetail(
        data ?? null
      )

      const {
        data: items,
      } = await supabase
        .from(ITEMS_TABLE_BY_TYPE[row.type])
        .select(
          'item_code, amount'
        )
        .eq(
          'case_id',
          selectedId
        )

      setSelectedItems(
        items ?? []
      )

      setLoadingDetail(false)
    }

    load()
  }, [selectedId, rows])

  // ============================================================
  // SUMMARY
  // ============================================================

  const summary = useMemo(() => {
    return {
      total: rows.length,

      completed:
        rows.filter(
          (r) =>
            r.status ===
            'completed'
        ).length,

      cancelled:
        rows.filter(
          (r) =>
            r.status ===
            'cancelled'
        ).length,

      inProgress:
        rows.filter(
          (r) =>
            r.status ===
            'in_progress'
        ).length,

      salesCount:
        rows.filter(
          (r) =>
            r.type === 'sales'
        ).length,

      transportCount:
        rows.filter(
          (r) =>
            r.type === 'transport'
        ).length,
    }
  }, [rows])

  // ============================================================
  // FILTER
  // ============================================================

  const filteredRows =
    useMemo(() => {
      return rows.filter((r) => {
        if (
          tab !== 'all' &&
          r.status !== tab
        ) {
          return false
        }

        if (search.trim()) {
          const q =
            search
              .trim()
              .toLowerCase()

          const hay =
            `${r.case_number ?? ''} ${r.store_code} ${r.store_name} ${r.creator_name ?? ''}`.toLowerCase()

          if (
            !hay.includes(q)
          ) {
            return false
          }
        }

        return true
      })
    }, [rows, tab, search])

  // ============================================================
  // SELECTED ROW
  // ============================================================

  const selectedRow =
    useMemo(
      () =>
        rows.find(
          (r) =>
            r.id === selectedId
        ) ?? null,
      [rows, selectedId]
    )

  // ============================================================
  // LOADING AUTH
  // ============================================================

  if (!employee) {
    return null
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      {/* Fonts */}
      <link
        rel="stylesheet"
        href="https://api.fontshare.com/v2/css?f[]=general-sans@500,600,700&display=swap"
      />

      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
      />

      <main
        className="min-h-screen"
        style={{
          backgroundColor: C.bg,
          ...bodyFont,
        }}
      >

        {/* =====================================================
            TOP NAV
        ===================================================== */}

        <header
          className="sticky top-0 z-30 border-b backdrop-blur-xl"
          style={{
            backgroundColor:
              'rgba(255,255,255,0.88)',
            borderColor: C.border,
          }}
        >
          <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">

            <div className="flex items-center gap-3">

              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-lg"
                style={{
                  background:
                    `linear-gradient(135deg, ${C.primary}, #818CF8)`,
                  boxShadow:
                    `0 8px 20px ${C.primary}25`,
                }}
              >
                C
              </div>

              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{
                    color: C.neutral,
                  }}
                >
                  Case Management
                </p>

                <p
                  className="text-sm font-bold"
                  style={{
                    color:
                      C.textPrimary,
                    ...displayFont,
                  }}
                >
                  Head Dashboard
                </p>
              </div>

            </div>

            <div className="flex items-center gap-3">

              <div className="hidden text-right sm:block">
                <p className="text-[10px] text-gray-400">
                  Signed in as
                </p>

                <p className="text-xs font-semibold text-gray-700">
                  {employee.name}
                </p>
              </div>

              <div
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white text-xs font-bold shadow-sm"
                style={{
                  borderColor:
                    `${C.primary}20`,
                  color: C.primary,
                }}
              >
                {employee.name
                  ?.charAt(0)
                  ?.toUpperCase()}
              </div>

            </div>

          </div>
        </header>

        {/* =====================================================
            MAIN
        ===================================================== */}

        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

          {/* Page title */}

          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">

            <div>
              <p
                className="mb-1 text-xs font-semibold uppercase tracking-[0.18em]"
                style={{
                  color: C.primary,
                }}
              >
                Overview
              </p>

              <h1
                className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
                style={displayFont}
              >
                จัดการเคสทั้งหมด
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                ตรวจสอบสถานะและรายละเอียดของทุกเคสในระบบ
              </p>
            </div>

            <div
              className="inline-flex w-fit items-center gap-2 rounded-full border bg-white px-3 py-2 text-xs font-medium shadow-sm"
              style={{
                borderColor: C.border,
              }}
            >
              <span
                className="h-2 w-2 animate-pulse rounded-full"
                style={{
                  backgroundColor:
                    C.success,
                }}
              />

              ระบบทำงานปกติ
            </div>

          </div>

          {/* ===================================================
              SUMMARY CARDS
          =================================================== */}

          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">

            {[
              {
                label: 'เคสทั้งหมด',
                value: summary.total,
                icon: '▦',
                color: C.primary,
                bg: '#EEF2FF',
              },

              {
                label: 'กำลังดำเนินการ',
                value:
                  summary.inProgress,
                icon: '◉',
                color: C.primary,
                bg: '#EEF2FF',
              },

              {
                label: 'สำเร็จ',
                value:
                  summary.completed,
                icon: '✓',
                color: C.success,
                bg: '#ECFDF5',
              },

              {
                label: 'ยกเลิก',
                value:
                  summary.cancelled,
                icon: '×',
                color: C.error,
                bg: '#FEF2F2',
              },
            ].map((s) => (
              <div
                key={s.label}
                className="group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-5"
                style={{
                  borderColor:
                    C.border,
                }}
              >

                <div className="flex items-start justify-between">

                  <div>
                    <p className="text-xs font-medium text-gray-400">
                      {s.label}
                    </p>

                    <p
                      className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
                      style={{
                        color: s.color,
                        ...displayFont,
                      }}
                    >
                      {s.value.toLocaleString()}
                    </p>
                  </div>

                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
                    style={{
                      backgroundColor:
                        s.bg,
                      color:
                        s.color,
                    }}
                  >
                    {s.icon}
                  </div>

                </div>

                <div
                  className="absolute bottom-0 left-0 h-0.5 w-0 transition-all duration-500 group-hover:w-full"
                  style={{
                    backgroundColor:
                      s.color,
                  }}
                />

              </div>
            ))}

          </div>

          {/* Type count */}

          <div className="mb-7 flex flex-wrap gap-3">

            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs text-gray-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    C.sales,
                }}
              />

              Sales

              <strong className="text-gray-800">
                {summary.salesCount}
              </strong>
              เคส
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs text-gray-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    C.transport,
                }}
              />

              Transport

              <strong className="text-gray-800">
                {summary.transportCount}
              </strong>
              เคส
            </div>

          </div>

          {/* ===================================================
              MAIN GRID
          =================================================== */}

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_500px]">

            {/* =================================================
                LEFT CASE LIST
            ================================================= */}

            <section
              className="overflow-hidden rounded-2xl border bg-white shadow-sm"
              style={{
                borderColor:
                  C.border,
              }}
            >

              {/* Search header */}

              <div
                className="border-b p-4 sm:p-5"
                style={{
                  borderColor:
                    C.border,
                }}
              >

                <div className="flex flex-col gap-3">

                  <div className="relative">

                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      ⌕
                    </span>

                    <input
                      type="text"
                      value={search}
                      onChange={(e) =>
                        setSearch(
                          e.target.value
                        )
                      }
                      placeholder="ค้นหาเลขเคส / ร้านค้า / ชื่อเซลล์"
                      className="w-full rounded-xl border bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-gray-400 focus:bg-white"
                      style={{
                        borderColor:
                          C.border,
                        ...bodyFont,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor =
                          C.primary

                        e.currentTarget.style.boxShadow =
                          `0 0 0 4px ${C.primary}12`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor =
                          C.border

                        e.currentTarget.style.boxShadow =
                          'none'
                      }}
                    />

                    {search && (
                      <button
                        type="button"
                        onClick={() =>
                          setSearch('')
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        ×
                      </button>
                    )}

                  </div>

                  {/* Tabs */}

                  <div className="flex overflow-x-auto rounded-xl bg-gray-100 p-1">

                    {(
                      [
                        [
                          'in_progress',
                          'กำลังทำ',
                        ],
                        [
                          'completed',
                          'สำเร็จ',
                        ],
                        [
                          'cancelled',
                          'ยกเลิก',
                        ],
                        [
                          'all',
                          'ทั้งหมด',
                        ],
                      ] as [
                        FilterTab,
                        string
                      ][]
                    ).map(
                      ([
                        key,
                        label,
                      ]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setTab(key)
                          }
                          className="relative flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                          style={{
                            backgroundColor:
                              tab === key
                                ? '#FFFFFF'
                                : 'transparent',

                            color:
                              tab === key
                                ? C.textPrimary
                                : C.textSecondary,

                            boxShadow:
                              tab === key
                                ? '0 1px 4px rgba(0,0,0,0.08)'
                                : 'none',
                          }}
                        >
                          {label}

                          {tab ===
                            key && (
                            <span
                              className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full"
                              style={{
                                backgroundColor:
                                  C.primary,
                              }}
                            />
                          )}
                        </button>
                      )
                    )}

                  </div>

                </div>

              </div>

              {/* List header */}

              <div className="flex items-center justify-between border-b bg-gray-50/70 px-4 py-2.5 sm:px-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Case List
                </p>

                <p className="text-xs font-medium text-gray-400">
                  {filteredRows.length.toLocaleString()}{' '}
                  รายการ
                </p>
              </div>

              {/* Case list */}

              <div className="max-h-[720px] overflow-y-auto">

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">

                    <div
                      className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-500"
                    />

                    <p className="mt-3 text-xs text-gray-400">
                      กำลังโหลดข้อมูล...
                    </p>

                  </div>
                ) : filteredRows.length ===
                  0 ? (
                  <div className="flex flex-col items-center justify-center px-5 py-20 text-center">

                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-xl">
                      🔍
                    </div>

                    <p className="text-sm font-semibold text-gray-700">
                      ไม่พบรายการ
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      ลองเปลี่ยนคำค้นหาหรือ filter
                    </p>

                  </div>
                ) : (
                  filteredRows.map(
                    (r) => {
                      const chip =
                        STATUS_CHIP[
                          r.status
                        ] ??
                        STATUS_CHIP.in_progress

                      const isSelected =
                        r.id ===
                        selectedId

                      const typeColor =
                        r.type ===
                        'sales'
                          ? C.sales
                          : C.transport

                      return (
                        <button
                          key={`${r.type}-${r.id}`}
                          type="button"
                          onClick={() =>
                            setSelectedId(
                              r.id
                            )
                          }
                          className="group relative w-full border-b px-4 py-4 text-left transition-all duration-200 last:border-b-0 sm:px-5"
                          style={{
                            backgroundColor:
                              isSelected
                                ? `${typeColor}06`
                                : '#FFFFFF',
                            borderColor:
                              '#F0F1F3',
                          }}
                          onMouseEnter={(
                            e
                          ) => {
                            if (
                              !isSelected
                            ) {
                              e.currentTarget.style.backgroundColor =
                                '#FAFAFC'
                            }
                          }}
                          onMouseLeave={(
                            e
                          ) => {
                            if (
                              !isSelected
                            ) {
                              e.currentTarget.style.backgroundColor =
                                '#FFFFFF'
                            }
                          }}
                        >

                          {/* Selected indicator */}

                          <span
                            className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full transition-opacity"
                            style={{
                              backgroundColor:
                                typeColor,
                              opacity:
                                isSelected
                                  ? 1
                                  : 0,
                            }}
                          />

                          <div className="flex items-start gap-3">

                            {/* Type icon */}

                            {r.type ===
                            'sales' ? (
                              <SalesIcon />
                            ) : (
                              <TransportIcon />
                            )}

                            {/* Main */}

                            <div className="min-w-0 flex-1">

                              <div className="flex flex-wrap items-center gap-2">

                                <span
                                  className="rounded-full px-2 py-1 text-[9px] font-bold"
                                  style={{
                                    backgroundColor:
                                      `${typeColor}12`,
                                    color:
                                      typeColor,
                                  }}
                                >
                                  {
                                    TYPE_LABEL[
                                      r.type
                                    ]
                                  }
                                </span>

                                <span
                                  className="truncate font-mono text-[11px] font-medium"
                                  style={{
                                    color:
                                      C.neutral,
                                  }}
                                >
                                  {r.case_number ??
                                    '-'}
                                </span>

                              </div>

                              <p className="mt-2 truncate text-sm font-bold text-gray-800">
                                {r.store_code}{' '}
                                <span className="font-normal text-gray-300">
                                  ·
                                </span>{' '}
                                {r.store_name}
                              </p>

                              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-400">

                                <span>
                                  👤{' '}
                                  {r.creator_name ??
                                    'ไม่ทราบ'}
                                </span>

                                <span className="text-gray-200">
                                  •
                                </span>

                                <span>
                                  {formatDate(
                                    r.created_at
                                  )}
                                </span>

                              </div>

                              {r.transport_name && (
                                <div className="mt-1.5 text-[10px] font-medium text-orange-500">
                                  🚚{' '}
                                  {r.transport_name}
                                </div>
                              )}

                            </div>

                            {/* Right */}

                            <div className="flex shrink-0 flex-col items-end gap-2">

                              <span
                                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
                                style={{
                                  backgroundColor:
                                    chip.bg,
                                  color:
                                    chip.text,
                                }}
                              >
                                <span
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      chip.dot,
                                  }}
                                />

                                {
                                  chip.label
                                }
                              </span>

                              <span className="text-[10px] font-medium text-gray-400">
                                Step{' '}
                                {
                                  r.current_step
                                }
                                /7
                              </span>

                            </div>

                          </div>

                        </button>
                      )
                    }
                  )
                )}

              </div>

            </section>

            {/* =================================================
                RIGHT DETAIL
            ================================================= */}

            <section className="xl:sticky xl:top-20">

              {!selectedRow ? (
                <div
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                  style={{
                    borderColor:
                      C.border,
                  }}
                >

                  <div className="flex min-h-[480px] flex-col items-center justify-center px-8 text-center">

                    <div className="relative mb-5">

                      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-3xl">
                        📋
                      </div>

                      <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-indigo-500 text-xs text-white shadow-sm">
                        →
                      </div>

                    </div>

                    <p className="text-base font-bold text-gray-800">
                      เลือกเคสเพื่อดูรายละเอียด
                    </p>

                    <p className="mt-1 max-w-xs text-xs leading-5 text-gray-400">
                      เลือกรายการจากทางซ้ายเพื่อดูข้อมูลร้านค้า สถานะ และความคืบหน้าของแต่ละขั้นตอน
                    </p>

                  </div>

                </div>
              ) : (
                <div
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                  style={{
                    borderColor:
                      C.border,
                  }}
                >

                  {/* ===========================================
                      DETAIL HEADER
                  =========================================== */}

                  <div className="border-b px-5 py-5 sm:px-6">
                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <span
                            className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                            style={{
                              backgroundColor:
                                selectedRow.type ===
                                'sales'
                                  ? '#EFF8FF'
                                  : '#FFF7ED',

                              color:
                                selectedRow.type ===
                                'sales'
                                  ? C.sales
                                  : C.transport,
                            }}
                          >
                            {
                              TYPE_LABEL[
                                selectedRow.type
                              ]
                            }
                          </span>

                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
                            style={{
                              backgroundColor:
                                (
                                  STATUS_CHIP[
                                    selectedRow
                                      .status
                                  ] ??
                                  STATUS_CHIP
                                    .in_progress
                                ).bg,

                              color:
                                (
                                  STATUS_CHIP[
                                    selectedRow
                                      .status
                                  ] ??
                                  STATUS_CHIP
                                    .in_progress
                                ).text,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor:
                                  (
                                    STATUS_CHIP[
                                      selectedRow
                                        .status
                                    ] ??
                                    STATUS_CHIP
                                      .in_progress
                                  ).dot,
                              }}
                            />

                            {
                              (
                                STATUS_CHIP[
                                  selectedRow
                                    .status
                                ] ??
                                STATUS_CHIP
                                  .in_progress
                              ).label
                            }
                          </span>

                        </div>

                        <p className="mt-2 truncate font-mono text-sm font-bold text-gray-800">
                          {selectedRow.case_number ??
                            '-'}
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedId('')
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
                        aria-label="Close"
                      >
                        ×
                      </button>

                    </div>

                    {/* Store hero */}

                    <div className="mt-5 flex items-center gap-3 rounded-2xl bg-gray-50 p-3.5">

                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm"
                        style={{
                          backgroundColor:
                            selectedRow.type ===
                            'sales'
                              ? '#EAF6FF'
                              : '#FFF1E6',
                        }}
                      >
                        {selectedRow.type ===
                        'sales'
                          ? '🏪'
                          : '🚚'}
                      </div>

                      <div className="min-w-0">

                        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                          Store
                        </p>

                        <p className="truncate text-sm font-bold text-gray-800">
                          {selectedRow.store_code}
                        </p>

                        <p className="truncate text-xs text-gray-500">
                          {selectedRow.store_name}
                        </p>

                      </div>

                    </div>

                    {/* Info grid */}

                    <div className="mt-4 grid grid-cols-2 gap-2">

                      <div className="rounded-xl border bg-white p-3">
                        <p className="text-[10px] text-gray-400">
                          Seller Code
                        </p>

                        <p className="mt-1 truncate text-xs font-semibold text-gray-700">
                          {selectedRow.seller_code ??
                            '-'}
                        </p>
                      </div>

                      <div className="rounded-xl border bg-white p-3">
                        <p className="text-[10px] text-gray-400">
                          ผู้สร้างเคส
                        </p>

                        <p className="mt-1 truncate text-xs font-semibold text-gray-700">
                          {selectedRow.creator_name ??
                            'ไม่ทราบ'}
                        </p>
                      </div>

                      {selectedRow.transport_name && (
                        <div className="col-span-2 rounded-xl border bg-white p-3">
                          <p className="text-[10px] text-gray-400">
                            Transport
                          </p>

                          <p className="mt-1 truncate text-xs font-semibold text-gray-700">
                            {selectedRow.transport_name}
                          </p>
                        </div>
                      )}

                      <div className="col-span-2 rounded-xl border bg-white p-3">
                        <p className="text-[10px] text-gray-400">
                          สร้างเมื่อ
                        </p>

                        <p className="mt-1 text-xs font-semibold text-gray-700">
                          {formatDate(
                            selectedRow.created_at
                          )}
                        </p>
                      </div>

                    </div>

                    {/* Cancel reason */}

                    {selectedRow.cancelled_reason && (
                      <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3">

                        <p className="text-[10px] font-bold uppercase tracking-wide text-red-400">
                          Cancellation Reason
                        </p>

                        <p className="mt-1 text-xs leading-5 text-red-600">
                          {
                            selectedRow.cancelled_reason
                          }
                        </p>

                      </div>
                    )}

                    {/* Progress */}

                    <div className="mt-6">
                      <CaseProgressBar
                        type={
                          selectedRow.type
                        }
                        currentStep={
                          selectedRow.current_step
                        }
                        status={
                          selectedRow.status
                        }
                      />
                    </div>

                  </div>

                  {/* ===========================================
                      STEP DETAILS
                  =========================================== */}

                  <div className="px-5 py-5 sm:px-6">

                    <div className="mb-5 flex items-center justify-between">

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                          Case Details
                        </p>

                        <h2 className="mt-1 text-base font-bold text-gray-800">
                          รายละเอียดแต่ละขั้นตอน
                        </h2>
                      </div>

                      <div className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-500">
                        {selectedRow.current_step}
                        /7
                      </div>

                    </div>

                    {loadingDetail ? (
                      <div className="flex flex-col items-center justify-center py-12">

                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-500" />

                        <p className="mt-3 text-xs text-gray-400">
                          กำลังโหลดรายละเอียด...
                        </p>

                      </div>
                    ) : (
                      <div className="space-y-3">

                        {/* Step 1 */}

                        <div className="relative rounded-2xl border bg-white p-4">

                          <div className="mb-3 flex items-center gap-3">

                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold"
                              style={{
                                backgroundColor:
                                  `${C.sales}12`,
                                color:
                                  C.sales,
                              }}
                            >
                              1
                            </div>

                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                Step 1
                              </p>

                              <p className="text-sm font-bold text-gray-800">
                                เลือกร้านค้า
                              </p>
                            </div>

                            {selectedRow.current_step >=
                              1 && (
                              <span className="ml-auto text-xs font-bold text-emerald-500">
                                ✓
                              </span>
                            )}

                          </div>

                          <div className="rounded-xl bg-gray-50 p-3">

                            <p className="text-[10px] text-gray-400">
                              ร้านค้า
                            </p>

                            <p className="mt-1 text-sm font-semibold text-gray-800">
                              {selectedRow.store_code}{' '}
                              —{' '}
                              {selectedRow.store_name}
                            </p>

                          </div>

                        </div>

                        {/* Step 2-7 */}

                        {STEPS[
                          selectedRow
                            .type
                        ].map(
                          (
                            step,
                            i
                          ) => {
                            const stepNumber =
                              i + 2

                            const isReached =
                              selectedRow.current_step >=
                                stepNumber ||
                              selectedRow.status !==
                                'in_progress'

                            const isCurrent =
                              selectedRow.status ===
                                'in_progress' &&
                              selectedRow.current_step ===
                                stepNumber

                            const stepColor =
                              selectedRow.type ===
                              'sales'
                                ? C.sales
                                : C.transport

                            return (
                              <div
                                key={
                                  stepNumber
                                }
                                className="relative rounded-2xl border p-4 transition-all"
                                style={{
                                  backgroundColor:
                                    isCurrent
                                      ? `${stepColor}04`
                                      : '#FFFFFF',

                                  borderColor:
                                    isCurrent
                                      ? `${stepColor}25`
                                      : C.border,

                                  opacity:
                                    !isReached &&
                                    !isCurrent
                                      ? 0.55
                                      : 1,
                                }}
                              >

                                <div className="mb-4 flex items-center gap-3">

                                  <div
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                                    style={{
                                      backgroundColor:
                                        isCurrent ||
                                        isReached
                                          ? `${stepColor}12`
                                          : '#F3F4F6',

                                      color:
                                        isCurrent ||
                                        isReached
                                          ? stepColor
                                          : '#9CA3AF',
                                    }}
                                  >
                                    {isReached &&
                                    !isCurrent
                                      ? '✓'
                                      : stepNumber}
                                  </div>

                                  <div className="min-w-0 flex-1">

                                    <div className="flex flex-wrap items-center gap-2">

                                      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                        Step{' '}
                                        {
                                          stepNumber
                                        }
                                      </p>

                                      {isCurrent && (
                                        <span
                                          className="rounded-full px-2 py-0.5 text-[8px] font-bold uppercase"
                                          style={{
                                            backgroundColor:
                                              `${stepColor}12`,
                                            color:
                                              stepColor,
                                          }}
                                        >
                                          Current
                                        </span>
                                      )}

                                    </div>

                                    <p className="truncate text-sm font-bold text-gray-800">
                                      {
                                        step.title
                                      }
                                    </p>

                                  </div>

                                  <span
                                    className="hidden rounded-full px-2 py-1 text-[9px] font-semibold sm:block"
                                    style={{
                                      backgroundColor:
                                        '#F8FAFC',
                                      color:
                                        '#64748B',
                                    }}
                                  >
                                    {
                                      step.role
                                    }
                                  </span>

                                </div>

                                <div className="space-y-3">

                                  {step.fields
                                    .filter(
                                      (
                                        f
                                      ) =>
                                        f.type !==
                                        'items'
                                    )
                                    .map(
                                      (
                                        f
                                      ) => (
                                        <div
                                          key={
                                            f.key
                                          }
                                          className="rounded-xl bg-gray-50/80 p-3"
                                        >

                                          <p className="mb-1 text-[10px] font-medium text-gray-400">
                                            {
                                              f.label
                                            }
                                          </p>

                                          <FieldValue
                                            field={
                                              f
                                            }
                                            value={
                                              selectedDetail?.[
                                                f.key
                                              ]
                                            }
                                          />

                                        </div>
                                      )
                                    )}

                                  {/* Items */}

                                  {step.fields.some(
                                    (
                                      f
                                    ) =>
                                      f.type ===
                                      'items'
                                  ) && (
                                    <div className="overflow-hidden rounded-xl border">
                                      <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2.5">

                                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                                          รายการสินค้า
                                        </p>

                                        <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-gray-400">
                                          {
                                            selectedItems.length
                                          }{' '}
                                          รายการ
                                        </span>

                                      </div>

                                      {selectedItems.length ===
                                      0 ? (
                                        <div className="px-3 py-5 text-center">

                                          <p className="text-xs text-gray-400">
                                            ยังไม่มีรายการสินค้า
                                          </p>

                                        </div>
                                      ) : (
                                        <div>

                                          {selectedItems.map(
                                            (
                                              it,
                                              idx
                                            ) => (
                                              <div
                                                key={
                                                  idx
                                                }
                                                className="flex items-center justify-between gap-3 border-t px-3 py-3 text-xs first:border-t-0"
                                                style={{
                                                  borderColor:
                                                    C.border,
                                                }}
                                              >

                                                <span className="font-mono font-medium text-gray-600">
                                                  {
                                                    it.item_code
                                                  }
                                                </span>

                                                <span className="font-bold text-gray-800">
                                                  {Number(
                                                    it.amount
                                                  ).toLocaleString()}{' '}
                                                  บาท
                                                </span>

                                              </div>
                                            )
                                          )}

                                        </div>
                                      )}

                                    </div>
                                  )}

                                </div>

                              </div>
                            )
                          }
                        )}

                      </div>
                    )}

                  </div>

                </div>
              )}

            </section>

          </div>

        </div>
      </main>
    </>
  )
}