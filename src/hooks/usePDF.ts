// =================================================================
// SEARCHER CONNECTOR — Hook PDF
// Génère de vrais fichiers PDF téléchargeables côté client, avec
// jsPDF + html2canvas (les deux étaient déjà des dépendances du
// projet, jamais utilisées — la version précédente se contentait
// d'ouvrir la boîte d'impression du navigateur via window.print(),
// ce qui n'est pas un vrai export PDF).
// =================================================================

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const MARGIN_MM = 12

// Construit un conteneur hors-écran avec l'entête/pied Searcher Connector
// autour du contenu HTML fourni, le capture en image, puis le découpe sur
// autant de pages A4 que nécessaire dans le PDF.
async function renderHtmlToPdf(html: string, filename: string, title: string = '') {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.top = '-99999px'
  container.style.left = '0'
  container.style.width = '800px'
  container.style.background = '#ffffff'
  container.style.padding = '32px'
  container.style.fontFamily = "'Segoe UI', Arial, sans-serif"
  container.style.color = '#111111'
  container.style.fontSize = '13px'
  container.style.lineHeight = '1.6'
  container.innerHTML = `
    <style>
      * { box-sizing: border-box; }
      h1 { font-size: 20px; margin-bottom: 16px; color: #111; }
      h2 { font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 6px; margin: 16px 0 8px; color: #111; }
      p { margin-bottom: 8px; color: #333; }
      ul, ol { padding-left: 20px; margin-bottom: 8px; }
      li { margin-bottom: 4px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th { background: #f5f5f5; font-weight: 700; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; }
      td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
      .score-big { font-size: 36px; font-weight: 900; color: #D4AF37; }
      .highlight { background: #FFF8E1; padding: 12px 16px; border-left: 3px solid #D4AF37; margin: 12px 0; border-radius: 0 6px 6px 0; }
    </style>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:14px;border-bottom:2px solid #D4AF37;">
      <div style="font-size:18px;font-weight:900;letter-spacing:-0.5px;">SEARCHER <span style="color:#D4AF37;">CONNECTOR</span></div>
      <div style="font-size:10px;color:#888;text-align:right;">
        ${title ? `<strong>${title}</strong><br/>` : ''}
        ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
        searcherconnector.com
      </div>
    </div>
    ${html}
    <div style="margin-top:40px;padding-top:12px;border-top:1px solid #eee;font-size:10px;color:#aaa;display:flex;justify-content:space-between;">
      <span>© ${new Date().getFullYear()} Searcher Connector — Tous droits réservés</span>
      <span>Généré par SCAI — L'agent IA qui travaille pour vous</span>
    </div>
  `
  document.body.appendChild(container)

  try {
    await renderContainerToPdf(container, filename)
  } finally {
    document.body.removeChild(container)
  }
}

async function renderContainerToPdf(container: HTMLElement, filename: string) {
  const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true })

  const pdf = new jsPDF('p', 'mm', 'a4')
  const usableWidth = A4_WIDTH_MM - MARGIN_MM * 2
  const usableHeight = A4_HEIGHT_MM - MARGIN_MM * 2
  const pageHeightPx = (usableHeight * canvas.width) / usableWidth

  let renderedHeightPx = 0
  let pageIndex = 0

  while (renderedHeightPx < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeightPx)

    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = sliceHeightPx
    const ctx = pageCanvas.getContext('2d')!
    ctx.drawImage(canvas, 0, renderedHeightPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx)

    const imgData = pageCanvas.toDataURL('image/jpeg', 0.92)
    if (pageIndex > 0) pdf.addPage()
    const sliceHeightMm = (sliceHeightPx * usableWidth) / canvas.width
    pdf.addImage(imgData, 'JPEG', MARGIN_MM, MARGIN_MM, usableWidth, sliceHeightMm)

    renderedHeightPx += sliceHeightPx
    pageIndex++
  }

  pdf.save(`${filename}.pdf`)
}

export function usePDF() {

  // ── Exporter une section de la page (par ID) en PDF ────────────
  const exportSection = async (elementId: string, filename: string = 'searcher-document') => {
    const element = document.getElementById(elementId)
    if (!element) {
      alert('Contenu introuvable pour l\'export PDF.')
      return
    }
    try {
      await renderContainerToPdf(element, filename)
    } catch (err: any) {
      alert(`Erreur lors de la génération du PDF : ${err.message}`)
    }
  }

  // ── Exporter du contenu HTML personnalisé en PDF ──────────────
  const exportHtml = async (html: string, filename: string = 'searcher-document', title: string = '') => {
    try {
      await renderHtmlToPdf(html, filename, title)
    } catch (err: any) {
      alert(`Erreur lors de la génération du PDF : ${err.message}`)
    }
  }

  // ── Exporter les opportunités en PDF ─────────────────────────
  const exportOpportunities = (opportunities: any[], profileName: string) => {
    const rows = opportunities.map(o => `
      <tr>
        <td><strong>${o.title}</strong><br/><span style="color:#888;font-size:11px">${o.company || ''}</span></td>
        <td>${o.location || 'Remote'}</td>
        <td style="font-weight:700;color:${o.score >= 70 ? '#D4AF37' : '#333'}">${o.score}/100</td>
        <td style="font-size:11px;color:#666">${o.source_platform || ''}</td>
        <td>${o.hours_ago < 24 ? `${o.hours_ago}h` : `${Math.round(o.hours_ago / 24)}j`}</td>
      </tr>
    `).join('')

    return exportHtml(`
      <h1>Mes opportunités — ${opportunities.length} résultats</h1>
      <p style="color:#666;margin-bottom:16px">Profil : <strong>${profileName}</strong> · Scan du ${new Date().toLocaleString('fr-FR')}</p>
      <table>
        <thead>
          <tr>
            <th>Opportunité</th>
            <th>Lieu</th>
            <th>Score</th>
            <th>Source</th>
            <th>Âge</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `, `opportunites-${new Date().toISOString().slice(0, 10)}`, 'Rapport d\'opportunités')
  }

  // ── Exporter une candidature en PDF ──────────────────────────
  const exportApplication = (application: any, profile: any) => {
    return exportHtml(`
      <h1>Candidature — ${application.job_title}</h1>
      ${application.company ? `<p><strong>Entreprise :</strong> ${application.company}</p>` : ''}
      <p><strong>Préparée le :</strong> ${new Date(application.applied_at).toLocaleString('fr-FR')}</p>
      ${application.score != null ? `<p><strong>Score de l'offre :</strong> ${application.score}/100</p>` : ''}
      <hr style="margin:16px 0;border:none;border-top:1px solid #eee"/>
      <h2>Message rédigé par SCAI</h2>
      <div style="background:#f9f9f9;padding:16px;border-radius:6px;white-space:pre-wrap;font-size:12px;line-height:1.7">
${application.cover_message}
      </div>
    `, `candidature-${application.job_title?.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30)}`, 'Candidature Searcher Connector')
  }

  return {
    exportSection,
    exportHtml,
    exportOpportunities,
    exportApplication,
  }
}
