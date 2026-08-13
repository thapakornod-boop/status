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

type ItemRow = { item_code: string; amount: string }

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
  const [items, setItems] = useState<ItemRow[]>([{ item_code: '', amount: '' }])
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
    setEmployee(JSON.parse(raw))
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
        const step = data.current_step && data.current_step >= 2 ? data.current_step : 2
        setCurrentStep(step)

        const { data: existingItems } = await supabase
          .from(itemsTable)
          .select('item_code, amount')
          .eq('case_id', id)
        if (existingItems && existingItems.length > 0) {
          setItems(existingItems.map((r: any) => ({ item_code: r.item_code, amount: String(r.amount) })))
        }

        setLoading(false)
      })
  }, [table, itemsTable, id, router])

  const stepIndex = currentStep - 2
  const step = stepDefs[stepIndex]
  const isLastStep = currentStep >= totalSteps
  const isDone = row?.status === 'completed'
  const isCancelled = row?.status === 'cancelled'

  // ใครยกเลิกเคสได้บ้าง: คนที่สร้างเคสเอง หรือ role admin/head (กันคนอื่นมายกเลิกมั่ว)
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
    () => (step ? step.fields.filter((f) => !f.showIf || f.showIf(values)) : []),
    [step, values]
  )

  const itemsTotal = useMemo(
    () => items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0),
    [items]
  )

  const setValue = (key: string, val: any) => {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  const addItemRow = () => setItems((prev) => [...prev, { item_code: '', amount: '' }])
  const removeItemRow = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))
  const updateItemRow = (idx: number, patch: Partial<ItemRow>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))

  const isFieldFilled = (field: FieldDef) => {
    if (field.type === 'items') {
      const valid = items.filter((it) => it.item_code.trim() && parseFloat(it.amount) > 0)
      return valid.length > 0
    }
    if (field.type === 'photo' || field.type === 'signature') {
      return !!(files[field.key] || values[field.key])
    }
    if (field.type === 'checkbox') {
      return !!values[field.key]
    }
    const v = values[field.key]
    return v !== undefined && v !== null && String(v).trim() !== ''
  }

  const canSubmitStep = visibleFields.every((f) => !f.required || isFieldFilled(f))

  const handleSubmitStep = async () => {
    if (!step) return
    setError('')

    if (!canActThisStep) {
      setError('ขั้นตอนนี้ไม่ใช่หน้าที่ของคุณครับ')
      return
    }

    if (!canSubmitStep) {
      setError('กรุณากรอก/ถ่ายรูป/เซ็นให้ครบตามที่บังคับก่อนไปขั้นตอนถัดไป')
      return
    }

    setSaving(true)
    try {
      const update: Record<string, any> = {}

      for (const field of visibleFields) {
        if (field.type === 'items') continue
        if (field.type === 'photo' || field.type === 'signature') {
          const file = files[field.key]
          if (file) {
            const url = await uploadPhoto(file, type, id, field.key)
            update[field.key] = url
          } else if (values[field.key]) {
            update[field.key] = values[field.key]
          }
        } else {
          update[field.key] = values[field.key] ?? null
        }
      }

      const hasItemsField = step.fields.some((f) => f.type === 'items')
      if (hasItemsField) {
        const validItems = items.filter((it) => it.item_code.trim() && parseFloat(it.amount) > 0)
        await supabase.from(itemsTable).delete().eq('case_id', id)
        if (validItems.length > 0) {
          await supabase.from(itemsTable).insert(
            validItems.map((it) => ({
              case_id: id,
              item_code: it.item_code.trim(),
              amount: parseFloat(it.amount),
            }))
          )
        }
        update.expired_total_amount = validItems.reduce((s, it) => s + parseFloat(it.amount), 0)
      }

      const nextStep = isLastStep ? currentStep : currentStep + 1
      update.current_step = nextStep
      update.updated_at = new Date().toISOString()
      update.step_timestamps = {
        ...(row?.step_timestamps || {}),
        [`step${currentStep}`]: new Date().toISOString(),
      }
      if (isLastStep) update.status = 'completed'

      const { error: updateError } = await supabase.from(table).update(update).eq('id', id)

      if (updateError) {
        setError('บันทึกไม่สำเร็จ: ' + updateError.message)
        setSaving(false)
        return
      }

      setValues((prev) => ({ ...prev, ...update }))
      setRow((prev) => (prev ? { ...prev, ...update } : prev))
      setFiles({})

      if (!isLastStep) setCurrentStep(nextStep)
      setSaving(false)
    } catch (e: any) {
      setError(e.message || 'เกิดข้อผิดพลาด')
      setSaving(false)
    }
  }

  const goBackStep = () => {
    if (currentStep > 2) setCurrentStep(currentStep - 1)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">กำลังโหลด...</p>
      </main>
    )
  }

  if (error && !row) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500 text-sm">{error}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-4 flex items-center gap-3">
        <button
          onClick={() => router.push(`/case/${type}`)}
          className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
        >
          ←
        </button>
        <div>
          <p className="text-xs text-gray-400">
            {row?.stores?.store_code ?? ''} {row?.stores?.store_name ?? ''}
            {row?.case_number ? ` · ${row.case_number}` : ''}
          </p>
          <p className="font-semibold" style={{ color: accent }}>
            {TYPE_LABEL[type]}
          </p>
        </div>
        {canCancel && !showCancelForm && (
          <button
            onClick={() => setShowCancelForm(true)}
            className="ml-auto text-xs text-red-400 hover:text-red-500 underline"
          >
            ยกเลิกเคสนี้
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-0 py-8">
        {showCancelForm && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-red-200 p-6 sm:p-8 mb-4">
            <p className="text-lg font-semibold text-red-600 mb-1">ยืนยันการยกเลิกเคสนี้</p>
            <p className="text-sm text-gray-400 mb-4">
              ข้อมูลจะไม่ถูกลบ แค่เปลี่ยนสถานะเป็น &ldquo;ยกเลิก&rdquo; เก็บไว้ตรวจสอบย้อนหลังได้
            </p>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              เหตุผลที่ยกเลิก <span className="text-red-400">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="เช่น กรอกร้านค้าผิด, ลูกค้ายกเลิกคำขอ"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 text-gray-800 mb-4"
            />
            {error && (
              <p className="text-sm text-red-500 text-center bg-red-50 py-2 px-4 rounded-lg mb-4">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelForm(false)
                  setCancelReason('')
                  setError('')
                }}
                className="px-5 py-3 rounded-xl border border-gray-200 text-gray-500 font-medium"
              >
                ไม่ยกเลิก
              </button>
              <button
                onClick={handleCancelCase}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition disabled:opacity-50"
              >
                {cancelling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกเคส'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          {isCancelled ? (
            <div className="text-center py-10">
              <p className="text-2xl mb-2">🚫</p>
              <p className="text-lg font-semibold text-gray-800">เคสนี้ถูกยกเลิกแล้ว</p>
              {row?.cancelled_reason && (
                <p className="text-sm text-gray-400 mt-2">เหตุผล: {row.cancelled_reason}</p>
              )}
            </div>
          ) : isDone ? (
            <div className="text-center py-10">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-lg font-semibold text-gray-800">รายการนี้เสร็จสมบูรณ์แล้ว</p>
              <p className="text-sm text-gray-400 mt-1">CN: {row?.cn_usage_status}</p>
            </div>
          ) : !canActThisStep ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">⏳</p>
              <p className="text-lg font-semibold text-gray-800">ยังไม่ถึงคิวของคุณ</p>
              <p className="text-sm text-gray-400 mt-1">
                ขั้นตอนนี้เป็นหน้าที่ของ <span className="font-medium">{step?.role}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                (role ของคุณตอนนี้คือ &ldquo;{employee?.role}&rdquo;)
              </p>
              <p className="text-xs text-gray-400 mt-4">
                ขั้นตอนที่ {currentStep} / {totalSteps} — {step?.title}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-1">
                ขั้นตอนที่ {currentStep} / {totalSteps} · รับผิดชอบโดย {step?.role}
              </p>
              <h2 className="text-lg font-semibold text-gray-800 mb-6">{step?.title}</h2>

              <div className="space-y-5">
                {visibleFields.map((field) => (
                  <div key={field.key}>
                    {field.type !== 'items' && (
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                    )}

                    {field.type === 'text' && (
                      <input
                        type="text"
                        value={values[field.key] ?? ''}
                        onChange={(e) => setValue(field.key, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 text-gray-800"
                      />
                    )}

                    {field.type === 'number' && (
                      <input
                        type="number"
                        value={values[field.key] ?? ''}
                        onChange={(e) => setValue(field.key, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 text-gray-800"
                      />
                    )}

                    {field.type === 'date' && (
                      <input
                        type="date"
                        value={values[field.key] ?? ''}
                        onChange={(e) => setValue(field.key, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 text-gray-800"
                      />
                    )}

                    {field.type === 'checkbox' && (
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!values[field.key]}
                          onChange={(e) => setValue(field.key, e.target.checked)}
                          className="w-4 h-4"
                        />
                        ยืนยัน
                      </label>
                    )}

                    {field.type === 'select' && (
                      <select
                        value={values[field.key] ?? ''}
                        onChange={(e) => setValue(field.key, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 text-gray-800"
                      >
                        <option value="">-- เลือก --</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}

                    {field.type === 'photo' && field.camera !== false && (
                      <CameraCapture
                        existingUrl={values[field.key]}
                        onCapture={(file) =>
                          setFiles((prev) => ({ ...prev, [field.key]: file }))
                        }
                      />
                    )}

                    {field.type === 'photo' && field.camera === false && (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setFiles((prev) => ({ ...prev, [field.key]: e.target.files?.[0] }))
                          }
                          className="w-full text-sm text-gray-600"
                        />
                        {values[field.key] && !files[field.key] && (
                          <p className="text-xs text-gray-400 mt-1">มีรูปแล้ว (อัปโหลดใหม่เพื่อแทนที่)</p>
                        )}
                      </div>
                    )}

                    {field.type === 'signature' && (
                      <SignaturePad
                        existingUrl={values[field.key]}
                        onSign={(file) =>
                          setFiles((prev) => ({ ...prev, [field.key]: file }))
                        }
                      />
                    )}

                    {field.type === 'items' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          {field.label} <span className="text-red-400">*</span>
                        </label>
                        <div className="space-y-2">
                          {items.map((it, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                type="text"
                                placeholder="รหัสสินค้า"
                                value={it.item_code}
                                onChange={(e) => updateItemRow(idx, { item_code: e.target.value })}
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                              />
                              <input
                                type="number"
                                placeholder="ยอดเงิน"
                                value={it.amount}
                                onChange={(e) => updateItemRow(idx, { amount: e.target.value })}
                                className="w-32 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                              />
                              {items.length > 1 && (
                                <button
                                  onClick={() => removeItemRow(idx)}
                                  className="px-3 text-gray-400 hover:text-red-500"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={addItemRow}
                          className="mt-2 text-sm font-medium"
                          style={{ color: accent }}
                        >
                          + เพิ่มรายการสินค้า
                        </button>
                        <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 flex justify-between">
                          <span>ยอดรวมทั้งหมด</span>
                          <span className="font-semibold">{itemsTotal.toLocaleString()} บาท</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center bg-red-50 py-2 px-4 rounded-lg mt-4">
                  {error}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                {currentStep > 2 && (
                  <button
                    onClick={goBackStep}
                    className="px-5 py-3 rounded-xl border border-gray-200 text-gray-500 font-medium"
                  >
                    ย้อนกลับ
                  </button>
                )}
                <button
                  onClick={handleSubmitStep}
                  disabled={saving || !canSubmitStep}
                  className="flex-1 py-3 rounded-xl text-white font-semibold transition disabled:opacity-40"
                  style={{ backgroundColor: accent }}
                >
                  {saving ? 'กำลังบันทึก...' : isLastStep ? 'บันทึกและจบงาน' : 'บันทึกและไปต่อ'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}