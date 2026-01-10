import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)


export interface IssueReport {
  id: string
  created_at: string
  issue_type: string
  description: string
  status: string
}

// in lib/supabase.ts

export interface LocationProperties {
  id?: string
  objectid?: string | number 
  objectid_1?: string | number
  recordid?: string
  naam?: string
  Naam?: string
  beschrijving?: string
  straatnaam?: string
  straat?: string
  adres?: string
  locatie?: string
  fixedId?: string;
  [key: string]: any 
}

export interface LocationFeature {
  properties: LocationProperties
}

export interface GeoJsonResponse {
  features: LocationFeature[]
}

export interface SelectedQrPoint {
  id: string
  naam: string
  adres: string
}