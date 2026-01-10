'use client'

import { useEffect, useState } from 'react'
import { supabase,IssueReport,LocationFeature, LocationProperties, GeoJsonResponse, SelectedQrPoint} from '@/lib/supabase'
import QRCode from "react-qr-code"

const BASE_URL = process.env.VERCEL_URL || 'https://agile-skills.vercel.app'

export default function AdminPage() {
    const [issueReports, setIssueReports] = useState<IssueReport[]>([])
     const [search, setSearch] = useState("")
    const [allLocations, setAllLocations] = useState<LocationFeature[]>([])
const [selectedQrPoint, setSelectedQrPoint] =
  useState<SelectedQrPoint | null>(null)
    const [filteredLocations, setFilteredLocations] = useState<LocationFeature[]>([])
    const [activeTab, setActiveTab] = useState<'generator' | 'issueReports'>('generator')

    useEffect(() => {
        const fetchReportsAndLocations = async() => {
            try {
                 const { data: reports} = await supabase.from('reports').select('*').order('created_at', { ascending: false })
            setIssueReports(reports || [])

          const response = await fetch('https://data.stad.gent/api/explore/v2.1/catalog/datasets/drinkwaterplekken-gent/exports/geojson')
                const data = (await response.json()) as GeoJsonResponse
const processedFeatures = (data.features || []).map((feature: any) => {
                    const props = feature.properties;
                    let finalId = "";

                    
                    if (props.objectid_1 && String(props.objectid_1) !== "0") {
                        finalId = String(props.objectid_1);
                    }
                    else if (props.objectid && String(props.objectid) !== "0") {
                        finalId = String(props.objectid);
                    }
                 
                    else if (props.recordid) {
                        finalId = props.recordid;
                    }

                    else if (feature.geometry?.coordinates) {
                         const [lat, lon] = feature.geometry.coordinates;
                         finalId = `loc-${String(lat).replace('.','').slice(0,8)}-${String(lon).replace('.','').slice(0,8)}`;
                    }

                    if (!finalId) finalId = `unknown-${Math.random()}`;

                   
                    return {
                        ...feature,
                        properties: { ...props, fixedId: finalId }
                    };
                });
                
                setAllLocations(processedFeatures)
            } catch (error) {
                console.error("Error fetching data:", error)
            }
           
        }

        fetchReportsAndLocations()
    }, [])


     useEffect(() => {
    if (!search) {
        setFilteredLocations(allLocations)
    } else {
        const lowerSearch = search.toLowerCase()
        const filtered = allLocations.filter(p => {
            const name = p.properties.naam || p.properties.beschrijving || ""
            const street = p.properties.straatnaam || p.properties.straat || ""
            return name.toLowerCase().includes(lowerSearch) || street.toLowerCase().includes(lowerSearch)
        })
        setFilteredLocations(filtered)
    }
  }, [search, allLocations])

  const getLocationId = (props: any) => {
    if (props.objectid) return String(props.objectid);
    if (props.recordid) return props.recordid;
    if (props.id) return props.id;

    return "onbekend" + Math.random().toString(36).substr(2, 9);
  }

  const getLocationName = (props: any) => {
    return props.naam || props.beschrijving || props.Naam || "Locatie zonder naam";
  }
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
            <div className="flex gap-2">
                <button 
                    onClick={() => setActiveTab('generator')}
                    className={`px-4 py-2 rounded font-bold ${activeTab === 'generator' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
                >
                    QR Stickers Maken
                </button>
                <button 
                    onClick={() => setActiveTab('issueReports')}
                    className={`px-4 py-2 rounded font-bold ${activeTab === 'issueReports' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
                >
                    Inkomende Meldingen ({issueReports.length})
                </button>
            </div>

            {activeTab === 'generator' && (
                <div className="mt-6 flex gap-6 h-full">
                  
                    <div className="flex-1 flex flex-col">
                        <h2 className="text-xl font-semibold mb-4">QR Stickers Maken</h2>
                        <input type="text" placeholder='Search here' value={search} onChange={(e) => setSearch(e.target.value)} className="border p-2 rounded w-full mb-4" />
                        <div className="overflow-y-auto flex-1 border rounded">
                            {filteredLocations.map((location, index) => {
                                const locationId =location.properties.fixedId || "unknown"
                                const locationName = getLocationName(location.properties)
                                const address = location.properties.straatnaam || location.properties.adres || location.properties.locatie || ""
                                return (
                                    <div key={index} className="border-b p-4 hover:bg-blue-50 transition cursor-pointer" onClick={() => setSelectedQrPoint({ id: locationId, naam: locationName, adres: address })}>
                                        <div className="font-bold text-gray-800">{locationName}</div>
                                        <div className="text-sm text-gray-500">{address}</div>
                                        <div className="text-xs text-gray-300 font-mono mt-1">{locationId}</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                
                    <div className="w-80 flex flex-col">
                        {selectedQrPoint ? (
                            <>
                                <h3 className="text-xl font-bold mb-1 text-blue-900">QR Sticker</h3>
                                <p className="text-sm text-gray-500 mb-6">{selectedQrPoint.naam}</p>

                                <div className="bg-white border-4 border-black p-4 rounded-lg mb-4 flex justify-center">
                                    <QRCode 
                                        value={`${BASE_URL}/?id=${selectedQrPoint.id}`} 
                                        size={180} 
                                    />
                                </div>

                                <p className="text-xs text-gray-400 break-all font-mono bg-gray-50 p-2 rounded mb-4">
                                    {BASE_URL}/?id={selectedQrPoint.id}
                                </p>

                                <button 
                                    onClick={() => window.print()}
                                    className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800"
                                >
                                    Print qr code
                                </button>
                            </>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                                <p className="text-center text-sm">Selecteer een locatie uit de lijst om de QR code te maken.</p>
                            </div>
                        )}
                    </div>
                </div>

            )}

            {activeTab === 'issueReports' && (
                <div className="mt-6">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Datum</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Probleem</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Melding</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {issueReports.map((report) => (
                                <tr key={report.id}>
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(report.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4"><span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">{report.issue_type}</span></td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{report.description}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{report.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            
        </div>
    )
}
