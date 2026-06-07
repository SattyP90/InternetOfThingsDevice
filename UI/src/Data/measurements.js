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

export function getSoilDrynessCategory(soilMoistureValue) {
  if (soilMoistureValue == null) return null
  
  if (soilMoistureValue > 2600) {
    return { category: 'Very Dry', value: soilMoistureValue }
  } else if (soilMoistureValue >= 2200) {
    return { category: 'Dry', value: soilMoistureValue }
  } else if (soilMoistureValue >= 1600) {
    return { category: 'Perfect', value: soilMoistureValue }
  } else {
    return { category: 'Too Wet', value: soilMoistureValue }
  }
}

export function getPlantCondition(temperatureC, humidityPct, soilMoisturePct) {
  if (temperatureC == null || humidityPct == null || soilMoisturePct == null) {
    return null
  }

  let score = 0

  //temp scoring: optimal range 18-28°C
  if (temperatureC >= 18 && temperatureC <= 28) {
    score += 3
  } else if (temperatureC >= 15 && temperatureC <= 35) {
    score += 2
  } else {
    score += 1
  }

  //humidity scoring: optimal range 40-70%
  if (humidityPct >= 40 && humidityPct <= 70) {
    score += 3
  } else if (humidityPct >= 30 && humidityPct <= 80) {
    score += 2
  } else {
    score += 1
  }

  //soil moisture scoring based on dryness category
  const soilDryness = getSoilDrynessCategory(soilMoisturePct)
  if (soilDryness.category === 'Perfect') {
    score += 3
  } else if (soilDryness.category === 'Dry' || soilDryness.category === 'Too Wet') {
    score += 2
  } else if (soilDryness.category === 'Very Dry') {
    score += 1
  }

  //determine condition based on total score (max 9)
  if (score >= 8) {
    return 'Perfect'
  } else if (score >= 6) {
    return 'Good'
  } else if (score >= 4) {
    return 'Poor'
  } else {
    return 'Bad'
  }
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

export function subscribeToMeasurementUpdates(onUpdate, onError) {
  const cfg = getSupabaseConfig()
  let pollInterval = null

  const loadAndNotify = async () => {
    try {
      const measurement = await fetchLatestMeasurement()
      console.log('Fetched latest measurement:', measurement)
      onUpdate(measurement)
    } catch (err) {
      console.error('Error fetching measurement:', err)
      onError?.(err)
    }
  }

  //start check database every 30 seconds
  console.log('Starting to poll database every 30 seconds')
  loadAndNotify() // load initial data immediately
  pollInterval = setInterval(loadAndNotify, 30000)

  //return unsubscribe function
  return () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      console.log('Stopped polling database')
    }
  }
}
