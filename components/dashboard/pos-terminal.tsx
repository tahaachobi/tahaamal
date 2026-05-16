"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Service = {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
  loyaltyPoints: number;
};

type Client = {
  id: string;
  name: string;
  email: string;
  loyaltyPoints: number;
};

type Staff = {
  id: string;
  name: string;
  role: string;
};

type PosTerminalProps = {
  salonId: string;
  salonName: string;
  services: Service[];
  staff: Staff[];
  clients: Client[];
  initialSession: { id: string; status: string } | null;
};

type CartItem = Service & { cartId: string };

export function PosTerminal({
  salonId,
  salonName,
  services,
  staff,
  clients,
  initialSession,
}: PosTerminalProps) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [session, setSession] = useState<{ id: string; status: string } | null>(initialSession);
  const [openingFloat, setOpeningFloat] = useState(0);
  const [isOpening, setIsOpening] = useState(false);

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const total = Math.max(0, subtotal - discount);

  const addToCart = (service: Service) => {
    setCart((prev) => [...prev, { ...service, cartId: Math.random().toString(36).substring(7) }]);
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const handleOpenRegister = async () => {
    setIsOpening(true);
    try {
      const res = await fetch("/api/pos/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "OPEN", salonId, amount: openingFloat }),
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        router.refresh();
      } else {
        alert(data.error);
      }
    } finally {
      setIsOpening(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId,
          staffId: selectedStaffId,
          clientId: selectedClientId,
          cart,
          paymentMethod,
          discountAmount: discount
        }),
      });
      const data = await res.json();
      if (data.success) {
        const loyaltyMessage =
          selectedClientId && data.earnedPoints > 0
            ? ` Client received ${data.earnedPoints} loyalty points.`
            : "";

        alert(
          `Payment of MAD ${total.toLocaleString()} confirmed via ${paymentMethod}! Invoice: ${data.transactionId}.${loyaltyMessage}`,
        );
        setCart([]);
        setDiscount(0);
        router.refresh();
      } else {
        alert(data.error || "Failed to process payment");
      }
    } catch {
      alert("Error processing payment");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!session) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 120px)" }}>
        <div className="luna-card luna-card-p" style={{ width: 400, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, background: "var(--luna-blue)18", color: "var(--luna-blue)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          </div>
          <h2 className="luna-h2" style={{ marginBottom: 8 }}>Register is Closed</h2>
          <p className="luna-text-muted" style={{ marginBottom: 24, fontSize: 14 }}>You must open the cash register with an initial float before making sales.</p>
          
          <div style={{ textAlign: "left", marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 8 }}>Opening Float (Cash in drawer)</label>
            <div className="luna-row luna-gap-2">
              <span style={{ fontSize: 16, fontWeight: 600, color: "var(--muted)" }}>MAD</span>
              <input 
                type="number" 
                className="luna-input" 
                style={{ width: "100%", fontSize: 16 }}
                value={openingFloat || ""}
                onChange={(e) => setOpeningFloat(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
          
          <button 
            className="luna-btn luna-btn-primary" 
            style={{ width: "100%", height: 48 }}
            onClick={handleOpenRegister}
            disabled={isOpening}
          >
            {isOpening ? "Opening..." : "Open Register"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="luna-pos-shell-responsive" style={{ display: "grid", gap: 24, height: "calc(100vh - 120px)" }}>
      {/* LEFT: Services & Cart */}
      <div className="luna-stack" style={{ gap: 20 }}>
        <div className="luna-between">
          <div>
            <h1 className="luna-h2">Register</h1>
            <p className="luna-text-muted" style={{ marginTop: 4, fontSize: 13 }}>
              {salonName}
            </p>
          </div>
          <div className="luna-row luna-gap-2">
            <input
              type="text"
              placeholder="Search services..."
              className="luna-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 240 }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, overflowY: "auto", paddingBottom: 20 }}>
          {filteredServices.map((service) => (
            <button
              key={service.id}
              onClick={() => addToCart(service)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px",
                textAlign: "left",
                cursor: "pointer",
                transition: "all .2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--luna-blue)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", marginBottom: 4 }}>{service.name}</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>{service.duration} mins</p>
              <p style={{ fontSize: 12, color: "var(--luna-blue)", marginBottom: 8 }}>Earn {service.loyaltyPoints} pts</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--luna-blue)" }}>MAD {service.price.toLocaleString()}</p>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT: Checkout Panel */}
      <div className="luna-card" style={{ display: "flex", flexDirection: "column", height: "100%", border: "1px solid var(--border)" }}>
        {/* Client & Staff Selection */}
        <div className="luna-card-p" style={{ borderBottom: "1px solid var(--border)", background: "var(--luna-gray-50)" }}>
          <div className="luna-stack" style={{ gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>Client</label>
              <select 
                className="luna-input" 
                style={{ width: "100%", background: "white" }}
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">Walk-in Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.loyaltyPoints} pts)</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>Staff Member</label>
              <select 
                className="luna-input" 
                style={{ width: "100%" }}
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                <option value="">Any Staff</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role.replace("_", " ")})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {cart.length === 0 ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 14 }}>
              Cart is empty. Select services to add.
            </div>
          ) : (
            <div className="luna-stack" style={{ gap: 12 }}>
              {cart.map((item) => (
                <div key={item.cartId} className="luna-between" style={{ padding: "10px 0", borderBottom: "1px dashed var(--border)" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</p>
                    <p style={{ fontSize: 12, color: "var(--muted)" }}>
                      MAD {item.price.toLocaleString()} • {item.loyaltyPoints} pts
                    </p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.cartId)}
                    style={{ color: "var(--luna-error)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, fontSize: 18 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary & Payment */}
        <div className="luna-card-p" style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
          <div className="luna-stack" style={{ gap: 12, marginBottom: 20 }}>
            <div className="luna-between">
              <span style={{ color: "var(--muted)", fontSize: 14 }}>Subtotal</span>
              <span style={{ fontWeight: 600 }}>MAD {subtotal.toLocaleString()}</span>
            </div>
            <div className="luna-between">
              <span style={{ color: "var(--muted)", fontSize: 14 }}>Discount</span>
              <div className="luna-row luna-gap-2" style={{ width: 100 }}>
                <span style={{ fontSize: 14 }}>MAD</span>
                <input 
                  type="number" 
                  className="luna-input" 
                  style={{ width: "100%", padding: "4px 8px", textAlign: "right" }}
                  value={discount === 0 ? "" : discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="luna-between" style={{ paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: 18, fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: "var(--luna-blue)" }}>MAD {total.toLocaleString()}</span>
            </div>
          </div>

          <div className="luna-row luna-gap-2" style={{ marginBottom: 16 }}>
            <button 
              className={`luna-btn ${paymentMethod === "CASH" ? "luna-btn-primary" : "luna-btn-outline"}`} 
              style={{ flex: 1, padding: "16px 0", height: "auto" }}
              onClick={() => setPaymentMethod("CASH")}
            >
              💵 Cash
            </button>
            <button 
              className={`luna-btn ${paymentMethod === "CARD" ? "luna-btn-primary" : "luna-btn-outline"}`} 
              style={{ flex: 1, padding: "16px 0", height: "auto" }}
              onClick={() => setPaymentMethod("CARD")}
            >
              💳 Card
            </button>
          </div>

          <button 
            className="luna-btn luna-btn-primary" 
            style={{ width: "100%", height: 56, fontSize: 16 }}
            disabled={cart.length === 0 || isProcessing}
            onClick={handleCheckout}
          >
            {isProcessing ? "Processing..." : `Charge MAD ${total.toLocaleString()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
