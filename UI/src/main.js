import './style.css'
import { isSupabaseConfigured } from './Data/config.js'
import { fetchLatestMeasurement, subscribeToMeasurementUpdates, getSoilDrynessCategory, getPlantCondition, getPlantCareAdvice, PLANTS, getTemperatureStatus, getHumidityStatus, getPlantSoilMoistureStatus } from './Data/measurements.js'
import { formatTimestamp } from './Data/time.js'
import { getWateringStatus } from './Data/watering.js'
import { sendTelegramMessage } from './Data/telegram.js'

const app = document.querySelector('#app')

app.innerHTML = `
  <main class="container">
    <header class="header">
      <h1>Plant Monitor</h1>
      <h2>Select a plant profile</h2>
      <select id="plant-profile-select" aria-label="Select plant profile">
        <option value="cactus">Cactus</option>
        <option value="spiderPlant">Spider Plant</option>
        <option value="peaceLily">Peace Lily</option>
        <option value="venusFlytrap" selected>Venus Flytrap</option>
      </select>

    </header>

    <section class="card advisory" aria-label="Watering recommendation">
      <h2 class="widget-title">Watering</h2>
      <div id="watering-status" class="advisory-status">—</div>
    </section>

    <section class="card advisory" aria-label="Plant conditions">
      <h2 class="widget-title">Plant Condition</h2>
      <div id="plant-condition" class="advisory-status">—</div>
    </section>

    <h2 class="section-title">Current measurements</h2>

    <section class="widgets" aria-label="Measurements">
      <article class="card widget" aria-label="Temperature">
        <h2 class="widget-title">Temperature</h2>
        <div class="widget-value">
          <span id="temperature-value" class="number">—</span>
          <span class="unit">°C</span>
        </div>
        <div id="temperature-meta" class="widget-meta">Last updated: —</div>
      </article>

      <article class="card widget" aria-label="Humidity">
        <h2 class="widget-title">Humidity</h2>
        <div class="widget-value">
          <span id="humidity-value" class="number">—</span>
          <span class="unit">%</span>
        </div>
        <div id="humidity-meta" class="widget-meta">Last updated: —</div>
      </article>

      <article class="card widget" aria-label="Soil moisture">
        <h2 class="widget-title">Soil Moisture</h2>
        <div class="widget-value">
          <span id="soil-moisture-value" class="number">—</span>
        </div>
        <div id="soil-moisture-meta" class="widget-meta">Last updated: —</div>
      </article>
    </section>
  </main>
`

const plantProfileSelect = document.querySelector('#plant-profile-select')
const temperatureValueEl = document.querySelector('#temperature-value')
const humidityValueEl = document.querySelector('#humidity-value')
const soilMoistureValueEl = document.querySelector('#soil-moisture-value')
const temperatureMetaEl = document.querySelector('#temperature-meta')
const humidityMetaEl = document.querySelector('#humidity-meta')
const soilMoistureMetaEl = document.querySelector('#soil-moisture-meta')
const wateringStatusEl = document.querySelector('#watering-status')
const plantConditionEl = document.querySelector('#plant-condition')

let latestMeasurement = null
let unsubscribe = null
let lastPlantType = null
let lastAdvice = null

function getSelectedProfile() {
  return plantProfileSelect?.value || 'venusFlytrap'
}

function renderMeasurement(measurement) {
  latestMeasurement = measurement

  const { temperatureC, humidityPct, soilMoisturePct, timestamp } = measurement
  const timeText = formatTimestamp(timestamp)
  const plantType = getSelectedProfile()
  
  //get plant-specific statuses
  const tempStatus = getTemperatureStatus(temperatureC, plantType)
  const humidityStatus = getHumidityStatus(humidityPct, plantType)
  const soilStatus = getPlantSoilMoistureStatus(soilMoisturePct, plantType)

  //update temperature with status class
  temperatureValueEl.textContent = temperatureC ?? '—'
  temperatureValueEl.className = `number ${tempStatus}`
  
  //update humidity with status class
  humidityValueEl.textContent = humidityPct ?? '—'
  humidityValueEl.className = `number ${humidityStatus}`
  
  //update soil moisture with plant-specific status
  soilMoistureValueEl.textContent = soilStatus ? soilStatus.category : '—'
  soilMoistureValueEl.className = `number ${soilStatus?.status || 'neutral'}`

  temperatureMetaEl.textContent = `Last updated: ${timeText}`
  humidityMetaEl.textContent = `Last updated: ${timeText}`
  soilMoistureMetaEl.textContent = `Last updated: ${timeText}`

  const wateringStatus = getWateringStatus(soilStatus)
  wateringStatusEl.textContent = wateringStatus ?? '—'

  const condition = getPlantCondition(temperatureC, humidityPct, soilMoisturePct, plantType)
  plantConditionEl.textContent = condition ?? '—'

  //log care advice to console and send to telegram only when plant changes or advice changes
  const advice = getPlantCareAdvice(temperatureC, humidityPct, soilMoisturePct, plantType)
  const adviceString = JSON.stringify(advice)
  
  if (plantType !== lastPlantType || adviceString !== lastAdvice) {
    const message = `[${PLANTS[plantType].name} Care Guide]\n${advice.map(tip => `• ${tip}`).join('\n')}`
    
    console.log(`[${PLANTS[plantType].name} Care Guide]`)
    advice.forEach(tip => console.log(`• ${tip}`))
    
    sendTelegramMessage(message)
    
    lastPlantType = plantType
    lastAdvice = adviceString
  }
}

async function loadData() {
  try {
    const measurement = await fetchLatestMeasurement()
    renderMeasurement(measurement)
  } catch (err) {
    wateringStatusEl.textContent = 'Error loading data'
  }
}

async function start() {
  if (!isSupabaseConfigured()) {
    wateringStatusEl.textContent = 'Supabase not configured'
    return
  }

  unsubscribe = subscribeToMeasurementUpdates(
    (measurement) => {
      renderMeasurement(measurement)
    },
    (error) => {
      wateringStatusEl.textContent = 'Error loading data'
    }
  )
}

plantProfileSelect?.addEventListener('change', () => {
  if (latestMeasurement) {
    renderMeasurement(latestMeasurement)
  }
})

start()
