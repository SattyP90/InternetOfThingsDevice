import { getSupabaseClient } from './supabaseClient.js'
import { getSupabaseConfig } from './config.js'
import { getWateringDecision } from './watering.js'

export const PLANTS = {
  cactus: {
    name: 'Cactus',
    moisture: {
      veryDry: 3000,
      dry: 2200,
      perfect: 1200
    },
    temperature: {
      min: 18,
      max: 32
    },
    humidity: {
      min: 20,
      max: 50
    }
  },
  spiderPlant: {
    name: 'Spider Plant',
    moisture: {
      veryDry: 3000,
      dry: 2000,
      perfect: 1000
    },
    temperature: {
      min: 18,
      max: 27
    },
    humidity: {
      min: 40,
      max: 60
    }
  },
  peaceLily: {
    name: 'Peace Lily',
    moisture: {
      veryDry: 2800,
      dry: 1800,
      perfect: 800
    },
    temperature: {
      min: 18,
      max: 30
    },
    humidity: {
      min: 50,
      max: 80
    }
  },
  venusFlytrap: {
    name: 'Venus Flytrap',
    moisture: {
      veryDry: 2000,
      dry: 1200,
      perfect: 300
    },
    temperature: {
      min: 20,
      max: 35
    },
    humidity: {
      min: 50,
      max: 80
    }
  }
}

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

function toMeasurementRecord(row, cfg) {
  return {
    temperatureC: row ? toNumberOrNull(row[cfg.columns.temperature]) : null,
    humidityPct: row ? toNumberOrNull(row[cfg.columns.humidity]) : null,
    soilMoisturePct: row ? toNumberOrNull(row[cfg.columns.soilMoisture]) : null,
    timestamp: row ? toIsoStringOrNull(row[cfg.timestampColumn]) : null
  }
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

export function getPlantCondition(temperatureC, humidityPct, soilMoisturePct, plantType = 'cactus') {
  if (temperatureC == null || humidityPct == null || soilMoisturePct == null) {
    return null
  }

  const plant = PLANTS[plantType] || PLANTS.cactus
  let goodFactors = 0

  //check temperature
  if (temperatureC >= plant.temperature.min && temperatureC <= plant.temperature.max) {
    goodFactors++
  }

  //check humidity
  if (humidityPct >= plant.humidity.min && humidityPct <= plant.humidity.max) {
    goodFactors++
  }

  //check soil moisture - good range is between perfect and dry
  if (soilMoisturePct >= plant.moisture.perfect && soilMoisturePct <= plant.moisture.dry) {
    goodFactors++
  }

  //determine condition based on how many factors are good (out of 3)
  if (goodFactors === 3) {
    return 'Perfect'
  } else if (goodFactors === 2) {
    return 'Good'
  } else if (goodFactors === 1) {
    return 'Poor'
  } else {
    return 'Bad'
  }
}

export function getPlantCareAdvice(temperatureC, humidityPct, soilMoisturePct, plantType = 'cactus') {
  if (temperatureC == null || humidityPct == null || soilMoisturePct == null) {
    return []
  }

  const plant = PLANTS[plantType] || PLANTS.cactus
  const advice = []

  //temperature advice
  if (temperatureC < plant.temperature.min) {
    advice.push(`Temperature too low for ${plant.name} (${temperatureC}°C). Move to warmer location.`)
  } else if (temperatureC > plant.temperature.max) {
    advice.push(`Temperature too high for ${plant.name} (${temperatureC}°C). Move to cooler location.`)
  }

  //humidity advice
  if (humidityPct < plant.humidity.min) {
    advice.push(`Humidity too low for ${plant.name} (${humidityPct}%). Increase humidity by misting or moving to humid area.`)
  } else if (humidityPct > plant.humidity.max) {
    advice.push(`Humidity too high for ${plant.name} (${humidityPct}%). Improve air circulation.`)
  }

  //soil moisture advice
  if (soilMoisturePct > plant.moisture.veryDry) {
    advice.push(`Soil too dry for ${plant.name}. Water the plant immediately.`)
  } else if (soilMoisturePct > plant.moisture.dry) {
    advice.push(`Soil getting dry for ${plant.name}. Water soon.`)
  } else if (soilMoisturePct < 500) {
    advice.push(`Soil too wet for ${plant.name}. Reduce watering and improve drainage.`)
  }

  if (advice.length === 0) {
    advice.push(`${plant.name} is in optimal conditions. Keep up the great care!`)
  }

  return advice
}

export function getTemperatureStatus(temperatureC, plantType = 'cactus') {
  if (temperatureC == null) return 'neutral'
  
  const plant = PLANTS[plantType] || PLANTS.cactus
  
  if (temperatureC >= plant.temperature.min && temperatureC <= plant.temperature.max) {
    return 'good'
  } else {
    return 'bad'
  }
}

export function getHumidityStatus(humidityPct, plantType = 'cactus') {
  if (humidityPct == null) return 'neutral'
  
  const plant = PLANTS[plantType] || PLANTS.cactus
  
  if (humidityPct >= plant.humidity.min && humidityPct <= plant.humidity.max) {
    return 'good'
  } else {
    return 'bad'
  }
}

export function getPlantSoilMoistureStatus(soilMoistureValue, plantType = 'cactus') {
  if (soilMoistureValue == null) return null
  
  const plant = PLANTS[plantType] || PLANTS.cactus
  
  if (soilMoistureValue > plant.moisture.veryDry) {
    return { category: 'Very Dry', value: soilMoistureValue, status: 'bad' }
  } else if (soilMoistureValue > plant.moisture.dry) {
    return { category: 'Dry', value: soilMoistureValue, status: 'bad' }
  } else if (soilMoistureValue <= plant.moisture.perfect) {
    return { category: 'Perfect', value: soilMoistureValue, status: 'good' }
  } else {
    return { category: 'Too Wet', value: soilMoistureValue, status: 'bad' }
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

  return toMeasurementRecord(data || null, cfg)
}

export async function fetchMeasurementHistory(limit = 24) {
  const cfg = getSupabaseConfig()
  const supabase = getSupabaseClient()
  const historyLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.trunc(Number(limit))) : 24

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
    .limit(historyLimit)

  if (error) throw error

  return (data || [])
    .map((row) => toMeasurementRecord(row, cfg))
    .filter((record) => record.timestamp)
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
