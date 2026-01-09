'use client'
import dynamic from 'next/dynamic'

// Lazy load de map zodat hij niet crasht op de server
const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="h-screen w-full flex items-center justify-center bg-gray-100">Kaart laden...</div>
})

export default function Home() {
  return (
    <main className="h-screen w-screen flex flex-col">
      <header className="p-4 bg-blue-900 text-white shadow-md z-10">
        <h1 className="text-xl font-bold">💧 Gent Waterpunten</h1>
      </header>
      
      <div className="flex-1 relative z-0">
        <Map />
      </div>
    </main>
  )
}