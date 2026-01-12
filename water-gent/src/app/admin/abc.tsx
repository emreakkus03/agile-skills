"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import QRCode from "react-qr-code";

// ⚠️ VERVANG DIT DOOR JOUW VERCEL URL (zonder / aan het eind)
const BASE_URL = "https://agile-skills.vercel.app";

export default function AdminPage() {
  // State voor data
  const [reports, setReports] = useState<any[]>([]);
  const [allPoints, setAllPoints] = useState<any[]>([]); // Alle punten van Stad Gent
  const [filteredPoints, setFilteredPoints] = useState<any[]>([]); // Voor de zoekbalk

  // State voor UI
  const [search, setSearch] = useState("");
  const [selectedQrPoint, setSelectedQrPoint] = useState<any>(null); // Welk punt wil je printen?
  const [activeTab, setActiveTab] = useState<"generator" | "reports">(
    "generator"
  );

  // Data ophalen bij laden
  useEffect(() => {
    const fetchEverything = async () => {
      // 1. Haal meldingen uit Supabase
      const { data: reportData } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      setReports(reportData || []);

      // 2. Haal ALLE locaties op van Stad Gent (dezelfde API's als de kaart)
      try {
        const [res1, res2] = await Promise.all([
          fetch(
            "https://data.stad.gent/api/explore/v2.1/catalog/datasets/drinkwaterplekken-gent/exports/geojson"
          ),
          fetch(
            "https://data.stad.gent/api/explore/v2.1/catalog/datasets/publiek-sanitair-gent/exports/geojson"
          ),
        ]);
        const d1 = await res1.json();
        const d2 = await res2.json();
        const combined = [...d1.features, ...d2.features];

        setAllPoints(combined);
        setFilteredPoints(combined); // Begin met alles te tonen
      } catch (e) {
        console.error("Kon Gent data niet laden", e);
      }
    };
    fetchEverything();
  }, []);

  // Zoekfunctie
  useEffect(() => {
    if (!search) {
      setFilteredPoints(allPoints);
    } else {
      const lowerSearch = search.toLowerCase();
      const filtered = allPoints.filter((p) => {
        const naam = p.properties.naam || p.properties.beschrijving || "";
        const straat = p.properties.straatnaam || p.properties.straat || "";
        return (
          naam.toLowerCase().includes(lowerSearch) ||
          straat.toLowerCase().includes(lowerSearch)
        );
      });
      setFilteredPoints(filtered);
    }
  }, [search, allPoints]);

  // Hulpfunctie om veilig een ID te pakken (dezelfde logica als je Map.tsx)
  const getPuntId = (props: any) => {
    return (
      props.id || props.objectid || props.agent || props.recordid || "onbekend"
    );
  };

  const getPuntNaam = (props: any) => {
    return (
      props.naam || props.beschrijving || props.Naam || "Locatie zonder naam"
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            🚰 WaterGent Admin
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("generator")}
              className={`px-4 py-2 rounded font-bold ${
                activeTab === "generator"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600"
              }`}
            >
              QR Stickers Maken
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`px-4 py-2 rounded font-bold ${
                activeTab === "reports"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600"
              }`}
            >
              Inkomende Meldingen ({reports.length})
            </button>
          </div>
        </header>

        {/* TAB 1: QR GENERATOR (De lijst met alle punten) */}
        {activeTab === "generator" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Linkerkant: De Zoeklijst */}
            <div className="md:col-span-2 bg-white rounded-xl shadow-md overflow-hidden flex flex-col h-[80vh]">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="font-bold text-lg mb-2">
                  Alle Locaties ({allPoints.length})
                </h2>
                <input
                  type="text"
                  placeholder="Zoek op naam of straat (bv. Korenmarkt)..."
                  className="w-full p-2 border rounded"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="overflow-y-auto flex-1 p-0">
                {filteredPoints.map((point, i) => {
                  const id = getPuntId(point.properties);
                  const naam = getPuntNaam(point.properties);
                  const adres =
                    point.properties.straatnaam ||
                    point.properties.adres ||
                    point.properties.locatie ||
                    "";

                  return (
                    <div
                      key={i}
                      className="border-b p-4 flex justify-between items-center hover:bg-blue-50 transition"
                    >
                      <div>
                        <div className="font-bold text-gray-800">{naam}</div>
                        <div className="text-sm text-gray-500">{adres}</div>
                        <div className="text-xs text-gray-300 font-mono mt-1">
                          {id}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedQrPoint({ id, naam, adres })}
                        className="bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white px-4 py-2 rounded font-medium transition"
                      >
                        Selecteer ➡️
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rechterkant: Het Voorbeeld & Printen */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-xl shadow-md p-6 sticky top-6 text-center">
                {selectedQrPoint ? (
                  <>
                    <h3 className="text-xl font-bold mb-1 text-blue-900">
                      QR Sticker
                    </h3>
                    <p className="text-sm text-gray-500 mb-6">
                      {selectedQrPoint.naam}
                    </p>

                    <div className="bg-white border-4 border-black p-4 inline-block rounded-lg mb-4">
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
                      🖨️ Print deze code
                    </button>
                  </>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                    <span className="text-4xl mb-2">👈</span>
                    <p>
                      Selecteer een locatie uit de lijst om de QR code te maken.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MELDINGEN (Je oude tabel) */}
        {activeTab === "reports" && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Probleem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Melding
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">
                        {report.issue_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {report.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {report.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
