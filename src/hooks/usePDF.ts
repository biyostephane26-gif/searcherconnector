// =================================================================
// SEARCHER CONNECTOR — Hook PDF
// Génère des PDFs côté client sans librairie lourde
// Utilise window.print() avec CSS d'impression dédié
// Compatible avec tous les navigateurs (Chrome, Firefox, Safari)
// Fonctionne sur PC, mobile et sur Vercel (100% client-side)
// =================================================================

export function usePDF() {

  // ── Exporter une section de la page en PDF ────────────────────
  // Passe l'ID de l'élément HTML à exporter
  const exportSection = (elementId: string, filename: string = 'searcher-document') => {
    const element = document.getElementById(elementId)
    if (!element) {
      alert('Contenu introuvable pour l\'export PDF.')
      return
    }

    // Créer une fenêtre d'impression dédiée
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) {
      alert('Popup bloqué. Autorise les popups pour ce site.')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>${filename}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #111;
            background: white;
            padding: 32px;
            font-size: 13px;
            line-height: 1.6;
          }
          /* Header Searcher */
          .sc-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 28px;
            padding-bottom: 16px;
            border-bottom: 2px solid #D4AF37;
          }
          .sc-header .logo {
            font-size: 18px;
            font-weight: 900;
            color: #111;
            letter-spacing: -0.5px;
          }
          .sc-header .logo span { color: #D4AF37; }
          .sc-header .meta {
            font-size: 10px;
            color: #888;
            text-align: right;
          }
          /* Contenu */
          h1, h2, h3 { color: #111; margin-bottom: 8px; margin-top: 20px; }
          h1 { font-size: 22px; }
          h2 { font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
          h3 { font-size: 14px; }
          p { margin-bottom: 8px; color: #333; }
          ul { padding-left: 20px; margin-bottom: 8px; }
          li { margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f5f5f5; font-weight: 700; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
          .badge-gold { background: #FFF8E1; color: #B8860B; border: 1px solid #D4AF37; }
          .badge-green { background: #E8F5E9; color: #2E7D32; }
          .badge-blue { background: #E3F2FD; color: #1565C0; }
          /* Score */
          .score { font-size: 20px; font-weight: 900; color: #D4AF37; }
          /* Footer */
          .sc-footer {
            margin-top: 40px;
            padding-top: 12px;
            border-top: 1px solid #eee;
            font-size: 10px;
            color: #aaa;
            display: flex;
            justify-content: space-between;
          }
          /* Page break */
          .page-break { page-break-after: always; }
          /* Hide UI elements not needed in PDF */
          button, nav, .no-print { display: none !important; }
          @media print {
            body { padding: 0; }
            @page { margin: 20mm 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="sc-header">
          <div class="logo">SEARCHER <span>CONNECTOR</span></div>
          <div class="meta">
            Généré le ${new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}<br/>
            searcherconnector.com
          </div>
        </div>
        ${element.innerHTML}
        <div class="sc-footer">
          <span>© ${new Date().getFullYear()} Searcher Connector</span>
          <span>Document généré automatiquement par SCAI</span>
        </div>
      </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    // Attendre que les fonts chargent avant d'imprimer
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  // ── Exporter du contenu HTML personnalisé en PDF ──────────────
  const exportHtml = (html: string, filename: string = 'searcher-document', title: string = '') => {
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) {
      alert('Popup bloqué. Autorise les popups pour ce site.')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>${filename}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: white; padding: 32px; font-size: 13px; line-height: 1.6; }
          .sc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 14px; border-bottom: 2px solid #D4AF37; }
          .sc-logo { font-size: 18px; font-weight: 900; letter-spacing: -0.5px; }
          .sc-logo span { color: #D4AF37; }
          .sc-meta { font-size: 10px; color: #888; text-align: right; }
          h1 { font-size: 20px; margin-bottom: 16px; }
          h2 { font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 6px; margin: 16px 0 8px; }
          p { margin-bottom: 8px; color: #333; }
          ul, ol { padding-left: 20px; margin-bottom: 8px; }
          li { margin-bottom: 4px; }
          .score-big { font-size: 36px; font-weight: 900; color: #D4AF37; }
          .highlight { background: #FFF8E1; padding: 12px 16px; border-left: 3px solid #D4AF37; margin: 12px 0; border-radius: 0 6px 6px 0; }
          .sc-footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #aaa; display: flex; justify-content: space-between; }
          @media print { @page { margin: 20mm 15mm; } }
        </style>
      </head>
      <body>
        <div class="sc-header">
          <div class="sc-logo">SEARCHER <span>CONNECTOR</span></div>
          <div class="sc-meta">
            ${title ? `<strong>${title}</strong><br/>` : ''}
            ${new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}<br/>
            searcherconnector.com
          </div>
        </div>
        ${html}
        <div class="sc-footer">
          <span>© ${new Date().getFullYear()} Searcher Connector — Tous droits réservés</span>
          <span>Généré par SCAI — L'agent IA qui travaille pour vous</span>
        </div>
      </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
  }

  // ── Exporter les opportunités en PDF ─────────────────────────
  const exportOpportunities = (opportunities: any[], profileName: string) => {
    const rows = opportunities.map(o => `
      <tr>
        <td><strong>${o.title}</strong><br/><span style="color:#888;font-size:11px">${o.company || ''}</span></td>
        <td>${o.location || 'Remote'}</td>
        <td style="font-weight:700;color:${o.score >= 70 ? '#D4AF37' : '#333'}">${o.score}/100</td>
        <td style="font-size:11px;color:#666">${o.source_platform || ''}</td>
        <td>${o.hours_ago < 24 ? `${o.hours_ago}h` : `${Math.round(o.hours_ago/24)}j`}</td>
        <td><a href="${o.original_url}" style="color:#D4AF37;font-size:11px">Voir →</a></td>
      </tr>
    `).join('')

    exportHtml(`
      <h1>Mes opportunités — ${opportunities.length} résultats</h1>
      <p style="color:#666;margin-bottom:16px">Profil : <strong>${profileName}</strong> · Scan du ${new Date().toLocaleString('fr-FR')}</p>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase">Opportunité</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase">Lieu</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase">Score</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase">Source</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase">Âge</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase">Lien</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `, `opportunites-${new Date().toISOString().slice(0,10)}`, 'Rapport d\'opportunités')
  }

  // ── Exporter une candidature en PDF ──────────────────────────
  const exportApplication = (application: any, profile: any) => {
    exportHtml(`
      <h1>Candidature — ${application.title}</h1>
      ${application.company ? `<p><strong>Entreprise :</strong> ${application.company}</p>` : ''}
      <p><strong>Envoyée le :</strong> ${new Date(application.applied_at).toLocaleString('fr-FR')}</p>
      <p><strong>Score de l'offre :</strong> ${application.score_at_apply}/100</p>
      <p><strong>Canal :</strong> ${application.channel === 'scai_auto' ? 'SCAI Auto-apply' : application.channel}</p>
      <hr style="margin:16px 0;border:none;border-top:1px solid #eee"/>
      <h2>Message envoyé</h2>
      <div style="background:#f9f9f9;padding:16px;border-radius:6px;white-space:pre-wrap;font-size:12px;line-height:1.7">
${application.message_sent}
      </div>
    `, `candidature-${application.title?.replace(/[^a-z0-9]/gi,'-').toLowerCase().slice(0,30)}`, 'Candidature Searcher Connector')
  }

  return {
    exportSection,
    exportHtml,
    exportOpportunities,
    exportApplication,
  }
}
