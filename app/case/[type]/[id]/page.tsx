'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { uploadPhoto } from '@/lib/uploadPhoto'
import CameraCapture from '@/components/CameraCapture'
import SignaturePad from '@/components/SignaturePad'
import {
  CaseType,
  STEPS,
  TABLE_BY_TYPE,
  ITEMS_TABLE_BY_TYPE,
  ACCENT_BY_TYPE,
  TYPE_LABEL,
  TOTAL_STEPS,
  FieldDef,
  canActOnStep,
  EmployeeRole,
} from '@/lib/caseSteps'
import {
  FaArrowLeft,
  FaArrowRight,
  FaBoxOpen,
  FaCamera,
  FaCheck,
  FaCheckCircle,
  FaChevronRight,
  FaClipboardCheck,
  FaClock,
  FaFileAlt,
  FaPen,
  FaPlus,
  FaShieldAlt,
  FaStore,
  FaTimes,
  FaTimesCircle,
  FaTrash,
  FaTruck,
  FaUpload,
  FaUserTie,
  FaExclamationTriangle,
} from 'react-icons/fa'

type ItemRow = {
  item_code: string
  amount: string
}

type Employee = {
  id: string
  employee_id: string
  name: string
  role: EmployeeRole
}

export default function CaseStepPage() {
  const params = useParams<{ type: string; id: string }>()
  const router = useRouter()

  const type = params.type as CaseType
  const id = params.id as string

  const table = TABLE_BY_TYPE[type]
  const itemsTable = ITEMS_TABLE_BY_TYPE[type]
  const accent = ACCENT_BY_TYPE[type]
  const totalSteps = TOTAL_STEPS[type]
  const stepDefs = STEPS[type]

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [currentStep, setCurrentStep] = useState(2)
  const [row, setRow] = useState<Record<string, any> | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [files, setFiles] = useState<Record<string, File | undefined>>({})
  const [items, setItems] = useState<ItemRow[]>([
    { item_code: '', amount: '' },
  ])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

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
    if (!table) {
      router.push('/select')
      return
    }

    supabase
      .from(table)
      .select('*, stores(store_code, store_name)')
      .eq('id', id)
      .single()
      .then(async ({ data, error: dbError }) => {
        if (dbError || !data) {
          setError('ไม่พบรายการนี้')
          setLoading(false)
          return
        }

        setRow(data)
        setValues(data)

        const step =
          data.current_step && data.current_step >= 2
            ? data.current_step
            : 2

        setCurrentStep(step)

        const { data: existingItems } = await supabase
          .from(itemsTable)
          .select('item_code, amount')
          .eq('case_id', id)

        if (existingItems && existingItems.length > 0) {
          setItems(
            existingItems.map((r: any) => ({
              item_code: r.item_code,
              amount: String(r.amount),
            }))
          )
        }

        setLoading(false)
      })
  }, [table, itemsTable, id, router])

  const stepIndex = currentStep - 2
  const step = stepDefs?.[stepIndex]

  const isLastStep = currentStep >= totalSteps
  const isDone = row?.status === 'completed'
  const isCancelled = row?.status === 'cancelled'

  const canCancel =
    !!employee &&
    !isDone &&
    !isCancelled &&
    (row?.created_by_employee_id === employee.id ||
      employee.role === 'admin' ||
      employee.role === 'head')

  const handleCancelCase = async () => {
    if (!employee) return

    if (!cancelReason.trim()) {
      setError('กรุณาระบุเหตุผลที่ยกเลิกก่อนครับ')
      return
    }

    setCancelling(true)
    setError('')

    const { error: cancelError } = await supabase
      .from(table)
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by_employee_id: employee.id,
        cancelled_reason: cancelReason.trim(),
      })
      .eq('id', id)

    setCancelling(false)

    if (cancelError) {
      setError('ยกเลิกไม่สำเร็จ: ' + cancelError.message)
      return
    }

    setRow((prev) =>
      prev
        ? {
            ...prev,
            status: 'cancelled',
            cancelled_reason: cancelReason.trim(),
          }
        : prev
    )

    setShowCancelForm(false)
  }

  const canActThisStep = useMemo(() => {
    if (!employee || !step) return false

    return canActOnStep(type, currentStep, employee.role)
  }, [employee, step, type, currentStep])

  const visibleFields = useMemo(
    () =>
      step
        ? step.fields.filter(
            (f) => !f.showIf || f.showIf(values)
          )
        : [],
    [step, values]
  )

  const itemsTotal = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + (parseFloat(it.amount) || 0),
        0
      ),
    [items]
  )

  const validItemsCount = useMemo(
    () =>
      items.filter(
        (it) =>
          it.item_code.trim() &&
          parseFloat(it.amount) > 0
      ).length,
    [items]
  )

  const setValue = (key: string, val: any) => {
    setValues((prev) => ({
      ...prev,
      [key]: val,
    }))
  }

  const addItemRow = () =>
    setItems((prev) => [
      ...prev,
      { item_code: '', amount: '' },
    ])

  const removeItemRow = (idx: number) =>
    setItems((prev) =>
      prev.filter((_, i) => i !== idx)
    )

  const updateItemRow = (
    idx: number,
    patch: Partial<ItemRow>
  ) =>
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, ...patch } : it
      )
    )

  const isFieldFilled = (field: FieldDef) => {
    if (field.type === 'items') {
      const valid = items.filter(
        (it) =>
          it.item_code.trim() &&
          parseFloat(it.amount) > 0
      )

      return valid.length > 0
    }

    if (
      field.type === 'photo' ||
      field.type === 'signature'
    ) {
      return !!(
        files[field.key] ||
        values[field.key]
      )
    }

    if (field.type === 'checkbox') {
      return !!values[field.key]
    }

    const v = values[field.key]

    return (
      v !== undefined &&
      v !== null &&
      String(v).trim() !== ''
    )
  }

  const canSubmitStep = visibleFields.every(
    (f) =>
      !f.required ||
      isFieldFilled(f)
  )

  const handleSubmitStep = async () => {
    if (!step) return

    setError('')

    if (!canActThisStep) {
      setError('ขั้นตอนนี้ไม่ใช่หน้าที่ของคุณครับ')
      return
    }

    if (!canSubmitStep) {
      setError(
        'กรุณากรอก/ถ่ายรูป/เซ็นให้ครบตามที่บังคับก่อนไปขั้นตอนถัดไป'
      )
      return
    }

    setSaving(true)

    try {
      const update: Record<string, any> = {}

      for (const field of visibleFields) {
        if (field.type === 'items') continue

        if (
          field.type === 'photo' ||
          field.type === 'signature'
        ) {
          const file = files[field.key]

          if (file) {
            const url = await uploadPhoto(
              file,
              type,
              id,
              field.key
            )

            update[field.key] = url
          } else if (values[field.key]) {
            update[field.key] =
              values[field.key]
          }
        } else {
          update[field.key] =
            values[field.key] ?? null
        }
      }

      const hasItemsField =
        step.fields.some(
          (f) => f.type === 'items'
        )

      if (hasItemsField) {
        const validItems = items.filter(
          (it) =>
            it.item_code.trim() &&
            parseFloat(it.amount) > 0
        )

        await supabase
          .from(itemsTable)
          .delete()
          .eq('case_id', id)

        if (validItems.length > 0) {
          await supabase
            .from(itemsTable)
            .insert(
              validItems.map((it) => ({
                case_id: id,
                item_code: it.item_code.trim(),
                amount: parseFloat(it.amount),
              }))
            )
        }

        update.expired_total_amount =
          validItems.reduce(
            (s, it) =>
              s + parseFloat(it.amount),
            0
          )
      }

      const nextStep = isLastStep
        ? currentStep
        : currentStep + 1

      update.current_step = nextStep
      update.updated_at =
        new Date().toISOString()

      update.step_timestamps = {
        ...(row?.step_timestamps || {}),
        [`step${currentStep}`]:
          new Date().toISOString(),
      }

      if (isLastStep) {
        update.status = 'completed'
      }

      const { error: updateError } =
        await supabase
          .from(table)
          .update(update)
          .eq('id', id)

      if (updateError) {
        setError(
          'บันทึกไม่สำเร็จ: ' +
            updateError.message
        )

        setSaving(false)
        return
      }

      setValues((prev) => ({
        ...prev,
        ...update,
      }))

      setRow((prev) =>
        prev
          ? {
              ...prev,
              ...update,
            }
          : prev
      )

      setFiles({})

      if (!isLastStep) {
        setCurrentStep(nextStep)
      }

      setSaving(false)
    } catch (e: any) {
      setError(
        e.message ||
          'เกิดข้อผิดพลาด'
      )

      setSaving(false)
    }
  }

  const goBackStep = () => {
    if (currentStep > 2) {
      setCurrentStep(
        currentStep - 1
      )
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f8fc]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div
              className="mx-auto h-12 w-12 animate-spin rounded-2xl border-4 border-gray-200"
              style={{
                borderTopColor: accent,
              }}
            />

            <p className="mt-4 text-sm font-semibold text-gray-500">
              กำลังโหลดข้อมูลเคส
            </p>

            <p className="mt-1 text-xs text-gray-400">
              กรุณารอสักครู่...
            </p>
          </div>
        </div>
      </main>
    )
  }

  if (error && !row) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f8fc] px-4">
        <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-400">
            <FaTimesCircle size={26} />
          </div>

          <h2 className="mt-5 text-lg font-bold text-gray-800">
            ไม่สามารถเปิดรายการได้
          </h2>

          <p className="mt-2 text-sm text-red-500">
            {error}
          </p>

          <button
            onClick={() =>
              router.push(`/case/${type}`)
            }
            className="mt-6 rounded-2xl bg-gray-800 px-6 py-3 text-sm font-bold text-white"
          >
            กลับไปหน้ารายการ
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f8fc]">

      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div
          className="absolute -left-40 -top-40 h-[450px] w-[450px] rounded-full blur-3xl"
          style={{
            backgroundColor: `${accent}10`,
          }}
        />

        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-gray-200/30 blur-3xl" />

        <div
          className="
            absolute inset-0 opacity-[0.02]
            [background-image:linear-gradient(#64748b_1px,transparent_1px),linear-gradient(90deg,#64748b_1px,transparent_1px)]
            [background-size:40px_40px]
          "
        />

      </div>

      {/* Header */}
      <header className="relative z-20 border-b border-white/70 bg-white/85 backdrop-blur-xl">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">

          <div className="flex min-w-0 items-center gap-3">

            <button
              onClick={() =>
                router.push(`/case/${type}`)
              }
              className="
                flex h-10 w-10 shrink-0 items-center justify-center
                rounded-xl border border-gray-200
                bg-white text-gray-500
                shadow-sm transition
                hover:-translate-x-0.5 hover:text-gray-800
              "
            >
              <FaArrowLeft size={14} />
            </button>

            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
              style={{
                backgroundColor: accent,
                boxShadow: `0 10px 30px ${accent}30`,
              }}
            >
              {type === 'transport' ? (
                <FaTruck size={19} />
              ) : (
                <FaStore size={19} />
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400">
                {TYPE_LABEL[type]} · WORKFLOW
              </p>

              <p className="truncate text-sm font-bold text-gray-800 sm:text-base">
                {row?.stores?.store_name ?? '-'}
              </p>

              <p className="truncate text-[10px] text-gray-400">
                {row?.stores?.store_code ?? '-'}
                {row?.case_number
                  ? ` · ${row.case_number}`
                  : ''}
              </p>
            </div>

          </div>

          <div className="flex items-center gap-2">

            {employee && (
              <div className="hidden text-right sm:block">
                <p className="text-xs font-bold text-gray-700">
                  {employee.name}
                </p>

                <p className="text-[10px] text-gray-400">
                  {employee.role}
                </p>
              </div>
            )}

            {canCancel &&
              !showCancelForm && (
                <button
                  onClick={() =>
                    setShowCancelForm(true)
                  }
                  className="
                    rounded-xl border border-red-100
                    bg-red-50 px-3 py-2
                    text-[10px] font-bold text-red-500
                    transition hover:bg-red-100
                    sm:px-4
                  "
                >
                  ยกเลิกเคส
                </button>
              )}

          </div>

        </div>

      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* Case summary */}
        <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_300px]">

          <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur sm:p-6">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: accent }}
                >
                  CASE WORKFLOW
                </p>

                <h1 className="mt-1 text-xl font-bold text-gray-800 sm:text-2xl">
                  {step?.title ?? 'รายการ'}
                </h1>

                <p className="mt-1 text-xs text-gray-400">
                  ขั้นตอนที่ {currentStep} จาก{' '}
                  {totalSteps}
                </p>
              </div>

              <div
                className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:flex"
                style={{
                  color: accent,
                  backgroundColor: `${accent}10`,
                }}
              >
                <FaClipboardCheck size={20} />
              </div>

            </div>

            {/* Progress */}
            <div className="mt-6">

              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-400">
                  ความคืบหน้า
                </span>

                <span
                  className="text-[10px] font-bold"
                  style={{ color: accent }}
                >
                  {Math.round(
                    (currentStep /
                      totalSteps) *
                      100
                  )}
                  %
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(
                      100,
                      (currentStep /
                        totalSteps) *
                        100
                    )}%`,
                    backgroundColor: accent,
                  }}
                />
              </div>

            </div>

          </div>

          <div
            className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl"
            style={{
              background: `linear-gradient(145deg, ${accent}, ${accent}cc)`,
              boxShadow: `0 20px 50px ${accent}25`,
            }}
          >

            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border-[22px] border-white/10" />

            <div className="relative">

              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                CURRENT STEP
              </p>

              <div className="mt-2 flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold">
                  {currentStep}
                </div>

                <div>
                  <p className="text-sm font-bold">
                    {step?.role}
                  </p>

                  <p className="text-[10px] text-white/65">
                    ผู้รับผิดชอบขั้นตอนนี้
                  </p>
                </div>

              </div>

              <div className="mt-5 flex gap-1.5">
                {Array.from({
                  length: totalSteps,
                }).map((_, index) => {
                  const stepNumber =
                    index + 1

                  return (
                    <div
                      key={index}
                      className="h-1.5 flex-1 rounded-full"
                      style={{
                        backgroundColor:
                          stepNumber <=
                          currentStep
                            ? 'white'
                            : 'rgba(255,255,255,0.2)',
                      }}
                    />
                  )
                })}
              </div>

            </div>

          </div>

        </div>

        {/* Cancel */}
        {showCancelForm && (
          <div className="mb-5 overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm">

            <div className="h-1 bg-red-500" />

            <div className="p-5 sm:p-6">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                  <FaExclamationTriangle size={18} />
                </div>

                <div>
                  <h3 className="text-base font-bold text-red-600">
                    ยืนยันการยกเลิกเคส
                  </h3>

                  <p className="mt-1 text-xs leading-relaxed text-gray-400">
                    ข้อมูลจะไม่ถูกลบ แต่สถานะจะเปลี่ยนเป็น
                    "ยกเลิก" และสามารถตรวจสอบย้อนหลังได้
                  </p>
                </div>

              </div>

              <div className="mt-5">

                <label className="mb-2 block text-xs font-bold text-gray-600">
                  เหตุผลที่ยกเลิก
                  <span className="ml-1 text-red-400">*</span>
                </label>

                <textarea
                  value={cancelReason}
                  onChange={(e) =>
                    setCancelReason(
                      e.target.value
                    )
                  }
                  placeholder="เช่น กรอกร้านค้าผิด, ลูกค้ายกเลิกคำขอ"
                  rows={3}
                  className="
                    w-full resize-none rounded-2xl
                    border border-gray-200
                    bg-gray-50 px-4 py-3
                    text-sm text-gray-800
                    outline-none transition
                    focus:border-red-200 focus:bg-white
                  "
                />

              </div>

              {error && (
                <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-center text-xs font-medium text-red-500">
                  {error}
                </div>
              )}

              <div className="mt-4 flex gap-3">

                <button
                  onClick={() => {
                    setShowCancelForm(false)
                    setCancelReason('')
                    setError('')
                  }}
                  className="
                    flex-1 rounded-2xl
                    border border-gray-200
                    bg-white py-3
                    text-xs font-bold text-gray-500
                    transition hover:bg-gray-50
                  "
                >
                  ไม่ยกเลิก
                </button>

                <button
                  onClick={handleCancelCase}
                  disabled={cancelling}
                  className="
                    flex-1 rounded-2xl
                    bg-red-500 py-3
                    text-xs font-bold text-white
                    shadow-lg shadow-red-500/20
                    transition hover:bg-red-600
                    disabled:opacity-50
                  "
                >
                  {cancelling
                    ? 'กำลังยกเลิก...'
                    : 'ยืนยันยกเลิกเคส'}
                </button>

              </div>

            </div>

          </div>
        )}

        {/* Main */}
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">

          {/* Main content */}
          <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur">

            {isCancelled ? (

              <StatusCard
                icon={
                  <FaTimesCircle size={30} />
                }
                title="เคสนี้ถูกยกเลิกแล้ว"
                description={
                  row?.cancelled_reason
                    ? `เหตุผล: ${row.cancelled_reason}`
                    : 'รายการนี้ถูกยกเลิก'
                }
                accent="#ef4444"
              />

            ) : isDone ? (

              <StatusCard
                icon={
                  <FaCheckCircle size={30} />
                }
                title="รายการนี้เสร็จสมบูรณ์แล้ว"
                description={`CN: ${row?.cn_usage_status ?? '-'}`}
                accent="#22c55e"
              />

            ) : !canActThisStep ? (

              <WaitingCard
                step={step}
                currentStep={currentStep}
                totalSteps={totalSteps}
                employee={employee}
                accent={accent}
              />

            ) : (

              <div>

                {/* Form heading */}
                <div
                  className="border-b border-gray-100 px-5 py-5 sm:px-7"
                  style={{
                    background: `linear-gradient(180deg, ${accent}05, transparent)`,
                  }}
                >

                  <div className="flex items-center gap-3">

                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
                      style={{
                        backgroundColor: accent,
                        boxShadow: `0 10px 25px ${accent}25`,
                      }}
                    >
                      <FaClipboardCheck size={18} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            color: accent,
                          }}
                        >
                          STEP {currentStep}
                        </span>

                        <span className="text-[10px] text-gray-300">
                          / {totalSteps}
                        </span>
                      </div>

                      <h2 className="text-base font-bold text-gray-800 sm:text-lg">
                        {step?.title}
                      </h2>

                      <p className="text-[10px] text-gray-400">
                        ผู้รับผิดชอบ: {step?.role}
                      </p>
                    </div>

                  </div>

                </div>

                {/* Fields */}
                <div className="space-y-5 p-5 sm:p-7">

                  {visibleFields.map(
                    (field, index) => (
                      <FieldCard
                        key={field.key}
                        field={field}
                        index={index}
                        accent={accent}
                        values={values}
                        files={files}
                        setValue={setValue}
                        setFiles={setFiles}
                        items={items}
                        itemsTotal={itemsTotal}
                        validItemsCount={
                          validItemsCount
                        }
                        addItemRow={
                          addItemRow
                        }
                        removeItemRow={
                          removeItemRow
                        }
                        updateItemRow={
                          updateItemRow
                        }
                      />
                    )
                  )}

                  {error && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">

                      <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-400" />

                      <p className="text-xs font-medium leading-relaxed text-red-500">
                        {error}
                      </p>

                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 border-t border-gray-100 pt-5">

                    {currentStep > 2 && (
                      <button
                        onClick={goBackStep}
                        disabled={saving}
                        className="
                          flex items-center justify-center gap-2
                          rounded-2xl border border-gray-200
                          bg-white px-5 py-3.5
                          text-xs font-bold text-gray-500
                          transition hover:bg-gray-50
                          disabled:opacity-50
                        "
                      >
                        <FaArrowLeft size={11} />
                        ย้อนกลับ
                      </button>
                    )}

                    <button
                      onClick={handleSubmitStep}
                      disabled={
                        saving ||
                        !canSubmitStep
                      }
                      className="
                        group flex flex-1
                        items-center justify-center gap-2
                        rounded-2xl py-3.5
                        text-xs font-bold text-white
                        shadow-lg
                        transition-all duration-300
                        hover:-translate-y-0.5
                        disabled:cursor-not-allowed
                        disabled:opacity-40
                      "
                      style={{
                        backgroundColor: accent,
                        boxShadow: `0 12px 30px ${accent}30`,
                      }}
                    >
                      {saving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          กำลังบันทึก...
                        </>
                      ) : (
                        <>
                          {isLastStep
                            ? 'บันทึกและจบงาน'
                            : 'บันทึกและไปต่อ'}

                          {isLastStep ? (
                            <FaCheck
                              size={11}
                            />
                          ) : (
                            <FaArrowRight
                              className="transition-transform group-hover:translate-x-1"
                              size={11}
                            />
                          )}
                        </>
                      )}
                    </button>

                  </div>

                  {!canSubmitStep && (
                    <p className="text-center text-[10px] text-gray-400">
                      กรุณากรอกข้อมูลที่มีเครื่องหมาย *
                      ให้ครบก่อนดำเนินการต่อ
                    </p>
                  )}

                </div>

              </div>

            )}

          </section>

          {/* Sidebar */}
          <aside className="space-y-4">

            {/* Step timeline */}
            <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur">

              <div className="mb-5 flex items-center justify-between">

                <div>
                  <p className="text-sm font-bold text-gray-800">
                    Workflow
                  </p>

                  <p className="text-[10px] text-gray-400">
                    ความคืบหน้าของเคส
                  </p>
                </div>

                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                  style={{
                    color: accent,
                    backgroundColor: `${accent}10`,
                  }}
                >
                  {currentStep}/{totalSteps}
                </span>

              </div>

              <div className="space-y-1">

                {Array.from({
                  length: totalSteps,
                }).map((_, index) => {

                  const number =
                    index + 1

                  const isCurrent =
                    number === currentStep

                  const isComplete =
                    number < currentStep

                  const isStepOne =
                    number === 1

                  return (
                    <div
                      key={number}
                      className="relative flex gap-3"
                    >

                      {number <
                        totalSteps && (
                        <div
                          className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px"
                          style={{
                            backgroundColor:
                              isComplete
                                ? accent
                                : '#e5e7eb',
                          }}
                        />
                      )}

                      <div
                        className={`
                          relative z-10
                          flex h-8 w-8 shrink-0
                          items-center justify-center
                          rounded-full
                          text-[10px] font-bold
                          transition-all
                        `}
                        style={{
                          backgroundColor:
                            isComplete ||
                            isCurrent
                              ? accent
                              : '#f3f4f6',
                          color:
                            isComplete ||
                            isCurrent
                              ? 'white'
                              : '#9ca3af',
                          boxShadow:
                            isCurrent
                              ? `0 0 0 5px ${accent}12`
                              : 'none',
                        }}
                      >
                        {isComplete ? (
                          <FaCheck
                            size={10}
                          />
                        ) : (
                          number
                        )}
                      </div>

                      <div
                        className={`
                          min-w-0 flex-1 pb-4
                          ${
                            isCurrent
                              ? ''
                              : ''
                          }
                        `}
                      >

                        <p
                          className={`
                            text-xs font-bold
                            ${
                              isCurrent
                                ? 'text-gray-800'
                                : isComplete
                                  ? 'text-gray-500'
                                  : 'text-gray-400'
                            }
                          `}
                        >
                          {isStepOne
                            ? 'เลือกร้านค้า'
                            : stepDefs[
                                number - 2
                              ]?.title ??
                              `ขั้นตอน ${number}`}
                        </p>

                        {isCurrent && (
                          <span
                            className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold"
                            style={{
                              color: accent,
                              backgroundColor: `${accent}10`,
                            }}
                          >
                            กำลังดำเนินการ
                          </span>
                        )}

                      </div>

                    </div>
                  )
                })}

              </div>

            </div>

            {/* Case info */}
            <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur">

              <div className="mb-4 flex items-center gap-3">

                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{
                    color: accent,
                    backgroundColor: `${accent}10`,
                  }}
                >
                  <FaStore size={15} />
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-800">
                    ข้อมูลเคส
                  </p>

                  <p className="text-[10px] text-gray-400">
                    Case information
                  </p>
                </div>

              </div>

              <InfoRow
                label="เลขเคส"
                value={
                  row?.case_number ??
                  '-'
                }
              />

              <InfoRow
                label="รหัสร้านค้า"
                value={
                  row?.stores
                    ?.store_code ??
                  '-'
                }
              />

              <InfoRow
                label="ร้านค้า"
                value={
                  row?.stores
                    ?.store_name ??
                  '-'
                }
              />

              <InfoRow
                label="ประเภท"
                value={
                  TYPE_LABEL[type]
                }
              />

              <InfoRow
                label="สถานะ"
                value={
                  isDone
                    ? 'เสร็จสิ้น'
                    : isCancelled
                      ? 'ยกเลิก'
                      : 'กำลังทำ'
                }
                last
              />

            </div>

          </aside>

        </div>

      </div>

    </main>
  )
}

/* =========================================================
   FIELD CARD
========================================================= */

function FieldCard({
  field,
  index,
  accent,
  values,
  files,
  setValue,
  setFiles,
  items,
  itemsTotal,
  validItemsCount,
  addItemRow,
  removeItemRow,
  updateItemRow,
}: {
  field: FieldDef
  index: number
  accent: string
  values: Record<string, any>
  files: Record<string, File | undefined>
  setValue: (key: string, val: any) => void
  setFiles: React.Dispatch<
    React.SetStateAction<
      Record<string, File | undefined>
    >
  >
  items: ItemRow[]
  itemsTotal: number
  validItemsCount: number
  addItemRow: () => void
  removeItemRow: (idx: number) => void
  updateItemRow: (
    idx: number,
    patch: Partial<ItemRow>
  ) => void
}) {
  if (field.type === 'items') {
    return (
      <div
        className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50/60"
      >

        <div
          className="border-b px-5 py-4"
          style={{
            borderColor: `${accent}18`,
            backgroundColor: `${accent}05`,
          }}
        >
          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  color: accent,
                  backgroundColor: `${accent}12`,
                }}
              >
                <FaBoxOpen size={17} />
              </div>

              <div>
                <p className="text-sm font-bold text-gray-800">
                  {field.label}
                </p>

                <p className="text-[10px] text-gray-400">
                  เพิ่มรายการสินค้าที่เสียหาย
                </p>
              </div>

            </div>

            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{
                color: accent,
                backgroundColor: `${accent}12`,
              }}
            >
              {validItemsCount} รายการ
            </span>

          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-5">

          {items.map((it, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
            >

              <div className="mb-3 flex items-center justify-between">

                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  ITEM #{idx + 1}
                </span>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      removeItemRow(idx)
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <FaTrash size={10} />
                  </button>
                )}

              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold text-gray-500">
                    รหัสสินค้า
                  </label>

                  <input
                    type="text"
                    placeholder="กรอกรหัสสินค้า"
                    value={it.item_code}
                    onChange={(e) =>
                      updateItemRow(
                        idx,
                        {
                          item_code:
                            e.target.value,
                        }
                      )
                    }
                    className="
                      w-full rounded-xl
                      border border-gray-200
                      bg-gray-50 px-3 py-3
                      text-sm text-gray-800
                      outline-none transition
                      focus:bg-white
                    "
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-bold text-gray-500">
                    ยอดเงิน
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={it.amount}
                      onChange={(e) =>
                        updateItemRow(
                          idx,
                          {
                            amount:
                              e.target.value,
                          }
                        )
                      }
                      className="
                        w-full rounded-xl
                        border border-gray-200
                        bg-gray-50 px-3 py-3 pr-12
                        text-right text-sm text-gray-800
                        outline-none transition
                        focus:bg-white
                      "
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                      บาท
                    </span>
                  </div>
                </div>

              </div>

            </div>
          ))}

          <button
            type="button"
            onClick={addItemRow}
            className="
              flex w-full items-center justify-center gap-2
              rounded-2xl border border-dashed
              py-3
              text-xs font-bold
              transition hover:bg-white
            "
            style={{
              borderColor: `${accent}50`,
              color: accent,
            }}
          >
            <FaPlus size={10} />
            เพิ่มรายการสินค้า
          </button>

          <div
            className="flex items-center justify-between rounded-2xl px-4 py-4"
            style={{
              color: accent,
              backgroundColor: `${accent}09`,
            }}
          >
            <div>
              <p className="text-[10px] font-medium opacity-70">
                ยอดรวมทั้งหมด
              </p>

              <p className="text-xs font-semibold">
                {validItemsCount} รายการ
              </p>
            </div>

            <p className="text-lg font-bold">
              {itemsTotal.toLocaleString(
                'th-TH',
                {
                  minimumFractionDigits: 2,
                }
              )}{' '}
              <span className="text-xs">
                บาท
              </span>
            </p>
          </div>

        </div>

      </div>
    )
  }

  const icon =
    field.type === 'photo'
      ? field.camera === false
        ? FaUpload
        : FaCamera
      : field.type === 'signature'
        ? FaPen
        : field.type === 'checkbox'
          ? FaCheck
          : field.type === 'select'
            ? FaClipboardCheck
            : field.type === 'date'
              ? FaClock
              : FaFileAlt

  const Icon = icon

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">

      <div className="mb-4 flex items-start gap-3">

        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            color: accent,
            backgroundColor: `${accent}10`,
          }}
        >
          <Icon size={15} />
        </div>

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <p className="text-sm font-bold text-gray-700">
              {field.label}
            </p>

            {field.required && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-400">
                จำเป็น
              </span>
            )}

          </div>

          <p className="mt-0.5 text-[10px] text-gray-400">
            รายการที่ {index + 1}
          </p>

        </div>

      </div>

      {field.type === 'text' && (
        <input
          type="text"
          value={values[field.key] ?? ''}
          onChange={(e) =>
            setValue(
              field.key,
              e.target.value
            )
          }
          className="
            w-full rounded-2xl
            border border-gray-200
            bg-gray-50 px-4 py-3.5
            text-sm text-gray-800
            outline-none transition
            focus:border-gray-300
            focus:bg-white
          "
        />
      )}

      {field.type === 'number' && (
        <input
          type="number"
          value={values[field.key] ?? ''}
          onChange={(e) =>
            setValue(
              field.key,
              e.target.value
            )
          }
          className="
            w-full rounded-2xl
            border border-gray-200
            bg-gray-50 px-4 py-3.5
            text-sm text-gray-800
            outline-none transition
            focus:border-gray-300
            focus:bg-white
          "
        />
      )}

      {field.type === 'date' && (
        <input
          type="date"
          value={values[field.key] ?? ''}
          onChange={(e) =>
            setValue(
              field.key,
              e.target.value
            )
          }
          className="
            w-full rounded-2xl
            border border-gray-200
            bg-gray-50 px-4 py-3.5
            text-sm text-gray-800
            outline-none transition
            focus:border-gray-300
            focus:bg-white
          "
        />
      )}

      {field.type === 'select' && (
        <div className="relative">
          <select
            value={
              values[field.key] ?? ''
            }
            onChange={(e) =>
              setValue(
                field.key,
                e.target.value
              )
            }
            className="
              w-full appearance-none
              rounded-2xl border border-gray-200
              bg-gray-50 px-4 py-3.5 pr-10
              text-sm text-gray-800
              outline-none transition
              focus:bg-white
            "
          >
            <option value="">
              -- เลือก --
            </option>

            {field.options?.map(
              (opt) => (
                <option
                  key={opt}
                  value={opt}
                >
                  {opt}
                </option>
              )
            )}
          </select>

          <FaChevronRight
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-300"
            size={11}
          />
        </div>
      )}

      {field.type === 'checkbox' && (
        <button
          type="button"
          onClick={() =>
            setValue(
              field.key,
              !values[field.key]
            )
          }
          className={`
            flex w-full items-center gap-3
            rounded-2xl border p-4
            text-left transition
            ${
              values[field.key]
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-gray-200 bg-gray-50'
            }
          `}
        >
          <div
            className={`
              flex h-6 w-6 items-center justify-center
              rounded-lg border-2
              transition
              ${
                values[field.key]
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-gray-300 bg-white text-transparent'
              }
            `}
          >
            <FaCheck size={10} />
          </div>

          <div>
            <p className="text-xs font-bold text-gray-700">
              ยืนยันข้อมูล
            </p>

            <p className="text-[10px] text-gray-400">
              กดเพื่อยืนยันว่าดำเนินการเรียบร้อยแล้ว
            </p>
          </div>
        </button>
      )}

      {field.type === 'photo' &&
        field.camera !== false && (
          <div className="overflow-hidden rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-2">
            <CameraCapture
              existingUrl={
                values[field.key]
              }
              onCapture={(file) =>
                setFiles((prev) => ({
                  ...prev,
                  [field.key]: file,
                }))
              }
            />
          </div>
        )}

      {field.type === 'photo' &&
        field.camera === false && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">

            <label
              className="
                flex cursor-pointer
                flex-col items-center justify-center
                rounded-xl border border-gray-200
                bg-white px-4 py-6
                transition hover:bg-gray-50
              "
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{
                  color: accent,
                  backgroundColor: `${accent}10`,
                }}
              >
                <FaUpload size={16} />
              </div>

              <p className="mt-3 text-xs font-bold text-gray-600">
                เลือกรูปภาพ
              </p>

              <p className="mt-1 text-[10px] text-gray-400">
                รองรับรูปภาพจากเครื่อง
              </p>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  setFiles(
                    (prev) => ({
                      ...prev,
                      [field.key]:
                        e.target.files?.[0],
                    })
                  )
                }
              />
            </label>

            {values[field.key] &&
              !files[field.key] && (
                <p className="mt-3 text-center text-[10px] font-medium text-emerald-500">
                  ✓ มีรูปเดิมอยู่แล้ว
                  (อัปโหลดใหม่เพื่อแทนที่)
                </p>
              )}

            {files[field.key] && (
              <p className="mt-3 text-center text-[10px] font-medium text-blue-500">
                ✓ เลือกรูปใหม่แล้ว
              </p>
            )}

          </div>
        )}

      {field.type === 'signature' && (
        <div className="overflow-hidden rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-2">
          <SignaturePad
            existingUrl={
              values[field.key]
            }
            onSign={(file) =>
              setFiles((prev) => ({
                ...prev,
                [field.key]: file,
              }))
            }
          />
        </div>
      )}

    </div>
  )
}

/* =========================================================
   STATUS CARD
========================================================= */

function StatusCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: React.ReactNode
  title: string
  description: string
  accent: string
}) {
  return (
    <div className="px-6 py-16 text-center sm:px-10">

      <div
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px]"
        style={{
          color: accent,
          backgroundColor: `${accent}10`,
          boxShadow: `0 15px 40px ${accent}15`,
        }}
      >
        {icon}
      </div>

      <h2 className="mt-6 text-xl font-bold text-gray-800">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-400">
        {description}
      </p>

    </div>
  )
}

/* =========================================================
   WAITING CARD
========================================================= */

function WaitingCard({
  step,
  currentStep,
  totalSteps,
  employee,
  accent,
}: {
  step: any
  currentStep: number
  totalSteps: number
  employee: Employee | null
  accent: string
}) {
  return (
    <div className="px-6 py-14 text-center sm:px-10">

      <div
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px]"
        style={{
          color: accent,
          backgroundColor: `${accent}10`,
        }}
      >
        <FaClock
          size={30}
          className="animate-pulse"
        />
      </div>

      <div className="mt-6">

        <span
          className="rounded-full px-3 py-1 text-[10px] font-bold"
          style={{
            color: accent,
            backgroundColor: `${accent}10`,
          }}
        >
          WAITING
        </span>

        <h2 className="mt-4 text-xl font-bold text-gray-800">
          ยังไม่ถึงคิวของคุณ
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-400">
          ขั้นตอนนี้เป็นหน้าที่ของ{' '}
          <span className="font-bold text-gray-600">
            {step?.role}
          </span>
        </p>

        <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-gray-50 p-4">

          <p className="text-[10px] text-gray-400">
            ขั้นตอนปัจจุบัน
          </p>

          <p className="mt-1 text-sm font-bold text-gray-700">
            {currentStep} / {totalSteps}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            {step?.title}
          </p>

          <div className="mt-4 flex items-center justify-center gap-2">

            <FaShieldAlt
              className="text-gray-300"
              size={12}
            />

            <span className="text-[10px] text-gray-400">
              Role ของคุณ: {employee?.role}
            </span>

          </div>

        </div>

      </div>

    </div>
  )
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string
  value: string
  last?: boolean
}) {
  return (
    <div
      className={`
        flex items-start justify-between gap-4 py-3
        ${!last ? 'border-b border-gray-100' : ''}
      `}
    >
      <span className="shrink-0 text-[10px] text-gray-400">
        {label}
      </span>

      <span className="max-w-[170px] truncate text-right text-[10px] font-bold text-gray-600">
        {value}
      </span>
    </div>
  )
}