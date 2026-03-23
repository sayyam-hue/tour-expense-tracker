import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getTripById, getExpenses, saveTrip, deleteExpense,
  formatCurrency, formatDate, CATEGORIES, PAYMENT_MODES
} from '../utils/storage'
import { generatePDF } from '../utils/report'

export default function TripDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [amountReceived, setAmountReceived] = useState('')
  const [showEditTrip, setShowEditTrip] = useState(false)
  const [editName, setEditName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    const [t, e] = await Promise.all([getTripById(id), getExpenses(id)])
    setTrip(t)
    setExpenses(e)
    setLoading(false)
  }

  function openEditTrip(t) {
    setEditName(t.name)
    setEditLocation(t.location || '')
    setEditStartDate(t.startDate || '')
    setEditEndDate(t.endDate || '')
    setShowEditTrip(true)
  }

  async function handleSaveTrip() {
    await saveTrip({
      ...trip,
      name: editName.trim(),
      location: editLocation.trim(),
      startDate: editStartDate,
      endDate: editEndDate
    })
    setShowEditTrip(false)
    loadData()
  }

  async function handleDeleteExpense(expenseId) {
    if (!window.confirm('Delete this expense?')) return
    await deleteExpense(id, expenseId)
    loadData()
  }

  async function handleCloseTrip() {
    const received = Number(amountReceived) || 0
    await saveTrip({
      ...trip,
      isClosed: true,
      amountReceived: received,
      closedAt: new Date().toISOString()
    })
    setShowCloseConfirm(false)
    setAmountReceived('')
    loadData()
  }

  async function handleReopenTrip() {
    await saveTrip({ ...trip, isClosed: false, amountReceived: 0, closedAt: null })
    loadData()
  }

  async function handleGenerateReport() {
    setGeneratingReport(true)
    try {
      await generatePDF(trip, expenses)
    } catch (err) {
      alert('Error generating report: ' + err.message)
    }
    setGeneratingReport(false)
  }

  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)

  const categoryTotals = CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.name).reduce((s, e) => s + Number(e.amount || 0), 0)
  })).filter(c => c.total > 0)

  const paymentTotals = PAYMENT_MODES.map(mode => ({
    ...mode,
    total: expenses.filter(e => e.paymentMode === mode.name).reduce((s, e) => s + Number(e.amount || 0), 0)
  })).filter(p => p.total > 0)

  const usedCategories = [...new Set(expenses.map(e => e.category))]

  const filteredExpenses = filter === 'All'
    ? expenses
    : expenses.filter(e => e.category === filter)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
  if (!trip) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>Trip not found</div>

  return (
    <div className="screen">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <h1 style={{ fontSize: 15, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {trip.name}
        </h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={() => openEditTrip(trip)} style={{ fontSize: 18 }}>✏️</button>
          <button onClick={handleGenerateReport} style={{ fontSize: 18 }}>📄</button>
          {trip.isClosed
            ? <button onClick={handleReopenTrip} style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>Reopen</button>
            : <button onClick={() => { setAmountReceived(String(totalSpent)); setShowCloseConfirm(true) }}
                style={{ fontSize: 13, color: '#7ED321', fontWeight: 600 }}>Close</button>
          }
        </div>
      </div>

      {generatingReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', padding: 32, borderRadius: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>⏳ Generating Report...</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Please wait</p>
          </div>
        </div>
      )}

      <div style={{ padding: '0 20px 20px' }}>
        {/* Trip Info */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              {trip.location && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📍 {trip.location}</p>}
              {(trip.startDate || trip.endDate) && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                  📅 {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                </p>
              )}
              {trip.isClosed && trip.amountReceived > 0 && (
                <p style={{ fontSize: 13, color: 'var(--success)', marginTop: 4 }}>
                  ✅ Received: {formatCurrency(trip.amountReceived)}
                </p>
              )}
            </div>
            {trip.isClosed
              ? <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--surface-alt)', padding: '3px 10px', borderRadius: 4 }}>CLOSED</span>
              : <span style={{ fontSize: 10, fontWeight: 700, color: '#4CAF50', background: 'rgba(76,175,80,0.15)', padding: '3px 10px', borderRadius: 4 }}>OPEN</span>
            }
          </div>
        </div>

        {/* Summary Card */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Spent</p>
              <p style={{ fontSize: 34, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.1 }}>
                {formatCurrency(totalSpent)}
              </p>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{expenses.length} expenses</p>
          </div>

          {categoryTotals.length > 0 && (
            <>
              <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2, marginBottom: 10 }}>
                {categoryTotals.map(cat => (
                  <div key={cat.name} style={{
                    width: `${totalSpent > 0 ? (cat.total / totalSpent) * 100 : 0}%`,
                    background: cat.color, borderRadius: 4
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {categoryTotals.map(cat => (
                  <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: cat.color }} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{cat.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{formatCurrency(cat.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Payment Mode Summary */}
        {paymentTotals.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 10 }}>
              PAYMENT BREAKDOWN
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {paymentTotals.map(mode => (
                <div key={mode.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{mode.icon}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{mode.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{formatCurrency(mode.total)}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>
                      {totalSpent > 0 ? Math.round((mode.total / totalSpent) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter chips */}
        {usedCategories.length > 1 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12 }}>
            {['All', ...usedCategories].map(cat => (
              <button key={cat} onClick={() => setFilter(cat)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0,
                  fontWeight: filter === cat ? 600 : 400,
                  background: filter === cat ? 'var(--accent)' : 'var(--surface-alt)',
                  color: filter === cat ? 'white' : 'var(--text-secondary)',
                }}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Expense List */}
        {filteredExpenses.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🧾</div>
            <h3>No Expenses</h3>
            {!trip.isClosed && <p>Tap + to add your first expense</p>}
          </div>
        ) : (
          filteredExpenses.map(expense => (
            <ExpenseRow key={expense.id} expense={expense}
              onEdit={() => navigate(`/trip/${id}/edit/${expense.id}`)}
              onDelete={() => handleDeleteExpense(expense.id)}
            />
          ))
        )}
      </div>

      {!trip.isClosed && (
        <button className="fab" onClick={() => navigate(`/trip/${id}/add`)}>+</button>
      )}

      {/* Edit Trip Modal */}
      {showEditTrip && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Edit Trip</h2>
              <button onClick={() => setShowEditTrip(false)} style={{ color: 'var(--text-secondary)', fontSize: 24 }}>×</button>
            </div>
            <label style={labelStyle}>TRIP NAME</label>
            <input style={inputStyle} value={editName}
              onChange={e => setEditName(e.target.value)} autoFocus />
            <label style={{ ...labelStyle, marginTop: 16 }}>LOCATION</label>
            <input style={inputStyle} placeholder="e.g. Mumbai, Maharashtra"
              value={editLocation} onChange={e => setEditLocation(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              <div>
                <label style={labelStyle}>FROM DATE</label>
                <input style={inputStyle} type="date" value={editStartDate}
                  onChange={e => setEditStartDate(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>TO DATE</label>
                <input style={inputStyle} type="date" value={editEndDate}
                  onChange={e => setEditEndDate(e.target.value)} />
              </div>
            </div>
            <button className="btn-primary" style={{ marginTop: 24 }}
              onClick={handleSaveTrip} disabled={!editName.trim()}>
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Close Trip Modal */}
      {showCloseConfirm && (
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Close Trip</h2>
              <button onClick={() => setShowCloseConfirm(false)}
                style={{ color: 'var(--text-secondary)', fontSize: 24 }}>×</button>
            </div>
            <div style={{ background: 'var(--surface-alt)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total Expenses</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{formatCurrency(totalSpent)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No. of Bills</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{expenses.length}</span>
              </div>
            </div>
            <label style={labelStyle}>AMOUNT RECEIVED FROM COMPANY</label>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4,
              background: 'var(--surface-alt)', borderRadius: 10, padding: '14px',
              border: '1px solid var(--separator)', marginBottom: 8 }}>
              <span style={{ fontSize: 20, color: 'var(--text-secondary)' }}>₹</span>
              <input type="number" inputMode="decimal" value={amountReceived}
                onChange={e => setAmountReceived(e.target.value)}
                style={{ fontSize: 28, fontWeight: 800, background: 'none', color: 'var(--text)', width: '100%' }}
                autoFocus />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Default is full trip amount. Edit if partial payment received.
            </p>
            <button onClick={handleCloseTrip}
              style={{ width: '100%', padding: 16, borderRadius: 12, background: '#7ED321',
                color: 'white', fontWeight: 700, fontSize: 16 }}>
              Close Trip ✓
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ExpenseRow({ expense, onEdit, onDelete }) {
  const cat = CATEGORIES.find(c => c.name === expense.category) || CATEGORIES[CATEGORIES.length - 1]
  const mode = PAYMENT_MODES.find(m => m.name === expense.paymentMode)
  const amount = Number(expense.amount || 0)
  const isHighValue = amount >= 1000

  return (
    <div className="card" style={{
      marginBottom: 10,
      cursor: 'pointer',
      borderLeft: `3px solid ${cat.color}`,
      borderRadius: 12,
    }} onClick={onEdit}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: cat.color + '22',
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 20, flexShrink: 0
        }}>
          {cat.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontWeight: isHighValue ? 700 : 600,
            fontSize: isHighValue ? 16 : 15,
            color: 'var(--text)', margin: 0
          }}>
            {expense.title || expense.category}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {formatDate(expense.expenseDate)}
            </span>
            {mode && (
              <span style={{
                fontSize: 10, color: cat.color,
                background: cat.color + '18',
                padding: '2px 8px', borderRadius: 10, fontWeight: 600
              }}>
                {mode.icon} {mode.name}
              </span>
            )}
          </div>
          {expense.notes && (
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, marginBottom: 0 }}>
              {expense.notes}
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{
            fontWeight: 800,
            fontSize: isHighValue ? 17 : 15,
            color: isHighValue ? 'var(--accent)' : 'var(--text)',
            margin: 0
          }}>
            {formatCurrency(amount)}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4, alignItems: 'center' }}>
            {expense.imageIds?.length > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                📎{expense.imageIds.length}
              </span>
            )}
            <button onClick={e => { e.stopPropagation(); onDelete() }}
              style={{ color: 'var(--danger)', fontSize: 14 }}>🗑</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }
const modalBox = { background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '24px 20px 48px', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 8 }
const inputStyle = { width: '100%', padding: '14px', background: 'var(--surface-alt)', border: '1px solid var(--separator)', borderRadius: 10, fontSize: 15, color: 'var(--text)', display: 'block' }