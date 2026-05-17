import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // 1. Fetch cash register session with movements and transactions
    const session = await prisma.cashSession.findUnique({
      where: { id: id },
      include: {
        salon: true,
        movements: { orderBy: { createdAt: "asc" } },
        transactions: {
          include: {
            booking: {
              include: {
                user: {
                  select: { name: true }
                }
              }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!session) {
      return new Response(
        `<html><body style="font-family: sans-serif; text-align: center; padding: 50px;"><h2>Session Not Found</h2><p>The requested cash register session could not be located.</p></body></html>`,
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    const salon = session.salon;

    // 2. Compute financial closure statistics
    const movementsIn = session.movements
      .filter((m) => m.type === "IN")
      .reduce((sum, m) => sum + m.amount, 0);

    const movementsOut = session.movements
      .filter((m) => m.type === "OUT")
      .reduce((sum, m) => sum + m.amount, 0);

    const expectedCashInDrawer = session.openingFloat + session.totalCash + movementsIn - movementsOut;
    const netRevenue = session.totalCash + session.totalCard;
    const transactionsCount = session.transactions.length;

    const openedDateFormatted = new Date(session.openedAt).toLocaleString("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC"
    });

    const closedDateFormatted = session.closedAt
      ? new Date(session.closedAt).toLocaleString("fr-FR", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "UTC"
        })
      : "En Cours (Actif)";

    // 3. Render print-friendly closure report
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport de Clôture - Caisse ${session.id.slice(-6)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    
    :root {
      --font-sans: 'Inter', sans-serif;
      --foreground: #1c1c1e;
      --muted: #8e8e93;
      --border: #e5e5ea;
      --accent: #007aff;
      --success: #34c759;
      --error: #ff3b30;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-sans);
      color: var(--foreground);
      background-color: #f2f2f7;
      padding: 40px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      -webkit-font-smoothing: antialiased;
    }

    .no-print-bar {
      width: 100%;
      max-width: 600px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .luna-btn {
      font-family: var(--font-sans);
      font-size: 14px;
      font-weight: 600;
      padding: 10px 20px;
      border-radius: 99px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .luna-btn-primary {
      background-color: var(--accent);
      color: white;
      box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
    }

    .luna-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(0, 122, 255, 0.3);
    }

    .luna-btn-secondary {
      background-color: white;
      color: var(--foreground);
      border: 1px solid var(--border);
    }

    .luna-btn-secondary:hover {
      background-color: #fafafa;
    }

    .report-card {
      background-color: white;
      width: 100%;
      max-width: 600px;
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
      border: 1px solid var(--border);
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .report-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }

    .salon-name {
      font-size: 14px;
      color: var(--muted);
      font-weight: 500;
    }

    .divider {
      height: 1px;
      background-color: var(--border);
      margin: 24px 0;
      border: none;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      font-size: 13px;
      margin-bottom: 30px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .meta-label {
      color: var(--muted);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .meta-value {
      font-weight: 500;
    }

    /* Financial Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }

    .metric-box {
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      background-color: #fafafa;
    }

    .metric-box-accent {
      background-color: rgba(0, 122, 255, 0.03);
      border-color: rgba(0, 122, 255, 0.15);
    }

    .metric-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .metric-value {
      font-size: 22px;
      font-weight: 800;
      color: var(--foreground);
    }

    .metric-value-accent {
      color: var(--accent);
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted);
      margin-bottom: 12px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      font-size: 13px;
    }

    .data-table th {
      text-align: left;
      font-weight: 600;
      color: var(--muted);
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }

    .data-table td {
      padding: 10px 0;
      border-bottom: 1px dashed #f2f2f7;
    }

    .text-right {
      text-align: right;
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .badge-in {
      background-color: rgba(52, 199, 89, 0.1);
      color: var(--success);
    }

    .badge-out {
      background-color: rgba(255, 59, 48, 0.1);
      color: var(--error);
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      font-size: 12px;
      color: var(--muted);
    }

    @media print {
      body {
        background-color: white;
        padding: 0;
        margin: 0;
      }
      
      .no-print-bar {
        display: none;
      }

      .report-card {
        box-shadow: none;
        border: none;
        max-width: 100%;
        padding: 0;
      }
    }
  </style>
</head>
<body>

  <div class="no-print-bar">
    <button onclick="window.print()" class="luna-btn luna-btn-primary">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Imprimer le Rapport
    </button>
    <a href="/dashboard" class="luna-btn luna-btn-secondary">Retour au Tableau</a>
  </div>

  <div class="report-card">
    <div class="header">
      <h1 class="report-title">Clôture Finale de Caisse</h1>
      <div class="salon-name">${salon.name}</div>
    </div>

    <hr class="divider">

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">ID Session</span>
        <span class="meta-value">#${session.id.slice(-8).toUpperCase()}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Statut Caisse</span>
        <span class="meta-value" style="font-weight: 700; color: ${session.status === "CLOSED" ? "var(--error)" : "var(--success)"}">${session.status === "CLOSED" ? "🔐 CLÔTURÉE" : "🔓 ACTIVE"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Ouvert le</span>
        <span class="meta-value">${openedDateFormatted}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Clôturé le</span>
        <span class="meta-value">${closedDateFormatted}</span>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-box">
        <div class="metric-label">Fond de Caisse (Opening)</div>
        <div class="metric-value">MAD ${session.openingFloat.toLocaleString()}</div>
      </div>
      <div class="metric-box metric-box-accent">
        <div class="metric-label">Chiffre d'Affaires Net</div>
        <div class="metric-value metric-value-accent">MAD ${netRevenue.toLocaleString()}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Espèces dans le Tiroir</div>
        <div class="metric-value">MAD ${expectedCashInDrawer.toLocaleString()}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Transactions Total</div>
        <div class="metric-value">${transactionsCount}</div>
      </div>
    </div>

    <hr class="divider">

    <div class="section-title">Flux de Caisse (Mouvements)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Heure</th>
          <th>Type</th>
          <th>Note / Motif</th>
          <th class="text-right">Montant (MAD)</th>
        </tr>
      </thead>
      <tbody>
        ${
          session.movements.length === 0
            ? '<tr><td colspan="4" style="text-align: center; color: var(--muted); padding: 15px 0;">Aucun mouvement de caisse enregistré.</td></tr>'
            : session.movements
                .map(
                  (m) => `
          <tr>
            <td>${new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}</td>
            <td><span class="badge ${m.type === "IN" ? "badge-in" : "badge-out"}">${m.type === "IN" ? "Entrée" : "Sortie"}</span></td>
            <td>${m.note || "Mouvement manuel"}</td>
            <td class="text-right" style="font-weight: 600;">MAD ${m.amount.toLocaleString()}</td>
          </tr>
        `
                )
                .join("")
        }
      </tbody>
    </table>

    <div class="section-title">Détails des Ventes / Paiements</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Heure</th>
          <th>Client</th>
          <th>Méthode</th>
          <th class="text-right">Total (MAD)</th>
        </tr>
      </thead>
      <tbody>
        ${
          session.transactions.length === 0
            ? '<tr><td colspan="4" style="text-align: center; color: var(--muted); padding: 15px 0;">Aucune transaction aujourd\'hui.</td></tr>'
            : session.transactions
                .map(
                  (t) => `
          <tr>
            <td>${new Date(t.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}</td>
            <td>${t.booking?.user?.name || "Client de passage"}</td>
            <td>${t.method === "CARD" ? "💳 Carte" : "💵 Espèces"}</td>
            <td class="text-right" style="font-weight: 600;">MAD ${t.amount.toLocaleString()}</td>
          </tr>
        `
                )
                .join("")
        }
      </tbody>
    </table>

    <div class="footer">
      Rapport d'audit système généré automatiquement le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}.<br>
      <strong>Luna OS Platform</strong>
    </div>
  </div>

</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html" }
    });
  } catch (error) {
    console.error("Closure report endpoint error:", error);
    return new Response(
      `<html><body style="font-family: sans-serif; text-align: center; padding: 50px;"><h2>Internal Server Error</h2><p>Unable to generate closure report.</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}
