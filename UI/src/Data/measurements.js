import { getSupabaseClient } from './supabaseClient.js'
import { getSupabaseConfig } from './config.js'
import { getWateringDecision } from './watering.js'

function toNumberOrNull(value) {
  if (value == null) return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

function toIsoStringOrNull(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

export async function fetchLatestMeasurement() {
  const cfg = getSupabaseConfig()
  const supabase = getSupabaseClient()

  const selectCols = [
    cfg.timestampColumn,
    cfg.columns.temperature,
    cfg.columns.humidity,
    cfg.columns.soilMoisture
  ]
    .filter(Boolean)
    .join(',')

  const { data, error } = await supabase
    .from(cfg.table)
    .select(selectCols)
    .order(cfg.timestampColumn, { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  const row = data || null
  const temperatureC = row ? toNumberOrNull(row[cfg.columns.temperature]) : null
  const humidityPct = row ? toNumberOrNull(row[cfg.columns.humidity]) : null
  const soilMoisturePct = row ? toNumberOrNull(row[cfg.columns.soilMoisture]) : null
  const timestamp = row ? toIsoStringOrNull(row[cfg.timestampColumn]) : null

  return {
    temperatureC,
    humidityPct,
    soilMoisturePct,
    timestamp
  }
}
