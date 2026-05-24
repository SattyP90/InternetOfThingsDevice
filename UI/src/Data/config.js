function getEnvString(key) {
  const value = import.meta.env[key]
  return typeof value === 'string' ? value.trim() : ''
}

export function getSupabaseConfig() {
  const url = getEnvString('VITE_SUPABASE_URL')
  const anonKey = getEnvString('VITE_SUPABASE_ANON_KEY')

  return {
    url,
    anonKey,
    table: getEnvString('VITE_SUPABASE_TABLE') || 'plant_readings',
    timestampColumn: getEnvString('VITE_SUPABASE_TIMESTAMP_COLUMN') || 'created_at',
    columns: {
      temperature: getEnvString('VITE_SUPABASE_TEMP_COLUMN') || 'temperature',
      humidity: getEnvString('VITE_SUPABASE_HUMIDITY_COLUMN') || 'humidity',
      soilMoisture: getEnvString('VITE_SUPABASE_SOIL_COLUMN') || 'soil_moisture'
    }
  }
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseConfig()
  return Boolean(url && anonKey)
}
