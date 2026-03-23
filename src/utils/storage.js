import localforage from 'localforage'

// ── Trips ──────────────────────────────────────────
export async function getTrips() {
  const trips = await localforage.getItem('trips')
  return trips || []
}

export async function saveTrip(trip) {
  const trips = await getTrips()
  const existing = trips.findIndex(t => t.id === trip.id)
  if (existing >= 0) {
    trips[existing] = trip
  } else {
    trips.unshift(trip)
  }
  await localforage.setItem('trips', trips)
  return trip
}

export async function deleteTrip(tripId) {
  const trips = await getTrips()
  const filtered = trips.filter(t => t.id !== tripId)
  await localforage.setItem('trips', filtered)
  // also delete all expenses for this trip
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
  if (existing >= 0) {
    expenses[existing] = expense
  } else {
    expenses.unshift(expense)
  }
  await localforage.setItem(`expenses_${tripId}`, expenses)
  return expense
}

export async function deleteExpense(tripId, expenseId) {
  const expenses = await getExpenses(tripId)
  const filtered = expenses.filter(e => e.id !== expenseId)
  await localforage.setItem(`expenses_${tripId}`, filtered)
}

export async function getExpenseById(tripId, expenseId) {
  const expenses = await getExpenses(tripId)
  return expenses.find(e => e.id === expenseId) || null
}

// ── Images ─────────────────────────────────────────
export async function saveImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const id = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2)
      // Compress before saving
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

// ── Image Compression ──────────────────────────────
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
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
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
  return '₹' + Number(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  })
}

export function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

export const CATEGORIES = [
  { name: 'Flights',  icon: '✈️',  color: '#5B8DEF' },
  { name: 'Travel',   icon: '🚗',  color: '#F5A623' },
  { name: 'Food',     icon: '🍴',  color: '#E85D75' },
  { name: 'Stay',     icon: '🛏️',  color: '#7ED321' },
  { name: 'Personal', icon: '👤',  color: '#9B59B6' },
  { name: 'Misc',     icon: '⚙️',  color: '#95A5A6' },
]