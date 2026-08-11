'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')
  const [idCard, setIdCard] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: dbError } = await supabase
        .from('employees')
        .select('id, employee_id, name, role')
        .eq('employee_id', employeeId.trim())
        .eq('id_card', idCard.trim())
        .single()

      if (dbError || !data) {
        setError('รหัสพนักงานหรือเลขบัตรประชาชนไม่ถูกต้อง')
        setLoading(false)
        return
      }

      localStorage.setItem('employee', JSON.stringify(data))

      const role = data.role?.toLowerCase()
      if (role === 'admin') {
        router.push('/admin')
      } else if (role === 'hr') {
        router.push('/hr')
      } else {
        router.push('/select') // <-- เดิมคือ /dashboard เปลี่ยนมาที่หน้าเลือกฝั่ง
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg px-10 py-12">
          <div className="flex justify-center mb-8">
            <Image src="/logo.png" alt="R8M Group" width={100} height={100} priority />
          </div>

          <h1 className="text-2xl font-semibold text-center text-gray-800 mb-1">
            เข้าสู่ระบบ
          </h1>
          <p className="text-sm text-center text-gray-400 mb-8">
            R8M Group Employee Portal
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                รหัสพนักงาน
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="เช่น SDO0586"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200
                           focus:outline-none focus:ring-2 focus:ring-[#3B9EE8]
                           focus:border-transparent text-gray-800 placeholder-gray-300
                           transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                เลขบัตรประชาชน
              </label>
              <input
                type="password"
                value={idCard}
                onChange={(e) => setIdCard(e.target.value)}
                placeholder="กรอกเลข 13 หลัก"
                required
                maxLength={13}
                className="w-full px-4 py-3 rounded-xl border border-gray-200
                           focus:outline-none focus:ring-2 focus:ring-[#3B9EE8]
                           focus:border-transparent text-gray-800 placeholder-gray-300
                           transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center bg-red-50 py-2 px-4 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#3B9EE8] hover:bg-[#2b8fd8]
                         text-white font-semibold text-base transition
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          © 2025 R8M Group. All rights reserved.
        </p>
      </div>
    </main>
  )
}