const PROFILE_THRESHOLDS = {
  cactus: { soilMoistureMin: 20 },
  fern: { soilMoistureMin: 40 },
  succulent: { soilMoistureMin: 30 }
}

export function getWateringDecision({ soilMoisturePct, profile }) {
  const profileKey = profile && PROFILE_THRESHOLDS[profile] ? profile : 'succulent'
  const { soilMoistureMin } = PROFILE_THRESHOLDS[profileKey]

  if (soilMoisturePct == null || Number.isNaN(soilMoisturePct)) {
    return {
      needsWater: null,
      statusText: 'No data yet',
      reason: 'Waiting for soil moisture reading.'
    }
  }

  if (soilMoisturePct < soilMoistureMin) {
    return {
      needsWater: true,
      statusText: 'Water needed',
      reason: `Soil moisture ${soilMoisturePct}% is below ${soilMoistureMin}%.`
    }
  }

  return {
    needsWater: false,
    statusText: 'No watering needed',
    reason: `Soil moisture ${soilMoisturePct}% is at/above ${soilMoistureMin}%.`
  }
}
