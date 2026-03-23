import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTrips, getExpenses, getAdvances, formatCurrency, CATEGORIES, PAYMENT_MODES } from '../utils/storage'

export default function SummaryScreen() {
  const navigate = useNavigate()
  const [trips, setTrips] = useState([])
  const [allExpenses, setAllExpenses] = useState([])
  const [advances, setAdvances] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [t, a] = await Promise.all([getTrips(), getAdvances()])
    setTrips(t)
    setAdvances(a)
    const expenseArrays = await Promise.all(t.map(trip => getExpenses(trip.id)))
    setAllExpenses(expenseArrays.flat())
    setLoading(false)
  }

  const totalSpent = allExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalAdvances = advances.reduce((s, a) => s + Number(a.amount || 0), 0)
  const openTotal = trips.filter(t => !t.isClosed).reduce((s, t) => s + (t.total || 0), 0)
  const closedTotal = trips.filter(t => t.isClosed).reduce((s, t) => s + (t.total || 0), 0)
  const balanceDue = openTotal - totalAdvances

  const categoryTotals = CATEGORIES.map(cat => ({
    ...cat,
    total: allExpenses.filter(e => e.category === cat.name).reduce((s, e) => s + Number(e.amount || 0), 0),
    count: allExpenses.filter(e => e.category === cat.name).length
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  const paymentTotals = PAYMENT_MODES.map(mode => ({
    ...mode,
    total: allExpenses.filter(e => e.paymentMode === mode.name).reduce((s, e) => s + Number(e.amount || 0), 0),
    count: allExpenses.filter(e => e.paymentMode === mode.name).length
  })).filter(p => p.total > 0).sort((a, b) => b.total - a.total)

  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <h1>Summary</h1>
        <div style={{ width: 60 }} />
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 40 }}>Loading...</p>
      ) : (
        <div style={{ padding: '16px 20px' }}>

          {/* Overall Stats */}
          <p style={sectionLabel}>OVERALL</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            <StatCard label="Total Spent" value={formatCurrency(totalSpent)} color="var(--accent)" />
            <StatCard label="Total Trips" value={trips.length} color="var(--text)" />
            <StatCard label="Pending Reimbursement" value={formatCurrency(openTotal)} color="#F5A623" />
            <StatCard label="Total Received" value={formatCurrency(closedTotal)} color="var(--success)" />
          </div>

          {/* Balance */}
          <div className="card" style={{ marginBottom: 20, background: balanceDue > 0 ? 'rgba(232,93,117,0.1)' : 'rgba(76,175,80,0.1)', border: `1px solid ${balanceDue > 0 ? 'rgba(232,93,117,0.3)' : 'rgba(76,175,80,0.3)'}` }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {balanceDue > 0 ? '⚠️ Balance Due from Company' : '✅ All Settled'}
            </p>
            <p style={{ fontSize: 28, fontWeight: 800, color: balanceDue > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {formatCurrency(Math.abs(balanceDue))}
            </p>
            {totalAdvances > 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                Advances received: {formatCurrency(totalAdvances)}
              </p>
            )}
          </div>

          {/* Category Breakdown */}
          {categoryTotals.length > 0 && (
            <>
              <p style={sectionLabel}>SPENDING BY CATEGORY</p>
              <div className="card" style={{ marginBottom: 20 }}>
                {/* Stacked bar */}
                <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', gap: 2, marginBottom: 14 }}>
                  {categoryTotals.map(cat => (
                    <div key={cat.name} style={{
                      width: `${totalSpent > 0 ? (cat.total / totalSpent) * 100 : 0}%`,
                      background: cat.color, borderRadius: 4
                    }} />
                  ))}
                </div>
                {categoryTotals.map(cat => (
                  <div key={cat.name} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{cat.icon}</span>
                        <span style={{ fontSize: 14 }}>{cat.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{cat.count} expenses</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{formatCurrency(cat.total)}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>
                          {totalSpent > 0 ? Math.round((cat.total / totalSpent) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: 4, background: 'var(--surface-alt)', borderRadius: 2 }}>
                      <div style={{
                        height: '100%', borderRadius: 2, background: cat.color,
                        width: `${totalSpent > 0 ? (cat.total / totalSpent) * 100 : 0}%`
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Payment Mode Breakdown */}
          {paymentTotals.length > 0 && (
            <>
              <p style={sectionLabel}>SPENDING BY PAYMENT MODE</p>
              <div className="card" style={{ marginBottom: 20 }}>
                {paymentTotals.map(mode => (
                  <div key={mode.name} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{mode.icon}</span>
                        <span style={{ fontSize: 14 }}>{mode.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{mode.count} expenses</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{formatCurrency(mode.total)}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>
                          {totalSpent > 0 ? Math.round((mode.total / totalSpent) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    <div style={{ height: 4, background: 'var(--surface-alt)', borderRadius: 2 }}>
                      <div style={{
                        height: '100%', borderRadius: 2, background: 'var(--accent)',
                        width: `${totalSpent > 0 ? (mode.total / totalSpent) * 100 : 0}%`
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Trip Breakdown */}
          {trips.length > 0 && (
            <>
              <p style={sectionLabel}>PER TRIP</p>
              {trips.sort((a, b) => (b.total || 0) - (a.total || 0)).map(trip => (
                <div key={trip.id} className="card" style={{ marginBottom: 10 }}
                  onClick={() => navigate(`/trip/${trip.id}`)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 15 }}>{trip.name}</p>
                      {trip.location && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>📍 {trip.location}</p>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent)' }}>{formatCurrency(trip.total || 0)}</p>
                      <p style={{ fontSize: 11, color: trip.isClosed ? 'var(--success)' : '#F5A623' }}>
                        {trip.isClosed ? '✅ Reimbursed' : '⏳ Pending'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <p style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>
        {label.toUpperCase()}
      </p>
      <p style={{ fontSize: 18, fontWeight: 800, color }}>{value}</p>
    </div>
  )
}

const sectionLabel = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
  letterSpacing: 1, marginBottom: 10, display: 'block'
}