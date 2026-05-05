import { useState } from "react";
import { Sankofa, type SankofaPropertyMap } from "@sankofa/browser";
import { useSankofa } from "../lib/SankofaProvider";
import { ActivityFeed } from "../components/ActivityFeed";

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji: string;
};

const PRODUCTS: Product[] = [
  { id: "sku_001", name: "Pro plan", price: 49, category: "subscription", emoji: "✦" },
  { id: "sku_002", name: "Enterprise plan", price: 199, category: "subscription", emoji: "♛" },
  { id: "sku_003", name: "Replay add-on", price: 29, category: "addon", emoji: "▶" },
  { id: "sku_004", name: "Survey credits (1k)", price: 15, category: "credit", emoji: "✉" },
];

const CUSTOM_TEMPLATES = [
  {
    name: "feature_used",
    properties: { feature: "dashboard_export", method: "csv", duration_ms: 1240 },
  },
  {
    name: "tutorial_completed",
    properties: { tutorial: "quickstart", steps: 5, completion_rate: 1.0 },
  },
  {
    name: "search_performed",
    properties: { query: "cohort retention", results: 12, source: "header_bar" },
  },
  {
    name: "video_watched",
    properties: { video_id: "vid_intro", watch_pct: 0.84, autoplay: true },
  },
];

export function AnalyticsPage() {
  const sankofa = useSankofa();
  const ready = sankofa.status === "ready";

  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [revenueGenerated, setRevenueGenerated] = useState(0);
  const [purchases, setPurchases] = useState(0);

  const cartTotal = cart.reduce((sum, c) => sum + c.product.price * c.qty, 0);

  const fire = async (eventName: string, properties: SankofaPropertyMap) => {
    await sankofa.runAction(`track ${eventName}`, async () => {
      await Sankofa.track(eventName, properties);
      sankofa.recordActivity({
        kind: "event",
        label: eventName,
        detail: Object.keys(properties).slice(0, 2).join(" · "),
        payload: properties as Record<string, unknown>,
      });
    });
  };

  const handleViewProduct = (p: Product) =>
    fire("product_viewed", {
      product_id: p.id,
      name: p.name,
      price: p.price,
      category: p.category,
    });

  const handleAddToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === p.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === p.id ? { ...c, qty: c.qty + 1 } : c,
        );
      }
      return [...prev, { product: p, qty: 1 }];
    });
    void fire("product_added", {
      product_id: p.id,
      name: p.name,
      price: p.price,
      category: p.category,
      qty: 1,
    });
  };

  const handleStartCheckout = () => {
    if (!cart.length) return;
    void fire("checkout_started", {
      item_count: cart.length,
      total: cartTotal,
      products: cart.map((c) => c.product.id),
    });
  };

  const handlePurchase = async () => {
    if (!cart.length) return;
    const orderId = `ord_${Math.random().toString(36).slice(2, 9)}`;
    await fire("purchase_completed", {
      order_id: orderId,
      total: cartTotal,
      currency: "USD",
      item_count: cart.length,
      items: cart.map((c) => ({
        product_id: c.product.id,
        name: c.product.name,
        price: c.product.price,
        qty: c.qty,
      })),
    });
    setRevenueGenerated((r) => r + cartTotal);
    setPurchases((n) => n + 1);
    setCart([]);
  };

  const handleClearCart = () => {
    if (!cart.length) return;
    void fire("cart_cleared", { item_count: cart.length, total: cartTotal });
    setCart([]);
  };

  const handleFlush = async () => {
    await sankofa.runAction("force flush", async () => {
      await Sankofa.flush({ reason: "manual", keepalive: true });
      sankofa.recordActivity({
        kind: "flush",
        label: "Sankofa.flush()",
        detail: "manual flush from analytics page",
      });
    });
  };

  return (
    <div className="page">
      <section className="panel hero-sub">
        <p className="eyebrow">Analytics · Events &amp; properties</p>
        <h2>Track anything. See it land.</h2>
        <p className="lede">
          Every interaction below issues a <code>Sankofa.track()</code> call.
          The activity feed at the bottom shows the exact payload, and the
          KPIs in the header tick up as events queue.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>E-commerce flow simulator</h3>
            <p className="muted">
              View → add → checkout → purchase. Each step is a distinct
              event with structured properties.
            </p>
          </div>
          <div className="cart-summary">
            <span className="pill">{cart.length} items</span>
            <strong>${cartTotal.toFixed(0)}</strong>
          </div>
        </div>

        <div className="product-grid">
          {PRODUCTS.map((p) => (
            <div key={p.id} className="product-card">
              <div className="product-emoji">{p.emoji}</div>
              <div className="product-meta">
                <strong>{p.name}</strong>
                <span className="muted small">{p.category} · {p.id}</span>
              </div>
              <div className="product-price">${p.price}</div>
              <div className="product-actions">
                <button
                  className="secondary"
                  disabled={!ready}
                  onClick={() => handleViewProduct(p)}
                >
                  View
                </button>
                <button disabled={!ready} onClick={() => handleAddToCart(p)}>
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-bar">
          <div className="cart-items">
            {cart.length === 0 ? (
              <span className="muted">Cart is empty — add a product to begin.</span>
            ) : (
              cart.map((c) => (
                <span key={c.product.id} className="cart-chip">
                  {c.product.emoji} {c.product.name} × {c.qty}
                </span>
              ))
            )}
          </div>
          <div className="cart-actions">
            <button
              className="ghost"
              disabled={!ready || !cart.length}
              onClick={handleClearCart}
            >
              Clear
            </button>
            <button
              className="secondary"
              disabled={!ready || !cart.length}
              onClick={handleStartCheckout}
            >
              Start checkout
            </button>
            <button disabled={!ready || !cart.length} onClick={handlePurchase}>
              Complete purchase (${cartTotal.toFixed(0)})
            </button>
          </div>
        </div>

        <div className="stat-row">
          <Stat label="Revenue (this session)" value={`$${revenueGenerated.toFixed(0)}`} />
          <Stat label="Purchases" value={String(purchases)} />
          <Stat label="Cart items" value={String(cart.length)} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Custom event templates</h3>
            <p className="muted">
              Click any template to fire that event with realistic
              properties. Inspect the payload in the activity feed.
            </p>
          </div>
        </div>
        <div className="template-grid">
          {CUSTOM_TEMPLATES.map((t) => (
            <button
              key={t.name}
              className="template-card"
              disabled={!ready}
              onClick={() => fire(t.name, t.properties)}
            >
              <strong>{t.name}</strong>
              <code>{JSON.stringify(t.properties)}</code>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Transport controls</h3>
            <p className="muted">
              The SDK auto-flushes every 2s, but you can force a sync any time.
            </p>
          </div>
        </div>
        <div className="actions">
          <button disabled={!ready} onClick={handleFlush}>
            Force flush queue
          </button>
        </div>
      </section>

      <ActivityFeed
        title="Event timeline"
        description="Every track() / identify() / flush() this session, newest first. Click a row to expand the payload."
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
    </div>
  );
}
