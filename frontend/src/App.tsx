import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import homeHero from "./assets/home-hero.png";
import logo from "./assets/logo-transparent.png";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type ProductImage = {
  id: string;
  url: string;
  altText: string | null;
};

type ProductVariant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  priceCents: number;
  compareAtCents: number | null;
  stockQuantity: number;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: { name: string; slug: string } | null;
  images: ProductImage[];
  variants: ProductVariant[];
};

type CartItem = {
  id: string;
  quantity: number;
  variant: ProductVariant & {
    product: Product;
  };
};

type Cart = {
  id: string;
  items: CartItem[];
};

type CheckoutForm = {
  email: string;
  phone: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
};

const currencies = [
  { code: "NGN", label: "NGN / ₦", locale: "en-NG", rateFromNgn: 1 },
  { code: "USD", label: "USD / $", locale: "en-US", rateFromNgn: 0.00063 },
  { code: "GBP", label: "GBP / £", locale: "en-GB", rateFromNgn: 0.0005 },
  { code: "EUR", label: "EUR / €", locale: "de-DE", rateFromNgn: 0.00058 },
] as const;

type CurrencyCode = (typeof currencies)[number]["code"];

const jsonHeaders = { "Content-Type": "application/json" };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload as T;
}

function App() {
  const [route, setRoute] = useState(
    window.location.hash === "#shop"
      ? "shop"
      : window.location.hash === "#checkout"
        ? "checkout"
        : window.location.hash === "#shipping-delivery"
          ? "shipping"
          : "home",
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("Loading shop.");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>("NGN");
  const [checkout, setCheckout] = useState<CheckoutForm>({
    email: "",
    phone: "",
    fullName: "",
    line1: "",
    line2: "",
    city: "Lagos",
    state: "Lagos",
  });

  const selectedCurrency = currencies.find((item) => item.code === currency) ?? currencies[0];

  const formatPrice = (cents: number) => {
    const amountInNgn = cents / 100;
    const amount = amountInNgn * selectedCurrency.rateFromNgn;

    return new Intl.NumberFormat(selectedCurrency.locale, {
      style: "currency",
      currency: selectedCurrency.code,
      maximumFractionDigits: selectedCurrency.code === "NGN" ? 0 : 2,
    }).format(amount);
  };

  useEffect(() => {
    const boot = async () => {
      try {
        const [{ products: nextProducts }, { cart: nextCart }] = await Promise.all([
          request<{ products: Product[] }>("/products"),
          request<{ cart: Cart }>("/cart", { method: "POST" }),
        ]);

        setProducts(nextProducts);
        setSelectedProductId(nextProducts[0]?.id ?? null);
        setSelectedVariants(
          Object.fromEntries(
            nextProducts.map((product) => [product.id, product.variants[0]?.id ?? ""]),
          ),
        );
        setCart(nextCart);
        setNotice("Ready to shop.");
      } catch (error) {
        setNotice("Could not load shop data.");
        console.error(error);
      }
    };

    void boot();
  }, []);

  useEffect(() => {
    const syncRoute = () => {
      setRoute(
        window.location.hash === "#shop"
          ? "shop"
          : window.location.hash === "#checkout"
            ? "checkout"
            : window.location.hash === "#shipping-delivery"
              ? "shipping"
              : "home",
      );
    };

    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? products[0],
    [products, selectedProductId],
  );

  const detailProduct = useMemo(
    () => products.find((product) => product.id === detailProductId) ?? null,
    [products, detailProductId],
  );

  const cartTotal = useMemo(
    () =>
      cart?.items.reduce(
        (sum, item) => sum + item.quantity * item.variant.priceCents,
        0,
      ) ?? 0,
    [cart],
  );

  const cartCount = useMemo(
    () => cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [cart],
  );

  const updateItem = async (itemId: string, quantity: number) => {
    if (!cart) return;

    setBusy(itemId);
    try {
      const { cart: nextCart } = await request<{ cart: Cart }>(
        `/cart/${cart.id}/items/${itemId}`,
        {
          method: "PATCH",
          headers: jsonHeaders,
          body: JSON.stringify({ quantity }),
        },
      );
      setCart(nextCart);
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(null);
    }
  };

  const addToCart = async (product: Product, explicitVariantId?: string) => {
    if (!cart) return;

    const variantId = explicitVariantId || selectedVariants[product.id] || product.variants[0]?.id;
    if (!variantId) {
      setNotice("Select an available size.");
      return;
    }

    setBusy(product.id);
    try {
      const { cart: nextCart } = await request<{ cart: Cart }>(
        `/cart/${cart.id}/items`,
        {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({ variantId, quantity: 1 }),
        },
      );

      setCart(nextCart);
      setCartOpen(true);
      setDetailProductId(null);
      setNotice(`${product.name} added to bag.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not add item.");
    } finally {
      setBusy(null);
    }
  };

  const goHome = () => {
    history.pushState(null, "", window.location.pathname);
    setRoute("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cart || cart.items.length === 0) {
      setNotice("Your bag is empty.");
      return;
    }

    setBusy("checkout");
    try {
      const { order } = await request<{ order: { id: string } }>("/orders", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          cartId: cart.id,
          customerEmail: checkout.email,
          customerPhone: checkout.phone,
          shippingAddress: {
            fullName: checkout.fullName,
            phone: checkout.phone,
            line1: checkout.line1,
            line2: checkout.line2 || undefined,
            city: checkout.city,
            state: checkout.state,
            country: "Nigeria",
          },
        }),
      });

      const { cart: nextCart } = await request<{ cart: Cart }>("/cart", { method: "POST" });
      setCart(nextCart);
      setOrderId(order.id);
      setNotice("Order placed.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not place order.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className={route === "shop" || route === "checkout" || route === "shipping" ? "shop-shell" : "home-shell"}>
      <header className="topbar">
        <button className="brand" onClick={goHome}>
          <img src={logo} alt="Diagramclo" />
        </button>
        <nav aria-label="Primary">
          <a href="#shop">New</a>
          <a href="#shop">Collections</a>
          <a href="#shop">Shop All</a>
          <a href="#shop">Limited</a>
          <a href="#shop">Editorial</a>
        </nav>
        <nav className="utility-nav" aria-label="Account">
          <a href="#footer">Search</a>
          <a href="#checkout">Account</a>
        </nav>
        <button className="bag-button" onClick={() => setCartOpen(true)}>
          Cart<sup>{cartCount}</sup>
        </button>
      </header>

      {route === "home" ? (
        <>
          <section
            className="hero"
            aria-label="Diagramclo homepage"
            style={{ "--hero-image": `url(${homeHero})` } as CSSProperties}
          >
            <h1>DIAGRAMCLO</h1>
            <a className="hero-shop" href="#shop">Shop</a>
            <a className="signup-tab" href="#footer">Sign up</a>
          </section>

          <footer className="home-footer" id="footer">
            <div className="footer-column">
              <h3>Customer Care</h3>
              <a href="#footer">Contact</a>
              <a href="#shipping-delivery">Shipping &amp; Delivery</a>
              <a href="#footer">Privacy Policy</a>
              <a href="#footer">Terms of Service</a>
            </div>

            <div className="footer-column">
              <h3>Info</h3>
              <a href="#footer">Care Guide</a>
              <a href="#footer">Size Guide</a>
              <a href="#footer">Order Tracking</a>
            </div>

            <div className="footer-subscribe">
              <h3>Subscribe</h3>
              <p>Sign up to receive emails from us, so you never miss out on the good stuff.</p>
              <form>
                <label>
                  Name
                  <input aria-label="Name" />
                </label>
                <label>
                  Email
                  <input aria-label="Email" type="email" />
                </label>
              </form>
              <button type="button">Subscribe</button>
            </div>

            <div className="footer-social">
              <div>
                <h3>Instagram</h3>
                <a href="https://www.instagram.com/diagramonlinee/" target="_blank" rel="noreferrer">
                  Follow us @diagramonlinee
                </a>
                <a href="https://www.snapchat.com/@diagramclo" target="_blank" rel="noreferrer">
                  Snapchat @diagramclo
                </a>
              </div>
              <label className="currency-selector">
                <span>Currency</span>
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                >
                  {currencies.map((item) => (
                    <option value={item.code} key={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="footer-copyright">© 2026 Diagramclo</p>
            <div className="payment-methods" aria-label="Accepted payment methods">
              <span>Visa</span>
              <span>Mastercard</span>
              <span>Verve</span>
              <span>Paystack</span>
              <span>Bank Transfer</span>
            </div>
          </footer>
        </>
      ) : route === "shop" ? (
        <section className="shop shop-page" id="shop">
          <div className="shop-toolbar">
            <span>{notice}</span>
            <button type="button">Sort and filter</button>
          </div>

          <div className="shop-grid">
            {products.flatMap((product) =>
              product.variants.map((variant) => (
                <article className="shop-card" key={variant.id}>
                  <div className="shop-image">
                    {product.images[0] ? (
                      <button
                        className="shop-image-button"
                        type="button"
                        onClick={() => {
                          setSelectedProductId(product.id);
                          setSelectedVariants((current) => ({ ...current, [product.id]: variant.id }));
                          setDetailProductId(product.id);
                        }}
                      >
                        <img
                          src={`${product.images[0].url}?auto=format&fit=crop&w=700&q=88`}
                          alt={product.images[0].altText ?? product.name}
                        />
                      </button>
                    ) : null}
                    <button
                      className="shop-add-overlay"
                      type="button"
                      disabled={busy === product.id}
                      onClick={() => {
                        setSelectedProductId(product.id);
                        setSelectedVariants((current) => ({ ...current, [product.id]: variant.id }));
                        void addToCart(product, variant.id);
                      }}
                    >
                      {busy === product.id ? "Adding" : "Add to cart"}
                    </button>
                  </div>
                  <div className="shop-card-meta">
                    <div>
                      <h2>{product.name}</h2>
                      <p>{variant.color} / {variant.size}</p>
                    </div>
                    <div>
                      <strong>{formatPrice(variant.priceCents)}</strong>
                    </div>
                  </div>
                </article>
              )),
            )}
          </div>
        </section>
      ) : route === "checkout" ? (
        <section className="checkout-page" id="checkout">
          <div className="checkout-grid">
            <form className="checkout-form" onSubmit={submitOrder}>
              <div>
                <p>Checkout</p>
                <h1>{orderId ? "Order received." : "Delivery details."}</h1>
                <span>{orderId ? `Order ${orderId}` : notice}</span>
              </div>
              {!orderId && (
                <>
                  <label>
                    Email
                    <input
                      type="email"
                      required
                      value={checkout.email}
                      onChange={(event) => setCheckout({ ...checkout, email: event.target.value })}
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      required
                      value={checkout.phone}
                      onChange={(event) => setCheckout({ ...checkout, phone: event.target.value })}
                    />
                  </label>
                  <label>
                    Full name
                    <input
                      required
                      value={checkout.fullName}
                      onChange={(event) => setCheckout({ ...checkout, fullName: event.target.value })}
                    />
                  </label>
                  <label>
                    Address line 1
                    <input
                      required
                      value={checkout.line1}
                      onChange={(event) => setCheckout({ ...checkout, line1: event.target.value })}
                    />
                  </label>
                  <label>
                    Address line 2
                    <input
                      value={checkout.line2}
                      onChange={(event) => setCheckout({ ...checkout, line2: event.target.value })}
                    />
                  </label>
                  <div className="field-pair">
                    <label>
                      City
                      <input
                        required
                        value={checkout.city}
                        onChange={(event) => setCheckout({ ...checkout, city: event.target.value })}
                      />
                    </label>
                    <label>
                      State
                      <input
                        required
                        value={checkout.state}
                        onChange={(event) => setCheckout({ ...checkout, state: event.target.value })}
                      />
                    </label>
                  </div>
                  <button disabled={busy === "checkout"} type="submit">
                    {busy === "checkout" ? "Placing order" : `Place order - ${formatPrice(cartTotal)}`}
                  </button>
                </>
              )}
            </form>
            <aside className="checkout-summary">
              <h2>Bag</h2>
              {cart?.items.length ? (
                cart.items.map((item) => (
                  <div className="summary-line" key={item.id}>
                    <span>
                      {item.variant.product.name}<br />
                      {item.variant.color} / {item.variant.size} x {item.quantity}
                    </span>
                    <strong>{formatPrice(item.variant.priceCents * item.quantity)}</strong>
                  </div>
                ))
              ) : (
                <p>Your bag is empty.</p>
              )}
              <div className="summary-total">
                <span>Total</span>
                <strong>{formatPrice(cartTotal)}</strong>
              </div>
            </aside>
          </div>
        </section>
      ) : (
        <section className="policy-page" id="shipping-delivery">
          <div className="policy-hero">
            <p>Customer Care</p>
            <h1>Shipping &amp; Delivery</h1>
            <span>
              Delivery information for Diagramclo orders, including processing windows,
              Lagos delivery, nationwide shipping, and order tracking.
            </span>
          </div>

          <div className="policy-grid">
            <aside>
              <h2>Quick Notes</h2>
              <p>
                Orders are processed Monday to Saturday. Delivery timelines begin after your
                order has been confirmed.
              </p>
              <p>
                For delivery questions, contact us with your order number and the email or phone
                number used at checkout.
              </p>
            </aside>

            <div className="faq-list">
              <article>
                <h2>How long does order processing take?</h2>
                <p>
                  Most orders are processed within 1-2 business days after confirmation. During
                  launches, limited drops, or public holidays, processing may take longer.
                </p>
              </article>
              <article>
                <h2>Do you deliver within Lagos?</h2>
                <p>
                  Yes. Lagos deliveries are available to supported areas and are typically completed
                  within 1-3 business days after processing.
                </p>
              </article>
              <article>
                <h2>Do you ship outside Lagos?</h2>
                <p>
                  Yes. Nationwide delivery within Nigeria is available. Delivery timelines vary by
                  city and courier coverage, but most orders arrive within 3-7 business days after
                  processing.
                </p>
              </article>
              <article>
                <h2>Can I pick up my order?</h2>
                <p>
                  Pickup availability may vary by drop. If pickup is available, instructions will be
                  shared after your order is confirmed.
                </p>
              </article>
              <article>
                <h2>How do I track my order?</h2>
                <p>
                  Once your order has been dispatched, tracking or courier details will be sent to
                  the contact information provided at checkout.
                </p>
              </article>
              <article>
                <h2>What if my delivery details are wrong?</h2>
                <p>
                  Contact us as soon as possible. If the order has not been dispatched, we will try
                  to update the delivery details before it leaves our studio.
                </p>
              </article>
              <article>
                <h2>What happens if delivery fails?</h2>
                <p>
                  The courier may attempt redelivery or return the order. Additional delivery fees
                  may apply if an order has to be resent because the recipient was unavailable or
                  the address was incomplete.
                </p>
              </article>
            </div>
          </div>
        </section>
      )}

      {detailProduct && (
        <div className="detail-backdrop" onClick={() => setDetailProductId(null)}>
          <section className="product-detail" aria-label={detailProduct.name} onClick={(event) => event.stopPropagation()}>
            <button className="detail-close" type="button" onClick={() => setDetailProductId(null)}>
              Close
            </button>
            <div className="detail-image">
              {detailProduct.images[0] && (
                <img
                  src={`${detailProduct.images[0].url}?auto=format&fit=crop&w=1000&q=90`}
                  alt={detailProduct.images[0].altText ?? detailProduct.name}
                />
              )}
            </div>
            <div className="detail-info">
              <p>{detailProduct.category?.name ?? "Product"}</p>
              <h2>{detailProduct.name}</h2>
              <span>{detailProduct.description}</span>
              <label>
                Variant
                <select
                  value={selectedVariants[detailProduct.id] ?? detailProduct.variants[0]?.id ?? ""}
                  onChange={(event) =>
                    setSelectedVariants((current) => ({ ...current, [detailProduct.id]: event.target.value }))
                  }
                >
                  {detailProduct.variants.map((variant) => (
                    <option value={variant.id} key={variant.id}>
                      {variant.color} / {variant.size} - {formatPrice(variant.priceCents)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={busy === detailProduct.id}
                onClick={() => addToCart(detailProduct)}
              >
                {busy === detailProduct.id ? "Adding" : "Add to cart"}
              </button>
            </div>
          </section>
        </div>
      )}

      <div className={cartOpen ? "drawer-backdrop open" : "drawer-backdrop"} onClick={() => setCartOpen(false)} />
      <aside className={cartOpen ? "cart-drawer open" : "cart-drawer"} aria-label="Shopping bag">
        <div className="drawer-head">
          <h2>Bag</h2>
          <button onClick={() => setCartOpen(false)}>Close</button>
        </div>
        {cart?.items.length ? (
          <div className="bag-items">
            {cart.items.map((item) => (
              <article className="bag-item" key={item.id}>
                <img
                  src={`${item.variant.product.images[0]?.url}?auto=format&fit=crop&w=320&q=80`}
                  alt={item.variant.product.images[0]?.altText ?? item.variant.product.name}
                />
                <div>
                  <h3>{item.variant.product.name}</h3>
                  <p>
                    {item.variant.color} / {item.variant.size}
                  </p>
                  <div className="bag-item-controls">
                    <div className="quantity">
                      <button
                        disabled={busy === item.id}
                        onClick={() => updateItem(item.id, Math.max(0, item.quantity - 1))}
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        disabled={busy === item.id}
                        onClick={() => updateItem(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <strong>{formatPrice(item.variant.priceCents * item.quantity)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-bag">Your bag is empty.</p>
        )}
        <div className="drawer-total">
          <span>Total</span>
          <strong>{formatPrice(cartTotal)}</strong>
        </div>
        <a href="#checkout" onClick={() => setCartOpen(false)}>
          Checkout
        </a>
      </aside>
    </main>
  );
}

export default App;
