import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getImage, formatDate, getAdvances } from './storage'

export async function generatePDF(trip, expenses) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 14

  // Sort expenses by date
  const sortedExpenses = [...expenses].sort((a, b) => {
    const dateA = new Date(a.expenseDate || a.date || 0)
    const dateB = new Date(b.expenseDate || b.date || 0)
    return dateA - dateB
  })

  // ── Header ──────────────────────────────────────
  doc.setFillColor(15, 15, 20)
  doc.rect(0, 0, pageW, 36, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Expense Report', margin, 13)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 160, 190)
  doc.text(trip.name, margin, 22)

  const tripMeta = [
    trip.location ? `${trip.location}` : null,
    (trip.startDate || trip.endDate)
      ? `${trip.startDate ? formatDate(trip.startDate) : '?'} – ${trip.endDate ? formatDate(trip.endDate) : '?'}`
      : null
  ].filter(Boolean).join('   ·   ')

  if (tripMeta) {
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 150)
    doc.text(tripMeta, margin, 30)
  }

  doc.setFontSize(8)
  doc.setTextColor(120, 120, 150)
  const genDate = `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
  doc.text(genDate, pageW - margin, 30, { align: 'right' })

  // ── Expense Table ───────────────────────────────
  const tableData = sortedExpenses.map((e, i) => [
    i + 1,
    formatDate(e.expenseDate || e.date),
    e.title || e.category || '—',
    `Rs. ${Number(e.amount || 0).toLocaleString('en-IN')}`,
    e.notes || '—'
  ])

  const total = sortedExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)

  autoTable(doc, {
    startY: 44,
    head: [['#', 'Date', 'Title', 'Amount', 'Notes']],
    body: tableData,
    foot: [['', '', 'Total', `Rs. ${total.toLocaleString('en-IN')}`, '']],
    headStyles: {
      fillColor: [26, 26, 36],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 30, 50],
      cellPadding: 4,
    },
    footStyles: {
      fillColor: [26, 26, 36],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 5,
    },
    alternateRowStyles: { fillColor: [245, 246, 250] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 55 },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 'auto' },
    },
    margin: { left: margin, right: margin },
    tableLineColor: [220, 220, 230],
    tableLineWidth: 0.3,
  })

  // ── Summary Section ─────────────────────────────
  const allAdvances = await getAdvances()
  const tripAdvances = allAdvances.filter(a => a.tripId === trip.id)
  const totalAdvance = tripAdvances.reduce((s, a) => s + Number(a.amount || 0), 0)
  const balanceDue = total - totalAdvance

  const summaryY = doc.lastAutoTable.finalY + 10
  const boxHeight = totalAdvance > 0 ? 38 : 18

  doc.setFillColor(245, 246, 250)
  doc.setDrawColor(210, 212, 220)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, summaryY, pageW - margin * 2, boxHeight, 2, 2, 'FD')

  // Total spent + expense count
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 100)
  doc.text('Total Spent', margin + 6, summaryY + 9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 50)
  doc.text(`Rs. ${total.toLocaleString('en-IN')}`, pageW - margin - 6, summaryY + 9, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 100)
  doc.text(`${sortedExpenses.length} expense${sortedExpenses.length !== 1 ? 's' : ''}`, pageW / 2, summaryY + 9, { align: 'center' })

  // Advance row (only if exists)
  if (totalAdvance > 0) {
    doc.setDrawColor(210, 212, 220)
    doc.setLineWidth(0.3)
    doc.line(margin + 2, summaryY + 13, pageW - margin - 2, summaryY + 13)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 100)
    doc.text('Advance Received', margin + 6, summaryY + 22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(76, 175, 80)
    doc.text(`− Rs. ${totalAdvance.toLocaleString('en-IN')}`, pageW - margin - 6, summaryY + 22, { align: 'right' })

    doc.setDrawColor(210, 212, 220)
    doc.line(margin + 2, summaryY + 26, pageW - margin - 2, summaryY + 26)
  }

  // Balance due - dark row
  const balanceBoxY = totalAdvance > 0 ? summaryY + 28 : summaryY + 8
  const balanceBoxH = 10
  doc.setFillColor(26, 26, 36)
  doc.roundedRect(margin, balanceBoxY, pageW - margin * 2, balanceBoxH, 0, 0, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.text('Balance Due', margin + 6, balanceBoxY + 7)
  const balanceColor = balanceDue > 0 ? [232, 93, 117] : [76, 175, 80]
  doc.setTextColor(...balanceColor)
  doc.text(
    `Rs. ${Math.abs(balanceDue).toLocaleString('en-IN')}${balanceDue < 0 ? ' (excess)' : ''}`,
    pageW - margin - 6, balanceBoxY + 7, { align: 'right' }
  )

  // ── Bill Images ─────────────────────────────────
  const expensesWithImages = sortedExpenses.filter(e => e.imageIds && e.imageIds.length > 0)

  if (expensesWithImages.length > 0) {
    doc.addPage()

    doc.setFillColor(15, 15, 20)
    doc.rect(0, 0, pageW, 22, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Bill Images', margin, 14)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 150)
    doc.text(trip.name, pageW - margin, 14, { align: 'right' })

    let imgY = 30
    const imgW = (pageW - margin * 2 - 8) / 2
    const imgH = 70
    const labelH = 16
    const blockH = imgH + labelH + 6
    let col = 0

    for (const expense of expensesWithImages) {
      for (const imgId of expense.imageIds) {
        const dataUrl = await getImage(imgId)
        if (!dataUrl) continue

        if (imgY + blockH > pageH - margin) {
          doc.addPage()
          doc.setFillColor(15, 15, 20)
          doc.rect(0, 0, pageW, 22, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.text('Bill Images (continued)', margin, 14)
          imgY = 30
          col = 0
        }

        const x = margin + col * (imgW + 8)

        doc.setFillColor(245, 246, 250)
        doc.setDrawColor(210, 212, 220)
        doc.setLineWidth(0.3)
        doc.roundedRect(x, imgY, imgW, imgH + labelH, 2, 2, 'FD')

        try {
          doc.addImage(dataUrl, 'JPEG', x + 2, imgY + 2, imgW - 4, imgH - 4)
        } catch (e) {
          doc.setFillColor(220, 220, 230)
          doc.rect(x + 2, imgY + 2, imgW - 4, imgH - 4, 'F')
          doc.setTextColor(150, 150, 160)
          doc.setFontSize(8)
          doc.text('Image unavailable', x + imgW / 2, imgY + imgH / 2, { align: 'center' })
        }

        doc.setFillColor(26, 26, 36)
        doc.roundedRect(x, imgY + imgH, imgW, labelH, 0, 0, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        const labelTitle = expense.title || expense.category || '—'
        doc.text(labelTitle.length > 22 ? labelTitle.slice(0, 22) + '…' : labelTitle, x + 4, imgY + imgH + 6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(160, 160, 190)
        doc.setFontSize(7)
        doc.text(
          `${formatDate(expense.expenseDate || expense.date)}   Rs. ${Number(expense.amount || 0).toLocaleString('en-IN')}`,
          x + 4, imgY + imgH + 12
        )

        col++
        if (col >= 2) {
          col = 0
          imgY += blockH + 8
        }
      }
    }
  }

  // ── Footer on all pages ─────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setTextColor(160, 160, 180)
    doc.setFont('helvetica', 'normal')
    doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 6, { align: 'center' })
    doc.text(trip.name, margin, pageH - 6)
    doc.text(
      new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      pageW - margin, pageH - 6, { align: 'right' }
    )
  }

  const filename = `${trip.name.replace(/\s+/g, '_')}_Expense_Report.pdf`
  doc.save(filename)
}