"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string; name: string; description: string | null; category: string;
  sku: string | null; quantity: number; minStock: number; unitPrice: number;
  supplierName: string | null; supplierId: string | null;
};

type Supplier = { id: string; name: string };

export function InventoryPanel({ salonId, products, suppliers }: { salonId: string; products: Product[]; suppliers: Supplier[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // New product form
  const [newProduct, setNewProduct] = useState({ name: "", description: "", category: "General", sku: "", quantity: 0, minStock: 5, unitPrice: 0, supplierId: "" });

  const filtered = products
    .filter(p => {
      if (filter === "low") return p.quantity > 0 && p.quantity <= p.minStock;
      if (filter === "out") return p.quantity === 0;
      return true;
    })
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.includes(search)));

  const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity <= p.minStock).length;
  const outOfStockCount = products.filter(p => p.quantity === 0).length;
  const totalValue = products.reduce((s, p) => s + p.quantity * p.unitPrice, 0);

  const handleAddProduct = async () => {
    if (!newProduct.name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId, ...newProduct }),
      });
      if (res.ok) {
        setShowAdd(false);
        setNewProduct({ name: "", description: "", category: "General", sku: "", quantity: 0, minStock: 5, unitPrice: 0, supplierId: "" });
        router.refresh();
      }
    } finally { setSaving(false); }
  };

  const handleUpdateQuantity = async (productId: string, delta: number) => {
    await fetch("/api/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: productId, quantityDelta: delta }),
    });
    router.refresh();
  };

  return (
    <div className="luna-stack" style={{ gap: 20 }}>
      <div className="luna-between">
        <div>
          <h1 className="luna-h1">Inventory</h1>
          <p className="luna-text-muted" style={{ marginTop: 4, fontSize: 13 }}>Track products, stock levels, and usage.</p>
        </div>
        <button className="luna-btn luna-btn-primary" onClick={() => setShowAdd(true)}>+ Add Product</button>
      </div>

      {/* KPIs */}
      <div className="luna-grid-kpi">
        <div className="luna-kpi-card">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Total Products</p>
          <p style={{ fontSize: 26, fontWeight: 800 }}>{products.length}</p>
        </div>
        <div className="luna-kpi-card">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Stock Value</p>
          <p style={{ fontSize: 26, fontWeight: 800 }}>MAD {totalValue.toLocaleString()}</p>
        </div>
        <div className="luna-kpi-card" style={{ borderLeft: lowStockCount > 0 ? "3px solid #f59e0b" : undefined }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Low Stock</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: lowStockCount > 0 ? "#f59e0b" : "var(--foreground)" }}>{lowStockCount}</p>
        </div>
        <div className="luna-kpi-card" style={{ borderLeft: outOfStockCount > 0 ? "3px solid var(--luna-error)" : undefined }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Out of Stock</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: outOfStockCount > 0 ? "var(--luna-error)" : "var(--foreground)" }}>{outOfStockCount}</p>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAdd && (
        <div className="luna-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="luna-modal" onClick={e => e.stopPropagation()}>
            <div className="luna-modal-header">
              <h2 className="luna-h2">Add Product</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>×</button>
            </div>
            <div className="luna-modal-body">
              <div className="luna-stack" style={{ gap: 14 }}>
                <div className="luna-field">
                  <label className="luna-label">Product Name *</label>
                  <input className="luna-input" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="e.g. Argan Shampoo" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="luna-field">
                    <label className="luna-label">Category</label>
                    <select className="luna-select" value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}>
                      <option>General</option><option>Hair Care</option><option>Skin Care</option>
                      <option>Spa Products</option><option>Tools</option><option>Consumables</option>
                    </select>
                  </div>
                  <div className="luna-field">
                    <label className="luna-label">SKU</label>
                    <input className="luna-input" value={newProduct.sku} onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="SKU-001" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div className="luna-field">
                    <label className="luna-label">Quantity</label>
                    <input className="luna-input" type="number" value={newProduct.quantity || ""} onChange={e => setNewProduct({ ...newProduct, quantity: Number(e.target.value) || 0 })} />
                  </div>
                  <div className="luna-field">
                    <label className="luna-label">Min Stock Alert</label>
                    <input className="luna-input" type="number" value={newProduct.minStock || ""} onChange={e => setNewProduct({ ...newProduct, minStock: Number(e.target.value) || 5 })} />
                  </div>
                  <div className="luna-field">
                    <label className="luna-label">Unit Price (MAD)</label>
                    <input className="luna-input" type="number" value={newProduct.unitPrice || ""} onChange={e => setNewProduct({ ...newProduct, unitPrice: Number(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="luna-field">
                  <label className="luna-label">Supplier</label>
                  <select className="luna-select" value={newProduct.supplierId} onChange={e => setNewProduct({ ...newProduct, supplierId: e.target.value })}>
                    <option value="">No supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="luna-modal-footer">
              <button className="luna-btn luna-btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="luna-btn luna-btn-primary" onClick={handleAddProduct} disabled={saving || !newProduct.name}>
                {saving ? "Saving…" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="luna-card luna-card-p">
        <div className="luna-between" style={{ marginBottom: 16 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--luna-gray-100)", borderRadius: 8, padding: "7px 12px", flex: 1, maxWidth: 360,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--luna-gray-400)" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input placeholder="Search products or SKU…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "var(--foreground)", flex: 1 }} />
          </div>
          <div className="luna-row luna-gap-2">
            {(["all", "low", "out"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`luna-btn luna-btn-sm ${filter === f ? "luna-btn-primary" : "luna-btn-secondary"}`}>
                {f === "all" ? "All" : f === "low" ? "⚠️ Low Stock" : "🔴 Out of Stock"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="luna-table-wrap" style={{ border: "none" }}>
          <table className="luna-table">
            <thead>
              <tr><th>Product</th><th>Category</th><th>SKU</th><th>Supplier</th><th>Price</th><th>Quantity</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No products found.</td></tr>
              ) : (
                filtered.map(p => {
                  const stockStatus = p.quantity === 0 ? "out" : p.quantity <= p.minStock ? "low" : "ok";
                  return (
                    <tr key={p.id}>
                      <td>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</p>
                          {p.description && <p style={{ fontSize: 11, color: "var(--muted)" }}>{p.description}</p>}
                        </div>
                      </td>
                      <td><span style={{ fontSize: 12, background: "var(--luna-gray-100)", padding: "2px 8px", borderRadius: 6 }}>{p.category}</span></td>
                      <td style={{ fontSize: 12, color: "var(--muted)", fontFamily: "monospace" }}>{p.sku || "—"}</td>
                      <td style={{ fontSize: 13, color: "var(--muted)" }}>{p.supplierName || "—"}</td>
                      <td style={{ fontWeight: 600 }}>MAD {p.unitPrice.toLocaleString()}</td>
                      <td style={{ fontWeight: 700, fontSize: 15 }}>{p.quantity}</td>
                      <td>
                        <span className={`luna-badge ${stockStatus === "out" ? "luna-badge-error" : stockStatus === "low" ? "luna-badge-warning" : "luna-badge-success"}`}>
                          {stockStatus === "out" ? "Out of Stock" : stockStatus === "low" ? "Low Stock" : "In Stock"}
                        </span>
                      </td>
                      <td>
                        <div className="luna-row luna-gap-2">
                          <button className="luna-btn luna-btn-sm luna-btn-secondary" onClick={() => handleUpdateQuantity(p.id, 1)} title="Add 1">+</button>
                          <button className="luna-btn luna-btn-sm luna-btn-outline" onClick={() => handleUpdateQuantity(p.id, -1)} title="Remove 1" disabled={p.quantity === 0}>−</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
