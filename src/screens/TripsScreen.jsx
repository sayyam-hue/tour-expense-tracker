import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTrips, saveTrip, deleteTrip, generateId, formatCurrency, formatDate } from '../utils/storage'

export default function TripsScreen() {
  const navigate = useNavigate()
  const [trips, setTrips] = useState([])
  const [showNewTrip, setShowNewTrip] = useState(false)
  const [tripName, setTripName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrips()
  }, [])

  async function loadTrips() {
    const data = await getTrips()
    setTrips(data)
    setLoading(false)
  }

  async function handleCreateTrip() {
    if (!tripName.trim() || !startDate || !endDate) return
    const trip = {
      id: generateId(),
      name: tripName.trim(),
      startDate,
      endDate,
      isClosed: false,
      createdAt: new Date().toISOString(),
      total: 0
    }
    await saveTrip(trip)
    setTripName('')
    setStartDate('')
    setEndDate('')
    setShowNewTrip(false)
    loadTrips()
  }

  async function handleDeleteTrip(e, tripId) {
    e.stopPropagation()
    if (!window.confirm('Delete this trip and all its expenses?')) return
    await deleteTrip(tripId)
    loadTrips()
  }

  async function handleCloseTrip(e, trip) {
    e.stopPropagation()
    if (!window.confirm('Mark this trip as closed?')) return
    await saveTrip({ ...trip, isClosed: true })
    loadTrips()
  }

  const activeTrips = trips.filter(t => !t.isClosed)
  const closedTrips = trips.filter(t => t.isClosed)

  return (
    <div className="screen">
      {/* Top Bar */}
      <div className="top-bar">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>
            Tour <span style={{ color: 'var(--accent)' }}>Expense</span>
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {trips.length} trip{trips.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: 40 }}>Loading...</p>
        ) : trips.length === 0 ? (
          <div className="empty-state">
            <div className="icon">✈️</div>
            <h3>No Trips Yet</h3>
            <p>Tap + to create your first trip</p>
          </div>
        ) : (
          <>
            {activeTrips.length > 0 && (
              <>
                <p className="section-label" style={{ padding: 0, marginBottom: 10 }}>Active</p>
                {activeTrips.map(trip => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onTap={() => navigate(`/trip/${trip.id}`)}
                    onDelete={(e) => handleDeleteTrip(e, trip.id)}
                    onClose={(e) => handleCloseTrip(e, trip)}
                  />
                ))}
              </>
            )}
            {closedTrips.length > 0 && (
              <>
                <p className="section-label" style={{ padding: 0, marginBottom: 10, marginTop: 20 }}>Completed</p>
                {closedTrips.map(trip => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onTap={() => navigate(`/trip/${trip.id}`)}
                    onDelete={(e) => handleDeleteTrip(e, trip.id)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setShowNewTrip(true)}>+</button>

      {/* New Trip Modal */}
      {showNewTrip && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>New Trip</h2>
              <button onClick={() => setShowNewTrip(false)} style={{ color: 'var(--text-secondary)', fontSize: 22 }}>×</button>
            </div>

            <label style={labelStyle}>TRIP NAME</label>
            <input
              style={inputStyle}
              placeholder="e.g. Mumbai Trip March 2026"
              value={tripName}
              onChange={e => setTripName(e.target.value)}
              autoFocus
            />

            <label style={{ ...labelStyle, marginTop: 16 }}>FROM DATE</label>
            <input
              style={inputStyle}
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />

            <label style={{ ...labelStyle, marginTop: 16 }}>TO DATE</label>
            <input
              style={inputStyle}
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />

            <button
              className="btn-primary"
              style={{ marginTop: 24 }}
              onClick={handleCreateTrip}
              disabled={!tripName.trim() || !startDate || !endDate}
            >
              Create Trip
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TripCard({ trip, onTap, onDelete, onClose }) {
  return (
    <div className="card" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={onTap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontWeight: 600, fontSize: 16 }}>{trip.name}</p>
            {trip.isClosed && (
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--surface-alt)', padding: '2px 8px', borderRadius: 4 }}>CLOSED</span>
            )}
            {!trip.isClosed && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!trip.isClosed && (
            <button onClick={onClose} style={{ fontSize: 18 }}>✓</button>
          )}
          <button onClick={onDelete} style={{ fontSize: 18, color: 'var(--danger)' }}>🗑</button>
        </div>
      </div>

      <div style={{ height: 0.5, background: 'var(--separator)', margin: '12px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(trip.total || 0)}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Expenses</p>
          <p style={{ fontSize: 20, fontWeight: 700 }}>{trip.expenseCount || 0}</p>
        </div>
      </div>
    </div>
  )
}

const modalOverlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'flex-end',
  justifyContent: 'center',
  zIndex: 200,
}

const modalBox = {
  background: 'var(--surface)',
  borderRadius: '20px 20px 0 0',
  padding: '24px 20px 40px',
  width: '100%',
  maxWidth: 480,
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  letterSpacing: 1,
  marginBottom: 8,
}

const inputStyle = {
  width: '100%',
  padding: '14px',
  background: 'var(--surface-alt)',
  border: '1px solid var(--separator)',
  borderRadius: 10,
  fontSize: 15,
  color: 'var(--text)',
  display: 'block',
}