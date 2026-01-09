'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useEffect, useState } from 'react'
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

export default function Map() {
  const [waterPoints, setWaterPoints] = useState<any[]>([])
  const [issueOptions, setIssueOptions] = useState<any[]>([]) // <--- NIEUW: Hier komen de DB opties in
  
  // State voor het formulier
  const [selectedPoint, setSelectedPoint] = useState<any>(null) 
  const [issueType, setIssueType] = useState('') // <--- Leeg beginnen
  const [isSubmitting, setIsSubmitting] = useState(false) 

  // Data ophalen: Waterpunten + Fonteinen + ISSUE TYPES
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [res1, res2, resOptions] = await Promise.all([
          fetch('https://data.stad.gent/api/explore/v2.1/catalog/datasets/drinkwaterplekken-gent/exports/geojson'),
          fetch('https://data.stad.gent/api/explore/v2.1/catalog/datasets/publiek-sanitair-gent/exports/geojson'),
          supabase.from('issue_types').select('*') // <--- NIEUW: Haal opties uit Supabase
        ])

        const data1 = await res1.json()
        const data2 = await res2.json()
        
        // Check of Supabase data goed is binnengekomen
        if (resOptions.data) {
            setIssueOptions(resOptions.data)
            // Zet de eerste optie als standaard geselecteerd (optioneel)
            if (resOptions.data.length > 0) setIssueType(resOptions.data[0].value)
        }

        setWaterPoints([...data1.features, ...data2.features]) 
      } catch (error) {
        console.error("Fout bij ophalen data:", error)
      }
    }
    fetchData()
  }, [])

  const handleSubmitReport = async () => {
    if (!selectedPoint) return
    setIsSubmitting(true)

    const props = selectedPoint.properties

    // 1. ID Bepalen (Nu ook checken op 'agent' voor de toiletten)
    const rawId = 
      props.id || 
      props.objectid || 
      props.agent || // <--- DIT IS DE BELANGRIJKSTE VOOR TOILETTEN
      props.recordid;
      
    const puntId = rawId ? String(rawId) : `temp-${Date.now()}`;

    // 2. Naam Bepalen (Nu ook checken op 'beschrijving')
    const puntNaam = 
      props.naam || 
      props.beschrijving || // <--- DIT IS DE NAAM BIJ TOILETTEN
      props.Naam || 
      props.locatie || 
      "Naamloos punt";

    // 3. Adres Bepalen (Nu ook checken op 'adres')
    const puntAdres = 
      props.straatnaam ? `${props.straatnaam} ${props.huisnummer || ''}` :
      props.adres || // <--- DIT ZIT IN JOUW LOG
      props.straat || 
      '';

    // Omschrijving samenstellen
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
        
        {waterPoints.map((point: any) => (
            
          <Marker 
          
            key={point.properties.id || Math.random()} 
            position={[point.geometry.coordinates[1], point.geometry.coordinates[0]]} 
            icon={icon}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-lg">{point.properties.naam || "Locatie"}</h3>
                <p className="text-sm mb-3 text-gray-600">
                    {point.properties.categorie || point.properties.type || point.properties.locatie}
                </p>
                <button 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full font-medium"
                  onClick={() => setSelectedPoint(point)}
                >
                  Meld Probleem
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* MODAL */}
      {selectedPoint && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold mb-4">Melding maken</h2>
            <p className="mb-4 text-sm text-gray-600">
              Wat is er mis met: <strong>{selectedPoint.properties.naam}</strong>?
            </p>

            <div className="space-y-2 mb-6">
              {/* NIEUW: Dynamische lijst uit database */}
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