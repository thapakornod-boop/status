import { supabase } from '@/lib/supabase'

// stepKey เช่น 'expired_item', 'srn_signed', 'cn_issued' ฯลฯ
// (ตั้งชื่อให้ตรงกับคอลัมน์ _photo_url ในตาราง case1/case2 เพื่อไม่งง)
export async function uploadPhoto(
  file: File,
  caseType: 'sales' | 'transport',
  recordId: string,
  stepKey: string
) {
  const path = `${caseType}/${recordId}/${stepKey}.jpg`

  const { error } = await supabase.storage
    .from('attachments')
    .upload(path, file, { upsert: true }) // upsert = อัปโหลดซ้ำ/แก้รูปทับได้

  if (error) throw error

  const { data } = supabase.storage.from('attachments').getPublicUrl(path)
  return data.publicUrl
}