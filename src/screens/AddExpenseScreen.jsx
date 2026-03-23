import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  saveExpense, getExpenseById, getImage, saveImage,
  deleteImage, generateId, CATEGORIES, PAYMENT_MODES
} from '../utils/storage'

export default function AddExpenseScreen() {
  const { id, expenseId } = useParams()
  const navigate = useNavigate()
  const isEditing = !!expenseId
  const fileInputRef = useRef()
  const cameraInputRef = useRef()

  const today = new Date().toISOString().split('T')[0]

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Misc')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [expenseDate, setExpenseDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [imageIds, setImageIds] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [saving, setSaving] = useState(false)
  const [fullScreenImg, setFullScreenImg] = useState(null)

  useEffect(() => {
    if (isEditing) loadExpense()
  }, [expenseId])

  useEffect(() => {
    loadImagePreviews()
  }, [imageIds])

  async function loadExpense() {
    const expense = await getExpenseById(id, expenseId)
    if (!expense) return
    setTitle(expense.title || '')
    setAmount(String(expense.amount || ''))
    setCategory(expense.category || 'Misc')
    setPaymentMode(expense.paymentMode || 'Cash')
    setExpenseDate(expense.expenseDate || today)
    setNotes(expense.notes || '')
    setImageIds(expense.imageIds || [])
  }

  async function loadImagePreviews() {
    if (imageIds.length === 0) { setImagePreviews([]); return }
    const previews = await Promise.all(imageIds.map(imgId => getImage(imgId)))
    setImagePreviews(previews.filter(Boolean))
  }

  async function handleImageChange(e) {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const imgId = await saveImage(file)
      setImageIds(prev => [...prev, imgId])
    }
    e.target.value = ''
  }

  async function handleRemoveImage(index) {
    const imgId = imageIds[index]
    await deleteImage(imgId)
    setImageIds(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    const expense = {
      id: expenseId || generateId(),
      title: title.trim(),
      amount: Number(amount) || 0,
      category,
      paymentMode,
      expenseDate,
      notes: notes.trim(),
      imageIds,
      createdAt: isEditing ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await saveExpense(id, expense)
    setSaving(false)
    navigate(`/trip/${id}`)
  }

  return (
    <div className="screen">
      {/* Top Bar */}
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate(`/trip/${id}`)}>← Back</button>
        <h1>{isEditing ? 'Edit Expense' : 'New Expense'}</h1>
        <button onClick={handleSave} disabled={saving}
          style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 16 }}>
          {saving ? '...' : 'Save'}
        </button>
      </div>

      <div style={{ padding: '16px 20px' }}>

        {/* Amount — big and prominent */}
        <div className="card" style={{ textAlign: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 1, marginBottom: 6 }}>AMOUNT</p>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 28, color: 'var(--text-secondary)', fontWeight: 300 }}>₹</span>
            <input
              type="number" inputMode="decimal" placeholder="0"
              value={amount} onChange={e => setAmount(e.target.value)}
              autoFocus={!isEditing}
              style={{ fontSize: 48, fontWeight: 800, textAlign: 'center', width: '100%', background: 'none', color: 'var(--text)' }}
            />
          </div>
        </div>

        {/* Title */}
        <p style={sectionLabel}>TITLE</p>
        <input
          style={{ ...inputStyle, marginBottom: 16 }}
          placeholder="e.g. Cab to airport, Team lunch..."
          value={title} onChange={e => setTitle(e.target.value)}
        />

        {/* Category */}
        <p style={sectionLabel}>CATEGORY</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {CATEGORIES.map(cat => (
            <button key={cat.name} onClick={() => setCategory(cat.name)}
              style={{
                padding: '10px 6px', borderRadius: 10, display: 'flex',
                flexDirection: 'column', alignItems: 'center', gap: 5,
                background: category === cat.name ? cat.color + '22' : 'var(--surface)',
                border: `1px solid ${category === cat.name ? cat.color + '88' : 'var(--separator)'}`,
              }}>
              <span style={{ fontSize: 22 }}>{cat.icon}</span>
              <span style={{ fontSize: 11, fontWeight: category === cat.name ? 700 : 400,
                color: category === cat.name ? 'var(--text)' : 'var(--text-secondary)' }}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>

        {/* Payment Mode */}
        <p style={sectionLabel}>PAYMENT MODE</p>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
          {PAYMENT_MODES.map(mode => (
            <button key={mode.name} onClick={() => setPaymentMode(mode.name)}
              style={{
                padding: '8px 14px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
                fontSize: 13, fontWeight: paymentMode === mode.name ? 700 : 400,
                background: paymentMode === mode.name ? 'var(--accent)' : 'var(--surface)',
                color: paymentMode === mode.name ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${paymentMode === mode.name ? 'var(--accent)' : 'var(--separator)'}`,
              }}>
              {mode.icon} {mode.name}
            </button>
          ))}
        </div>

        {/* Expense Date */}
        <p style={sectionLabel}>EXPENSE DATE</p>
        <div className="card" style={{ marginBottom: 16 }}>
          <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
            style={{ width: '100%', fontSize: 15, background: 'none', color: 'var(--text)' }} />
        </div>

        {/* Notes */}
        <p style={sectionLabel}>NOTES (optional)</p>
        <div className="card" style={{ marginBottom: 16 }}>
          <textarea placeholder="Add any notes..." value={notes} onChange={e => setNotes(e.target.value)}
            rows={3} style={{ width: '100%', fontSize: 15, resize: 'none', background: 'none', color: 'var(--text)' }} />
        </div>

        {/* Bill Images */}
        <p style={sectionLabel}>BILL / RECEIPT {imageIds.length > 0 && `(${imageIds.length})`}</p>

        {imagePreviews.length > 0 && (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 12 }}>
            {imagePreviews.map((src, idx) => (
              <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                <img src={src} onClick={() => setFullScreenImg(src)}
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, cursor: 'pointer' }} />
                <button onClick={() => handleRemoveImage(idx)}
                  style={{ position: 'absolute', top: -6, right: -6, background: 'var(--danger)',
                    color: 'white', borderRadius: '50%', width: 20, height: 20, fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          <button onClick={() => cameraInputRef.current.click()} style={imgBtn}>📷 Camera</button>
          <button onClick={() => fileInputRef.current.click()} style={imgBtn}>🖼 Gallery</button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ display: 'none' }} />

        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : isEditing ? 'Update Expense' : 'Save Expense'}
        </button>
      </div>

      {/* Full screen image */}
      {fullScreenImg && (
        <div onClick={() => setFullScreenImg(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={fullScreenImg} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          <button style={{ position: 'absolute', top: 20, right: 20, color: 'white', fontSize: 28 }}>×</button>
        </div>
      )}
    </div>
  )
}

const sectionLabel = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
  letterSpacing: 1, marginBottom: 10
}
const inputStyle = {
  width: '100%', padding: '14px', background: 'var(--surface)',
  border: '1px solid var(--separator)', borderRadius: 10,
  fontSize: 15, color: 'var(--text)', display: 'block'
}
const imgBtn = {
  flex: 1, padding: '12px', borderRadius: 10,
  background: 'var(--accent-glow)', border: '1px solid rgba(91,141,239,0.3)',
  color: 'var(--accent)', fontWeight: 600, fontSize: 14
}