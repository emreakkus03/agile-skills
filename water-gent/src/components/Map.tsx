'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet' // <--- useMap toegevoegd
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation' // <--- NIEUW: Om de URL uit te lezen
import L from 'leaflet'
import { supabase } from '@/lib/supabase'

// Icon setup (standaard leaflet fix)
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

// <--- NIEUW: Hulpcomponent om de kaart te laten vliegen naar het gezochte punt
function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.flyTo(center, 18) // Zoom diep in op het punt (niveau 18)
    }
  }, [center, map])
  return null
}

export default function Map() {
  const searchParams = useSearchParams() // <--- NIEUW: De URL parameters ophalen
  const urlId = searchParams.get('id') // <--- NIEUW: Haal specifiek '?id=...' op

  const [waterPoints, setWaterPoints] = useState<any[]>([])
  const [issueOptions, setIssueOptions] = useState<any[]>([]) 
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null) // <--- NIEUW: Om de kaart te sturen

  // State voor het formulier
  const [selectedPoint, setSelectedPoint] = useState<any>(null) 
  const [issueType, setIssueType] = useState('') 
  const [isSubmitting, setIsSubmitting] = useState(false) 

  // Data ophalen: Waterpunten + Fonteinen + ISSUE TYPES
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [res1, res2, resOptions] = await Promise.all([
          fetch('https://data.stad.gent/api/explore/v2.1/catalog/datasets/drinkwaterplekken-gent/exports/geojson'),
          fetch('https://data.stad.gent/api/explore/v2.1/catalog/datasets/publiek-sanitair-gent/exports/geojson'),
          supabase.from('issue_types').select('*') 
        ])

        const data1 = await res1.json()
        const data2 = await res2.json()
        
        if (resOptions.data) {
            setIssueOptions(resOptions.data)
            if (resOptions.data.length > 0) setIssueType(resOptions.data[0].value)
        }

        const allPoints = [...data1.features, ...data2.features]
        setWaterPoints(allPoints)

        // <--- NIEUW: Checken of er een ID in de URL zat
        if (urlId) {
            const found = allPoints.find((p: any) => {
               // We checken alle mogelijke ID velden uit de data
               const pId = p.properties.id || p.properties.objectid || p.properties.agent || p.properties.recordid;
               return String(pId) === urlId;
            })
  
            if (found) {
              console.log("📍 Punt gevonden via QR code:", found.properties.naam)
              setSelectedPoint(found) // Open direct de modal!
              // Zet het nieuwe centrum zodat de MapUpdater de kaart kan bewegen
              setMapCenter([found.geometry.coordinates[1], found.geometry.coordinates[0]])
            }
        }

      } catch (error) {
        console.error("Fout bij ophalen data:", error)
      }
    }
    fetchData()
  }, [urlId]) // <--- NIEUW: Voer dit ook uit als de URL verandert

  const handleSubmitReport = async () => {
    if (!selectedPoint) return
    setIsSubmitting(true)

    const props = selectedPoint.properties

    // 1. ID Bepalen
    const rawId = 
      props.id || 
      props.objectid || 
      props.agent || 
      props.recordid;
      
    const puntId = rawId ? String(rawId) : `temp-${Date.now()}`;

    // 2. Naam Bepalen 
    const puntNaam = 
      props.naam || 
      props.beschrijving || 
      props.Naam || 
      props.locatie || 
      "Naamloos punt";

    // 3. Adres Bepalen 
    const puntAdres = 
      props.straatnaam ? `${props.straatnaam} ${props.huisnummer || ''}` :
      props.adres || 
      props.straat || 
      '';

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

  return (
    <>
      <MapContainer center={[51.0543, 3.7174]} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {/* <--- NIEUW: Dit zorgt dat de kaart beweegt naar het QR punt */}
        <MapUpdater center={mapCenter} />

        {waterPoints.map((point: any) => (
          <Marker 
            key={point.properties.id || Math.random()} 
            position={[point.geometry.coordinates[1], point.geometry.coordinates[0]]} 
            icon={icon}
            // <--- NIEUW: Zorgen dat klikken op de pin hetzelfde doet als de QR scan
            eventHandlers={{
                click: () => setSelectedPoint(point)
            }}
          />
        ))}
      </MapContainer>

      {/* MODAL (Je bestaande code) */}
      {selectedPoint && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl relative">
             {/* <--- NIEUW: Kruisje om te sluiten toegevoegd voor UX */}
             <button 
                onClick={() => setSelectedPoint(null)}
                className="absolute top-2 right-2 text-gray-500 hover:text-black font-bold text-xl px-2"
            >
                &times;
            </button>

            <h2 className="text-xl font-bold mb-4">Melding maken</h2>
            <p className="mb-4 text-sm text-gray-600">
              Wat is er mis met: <strong>{selectedPoint.properties.naam || selectedPoint.properties.beschrijving}</strong>?
            </p>

            <div className="space-y-2 mb-6">
              {issueOptions.length > 0 ? (
                  issueOptions.map((option) => (
                    <label key={option.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input 
                            type="radio" 
                            name="issue" 
                            value={option.value} 
                            checked={issueType === option.value} 
                            onChange={(e) => setIssueType(e.target.value)} 
                            className="text-blue-600"
                        />
                        <span>{option.label}</span>
                    </label>
                  ))
              ) : (
                  <p>Laden van opties...</p>
              )}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedPoint(null)}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-100"
              >
                Annuleren
              </button>
              <button 
                onClick={handleSubmitReport}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Verzenden...' : 'Verstuur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}