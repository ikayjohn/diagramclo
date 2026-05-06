type ProductImage = {
  url: string;
  altText: string | null;
};

type CartItem = {
  id: string;
  quantity: number;
  variant: {
    color: string;
    size: string;
    priceCents: number;
    product: {
      name: string;
      images: ProductImage[];
    };
  };
};

type Cart = {
  items: CartItem[];
};

type CartDrawerProps = {
  cart: Cart | null;
  cartOpen: boolean;
  cartTotal: number;
  busy: string | null;
  formatPrice: (cents: number) => string;
  imageSrc: (url: string, transform?: string) => string;
  onClose: () => void;
  onUpdateItem: (itemId: string, quantity: number) => void;
};

export function CartDrawer({
  cart,
  cartOpen,
  cartTotal,
  busy,
  formatPrice,
  imageSrc,
  onClose,
  onUpdateItem,
}: CartDrawerProps) {
  return (
    <>
      <div className={cartOpen ? "drawer-backdrop open" : "drawer-backdrop"} onClick={onClose} />
      <aside className={cartOpen ? "cart-drawer open" : "cart-drawer"} aria-label="Shopping bag">
        <div className="drawer-head">
          <h2>Bag</h2>
          <button onClick={onClose}>Close</button>
        </div>
        {cart?.items.length ? (
          <div className="bag-items">
            {cart.items.map((item) => (
              <article className="bag-item" key={item.id}>
                {item.variant.product.images[0] && (
                  <img
                    src={imageSrc(item.variant.product.images[0].url, "?auto=format&fit=crop&w=320&q=80")}
                    alt={item.variant.product.images[0].altText ?? item.variant.product.name}
                  />
                )}
                <div>
                  <h3>{item.variant.product.name}</h3>
                  <p>
                    {item.variant.color} / {item.variant.size}
                  </p>
                  <div className="bag-item-controls">
                    <div className="quantity">
                      <button
                        disabled={busy === item.id}
                        onClick={() => onUpdateItem(item.id, Math.max(0, item.quantity - 1))}
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        disabled={busy === item.id}
                        onClick={() => onUpdateItem(item.id, item.quantity + 1)}
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
        <a href="#checkout" onClick={onClose}>
          Checkout
        </a>
      </aside>
    </>
  );
}
