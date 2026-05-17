import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // 1. Fetch Invoice
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { id: id },
          { transactionId: id },
          { number: id }
        ]
      },
      include: {
        transaction: {
          include: {
            session: {
              include: {
                salon: true
              }
            }
          }
        }
      }
    });

    if (!invoice) {
      return new Response(
        `<html><body style="font-family: sans-serif; text-align: center; padding: 50px;"><h2>Receipt Not Found</h2><p>The requested invoice could not be located in our registers.</p></body></html>`,
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    const transaction = invoice.transaction;
    const salon = transaction.session.salon;

    // 2. Fetch TRANSACTION_CREATED audit log for exact cart item details
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entity: "Transaction",
        entityId: transaction.id,
        action: "TRANSACTION_CREATED"
      }
    });

    let cartItems: Array<{ id: string; name: string; price: number; quantity: number }> = [];
    let discountAmount = 0;

    if (auditLog && auditLog.details) {
      try {
        const details = JSON.parse(auditLog.details);
        cartItems = details.cart || [];
        discountAmount = details.discountAmount || 0;
      } catch (err) {
        console.error("Failed to parse transaction audit details", err);
      }
    }

    // Fallback if no audit details exist
    if (cartItems.length === 0) {
      cartItems = [
        {
          id: "legacy",
          name: "Salon Services",
          price: invoice.totalAmount,
          quantity: 1
        }
      ];
    }

    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const dateFormatted = new Date(invoice.createdAt).toLocaleString("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC"
    });

    // 3. Render Apple-level, minimal, ultra-clean CSS and print-ready layout
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reçu Luna - ${invoice.number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    
    :root {
      --font-sans: 'Inter', sans-serif;
      --foreground: #1c1c1e;
      --muted: #8e8e93;
      --border: #e5e5ea;
      --accent: #007aff;
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
      max-width: 480px;
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

    .receipt-card {
      background-color: white;
      width: 100%;
      max-width: 480px;
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
      border: 1px solid var(--border);
      position: relative;
    }

    /* Decorative Receipt Cutout effect */
    .receipt-card::after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 0;
      width: 100%;
      height: 12px;
      background-image: radial-gradient(circle, white 4px, transparent 5px);
      background-size: 12px 12px;
      background-position: left bottom;
      display: none; /* Screen-only fallback */
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .logo-placeholder {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -1.5px;
      color: var(--foreground);
      margin-bottom: 8px;
    }

    .salon-name {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .salon-contact {
      font-size: 13px;
      color: var(--muted);
      line-height: 1.4;
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
      gap: 12px;
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

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .items-table th {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted);
      text-align: left;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }

    .items-table td {
      padding: 12px 0;
      font-size: 14px;
      border-bottom: 1px dashed #f2f2f7;
    }

    .item-name {
      font-weight: 600;
    }

    .item-qty {
      color: var(--muted);
      font-size: 12px;
      margin-top: 2px;
    }

    .price-col {
      text-align: right;
    }

    .summary-stack {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 14px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
    }

    .summary-row-muted {
      color: var(--muted);
    }

    .summary-row-total {
      font-size: 20px;
      font-weight: 800;
      color: var(--accent);
      margin-top: 8px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      font-size: 13px;
      color: var(--muted);
      line-height: 1.4;
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

      .receipt-card {
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
      Imprimer le Reçu
    </button>
    <a href="/dashboard" class="luna-btn luna-btn-secondary">Retour au Tableau</a>
  </div>

  <div class="receipt-card">
    <div class="header">
      <div class="logo-placeholder">LUNA</div>
      <div class="salon-name">${salon.name}</div>
      <div class="salon-contact">
        ${salon.address ? `${salon.address}, ` : ""}${salon.city || "Casablanca"}<br>
        Tél: ${salon.contactPhone || "+212 522 123456"}
      </div>
    </div>

    <hr class="divider">

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Référence Reçu</span>
        <span class="meta-value">${invoice.number}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Date & Heure</span>
        <span class="meta-value">${dateFormatted}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Mode Paiement</span>
        <span class="meta-value">${transaction.method === "CARD" ? "💳 Carte Bancaire" : "💵 Espèces"}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Statut</span>
        <span class="meta-value" style="color: #34c759; font-weight: 700;">PAYÉ</span>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Service / Description</th>
          <th style="text-align: right;">Total (MAD)</th>
        </tr>
      </thead>
      <tbody>
        ${cartItems.map(item => `
          <tr>
            <td>
              <div class="item-name">${item.name}</div>
              <div class="item-qty">Qté: ${item.quantity} x MAD ${item.price.toLocaleString()}</div>
            </td>
            <td class="price-col" style="font-weight: 600;">MAD ${(item.price * item.quantity).toLocaleString()}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="summary-stack">
      <div class="summary-row summary-row-muted">
        <span>Sous-total</span>
        <span>MAD ${subtotal.toLocaleString()}</span>
      </div>
      ${discountAmount > 0 ? `
        <div class="summary-row summary-row-muted" style="color: #ff3b30;">
          <span>Remise</span>
          <span>- MAD ${discountAmount.toLocaleString()}</span>
        </div>
      ` : ""}
      <div class="summary-row summary-row-total">
        <span>Total Net</span>
        <span>MAD ${invoice.totalAmount.toLocaleString()}</span>
      </div>
    </div>

    <div class="footer">
      Merci de votre visite chez ${salon.name}!<br>
      <span style="font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">Luna OS • www.lunasalon.ma</span>
    </div>
  </div>

</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html" }
    });
  } catch (error) {
    console.error("Invoice endpoint error:", error);
    return new Response(
      `<html><body style="font-family: sans-serif; text-align: center; padding: 50px;"><h2>Internal Server Error</h2><p>Unable to stream invoice receipt.</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}
