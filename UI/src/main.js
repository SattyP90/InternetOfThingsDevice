import './style.css'
import { isSupabaseConfigured } from './Data/config.js'
import { fetchLatestMeasurement, subscribeToMeasurementUpdates, getSoilDrynessCategory } from './Data/measurements.js'
import { formatTimestamp } from './Data/time.js'
import { getWateringDecision } from './Data/watering.js'

const app = document.querySelector('#app')

app.innerHTML = `
  <main class="container">
    <header class="header">
      <h1>Plant Monitoring UI</h1>
      <h2>Select a plant profile</h2>
      <select id="plant-profile-select" aria-label="Select plant profile">
        <option value="cactus">Cactus</option>
        <option value="fern">Fern</option>
        <option value="succulent" selected>Succulent</option>
      </select>

    </header>

    <section class="card advisory" aria-label="Watering recommendation">
      <h2 class="widget-title">Watering</h2>
      <div id="watering-status" class="advisory-status">—</div>
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

let latestMeasurement = null
let unsubscribe = null

function getSelectedProfile() {
  return plantProfileSelect?.value || 'succulent'
}

function renderMeasurement(measurement) {
  latestMeasurement = measurement

  const { temperatureC, humidityPct, soilMoisturePct, timestamp } = measurement
  const timeText = formatTimestamp(timestamp)
  const soilDryness = getSoilDrynessCategory(soilMoisturePct)

  temperatureValueEl.textContent = temperatureC ?? '—'
  humidityValueEl.textContent = humidityPct ?? '—'
  soilMoistureValueEl.textContent = soilDryness ? soilDryness.category : '—'

  temperatureMetaEl.textContent = `Last updated: ${timeText}`
  humidityMetaEl.textContent = `Last updated: ${timeText}`
  soilMoistureMetaEl.textContent = `Last updated: ${timeText}`

  const watering = getWateringDecision({ soilMoisturePct, profile: getSelectedProfile() })
  wateringStatusEl.textContent = watering?.statusText ?? '—'
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
