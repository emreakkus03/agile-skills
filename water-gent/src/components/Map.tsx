'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
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
  const urlId = searchParams.get('id') // Haal ID uit URL (?id=...)

  const [waterPoints, setWaterPoints] = useState<any[]>([])
  const [issueOptions, setIssueOptions] = useState<any[]>([]) 
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null)

  // State voor het formulier
  const [selectedPoint, setSelectedPoint] = useState<any>(null) 
  const [issueType, setIssueType] = useState('') 
  const [isSubmitting, setIsSubmitting] = useState(false) 

  // Data ophalen en verwerken
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [res1, resOptions] = await Promise.all([
          fetch('https://data.stad.gent/api/explore/v2.1/catalog/datasets/drinkwaterplekken-gent/exports/geojson'),
          supabase.from('issue_types').select('*') 
        ])

        const data1 = await res1.json()

        // Issue opties
        if (resOptions.data) {
            setIssueOptions(resOptions.data)
            if (resOptions.data.length > 0) setIssueType(resOptions.data[0].value)
        }

        // --- HIER IS DE BELANGRIJKE WIJZIGING ---
        // We passen EXACT dezelfde logica toe als in de Admin pagina om IDs te matchen
        const processedPoints = (data1.features || []).map((feature: any) => {
            const props = feature.properties;
            let finalId = ""; 

            // 1. Check objectid_1 (De echte unieke ID)
            if (props.objectid_1 && String(props.objectid_1) !== "0") {
                finalId = String(props.objectid_1);
            }
            // 2. Check crmid
            else if (props.crmid) {
                finalId = String(props.crmid);
            }
            // 3. Check gewone objectid (alleen als geen 0)
            else if (props.objectid && String(props.objectid) !== "0") {
                finalId = String(props.objectid);
            }
            // 4. Check recordid
            else if (props.recordid) {
                finalId = props.recordid;
            }
            // 5. Fallback Coördinaten
            else if (feature.geometry?.coordinates) {
                 const [lat, lon] = feature.geometry.coordinates;
                 finalId = `loc-${String(lat).replace('.','').slice(0,8)}-${String(lon).replace('.','').slice(0,8)}`;
            }

            if (!finalId) finalId = `unknown-${Math.random()}`;

            // Voeg fixedId toe aan properties
            return {
                ...feature,
                properties: { ...props, fixedId: finalId }
            };
        });

        setWaterPoints(processedPoints)

        // Checken of er een ID in de URL zat en matchen met onze nieuwe fixedId
        if (urlId) {
            // Nu is het simpel: vergelijk urlId met fixedId
            const found = processedPoints.find((p: any) => p.properties.fixedId === urlId);
  
            if (found) {
              console.log("📍 Punt gevonden via QR code:", found.properties.naam)
              setSelectedPoint(found) 
              setMapCenter([found.geometry.coordinates[1], found.geometry.coordinates[0]])
            } else {
              console.warn("⚠️ Wel ID in URL, maar geen punt gevonden:", urlId)
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

    // Gebruik de fixedId die we al berekend hebben!
    const puntId = props.fixedId || "onbekend";

    // Naam Bepalen 
    const puntNaam = 
      props.naam || 
      props.beschrijving || 
      props.Naam || 
      props.locatie || 
      "Naamloos punt";

    // Adres Bepalen 
    const puntAdres = 
      props.straatnaam ? `${props.straatnaam} ${props.huisnummer || ''}` :
      props.adres || 
      props.straat || 
      '';

    const descriptionText = `Melding voor: ${puntNaam} ${puntAdres ? `(${puntAdres})` : ''}`;

    try {
      const { error } = await supabase.from('reports').insert([
        {
          waterpunt_id: puntId, // Hier sturen we nu de juiste ID mee
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
        
        <MapUpdater center={mapCenter} />

        {waterPoints.map((point: any) => (
          <Marker 
            // Gebruik fixedId als key, dat is veel stabieler dan random
            key={point.properties.fixedId || Math.random()} 
            position={[point.geometry.coordinates[1], point.geometry.coordinates[0]]} 
            icon={icon}
            eventHandlers={{
                click: () => setSelectedPoint(point)
            }}
          />
        ))}
      </MapContainer>

      {/* MODAL */}
      {selectedPoint && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl relative">
             <button 
                onClick={() => setSelectedPoint(null)}
                className="absolute top-2 right-2 text-gray-500 hover:text-black font-bold text-xl px-2"
            >
                &times;
            </button>

            <h2 className="text-xl font-bold mb-4">Melding maken</h2>
            <p className="mb-4 text-sm text-gray-600">
              Wat is er mis met: <strong>{selectedPoint.properties.naam || selectedPoint.properties.beschrijving}</strong>?
              <br/>
              <span className="text-xs text-gray-400 font-mono">ID: {selectedPoint.properties.fixedId}</span>
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