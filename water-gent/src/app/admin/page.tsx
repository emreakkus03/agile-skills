'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import QRCode from "react-qr-code"

// JOUW LIVE URL (Verander dit naar je Vercel link!)
const BASE_URL = "https://gent-water-mvp.vercel.app"; 

export default function AdminPage() {
  const [reports, setReports] = useState<any[]>([])
  const [qrId, setQrId] = useState("") // <--- Om een QR te maken

  // ... (Je fetchReports en updateStatus functies blijven hetzelfde als voorheen) ...
  useEffect(() => {
    const fetchReports = async () => {
        const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
        setReports(data || [])
    }
    fetchReports()
  }, [])
  
  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-8">Admin & QR Tool</h1>

      {/* DE AUTOMATISCHE QR GENERATOR */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl mb-10 flex gap-8 items-center shadow-sm">
        <div className="flex-1">
            <h2 className="text-xl font-bold mb-2 text-blue-900">QR Code Generator</h2>
            <p className="text-sm text-blue-700 mb-4">
                Plak hier het ID van een waterpunt om direct de unieke sticker te genereren.
            </p>
            <input 
                type="text" 
                placeholder="bv. http://stad.gent/id/public-toilets/inffma-pubsan203"
                className="w-full p-3 border rounded mb-2"
                value={qrId}
                onChange={(e) => setQrId(e.target.value)}
            />
            <p className="text-xs text-gray-500">
                Link: {BASE_URL}/?id={qrId}
            </p>
        </div>
        
        {/* Het QR plaatje */}
        <div className="bg-white p-4 rounded shadow-md border">
            {qrId ? (
                <QRCode value={`${BASE_URL}/?id=${qrId}`} size={120} />
            ) : (
                <div className="w-[120px] h-[120px] bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center">
                    Typ een ID
                </div>
            )}
        </div>
      </div>

      {/* TWEEDE OPTIE: QR Knoppen in je tabel (Als je die al hebt) */}
      <h2 className="text-2xl font-bold mb-4">Recente Meldingen</h2>
      <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Punt ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Probleem</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actie</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate">
                    {report.waterpunt_id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {report.description}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {/* KNOP: Genereer QR voor dit specifieke punt */}
                    <button 
                        onClick={() => setQrId(report.waterpunt_id)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded"
                    >
                        Maak QR ➡️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </div>
  )
}