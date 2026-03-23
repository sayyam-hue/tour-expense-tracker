import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTripById, getExpenses, saveTrip, deleteExpense, getImage, formatCurrency, formatDate, CATEGORIES } from '../utils/storage'
import { generatePDF } from '../utils/report'

export default function TripDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [generatingReport, setGeneratingReport] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    const t = await getTripById(id)
    const e = await getExpenses(id)
    setTrip(t)
    setExpenses(e)
    setLoading(false)
  }

  async function handleDeleteExpense(expenseId, imageIds) {
    if (!window.confirm('Delete this expense?')) return
    await deleteExpense(id, expenseId)
    loadData()
  }

  async function handleCloseTrip() {
    if (!window.confirm('Mark this trip as closed?')) return
    await saveTrip({ ...trip, isClosed: true })
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

  const filteredExpenses = filter === 'All'
    ? expenses
    : expenses.filter(e => e.category === filter)

  const categoryTotals = CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.name).reduce((s, e) => s + Number(e.amount), 0)
  })).filter(c => c.total > 0)

  const usedCategories = [...new Set(expenses.map(e => e.category))]

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
  if (!trip) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>Trip not found</div>

  return (
    <div className="screen">
      {/* Top Bar */}
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <h1 style={{ fontSize: 16, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trip.name}</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          {!trip.isClosed && (
            <button onClick={handleCloseTrip} style={{ fontSize: 20 }}>✓</button>
          )}
          <button onClick={handleGenerateReport} style={{ fontSize: 20 }}>📄</button>
        </div>
      </div>

      {generatingReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', padding: 32, borderRadius: 16, textAlign: 'center' }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>⏳ Generating Report...</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Please wait</p>
          </div>
        </div>
      )}

      <div style={{ padding: '16px 20px' }}>
        {/* Summary Card */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Spent</p>
              <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)' }}>
                {formatCurrency(expenses.reduce((s, e) => s + Number(e.amount), 0))}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{expenses.length} expenses</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
              </p>
              {trip.isClosed && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--surface-alt)', padding: '2px 8px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>CLOSED</span>
              )}
            </div>
          </div>

          {/* Category breakdown bar */}
          {categoryTotals.length > 0 && (
            <>
              <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2, marginBottom: 8 }}>
                {categoryTotals.map(cat => {
                  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
                  const pct = total > 0 ? (cat.total / total) * 100 : 0
                  return (
                    <div key={cat.name} style={{ width: `${pct}%`, background: cat.color, borderRadius: 4 }} />
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {categoryTotals.map(cat => (
                  <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: cat.color }} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{cat.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{formatCurrency(cat.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Filter chips */}
        {usedCategories.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12 }}>
            {['All', ...usedCategories].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: filter === cat ? 600 : 400,
                  background: filter === cat ? 'var(--accent)' : 'var(--surface-alt)',
                  color: filter === cat ? 'white' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
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
            <ExpenseRow
              key={expense.id}
              expense={expense}
              onEdit={() => navigate(`/trip/${id}/edit/${expense.id}`)}
              onDelete={() => handleDeleteExpense(expense.id, expense.imageIds)}
            />
          ))
        )}
      </div>

      {/* FAB - only if trip is open */}
      {!trip.isClosed && (
        <button className="fab" onClick={() => navigate(`/trip/${id}/add`)}>+</button>
      )}
    </div>
  )
}

function ExpenseRow({ expense, onEdit, onDelete }) {
  const cat = CATEGORIES.find(c => c.name === expense.category) || CATEGORIES[5]

  return (
    <div className="card" style={{ marginBottom: 10, cursor: 'pointer' }} onClick={onEdit}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Icon */}
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: cat.color + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0
        }}>
          {cat.icon}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 15 }}>{expense.category}</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {formatDate(expense.date)}
            {expense.notes ? ` · ${expense.notes}` : ''}
          </p>
        </div>

        {/* Amount + actions */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 15 }}>{formatCurrency(expense.amount)}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            {expense.imageIds?.length > 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>📎 {expense.imageIds.length}</span>
            )}
            <button onClick={(e) => { e.stopPropagation(); onDelete() }} style={{ color: 'var(--danger)', fontSize: 14 }}>🗑</button>
          </div>
        </div>
      </div>
    </div>
  )
}