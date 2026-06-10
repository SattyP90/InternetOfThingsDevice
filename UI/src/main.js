import './style.css'
import { isSupabaseConfigured } from './Data/config.js'
import { fetchLatestMeasurement, fetchMeasurementHistory, getPlantCondition, getPlantCareAdvice, PLANTS, getTemperatureStatus, getHumidityStatus, getPlantSoilMoistureStatus } from './Data/measurements.js'
import { formatTimestamp } from './Data/time.js'
import { getWateringStatus } from './Data/watering.js'
import { sendTelegramMessage } from './notifications/telegram.js'

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
        <details class="history-toggle">
          <summary>History</summary>
          <div id="temperature-history" class="history-panel"></div>
        </details>
      </article>

      <article class="card widget" aria-label="Humidity">
        <h2 class="widget-title">Humidity</h2>
        <div class="widget-value">
          <span id="humidity-value" class="number">—</span>
          <span class="unit">%</span>
        </div>
        <div id="humidity-meta" class="widget-meta">Last updated: —</div>
        <details class="history-toggle">
          <summary>History</summary>
          <div id="humidity-history" class="history-panel"></div>
        </details>
      </article>

      <article class="card widget" aria-label="Soil moisture">
        <h2 class="widget-title">Soil Moisture</h2>
        <div class="widget-value">
          <span id="soil-moisture-value" class="number">—</span>
        </div>
        <div id="soil-moisture-meta" class="widget-meta">Last updated: —</div>
        <details class="history-toggle">
          <summary>History</summary>
          <div id="soil-moisture-history" class="history-panel"></div>
        </details>
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
const temperatureHistoryEl = document.querySelector('#temperature-history')
const humidityHistoryEl = document.querySelector('#humidity-history')
const soilMoistureHistoryEl = document.querySelector('#soil-moisture-history')
const wateringStatusEl = document.querySelector('#watering-status')
const plantConditionEl = document.querySelector('#plant-condition')

let latestMeasurement = null
let measurementHistory = []
let refreshTimer = null
let lastPlantType = null
let lastAdvice = null

function getSelectedProfile() {
  return plantProfileSelect?.value || 'venusFlytrap'
}

function getPlantConfig(plantType) {
  return PLANTS[plantType] || PLANTS.cactus
}

function getChartDomain(values, extraValues = []) {
  const numericValues = [...values, ...extraValues].filter((value) => Number.isFinite(value))

  if (numericValues.length === 0) {
    return { min: 0, max: 1 }
  }

  const minValue = Math.min(...numericValues)
  const maxValue = Math.max(...numericValues)

  if (minValue === maxValue) {
    const delta = Math.max(Math.abs(minValue) * 0.2, 1)
    return { min: minValue - delta, max: maxValue + delta }
  }

  const padding = Math.max((maxValue - minValue) * 0.15, 1)
  return { min: minValue - padding, max: maxValue + padding }
}

function projectValue(value, domain, height, topPadding) {
  const plotHeight = height - topPadding * 2
  const safeRange = domain.max - domain.min || 1
  return topPadding + ((domain.max - value) / safeRange) * plotHeight
}

function renderMeasurementHistory(container, series, options) {
  if (!container) return

  if (!series.length) {
    container.innerHTML = `
      <div class="history-empty">No history available yet.</div>
    `
    return
  }

  const width = 680
  const height = 220
  const leftPadding = 44
  const rightPadding = 16
  const topPadding = 16
  const bottomPadding = 34
  const plotWidth = width - leftPadding - rightPadding
  const plotHeight = height - topPadding - bottomPadding
  const values = series.map((entry) => entry.value)
  const thresholdValues = options.thresholds ? [options.thresholds.min, options.thresholds.max] : []
  const domain = getChartDomain(values, thresholdValues)
  const xStep = series.length > 1 ? plotWidth / (series.length - 1) : 0

  const points = series.map((entry, index) => {
    const x = leftPadding + (series.length === 1 ? plotWidth / 2 : index * xStep)
    const y = projectValue(entry.value, domain, height, topPadding)
    return { ...entry, x, y }
  })

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')

  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4
    const y = topPadding + ratio * plotHeight
    const value = domain.max - ratio * (domain.max - domain.min)
    return { y, value }
  })

  const latestPoint = points[points.length - 1]
  const latestValue = latestPoint.value
  const latestStatus = options.thresholds
    ? latestValue >= options.thresholds.min && latestValue <= options.thresholds.max
      ? 'In range'
      : 'Out of range'
    : `${options.valueFormatter(latestValue)}`

  const latestStatusClass = options.thresholds
    ? latestValue >= options.thresholds.min && latestValue <= options.thresholds.max
      ? 'good'
      : 'bad'
    : 'neutral'

  const chartZones = options.thresholds
    ? `
      <rect x="${leftPadding}" y="${topPadding}" width="${plotWidth}" height="${Math.max(projectValue(options.thresholds.max, domain, height, topPadding) - topPadding, 0)}" class="chart-zone chart-zone--bad" />
      <rect x="${leftPadding}" y="${projectValue(options.thresholds.max, domain, height, topPadding)}" width="${plotWidth}" height="${Math.max(projectValue(options.thresholds.min, domain, height, topPadding) - projectValue(options.thresholds.max, domain, height, topPadding), 0)}" class="chart-zone chart-zone--good" />
      <rect x="${leftPadding}" y="${projectValue(options.thresholds.min, domain, height, topPadding)}" width="${plotWidth}" height="${Math.max(height - bottomPadding - projectValue(options.thresholds.min, domain, height, topPadding), 0)}" class="chart-zone chart-zone--bad" />
    `
    : ''

  const xAxisLabels = points.length > 1
    ? `
      <text x="${points[0].x.toFixed(2)}" y="${height - 10}" text-anchor="start" class="chart-axis-label">${formatTimestamp(points[0].timestamp)}</text>
      <text x="${points[points.length - 1].x.toFixed(2)}" y="${height - 10}" text-anchor="end" class="chart-axis-label">${formatTimestamp(points[points.length - 1].timestamp)}</text>
    `
    : `
      <text x="${points[0].x.toFixed(2)}" y="${height - 10}" text-anchor="middle" class="chart-axis-label">${formatTimestamp(points[0].timestamp)}</text>
    `

  const pointMarkers = points
    .map((point) => {
      const pointClass = options.thresholds
        ? point.value >= options.thresholds.min && point.value <= options.thresholds.max
          ? 'good'
          : 'bad'
        : 'neutral'

      return `
        <circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="4.5" class="chart-point ${pointClass}">
          <title>${formatTimestamp(point.timestamp)}: ${options.valueFormatter(point.value)}</title>
        </circle>
      `
    })
    .join('')

  const thresholdLegend = options.thresholds
    ? `<div class="chart-legend"><span class="legend-item legend-item--good">Within window ${options.thresholdLabel}</span><span class="legend-item legend-item--bad">Outside window</span></div>`
    : ''

  container.innerHTML = `
    <div class="history-card">
      <div class="history-card__header">
        <div>
          <div class="history-card__title">${options.title}</div>
          <div class="history-card__subtitle">${options.subtitle}</div>
        </div>
        <div class="history-card__status ${latestStatusClass}">${latestStatus}</div>
      </div>
      ${thresholdLegend}
      <svg class="history-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.title} history chart">
        <line x1="${leftPadding}" y1="${topPadding}" x2="${leftPadding}" y2="${height - bottomPadding}" class="chart-axis" />
        <line x1="${leftPadding}" y1="${height - bottomPadding}" x2="${width - rightPadding}" y2="${height - bottomPadding}" class="chart-axis" />
        ${gridLines
          .map(
            (line) => `
              <line x1="${leftPadding}" y1="${line.y.toFixed(2)}" x2="${width - rightPadding}" y2="${line.y.toFixed(2)}" class="chart-grid" />
              <text x="${leftPadding - 8}" y="${line.y.toFixed(2)}" text-anchor="end" class="chart-y-label">${options.valueFormatter(line.value)}</text>
            `
          )
          .join('')}
        ${chartZones}
        <path d="${linePath}" class="chart-line" />
        ${pointMarkers}
        ${xAxisLabels}
      </svg>
      <div class="history-card__footer">
        <span>Oldest: ${formatTimestamp(series[0].timestamp)}</span>
        <span>Newest: ${formatTimestamp(series[series.length - 1].timestamp)}</span>
      </div>
    </div>
  `
}

function renderHistoryPanels() {
  const plantType = getSelectedProfile()
  const plant = getPlantConfig(plantType)

  renderMeasurementHistory(temperatureHistoryEl, measurementHistory.map((entry) => ({ timestamp: entry.timestamp, value: entry.temperatureC })).filter((entry) => Number.isFinite(entry.value)), {
    title: 'Temperature history',
    subtitle: `Green shows the target window for ${plant.name}.`,
    thresholds: plant.temperature,
    thresholdLabel: `${plant.temperature.min}°C - ${plant.temperature.max}°C`,
    valueFormatter: (value) => `${Number(value).toFixed(1)}°C`
  })

  renderMeasurementHistory(humidityHistoryEl, measurementHistory.map((entry) => ({ timestamp: entry.timestamp, value: entry.humidityPct })).filter((entry) => Number.isFinite(entry.value)), {
    title: 'Humidity history',
    subtitle: `Green shows the target window for ${plant.name}.`,
    thresholds: plant.humidity,
    thresholdLabel: `${plant.humidity.min}% - ${plant.humidity.max}%`,
    valueFormatter: (value) => `${Number(value).toFixed(0)}%`
  })

  renderMeasurementHistory(soilMoistureHistoryEl, measurementHistory.map((entry) => ({ timestamp: entry.timestamp, value: entry.soilMoisturePct })).filter((entry) => Number.isFinite(entry.value)), {
    title: 'Soil moisture history',
    subtitle: `Green shows the good moisture window for ${plant.name}.`,
    thresholds: {
      min: plant.moisture.perfect,
      max: plant.moisture.dry
    },
    thresholdLabel: `${plant.moisture.perfect} - ${plant.moisture.dry}`,
    valueFormatter: (value) => `${Number(value).toFixed(0)}`
  })
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
    const message = `[${PLANTS[plantType].name} Care Guide]\n${advice.join('\n')}`
    
    console.log(`[${PLANTS[plantType].name} Care Guide]`)
    advice.forEach(tip => console.log(`• ${tip}`))
    
    sendTelegramMessage(message)
    
    lastPlantType = plantType
    lastAdvice = adviceString
  }
}

function renderDashboard() {
  if (latestMeasurement) {
    renderMeasurement(latestMeasurement)
  }

  renderHistoryPanels()
}

async function loadData() {
  try {
    const [measurement, history] = await Promise.all([
      fetchLatestMeasurement(),
      fetchMeasurementHistory(24)
    ])

    latestMeasurement = measurement
    measurementHistory = history
    renderDashboard()
  } catch (err) {
    wateringStatusEl.textContent = 'Error loading data'
    temperatureHistoryEl.innerHTML = '<div class="history-empty">Unable to load history.</div>'
    humidityHistoryEl.innerHTML = '<div class="history-empty">Unable to load history.</div>'
    soilMoistureHistoryEl.innerHTML = '<div class="history-empty">Unable to load history.</div>'
  }
}

async function start() {
  if (!isSupabaseConfigured()) {
    wateringStatusEl.textContent = 'Supabase not configured'
    return
  }

  await loadData()
  refreshTimer = window.setInterval(loadData, 30000)
}

plantProfileSelect?.addEventListener('change', () => {
  renderDashboard()
})

window.addEventListener('beforeunload', () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

start()
