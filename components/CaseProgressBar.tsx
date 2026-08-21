'use client'

import { STEPS, ACCENT_BY_TYPE, CaseType } from '@/lib/caseSteps'

type Props = {
  type: CaseType
  currentStep: number // 1..7
  status: string // 'in_progress' | 'completed' | 'cancelled'
  // ชื่อผู้ทำแต่ละ step: key = step number (1 = เลือกร้านค้า, 2..7 = STEPS[type])
  stepActorNames?: Record<number, string>
}

// รวม Step 1 + Step 2-7
function getFullStepList(type: CaseType) {
  return [
    { title: 'เลือกร้านค้า', role: 'Sales' },
    ...STEPS[type].map((s) => ({
      title: s.title,
      role: s.role,
    })),
  ]
}

export default function CaseProgressBar({
  type,
  currentStep,
  status,
  stepActorNames = {},
}: Props) {
  const steps = getFullStepList(type)
  const accent = ACCENT_BY_TYPE[type]

  const isCancelled = status === 'cancelled'
  const isCompleted = status === 'completed'

  const safeCurrentStep = Math.min(
    Math.max(currentStep || 1, 1),
    steps.length
  )

  const current = steps[safeCurrentStep - 1]

  // ชื่อคนที่ทำ step ก่อนหน้า (คนที่ "ส่งงาน" มาถึงขั้นตอนปัจจุบัน)
  const previousActorName =
    !isCompleted && !isCancelled
      ? stepActorNames[safeCurrentStep - 1]
      : undefined

  const progressPercent =
    isCompleted
      ? 100
      : isCancelled
        ? 0
        : ((safeCurrentStep - 1) / (steps.length - 1)) * 100

  return (
    <div className="space-y-4">

      {/* =========================================================
          HEADER
      ========================================================= */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
            Case Progress
          </p>

          <p className="mt-1 text-sm font-semibold text-gray-900">
            {isCancelled
              ? 'กระบวนการถูกยกเลิก'
              : isCompleted
                ? 'ดำเนินการครบทุกขั้นตอน'
                : current?.title ?? 'กำลังดำเนินการ'}
          </p>
        </div>

        <div
          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold"
          style={{
            backgroundColor: isCancelled
              ? '#F3F4F6'
              : isCompleted
                ? '#ECFDF5'
                : `${accent}12`,
            color: isCancelled
              ? '#9CA3AF'
              : isCompleted
                ? '#059669'
                : accent,
          }}
        >
          {isCancelled
            ? 'CANCELLED'
            : isCompleted
              ? 'COMPLETED'
              : `${safeCurrentStep} / ${steps.length}`}
        </div>
      </div>

      {/* =========================================================
          PROGRESS BAR
      ========================================================= */}
      <div className="relative pt-2">

        {/* Background line */}
        <div
          className="absolute left-0 right-0 top-[17px] h-1 rounded-full"
          style={{
            backgroundColor: '#E5E7EB',
          }}
        />

        {/* Active line */}
        <div
          className="absolute left-0 top-[17px] h-1 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: isCancelled ? '#D1D5DB' : accent,
            boxShadow:
              !isCancelled && !isCompleted
                ? `0 0 10px ${accent}35`
                : 'none',
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, i) => {
            const stepNumber = i + 1

            const isDone =
              isCompleted || stepNumber < safeCurrentStep

            const isCurrent =
              !isCompleted &&
              !isCancelled &&
              stepNumber === safeCurrentStep

            const isPending =
              !isDone && !isCurrent

            const actorName = stepActorNames[stepNumber]

            return (
              <div
                key={stepNumber}
                className="flex min-w-0 flex-1 flex-col items-center"
              >

                {/* Circle */}
                <div
                  className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white text-[11px] font-bold shadow-sm transition-all duration-500"
                  style={{
                    backgroundColor: isCancelled
                      ? '#E5E7EB'
                      : isDone
                        ? accent
                        : isCurrent
                          ? '#FFFFFF'
                          : '#F3F4F6',

                    color: isCancelled
                      ? '#9CA3AF'
                      : isDone
                        ? '#FFFFFF'
                        : isCurrent
                          ? accent
                          : '#9CA3AF',

                    borderColor:
                      isCurrent && !isCancelled
                        ? `${accent}55`
                        : '#FFFFFF',

                    boxShadow:
                      isCurrent && !isCancelled
                        ? `0 0 0 5px ${accent}12, 0 4px 12px ${accent}20`
                        : isDone
                          ? `0 3px 8px ${accent}25`
                          : '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                  title={actorName ? `ทำโดย: ${actorName}` : undefined}
                >
                  {isDone ? '✓' : stepNumber}

                  {/* Current pulse */}
                  {isCurrent && (
                    <span
                      className="absolute inset-[-5px] animate-ping rounded-full opacity-20"
                      style={{
                        backgroundColor: accent,
                      }}
                    />
                  )}
                </div>

                {/* Step number / title */}
                <div className="mt-2 w-full px-1 text-center">
                  <p
                    className="text-[9px] font-semibold uppercase tracking-wide"
                    style={{
                      color: isCurrent
                        ? accent
                        : isDone
                          ? '#6B7280'
                          : '#B9BDC5',
                    }}
                  >
                    Step {stepNumber}
                  </p>

                  <p
                    className="mt-0.5 hidden truncate text-[10px] font-medium sm:block"
                    title={step.title}
                    style={{
                      color: isCurrent
                        ? '#111827'
                        : isDone
                          ? '#6B7280'
                          : '#B9BDC5',
                    }}
                  >
                    {step.title}
                  </p>

                  {/* ชื่อผู้ทำ step นี้ (ถ้ามี) */}
                  {isDone && actorName && (
                    <p
                      className="mt-0.5 hidden truncate text-[9px] font-medium text-gray-400 sm:block"
                      title={`ทำโดย: ${actorName}`}
                    >
                      👤 {actorName}
                    </p>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      </div>

      {/* =========================================================
          CURRENT STATUS CARD
      ========================================================= */}
      <div
        className="relative overflow-hidden rounded-2xl border px-4 py-3.5"
        style={{
          backgroundColor: isCancelled
            ? '#FEF2F2'
            : isCompleted
              ? '#ECFDF5'
              : `${accent}08`,
          borderColor: isCancelled
            ? '#FECACA'
            : isCompleted
              ? '#A7F3D0'
              : `${accent}20`,
        }}
      >

        {/* Accent line */}
        {!isCancelled && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
            style={{
              backgroundColor: isCompleted ? '#10B981' : accent,
            }}
          />
        )}

        {isCancelled ? (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-sm">
              ✕
            </div>

            <div>
              <p className="text-sm font-bold text-red-600">
                เคสนี้ถูกยกเลิกแล้ว
              </p>

              <p className="mt-0.5 text-xs text-red-400">
                กระบวนการนี้ไม่สามารถดำเนินการต่อได้
              </p>
            </div>
          </div>
        ) : isCompleted ? (
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm text-emerald-600">
              ✓
            </div>

            <div>
              <p className="text-sm font-bold text-emerald-600">
                ดำเนินการเสร็จสมบูรณ์
              </p>

              <p className="mt-0.5 text-xs text-emerald-500">
                เคสนี้ผ่านครบทุกขั้นตอนแล้ว
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">

            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm"
              style={{
                backgroundColor: `${accent}15`,
                color: accent,
              }}
            >
              ●
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-gray-800">
                  {current?.title}
                </p>

                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                  style={{
                    backgroundColor: `${accent}15`,
                    color: accent,
                  }}
                >
                  {current?.role}
                </span>
              </div>

              <p className="mt-1 text-xs text-gray-400">
                รอดำเนินการต่อที่แผนก{' '}
                <span
                  className="font-semibold"
                  style={{ color: accent }}
                >
                  {current?.role}
                </span>
              </p>

              {/* ใครเป็นคนส่งงานมาถึงขั้นตอนนี้ */}
              {previousActorName && (
                <p className="mt-1 text-[11px] text-gray-400">
                  ส่งต่อมาจาก:{' '}
                  <span className="font-semibold text-gray-600">
                    👤 {previousActorName}
                  </span>
                </p>
              )}
            </div>

            <div
              className="hidden shrink-0 text-right sm:block"
            >
              <p className="text-[9px] font-medium uppercase tracking-wider text-gray-400">
                Progress
              </p>

              <p
                className="mt-0.5 text-lg font-bold"
                style={{ color: accent }}
              >
                {Math.round(progressPercent)}%
              </p>
            </div>

          </div>
        )}
      </div>

    </div>
  )
}