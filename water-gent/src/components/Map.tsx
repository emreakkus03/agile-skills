'use client'

import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'

// Icon setup
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

// Hulpcomponent voor vliegen naar punt
function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.flyTo(center, 18)
    }
  }, [center, map])
  return null
}

export default function Map() {
  const searchParams = useSearchParams()
  const urlId = searchParams.get('id')

  const [waterPoints, setWaterPoints] = useState<any[]>([])
  const [issueOptions, setIssueOptions] = useState<any[]>([]) 
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)

  // State voor het formulier
  const [selectedPoint, setSelectedPoint] = useState<any>(null) 
  const [showReportForm, setShowReportForm] = useState(false) // <--- NIEUW: Schakelen tussen info en formulier
  const [issueType, setIssueType] = useState('') 
  const [isSubmitting, setIsSubmitting] = useState(false) 

  // Reset formulier view als we een nieuw punt openen
  const handlePointClick = (point: any) => {
      setSelectedPoint(point);
      setShowReportForm(false); // Altijd beginnen met de Info weergave
  }

  // Data ophalen en verwerken (Onze fixedId logica)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [res1, resOptions] = await Promise.all([
          fetch('https://data.stad.gent/api/explore/v2.1/catalog/datasets/drinkwaterplekken-gent/exports/geojson'),
          supabase.from('issue_types').select('*') 
        ])

        const data1 = await res1.json()

        if (resOptions.data) {
            setIssueOptions(resOptions.data)
            if (resOptions.data.length > 0) setIssueType(resOptions.data[0].value)
        }

        const processedPoints = (data1.features || []).map((feature: any) => {
            const props = feature.properties;
            let finalId = ""; 

            // De robuuste ID check (dezelfde als Admin page)
            if (props.objectid_1 && String(props.objectid_1) !== "0") finalId = String(props.objectid_1);
            else if (props.crmid) finalId = String(props.crmid);
            else if (props.objectid && String(props.objectid) !== "0") finalId = String(props.objectid);
            else if (props.recordid) finalId = props.recordid;
            else if (feature.geometry?.coordinates) {
                 const [lat, lon] = feature.geometry.coordinates;
                 finalId = `loc-${String(lat).replace('.','').slice(0,8)}-${String(lon).replace('.','').slice(0,8)}`;
            }
            if (!finalId) finalId = `unknown-${Math.random()}`;

            return { ...feature, properties: { ...props, fixedId: finalId } };
        });

        setWaterPoints(processedPoints)

        if (urlId) {
            const found = processedPoints.find((p: any) => p.properties.fixedId === urlId);
            if (found) {
              console.log("📍 Punt gevonden via QR code:", found.properties.naam)
              handlePointClick(found);
              setMapCenter([found.geometry.coordinates[1], found.geometry.coordinates[0]])
            }
        }

      } catch (error) {
        console.error("Fout bij ophalen data:", error)
      }
    }
    fetchData()
  }, [urlId])

  const handleSubmitReport = async () => {
    if (!selectedPoint) return
    setIsSubmitting(true)

    const props = selectedPoint.properties
    const puntId = props.fixedId || "onbekend";
    const puntNaam = props.naam || props.beschrijving || props.Naam || props.locatie || "Naamloos punt";
    const puntAdres = props.straatnaam ? `${props.straatnaam} ${props.huisnummer || ''}` : props.adres || props.straat || '';
    const descriptionText = `Melding voor: ${puntNaam} ${puntAdres ? `(${puntAdres})` : ''}`;

    try {
      const { error } = await supabase.from('reports').insert([
        {
          waterpunt_id: puntId,
          issue_type: issueType,
          description: descriptionText,
        }
      ])

      if (error) throw error
      alert("Melding succesvol verzonden! 🚀")
      setSelectedPoint(null) 
    } catch (error) {
      console.error(error)
      alert(`Er ging iets mis`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // <--- NIEUW: Functie voor Google Maps
  const openGoogleMaps = () => {
      if(!selectedPoint) return;
      // GeoJSON is [Longitude, Latitude], maar Google Maps wil [Latitude, Longitude]
      const [lng, lat] = selectedPoint.geometry.coordinates;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
      window.open(url, '_blank');
  }

  return (
    <>
      <MapContainer center={[51.0543, 3.7174]} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapUpdater center={mapCenter} />
        {waterPoints.map((point: any) => (
          <Marker 
            key={point.properties.fixedId} 
            position={[point.geometry.coordinates[1], point.geometry.coordinates[0]]} 
            icon={icon}
            eventHandlers={{ click: () => handlePointClick(point) }}
          />
        ))}
      </MapContainer>

      {/* MODAL */}
      {selectedPoint && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl relative animate-in fade-in zoom-in duration-200">
             <button 
                onClick={() => setSelectedPoint(null)}
                className="absolute top-2 right-2 text-gray-400 hover:text-black font-bold text-2xl px-2 leading-none"
            >
                &times;
            </button>

            {/* HEADER (Naam) */}
            <h2 className="text-xl font-bold mb-1 pr-6">
                {selectedPoint.properties.naam || "Waterpunt"}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
                 {selectedPoint.properties.straatnaam ? `${selectedPoint.properties.straatnaam} ${selectedPoint.properties.huisnummer || ''}` : selectedPoint.properties.adres || "Locatie onbekend"}
            </p>

            {/* <--- NIEUW: KEUZE TUSSEN INFO & FORMULIER ---> */}
            
            {!showReportForm ? (
                // VIEW 1: INFO & NAVIGATIE
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={openGoogleMaps}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition"
                    >
                        <span>📍</span> Navigeer hiernaartoe
                    </button>
                    
                    <button 
                        onClick={() => setShowReportForm(true)}
                        className="w-full flex items-center justify-center gap-2 bg-white border-2 border-red-100 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-50 transition"
                    >
                        <span>⚠️</span> Meld een probleem
                    </button>
                </div>
            ) : (
                // VIEW 2: PROBLEEM RAPPORTAGE
                <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Wat is er aan de hand?</h3>
                    <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                    {issueOptions.length > 0 ? (
                        issueOptions.map((option) => (
                            <label key={option.id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded border border-transparent hover:border-gray-200">
                                <input 
                                    type="radio" 
                                    name="issue" 
                                    value={option.value} 
                                    checked={issueType === option.value} 
                                    onChange={(e) => setIssueType(e.target.value)} 
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-gray-700">{option.label}</span>
                            </label>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500">Opties laden...</p>
                    )}
                    </div>

                    <div className="flex gap-3">
                    <button 
                        onClick={() => setShowReportForm(false)} // Terug naar info
                        className="px-4 py-2 text-gray-600 hover:text-black font-medium"
                    >
                        Terug
                    </button>
                    <button 
                        onClick={handleSubmitReport}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 transition"
                    >
                        {isSubmitting ? 'Verzenden...' : 'Verstuur Melding'}
                    </button>
                    </div>
                </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}