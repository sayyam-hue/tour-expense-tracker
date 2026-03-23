import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { saveExpense, getExpenseById, getImage, saveImage, deleteImage, generateId, formatCurrency, CATEGORIES } from '../utils/storage'
import { getTripById, saveTrip } from '../utils/storage'

export default function AddExpenseScreen() {
  const { id, expenseId } = useParams()
  const navigate = useNavigate()
  const isEditing = !!expenseId
  const fileInputRef = useRef()
  const cameraInputRef = useRef()

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('Misc')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [imageIds, setImageIds] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [saving, setSaving] = useState(false)
  const [fullScreenImg, setFullScreenImg] = useState(null)

  useEffect(() => {
    if (isEditing) loadExpense()
    loadImagePreviews()
  }, [expenseId])

  async function loadExpense() {
    const expense = await getExpenseById(id, expenseId)
    if (!expense) return
    setDate(expense.date)
    setCategory(expense.category)
    setAmount(String(expense.amount))
    setNotes(expense.notes || '')
    setImageIds(expense.imageIds || [])
  }

  async function loadImagePreviews() {
    if (imageIds.length === 0) return
    const previews = await Promise.all(imageIds.map(imgId => getImage(imgId)))
    setImagePreviews(previews.filter(Boolean))
  }

  useEffect(() => {
    loadImagePreviews()
  }, [imageIds])

  async function handleImageChange(e) {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const imgId = await saveImage(file)
      setImageIds(prev => [...prev, imgId])
    }
  }

  async function handleRemoveImage(index) {
    const imgId = imageIds[index]
    await deleteImage(imgId)
    setImageIds(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!amount || isNaN(Number(amount))) return
    setSaving(true)

    const expense = {
      id: expenseId || generateId(),
      date,
      category,
      amount: Number(amount),
      notes: notes.trim(),
      imageIds,
      createdAt: new Date().toISOString()
    }

    await saveExpense(id, expense)

    // Update trip total and count
    const trip = await getTripById(id)
    const { getExpenses } = await import('../utils/storage')
    const allExpenses = await getExpenses(id)
    const total = allExpenses.reduce((s, e) => s + Number(e.amount), 0)
    await saveTrip({ ...trip, total, expenseCount: allExpenses.length })

    setSaving(false)
    navigate(`/trip/${id}`)
  }

  return (
    <div className="screen">
      {/* Top Bar */}
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate(`/trip/${id}`)}>← Back</button>
        <h1>{isEditing ? 'Edit Expense' : 'New Expense'}</h1>
        <button
          onClick={handleSave}
          disabled={!amount || saving}
          style={{ color: amount ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 600, fontSize: 16 }}
        >
          {saving ? '...' : 'Save'}
        </button>
      </div>

      <div style={{ padding: '20px' }}>

        {/* Amount */}
        <div className="card" style={{ marginBottom: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 8 }}>AMOUNT</p>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 28, color: 'var(--text-secondary)', fontWeight: 300 }}>₹</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus={!isEditing}
              style={{
                fontSize: 48,
                fontWeight: 700,
                textAlign: 'center',
                width: '100%',
                background: 'none',
                color: 'var(--text)',
              }}
            />
          </div>
        </div>

        {/* Category */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 10 }}>CATEGORY</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.name}
              onClick={() => setCategory(cat.name)}
              style={{
                padding: '12px 8px',
                borderRadius: 10,
                background: category === cat.name ? cat.color + '22' : 'var(--surface)',
                border: `1px solid ${category === cat.name ? cat.color + '88' : 'var(--separator)'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 24 }}>{cat.icon}</span>
              <span style={{
                fontSize: 12,
                fontWeight: category === cat.name ? 600 : 400,
                color: category === cat.name ? 'var(--text)' : 'var(--text-secondary)'
              }}>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Date */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 10 }}>DATE</p>
        <div className="card" style={{ marginBottom: 20 }}>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: '100%', fontSize: 15, background: 'none', color: 'var(--text)' }}
          />
        </div>

        {/* Notes */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 10 }}>NOTES</p>
        <div className="card" style={{ marginBottom: 20 }}>
          <textarea
            placeholder="Add notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            style={{ width: '100%', fontSize: 15, resize: 'none', background: 'none', color: 'var(--text)' }}
          />
        </div>

        {/* Images */}
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 10 }}>
          BILLS / RECEIPTS {imageIds.length > 0 && `(${imageIds.length})`}
        </p>

        {/* Image previews */}
        {imagePreviews.length > 0 && (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
            {imagePreviews.map((src, idx) => (
              <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={src}
                  onClick={() => setFullScreenImg(src)}
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, cursor: 'pointer' }}
                />
                <button
                  onClick={() => handleRemoveImage(idx)}
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    background: 'var(--danger)', color: 'white',
                    borderRadius: '50%', width: 20, height: 20,
                    fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        {/* Add image buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => cameraInputRef.current.click()}
            style={{
              flex: 1, padding: '12px', borderRadius: 10,
              background: 'var(--accent-glow)',
              border: '1px solid rgba(91,141,239,0.3)',
              color: 'var(--accent)', fontWeight: 600, fontSize: 14
            }}
          >
            📷 Camera
          </button>
          <button
            onClick={() => fileInputRef.current.click()}
            style={{
              flex: 1, padding: '12px', borderRadius: 10,
              background: 'var(--accent-glow)',
              border: '1px solid rgba(91,141,239,0.3)',
              color: 'var(--accent)', fontWeight: 600, fontSize: 14
            }}
          >
            🖼 Gallery
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ display: 'none' }} />

        {/* Save Button */}
        <button
          className="btn-primary"
          style={{ marginTop: 32 }}
          onClick={handleSave}
          disabled={!amount || saving}
        >
          {saving ? 'Saving...' : isEditing ? 'Update Expense' : 'Save Expense'}
        </button>
      </div>

      {/* Full screen image preview */}
      {fullScreenImg && (
        <div
          onClick={() => setFullScreenImg(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
            zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <img src={fullScreenImg} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          <button style={{ position: 'absolute', top: 20, right: 20, color: 'white', fontSize: 28 }}>×</button>
        </div>
      )}
    </div>
  )
}