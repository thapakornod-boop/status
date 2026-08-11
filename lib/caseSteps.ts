// lib/caseSteps.ts
// Central config: edit step titles / fields / required rules / roles here once,
// both the wizard page and the status tracker page read from this file.

export type CaseType = 'sales' | 'transport'

export type FieldType = 'text' | 'number' | 'photo' | 'checkbox' | 'select' | 'date' | 'items' | 'signature'

// role ของพนักงาน (ต้องตรงกับ constraint ในตาราง employees)
export type EmployeeRole = 'sales' | 'wh' | 'admin' | 'head' | 'hr'

export const ROLE_LABEL: Record<EmployeeRole, string> = {
  sales: 'เซลล์',
  wh: 'คลัง/ขนส่ง',
  admin: 'แอดมิน (LG)',
  head: 'หัวหน้า (ดูภาพรวม)',
  hr: 'ฝ่ายบุคคล',
}

export type FieldDef = {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: string[]
  camera?: boolean // for type 'photo': true = force camera capture, false = allow gallery pick
  showIf?: (values: Record<string, any>) => boolean
}

export type StepDef = {
  title: string
  role: string // display label shown in the status tracker (free text)
  accessRole: 'sales' | 'wh' | 'admin' // who is ALLOWED to submit this step
  fields: FieldDef[]
}

export const TABLE_BY_TYPE: Record<CaseType, string> = {
  sales: 'case1_sales_pickup',
  transport: 'case2_transport_pickup',
}

export const ITEMS_TABLE_BY_TYPE: Record<CaseType, string> = {
  sales: 'case1_sales_items',
  transport: 'case2_transport_items',
}

export const ACCENT_BY_TYPE: Record<CaseType, string> = {
  sales: '#3B9EE8',
  transport: '#F2994A',
}

export const TYPE_LABEL: Record<CaseType, string> = {
  sales: 'เซลล์',
  transport: 'ขนส่ง',
}

export const TOTAL_STEPS: Record<CaseType, number> = {
  sales: 7,
  transport: 12,
}

// step 1 (เลือกร้านค้า) เป็นหน้าที่ sales เสมอ ทั้งสอง type
export const STEP1_ACCESS_ROLE: 'sales' = 'sales'

// ---------------------------------------------------------
// Step 1 = เลือกร้านค้า (already handled in app/case/[type]/page.tsx)
// Below = step 2 onward
// ---------------------------------------------------------
export const STEPS: Record<CaseType, StepDef[]> = {
  sales: [
    {
      title: 'ของหมดอายุที่ร้านค้า + ขออนุมัติจากหัวหน้า',
      role: 'Sales',
      accessRole: 'sales',
      fields: [
        { key: 'expired_photo_url', label: 'รูปของหมดอายุที่ร้านค้า', type: 'photo', required: true, camera: true },
        { key: 'items', label: 'รายการสินค้าที่เสียหาย', type: 'items', required: true },
      ],
    },
    {
      title: 'หัวหน้าอนุมัติ + เขียน SRN',
      role: 'Sales',
      accessRole: 'sales',
      fields: [
        { key: 'approval_email_photo_url', label: 'รูปอีเมล/แชทที่หัวหน้าอนุมัติ', type: 'photo', required: true, camera: false },
        { key: 'srn_number', label: 'เลขที่ SRN', type: 'text', required: true },
        { key: 'srn_photo_url', label: 'รูปใบ SRN', type: 'photo', required: true, camera: true },
      ],
    },
    {
      title: 'รับสินค้า / นำเข้าคลัง / หัวหน้าคลังเซ็น',
      role: 'Sales',
      accessRole: 'sales',
      fields: [
        { key: 'srn_signed_photo_url', label: 'รูปร้านค้าเซ็นใน SRN (ตัวบรรจง)', type: 'photo', required: true, camera: true },
        { key: 'warehouse_in_photo_url', label: 'รูปนำสินค้าเข้าคลัง', type: 'photo', required: true, camera: true },
        { key: 'warehouse_supervisor_sign_photo_url', label: 'รูปหัวหน้าคลังเซ็นรับสินค้า', type: 'photo', required: true, camera: true },
        { key: 'system_signature_url', label: 'เซ็นยอมรับว่าได้รับสินค้าครบถ้วน', type: 'signature', required: true },
        { key: 'item_mismatch', label: 'สินค้าไม่ตรงกับ SRN', type: 'checkbox' },
        {
          key: 'item_mismatch_note',
          label: 'บันทึกการแก้ไข (ให้ร้านค้าเซ็นกำกับ)',
          type: 'text',
          showIf: (v) => !!v.item_mismatch,
        },
      ],
    },
    {
      title: 'คลังนับสินค้ากระทบ SRN + ส่งเอกสารให้แอดมิน',
      role: 'คลัง/ขนส่ง',
      accessRole: 'wh',
      fields: [
        {
          key: 'warehouse_count_match',
          label: 'ผลการนับสินค้า',
          type: 'select',
          required: true,
          options: ['ตรงกับ SRN', 'ไม่ตรงกับ SRN'],
        },
        {
          key: 'warehouse_diff_note',
          label: 'ส่วนต่าง (Sales รับผิดชอบ)',
          type: 'text',
          showIf: (v) => v.warehouse_count_match === 'ไม่ตรงกับ SRN',
        },
        { key: 'docs_handoff_photo_url', label: 'รูปส่งเอกสารให้แอดมิน (รับกับมือ)', type: 'photo', required: true, camera: true },
      ],
    },
    {
      title: 'แอดมินออก CN',
      role: 'แอดมิน (LG)',
      accessRole: 'admin',
      fields: [
        { key: 'cn_number', label: 'รหัส CN', type: 'text', required: true },
        { key: 'cn_photo_url', label: 'รูปเอกสาร CN', type: 'photo', required: true, camera: true },
      ],
    },
    {
      title: 'Sales นำ CN ไปให้ร้านค้า',
      role: 'Sales',
      accessRole: 'sales',
      fields: [
        { key: 'cn_usage_photo_url', label: 'รูปหลักฐานการใช้ CN', type: 'photo', required: true, camera: true },
        {
          key: 'cn_usage_status',
          label: 'CN มีการนำมาใช้หรือยัง',
          type: 'select',
          required: true,
          options: ['ยังไม่ได้ใช้', 'มีการนำมาใช้แล้ว'],
        },
      ],
    },
  ],

  transport: [
    {
      title: 'ของหมดอายุที่ร้านค้า',
      role: 'Sales',
      accessRole: 'sales',
      fields: [
        { key: 'expired_photo_url', label: 'รูปของหมดอายุที่ร้านค้า', type: 'photo', required: true, camera: true },
        { key: 'items', label: 'รายการสินค้าที่เสียหาย', type: 'items', required: true },
      ],
    },
    {
      title: 'ขออนุมัติจากหัวหน้า',
      role: 'Sales',
      accessRole: 'sales',
      fields: [{ key: 'approval_requested_at', label: 'ส่งขออนุมัติแล้ว', type: 'checkbox', required: true }],
    },
    {
      title: 'หัวหน้าอนุมัติ',
      role: 'Sales',
      accessRole: 'sales',
      fields: [
        { key: 'approval_email_photo_url', label: 'รูปอีเมล/แชทที่หัวหน้าอนุมัติ', type: 'photo', required: true, camera: false },
        { key: 'supervisor_approved', label: 'หัวหน้าอนุมัติแล้ว', type: 'checkbox', required: true },
      ],
    },
    {
      title: 'เขียน SRN',
      role: 'Sales',
      accessRole: 'sales',
      fields: [
        { key: 'srn_number', label: 'เลขที่ SRN', type: 'text', required: true },
        { key: 'srn_photo_url', label: 'รูปใบ SRN', type: 'photo', required: true, camera: true },
      ],
    },
    {
      title: 'ส่ง SRN ให้ขนส่ง + แจ้ง LG ทางอีเมล',
      role: 'Sales',
      accessRole: 'sales',
      fields: [
        { key: 'srn_sent_to_transport', label: 'ส่ง SRN ฉบับจริงให้ขนส่งแล้ว', type: 'checkbox', required: true },
        { key: 'lg_email_sent', label: 'ส่งอีเมลแจ้ง LG (แนบรูป SRN) แล้ว', type: 'checkbox', required: true },
      ],
    },
    {
      title: 'ขนส่งรับสินค้า + ร้านค้าเซ็น SRN',
      role: 'คลัง/ขนส่ง',
      accessRole: 'wh',
      fields: [
        { key: 'srn_signed_photo_url', label: 'รูปร้านค้าเซ็นใน SRN (ตัวบรรจง)', type: 'photo', required: true, camera: true },
        { key: 'item_mismatch', label: 'สินค้าไม่ตรงกับ SRN', type: 'checkbox' },
        {
          key: 'item_mismatch_note',
          label: 'บันทึกการแก้ไข (ให้ร้านค้าเซ็นกำกับ)',
          type: 'text',
          showIf: (v) => !!v.item_mismatch,
        },
      ],
    },
    {
      title: 'ขนส่งนำของเข้าคลัง',
      role: 'คลัง/ขนส่ง',
      accessRole: 'wh',
      fields: [{ key: 'warehouse_in_photo_url', label: 'รูปนำสินค้าเข้าคลัง', type: 'photo', required: true, camera: true }],
    },
    {
      title: 'คลังนับสินค้ากระทบ SRN',
      role: 'คลัง/ขนส่ง',
      accessRole: 'wh',
      fields: [
        {
          key: 'warehouse_count_match',
          label: 'ผลการนับสินค้า',
          type: 'select',
          required: true,
          options: ['ตรงกับ SRN', 'ไม่ตรงกับ SRN'],
        },
        {
          key: 'warehouse_diff_note',
          label: 'ส่วนต่าง (ขนส่งรับผิดชอบ)',
          type: 'text',
          showIf: (v) => v.warehouse_count_match === 'ไม่ตรงกับ SRN',
        },
        { key: 'warehouse_supervisor_sign_photo_url', label: 'รูปหัวหน้าคลังเซ็นรับสินค้า', type: 'photo', required: true, camera: true },
      ],
    },
    {
      title: 'คลังส่งเอกสารให้แอดมิน',
      role: 'คลัง/ขนส่ง',
      accessRole: 'wh',
      fields: [{ key: 'docs_handoff_photo_url', label: 'รูปส่งเอกสารให้แอดมิน (รับกับมือ)', type: 'photo', required: true, camera: true }],
    },
    {
      title: 'แอดมินออก CN',
      role: 'แอดมิน (LG)',
      accessRole: 'admin',
      fields: [
        { key: 'cn_number', label: 'รหัส CN', type: 'text', required: true },
        { key: 'cn_photo_url', label: 'รูปเอกสาร CN', type: 'photo', required: true, camera: true },
      ],
    },
    {
      title: 'Sales นำ CN ไปให้ร้านค้า',
      role: 'Sales',
      accessRole: 'sales',
      fields: [
        { key: 'cn_usage_photo_url', label: 'รูปหลักฐานการใช้ CN', type: 'photo', required: true, camera: true },
        {
          key: 'cn_usage_status',
          label: 'CN มีการนำมาใช้หรือยัง',
          type: 'select',
          required: true,
          options: ['ยังไม่ได้ใช้', 'มีการนำมาใช้แล้ว'],
        },
      ],
    },
  ],
}

// ---------------------------------------------------------
// Role helper functions
// ---------------------------------------------------------

// คืนรายชื่อ step number (2..N) ที่ role นี้ทำได้ สำหรับ type นี้
export function getQueueStepNumbers(type: CaseType, role: EmployeeRole): number[] {
  if (role === 'head' || role === 'hr') return [] // head ดูอย่างเดียว ไม่มีคิวงาน
  return STEPS[type]
    .map((s, i) => ({ stepNumber: i + 2, accessRole: s.accessRole }))
    .filter((s) => s.accessRole === role)
    .map((s) => s.stepNumber)
}

// เช็คว่า role นี้ทำ step นี้ได้ไหม (step 1 = เลือกร้านค้า ถือเป็นหน้าที่ sales เสมอ)
export function canActOnStep(type: CaseType, stepNumber: number, role: EmployeeRole): boolean {
  if (role === 'head' || role === 'hr') return false // ดูได้อย่างเดียว แก้ไม่ได้
  if (stepNumber === 1) return role === STEP1_ACCESS_ROLE
  const step = STEPS[type][stepNumber - 2]
  return step?.accessRole === role
}