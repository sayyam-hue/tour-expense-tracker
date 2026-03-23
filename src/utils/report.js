import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getImage, formatCurrency, formatDate } from './storage'

export async function generatePDF(trip, expenses) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  // ── Page 1: Header ──────────────────────────────
  // Dark header bar
  doc.setFillColor(15, 15, 20)
  doc.rect(0, 0, pageW, 40, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Tour Expense Report', 14, 16)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 200)
  doc.text(trip.name, 14, 25)
  doc.text(`${formatDate(trip.startDate)}  →  ${formatDate(trip.endDate)}`, 14, 33)

  // ── Total Amount Box ────────────────────────────
  doc.setFillColor(240, 244, 255)
  doc.roundedRect(14, 46, pageW - 28, 22, 4, 4, 'F')
  doc.setTextColor(100, 100, 130)
  doc.setFontSize(9)
  doc.text('TOTAL SPEND', 20, 54)
  doc.setTextColor(15, 15, 20)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  doc.text(formatCurrency(total), 20, 63)

  // ── Category Summary ────────────────────────────
  doc.setTextColor(80, 80, 100)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Category Breakdown', 14, 78)

  const catMap = {}
  expenses.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount)
  })

  const catColors = {
    Flights: [91, 141, 239],
    Travel: [245, 166, 35],
    Food: [232, 93, 117],
    Stay: [126, 211, 33],
    Personal: [155, 89, 182],
    Misc: [149, 165, 166],
  }

  let catY = 84
  Object.entries(catMap).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
    const pct = total > 0 ? amt / total : 0
    const barMaxW = 60
    const color = catColors[cat] || [149, 165, 166]

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 80)
    doc.text(cat, 14, catY + 3)
    doc.text(formatCurrency(amt), 60, catY + 3)

    // Bar background
    doc.setFillColor(220, 220, 230)
    doc.roundedRect(95, catY - 2, barMaxW, 5, 2, 2, 'F')

    // Bar fill
    doc.setFillColor(...color)
    doc.roundedRect(95, catY - 2, barMaxW * pct, 5, 2, 2, 'F')

    doc.setTextColor(120, 120, 140)
    doc.setFontSize(8)
    doc.text(`${Math.round(pct * 100)}%`, 158, catY + 3)

    catY += 10
  })

  // ── Expense Table ───────────────────────────────
  doc.setTextColor(80, 80, 100)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Expense Detail', 14, catY + 8)

  autoTable(doc, {
    startY: catY + 13,
    head: [['Date', 'Category', 'Amount (₹)', 'Notes']],
    body: expenses.map(e => [
      formatDate(e.date),
      e.category,
      formatCurrency(e.amount),
      e.notes || '-'
    ]),
    foot: [['', 'TOTAL', formatCurrency(total), '']],
    headStyles: {
      fillColor: [26, 26, 36],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 30, 50],
    },
    footStyles: {
      fillColor: [26, 26, 36],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [245, 246, 250] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 30 },
      2: { cellWidth: 35 },
      3: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
  })

  // ── Page 2+: Bill Images ────────────────────────
  const expensesWithImages = expenses.filter(e => e.imageIds && e.imageIds.length > 0)

  if (expensesWithImages.length > 0) {
    doc.addPage()

    // Header
    doc.setFillColor(15, 15, 20)
    doc.rect(0, 0, pageW, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Bill Images', 14, 13)

    let imgY = 28
    const imgW = 85
    const imgH = 65
    const colGap = 8
    let col = 0

    for (const expense of expensesWithImages) {
      for (const imgId of expense.imageIds) {
        const dataUrl = await getImage(imgId)
        if (!dataUrl) continue

        // Check page overflow
        if (imgY + imgH + 20 > 280) {
          doc.addPage()
          imgY = 20
          col = 0
        }

        const x = 14 + col * (imgW + colGap)

        // Border box
        doc.setFillColor(245, 246, 250)
        doc.roundedRect(x, imgY, imgW, imgH + 14, 3, 3, 'F')

        // Image
        try {
          doc.addImage(dataUrl, 'JPEG', x + 2, imgY + 2, imgW - 4, imgH - 4)
        } catch (e) {
          // skip broken image
        }

        // Label
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(40, 40, 60)
        doc.text(formatDate(expense.date), x + 3, imgY + imgH + 4)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(80, 80, 100)
        doc.text(`${expense.category} · ${formatCurrency(expense.amount)}`, x + 3, imgY + imgH + 10)

        col++
        if (col >= 2) {
          col = 0
          imgY += imgH + 22
        }
      }
    }
  }

  // ── Save / Download ─────────────────────────────
  const filename = `${trip.name.replace(/\s+/g, '_')}_Report.pdf`
  doc.save(filename)
}