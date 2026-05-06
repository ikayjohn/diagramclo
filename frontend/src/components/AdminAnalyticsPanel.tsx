type LowStockItem = {
  id: string;
  sku: string;
  size: string;
  color: string;
  stockQuantity: number;
  productId: string;
  productName: string;
  productSlug: string;
};

export type AdminAnalytics = {
  totalRevenueCents: number;
  pendingOrders: number;
  paidOrders: number;
  lowStockVariants: number;
  lowStockItems: LowStockItem[];
  subscriberCount: number;
  activeProducts: number;
  archivedProducts: number;
};

type AdminAnalyticsPanelProps = {
  analytics: AdminAnalytics | null;
  formatPrice: (cents: number) => string;
  onRefresh: () => void;
};

export function AdminAnalyticsPanel({ analytics, formatPrice, onRefresh }: AdminAnalyticsPanelProps) {
  return (
    <section className="admin-analytics">
      <div className="shop-toolbar">
        <span>Dashboard analytics</span>
        <button type="button" onClick={onRefresh}>Refresh analytics</button>
      </div>
      {analytics ? (
        <>
          <div className="admin-metric-grid">
            <article>
              <span>Revenue</span>
              <strong>{formatPrice(analytics.totalRevenueCents)}</strong>
            </article>
            <article>
              <span>Pending orders</span>
              <strong>{analytics.pendingOrders}</strong>
            </article>
            <article>
              <span>Paid orders</span>
              <strong>{analytics.paidOrders}</strong>
            </article>
            <article>
              <span>Low stock</span>
              <strong>{analytics.lowStockVariants}</strong>
            </article>
            <article>
              <span>Subscribers</span>
              <strong>{analytics.subscriberCount}</strong>
            </article>
            <article>
              <span>Products</span>
              <strong>{analytics.activeProducts}</strong>
            </article>
            <article>
              <span>Archived</span>
              <strong>{analytics.archivedProducts}</strong>
            </article>
          </div>

          <section className="admin-low-stock">
            <div className="shop-toolbar">
              <span>Low stock alerts</span>
            </div>
            {analytics.lowStockItems.length ? (
              <div className="admin-list">
                {analytics.lowStockItems.map((item) => (
                  <article className="admin-list-row" key={item.id}>
                    <div>
                      <strong>{item.productName}</strong>
                      <span>{item.sku} / {item.color} / {item.size}</span>
                    </div>
                    <strong>{item.stockQuantity} left</strong>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-bag">No low-stock variants.</p>
            )}
          </section>
        </>
      ) : (
        <p className="empty-bag">Analytics are not loaded yet.</p>
      )}
    </section>
  );
}
