import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getTrips, saveTrip, deleteTrip, generateId,
  formatCurrency, formatDate, getAdvances, saveAdvance, deleteAdvance
} from '../utils/storage'

export default function TripsScreen() {
  const navigate = useNavigate()
  const [trips, setTrips] = useState([])
  const [advances, setAdvances] = useState([])
  const [showNewTrip, setShowNewTrip] = useState(false)
  const [showNewAdvance, setShowNewAdvance] = useState(false)
  const [loading, setLoading] = useState(true)

  const [tripName, setTripName] = useState('')
  const [tripLocation, setTripLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [advanceAmount, setAdvanceAmount] = useState('')
  const [advanceNote, setAdvanceNote] = useState('')
  const [advanceTripId, setAdvanceTripId] = useState('')
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [t, a] = await Promise.all([getTrips(), getAdvances()])
    setTrips(t)
    setAdvances(a)
    setLoading(false)
  }

  async function handleCreateTrip() {
    if (!tripName.trim()) return
    const trip = {
      id: generateId(),
      name: tripName.trim(),
      location: tripLocation.trim(),
      startDate, endDate,
      isClosed: false,
      createdAt: new Date().toISOString(),
      total: 0, expenseCount: 0
    }
    await saveTrip(trip)
    setTripName(''); setTripLocation(''); setStartDate(''); setEndDate('')
    setShowNewTrip(false)
    loadData()
  }

  async function handleCreateAdvance() {
    if (!advanceAmount) return
    const advance = {
      id: generateId(),
      amount: Number(advanceAmount),
      note: advanceNote.trim(),
      tripId: advanceTripId || null,
      date: advanceDate,
      createdAt: new Date().toISOString()
    }
    await saveAdvance(advance)
    setAdvanceAmount(''); setAdvanceNote(''); setAdvanceTripId('')
    setShowNewAdvance(false)
    loadData()
  }

  async function handleDeleteTrip(e, tripId) {
    e.stopPropagation()
    if (!window.confirm('Delete this trip and all its expenses?')) return
    await deleteTrip(tripId)
    loadData()
  }

  async function handleDeleteAdvance(id) {
    if (!window.confirm('Delete this advance?')) return
    await deleteAdvance(id)
    loadData()
  }

  // ── Dashboard calculations (OPEN TRIPS ONLY) ──
  const openTrips = trips.filter(t => !t.isClosed)
  const closedTrips = trips.filter(t => t.isClosed)

  // Total spent = only open trips
  const totalSpent = openTrips.reduce((s, t) => s + (t.total || 0), 0)

  // Advances linked to open trips only
  const openTripIds = new Set(openTrips.map(t => t.id))
  const relevantAdvances = advances.filter(a => !a.tripId || openTripIds.has(a.tripId))
  const totalAdvances = relevantAdvances.reduce((s, a) => s + (a.amount || 0), 0)

  // Remaining advance = advance minus what's already been spent (can't go below 0)
  const remainingAdvance = Math.max(0, totalAdvances - totalSpent)

  // Balance due = what company still owes me (open trips total minus advances given)
  const balanceDue = totalSpent - totalAdvances

  return (
    <div className="screen">
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800 }}>
              Tour <span style={{ color: 'var(--accent)' }}>Expense</span>
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {openTrips.length} open · {closedTrips.length} closed
            </p>
          </div>
          <button onClick={() => navigate('/summary')}
            style={{ background: 'var(--surface)', border: '1px solid var(--separator)',
              borderRadius: 10, padding: '8px 14px', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
            📊 Summary
          </button>
        </div>

        {/* Dashboard Cards - open trips only */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <DashCard
            label="Total Spent"
            value={formatCurrency(totalSpent)}
            sub="Open trips only"
            color="var(--accent)"
          />
          <DashCard
            label="Advances Received"
            value={formatCurrency(totalAdvances)}
            sub={remainingAdvance > 0 ? `₹${remainingAdvance.toLocaleString('en-IN')} remaining` : 'Fully utilized'}
            color="#7ED321"
          />
        </div>

        {/* Balance Due - full width prominent card */}
        <div style={{
          borderRadius: 12, padding: '16px',
          marginBottom: 16,
          background: balanceDue > 0 ? 'rgba(232,93,117,0.1)' : balanceDue < 0 ? 'rgba(76,175,80,0.1)' : 'var(--surface)',
          border: `1px solid ${balanceDue > 0 ? 'rgba(232,93,117,0.4)' : balanceDue < 0 ? 'rgba(76,175,80,0.4)' : 'var(--separator)'}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 0.5, marginBottom: 4 }}>
              {balanceDue > 0 ? '⚠️ BALANCE DUE FROM COMPANY' : balanceDue < 0 ? '✅ EXCESS ADVANCE' : '✅ ALL SETTLED'}
            </p>
            <p style={{ fontSize: 28, fontWeight: 800,
              color: balanceDue > 0 ? 'var(--danger)' : balanceDue < 0 ? 'var(--success)' : 'var(--text-secondary)' }}>
              {formatCurrency(Math.abs(balanceDue))}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
              ₹{totalSpent.toLocaleString('en-IN')} spent − ₹{totalAdvances.toLocaleString('en-IN')} advance
            </p>
          </div>
          <button onClick={() => setShowNewAdvance(true)}
            style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600,
              background: 'var(--accent-glow)', padding: '8px 14px', borderRadius: 8,
              border: '1px solid rgba(91,141,239,0.3)', whiteSpace: 'nowrap' }}>
            + Advance
          </button>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: 40 }}>Loading...</p>
        ) : (
          <>
            {/* Active Trips */}
            <p className="section-label" style={{ padding: 0, margin: '0 0 10px' }}>Active Trips</p>

            {openTrips.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <div className="icon">✈️</div>
                <h3>No Active Trips</h3>
                <p>Tap + to create your first trip</p>
              </div>
            ) : (
              openTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} advances={advances}
                  onTap={() => navigate(`/trip/${trip.id}`)}
                  onDelete={(e) => handleDeleteTrip(e, trip.id)} />
              ))
            )}

            {/* Closed Trips */}
            {closedTrips.length > 0 && (
              <>
                <p className="section-label" style={{ padding: 0, margin: '20px 0 10px' }}>Closed Trips</p>
                {closedTrips.map(trip => (
                  <TripCard key={trip.id} trip={trip} advances={advances}
                    onTap={() => navigate(`/trip/${trip.id}`)}
                    onDelete={(e) => handleDeleteTrip(e, trip.id)} />
                ))}
              </>
            )}

            {/* Advances list */}
            {advances.length > 0 && (
              <>
                <p className="section-label" style={{ padding: 0, margin: '20px 0 10px' }}>Advance Receipts</p>
                {advances.map(adv => {
                  const linkedTrip = trips.find(t => t.id === adv.tripId)
                  return (
                    <div key={adv.id} className="card"
                      style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 15, color: '#7ED321' }}>{formatCurrency(adv.amount)}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {formatDate(adv.date)}{adv.note ? ` · ${adv.note}` : ''}
                        </p>
                        {linkedTrip
                          ? <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>🔗 {linkedTrip.name}</p>
                          : <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Generic advance</p>
                        }
                      </div>
                      <button onClick={() => handleDeleteAdvance(adv.id)}
                        style={{ color: 'var(--danger)', fontSize: 18 }}>🗑</button>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}
      </div>

      <button className="fab" onClick={() => setShowNewTrip(true)}>+</button>

      {/* New Trip Modal */}
      {showNewTrip && (
        <Modal title="New Trip" onClose={() => setShowNewTrip(false)}>
          <label style={labelStyle}>TRIP NAME *</label>
          <input style={inputStyle} placeholder="e.g. Mumbai Client Visit"
            value={tripName} onChange={e => setTripName(e.target.value)} autoFocus />

          <label style={{ ...labelStyle, marginTop: 16 }}>LOCATION</label>
          <input style={inputStyle} placeholder="e.g. Mumbai, Maharashtra"
            value={tripLocation} onChange={e => setTripLocation(e.target.value)} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div>
              <label style={labelStyle}>FROM DATE</label>
              <input style={inputStyle} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>TO DATE</label>
              <input style={inputStyle} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <button className="btn-primary" style={{ marginTop: 24 }}
            onClick={handleCreateTrip} disabled={!tripName.trim()}>
            Create Trip
          </button>
        </Modal>
      )}

      {/* New Advance Modal */}
      {showNewAdvance && (
        <Modal title="Add Advance Receipt" onClose={() => setShowNewAdvance(false)}>
          <label style={labelStyle}>AMOUNT *</label>
          <input style={inputStyle} type="number" inputMode="decimal" placeholder="0"
            value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} autoFocus />

          <label style={{ ...labelStyle, marginTop: 16 }}>DATE</label>
          <input style={inputStyle} type="date" value={advanceDate}
            onChange={e => setAdvanceDate(e.target.value)} />

          <label style={{ ...labelStyle, marginTop: 16 }}>NOTE</label>
          <input style={inputStyle} placeholder="e.g. Advance for Mumbai trip"
            value={advanceNote} onChange={e => setAdvanceNote(e.target.value)} />

          <label style={{ ...labelStyle, marginTop: 16 }}>LINK TO TRIP (optional)</label>
          <select style={{ ...inputStyle, background: 'var(--surface-alt)' }}
            value={advanceTripId} onChange={e => setAdvanceTripId(e.target.value)}>
            <option value="">— Generic advance —</option>
            {openTrips.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <button className="btn-primary" style={{ marginTop: 24 }}
            onClick={handleCreateAdvance} disabled={!advanceAmount}>
            Save Advance
          </button>
        </Modal>
      )}
    </div>
  )
}

function DashCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <p style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>
        {label.toUpperCase()}
      </p>
      <p style={{ fontSize: 20, fontWeight: 800, color }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

function TripCard({ trip, advances, onTap, onDelete }) {
  const tripAdvances = advances.filter(a => a.tripId === trip.id)
  const tripAdvanceTotal = tripAdvances.reduce((s, a) => s + a.amount, 0)
  const tripRemainingAdvance = Math.max(0, tripAdvanceTotal - (trip.total || 0))

  return (
    <div className="card" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={onTap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <p style={{ fontWeight: 700, fontSize: 16 }}>{trip.name}</p>
            {trip.isClosed
              ? <span style={closedBadge}>CLOSED</span>
              : <span style={openBadge}>OPEN</span>}
          </div>
          {trip.location && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>📍 {trip.location}</p>}
          {(trip.startDate || trip.endDate) && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              📅 {trip.startDate ? formatDate(trip.startDate) : '?'} – {trip.endDate ? formatDate(trip.endDate) : '?'}
            </p>
          )}
        </div>
        <button onClick={onDelete} style={{ color: 'var(--danger)', fontSize: 18, padding: '0 0 0 12px' }}>🗑</button>
      </div>

      <div style={{ height: 0.5, background: 'var(--separator)', margin: '8px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total Spent</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{formatCurrency(trip.total || 0)}</p>
        </div>
        {tripAdvanceTotal > 0 && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {tripRemainingAdvance > 0 ? 'Advance Left' : 'Advance Used'}
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: tripRemainingAdvance > 0 ? '#7ED321' : 'var(--text-secondary)' }}>
              {formatCurrency(tripRemainingAdvance > 0 ? tripRemainingAdvance : tripAdvanceTotal)}
            </p>
          </div>
        )}
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Expenses</p>
          <p style={{ fontSize: 20, fontWeight: 800 }}>{trip.expenseCount || 0}</p>
        </div>
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div style={modalOverlay}>
      <div style={modalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)', fontSize: 24, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const openBadge = { fontSize: 9, fontWeight: 700, color: '#4CAF50', background: 'rgba(76,175,80,0.15)', padding: '2px 8px', borderRadius: 4 }
const closedBadge = { fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--surface-alt)', padding: '2px 8px', borderRadius: 4 }
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }
const modalBox = { background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '24px 20px 48px', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 8 }
const inputStyle = { width: '100%', padding: '14px', background: 'var(--surface-alt)', border: '1px solid var(--separator)', borderRadius: 10, fontSize: 15, color: 'var(--text)', display: 'block' }