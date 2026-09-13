// Construction des fichiers générés par SCAI : PDF (jsPDF), Excel (ExcelJS), Word (docx).
import { jsPDF } from 'jspdf'
import ExcelJS from 'exceljs'
import { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx'

export interface DocTable { columns: string[]; rows: (string | number | null)[][] }
export interface DocSection { heading?: string; paragraphs?: string[]; bullets?: string[]; table?: DocTable }
export interface DocSpec { title: string; subtitle?: string; sections: DocSection[] }
export interface SheetSpec { name: string; columns: string[]; rows: (string | number | null)[][] }
export interface WorkbookSpec { title: string; sheets: SheetSpec[] }

const GOLD: [number, number, number] = [212, 175, 55]
const TURQUOISE: [number, number, number] = [14, 159, 154]

// Helvetica (jsPDF) ne couvre que le Latin-1 : on retire émojis et symboles hors plage.
const latin1 = (s: unknown) => String(s ?? '')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...')
  .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '')

export function buildPdf(spec: DocSpec): Buffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 50
  let y = M

  const ensure = (h: number) => { if (y + h > H - M) { doc.addPage(); y = M } }

  doc.setFillColor(...TURQUOISE); doc.rect(0, 0, W, 6, 'F')
  doc.setFillColor(...GOLD); doc.rect(0, 6, W, 2, 'F')

  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(20, 20, 20)
  for (const line of doc.splitTextToSize(latin1(spec.title), W - 2 * M)) { ensure(26); doc.text(line, M, y + 14); y += 26 }
  if (spec.subtitle) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(110, 110, 110)
    for (const line of doc.splitTextToSize(latin1(spec.subtitle), W - 2 * M)) { ensure(16); doc.text(line, M, y + 8); y += 16 }
  }
  y += 10

  for (const s of spec.sections || []) {
    if (s.heading) {
      ensure(30); y += 8
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...TURQUOISE)
      doc.text(latin1(s.heading), M, y + 10); y += 16
      doc.setDrawColor(...GOLD); doc.setLineWidth(1); doc.line(M, y, M + 40, y); y += 10
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(40, 40, 40)
    for (const p of s.paragraphs || []) {
      for (const line of doc.splitTextToSize(latin1(p), W - 2 * M)) { ensure(15); doc.text(line, M, y + 10); y += 15 }
      y += 6
    }
    for (const b of s.bullets || []) {
      const lines = doc.splitTextToSize(latin1(b), W - 2 * M - 14)
      lines.forEach((line: string, i: number) => {
        ensure(15)
        if (i === 0) { doc.setFillColor(...GOLD); doc.circle(M + 3, y + 7, 2, 'F') }
        doc.text(line, M + 14, y + 10); y += 15
      })
    }
    if (s.table && s.table.columns?.length) {
      const cols = s.table.columns
      const colW = (W - 2 * M) / cols.length
      const rowH = (cells: unknown[]) => Math.max(...cells.map(c => doc.splitTextToSize(latin1(c), colW - 8).length)) * 12 + 8
      ensure(24)
      doc.setFillColor(...TURQUOISE); doc.rect(M, y, W - 2 * M, 20, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255)
      cols.forEach((c, i) => doc.text(doc.splitTextToSize(latin1(c), colW - 8)[0] || '', M + i * colW + 4, y + 13))
      y += 20
      doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40)
      s.table.rows.forEach((r, ri) => {
        const h = rowH(r); ensure(h)
        if (ri % 2 === 0) { doc.setFillColor(245, 250, 250); doc.rect(M, y, W - 2 * M, h, 'F') }
        r.forEach((cell, i) => doc.text(doc.splitTextToSize(latin1(cell), colW - 8), M + i * colW + 4, y + 12))
        y += h
      })
      y += 10
    }
  }

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(150, 150, 150)
    doc.text(`Généré par SCAI - Searcher Connector   ${i}/${pages}`, M, H - 24)
  }
  return Buffer.from(doc.output('arraybuffer'))
}

export async function buildXlsx(spec: WorkbookSpec): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'SCAI - Searcher Connector'
  wb.created = new Date()
  for (const sheet of spec.sheets?.length ? spec.sheets : [{ name: 'Feuille 1', columns: ['Contenu'], rows: [] }]) {
    const safeName = String(sheet.name || 'Feuille').replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Feuille'
    const ws = wb.addWorksheet(safeName, { views: [{ state: 'frozen', ySplit: 1 }] })
    ws.columns = sheet.columns.map(c => ({
      header: c,
      key: c,
      width: Math.min(60, Math.max(12, c.length + 4, ...sheet.rows.map(r => String(r[sheet.columns.indexOf(c)] ?? '').length + 2))),
    }))
    sheet.rows.forEach(r => ws.addRow(r))
    const header = ws.getRow(1)
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E9F9A' } }
    header.alignment = { vertical: 'middle' }
    header.height = 22
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: Math.max(1, sheet.columns.length) } }
    ws.eachRow((row, n) => {
      if (n > 1 && n % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3FAFA' } }
    })
  }
  return Buffer.from(await wb.xlsx.writeBuffer())
}

export async function buildDocx(spec: DocSpec): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: spec.title, bold: true, color: '0E9F9A' })] }),
  ]
  if (spec.subtitle) children.push(new Paragraph({ children: [new TextRun({ text: spec.subtitle, italics: true, color: '6B7280' })] }))

  for (const s of spec.sections || []) {
    if (s.heading) children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240 }, children: [new TextRun({ text: s.heading, color: 'B8962D' })] }))
    for (const p of s.paragraphs || []) children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun(p)] }))
    for (const b of s.bullets || []) children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(b)] }))
    if (s.table && s.table.columns?.length) {
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: s.table.columns.map(c => new TableCell({
              shading: { fill: '0E9F9A' },
              children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: c, bold: true, color: 'FFFFFF' })] })],
            })),
          }),
          ...s.table.rows.map(r => new TableRow({
            children: s.table!.columns.map((_, i) => new TableCell({ children: [new Paragraph(String(r[i] ?? ''))] })),
          })),
        ],
      }))
    }
  }

  const doc = new Document({ creator: 'SCAI - Searcher Connector', title: spec.title, sections: [{ children }] })
  return Buffer.from(await Packer.toBuffer(doc))
}
