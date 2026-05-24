export function formatTimestamp(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (!Number.isFinite(date.getTime())) return '—'

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
