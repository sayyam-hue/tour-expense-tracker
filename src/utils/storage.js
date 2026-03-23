import localforage from 'localforage'

// ── Trips ──────────────────────────────────────────
export async function getTrips() {
  const trips = await localforage.getItem('trips')
  return trips || []
}

export async function saveTrip(trip) {
  const trips = await getTrips()
  const existing = trips.findIndex(t => t.id === trip.id)
  if (existing >= 0) { trips[existing] = trip } 
  else { trips.unshift(trip) }
  await localforage.setItem('trips', trips)
  return trip
}

export async function deleteTrip(tripId) {
  const trips = await getTrips()
  await localforage.setItem('trips', trips.filter(t => t.id !== tripId))
  await localforage.removeItem(`expenses_${tripId}`)
}

export async function getTripById(tripId) {
  const trips = await getTrips()
  return trips.find(t => t.id === tripId) || null
}

// ── Expenses ───────────────────────────────────────
export async function getExpenses(tripId) {
  const expenses = await localforage.getItem(`expenses_${tripId}`)
  return expenses || []
}

export async function saveExpense(tripId, expense) {
  const expenses = await getExpenses(tripId)
  const existing = expenses.findIndex(e => e.id === expense.id)
  if (existing >= 0) { expenses[existing] = expense } 
  else { expenses.unshift(expense) }
  await localforage.setItem(`expenses_${tripId}`, expenses)
  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const trip = await getTripById(tripId)
  if (trip) await saveTrip({ ...trip, total, expenseCount: expenses.length })
  return expense
}

export async function deleteExpense(tripId, expenseId) {
  const expenses = await getExpenses(tripId)
  const filtered = expenses.filter(e => e.id !== expenseId)
  await localforage.setItem(`expenses_${tripId}`, filtered)
  const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0)
  const trip = await getTripById(tripId)
  if (trip) await saveTrip({ ...trip, total, expenseCount: filtered.length })
}

export async function getExpenseById(tripId, expenseId) {
  const expenses = await getExpenses(tripId)
  return expenses.find(e => e.id === expenseId) || null
}

// ── Advance Receipts ───────────────────────────────
export async function getAdvances() {
  return (await localforage.getItem('advances')) || []
}

export async function saveAdvance(advance) {
  const advances = await getAdvances()
  const existing = advances.findIndex(a => a.id === advance.id)
  if (existing >= 0) { advances[existing] = advance } 
  else { advances.unshift(advance) }
  await localforage.setItem('advances', advances)
  return advance
}

export async function deleteAdvance(advanceId) {
  const advances = await getAdvances()
  await localforage.setItem('advances', advances.filter(a => a.id !== advanceId))
}

// ── Images ─────────────────────────────────────────
export async function saveImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const id = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2)
      const compressed = await compressImage(e.target.result, 1200, 0.8)
      await localforage.setItem(id, compressed)
      resolve(id)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function getImage(imageId) {
  return await localforage.getItem(imageId)
}

export async function deleteImage(imageId) {
  await localforage.removeItem(imageId)
}

function compressImage(dataUrl, maxDimension, quality) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const max = Math.max(width, height)
      if (max > maxDimension) {
        const scale = maxDimension / max
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}

// ── Helpers ────────────────────────────────────────
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2, minimumFractionDigits: 0
  })
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: '2-digit'
  })
}

export const CATEGORIES = [
  { name: 'Flights',  icon: '✈️',  color: '#5B8DEF' },
  { name: 'Travel',   icon: '🚗',  color: '#F5A623' },
  { name: 'Food',     icon: '🍴',  color: '#E85D75' },
  { name: 'Stay',     icon: '🛏️',  color: '#7ED321' },
  { name: 'Misc',     icon: '⚙️',  color: '#95A5A6' },
]

export const PAYMENT_MODES = [
  { name: 'KB - UPI',      icon: '📱' },
  { name: 'HDFC - UPI',    icon: '📲' },
  { name: 'Credit Card',   icon: '💳' },
  { name: 'Cash',          icon: '💵' },
]