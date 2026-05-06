import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import bankTransferIcon from "./assets/icons/bank-transfer-svgrepo-com.svg";
import mastercardIcon from "./assets/icons/mastercard-svgrepo-com(2).svg";
import paypalIcon from "./assets/icons/paypal-svgrepo-com.svg";
import paystackIcon from "./assets/icons/paystack-2.svg";
import stripeIcon from "./assets/icons/credit-card-stripe-svgrepo-com.svg";
import verveIcon from "./assets/icons/verve-2-svgrepo-com.svg";
import visaIcon from "./assets/icons/visa-svgrepo-com.svg";
import homeHero from "./assets/home-hero.png";
import logo from "./assets/logo-transparent.png";
import { AdminAnalyticsPanel, type AdminAnalytics } from "./components/AdminAnalyticsPanel";

const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:4000" : "/_/backend");

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
  isActive: boolean;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  archivedAt?: string | null;
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

type Address = CheckoutForm & {
  id: string;
  country: string;
  postalCode: string | null;
};

type AuthUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: "CUSTOMER" | "ADMIN";
};

type AuthForm = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
};

type TrackingForm = {
  orderId: string;
  email: string;
};

type TrackedOrder = {
  id: string;
  status: string;
  paymentStatus: string;
  totalCents: number;
  customerEmail: string;
  customerPhone?: string | null;
  courier?: string | null;
  trackingNumber?: string | null;
  internalNotes?: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    variantSku: string;
    size: string;
    color: string;
    quantity: number;
    lineTotalCents: number;
  }>;
  shippingAddress: {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    country: string;
  } | null;
};

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  _count: { products: number };
};

type Subscriber = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
};

type AdminProductForm = {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  images: Array<{ url: string; altText: string }>;
  variants: Array<{ sku: string; size: string; color: string; priceNaira: string; stockQuantity: string }>;
};

type NewVariantForm = {
  sku: string;
  size: string;
  color: string;
  priceNaira: string;
  stockQuantity: string;
};

type NewImageForm = {
  url: string;
  altText: string;
};

type DashboardProfileForm = {
  firstName: string;
  lastName: string;
  phone: string;
};

type AddressForm = CheckoutForm & {
  country: string;
  postalCode: string;
};

type ShopSort = "featured" | "price-low" | "price-high" | "name";
type AdminTab = "analytics" | "products" | "orders" | "categories" | "subscribers";

type Route =
  | "home"
  | "new"
  | "shop"
  | "collections"
  | "limited"
  | "custom"
  | "search"
  | "checkout"
  | "shipping"
  | "contact"
  | "privacy"
  | "terms"
  | "care"
  | "size"
  | "tracking"
  | "login"
  | "signup"
  | "account"
  | "admin";

type PolicyRoute = "contact" | "privacy" | "terms" | "care" | "size";

const currencies = [
  { code: "NGN", label: "NGN / ₦", locale: "en-NG", rateFromNgn: 1 },
  { code: "USD", label: "USD / $", locale: "en-US", rateFromNgn: 0.00063 },
  { code: "GBP", label: "GBP / £", locale: "en-GB", rateFromNgn: 0.0005 },
  { code: "EUR", label: "EUR / €", locale: "de-DE", rateFromNgn: 0.00058 },
] as const;

const orderStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
const paymentStatuses = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
const deliverySteps = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
const paymentIcons: Array<{ label: string; src: string; className?: string }> = [
  { label: "Visa", src: visaIcon },
  { label: "Mastercard", src: mastercardIcon },
  { label: "Verve", src: verveIcon },
  { label: "Paystack", src: paystackIcon, className: "paystack-logo" },
  { label: "Stripe", src: stripeIcon },
  { label: "PayPal", src: paypalIcon },
  { label: "Bank transfer", src: bankTransferIcon },
] as const;

type CurrencyCode = (typeof currencies)[number]["code"];

const jsonHeaders = { "Content-Type": "application/json" };

const imageSrc = (url: string, transform = "") => {
  if (url.startsWith("/uploads")) return `${API_URL}${url}`;
  return transform ? `${url}${transform}` : url;
};

const orderProgress = (status: string) => {
  if (status === "CANCELLED") return -1;
  return deliverySteps.findIndex((step) => step === status);
};

const policyPages: Record<PolicyRoute, {
  eyebrow: string;
  title: string;
  intro: string;
  sideTitle: string;
  sideNotes: string[];
  sections: Array<{ title: string; body: string }>;
}> = {
  contact: {
    eyebrow: "Customer Care",
    title: "Contact",
    intro: "Reach Diagramclo™ for orders, delivery support, sizing questions, and store enquiries.",
    sideTitle: "Studio",
    sideNotes: [
      "7a JOK Mall, Bisola Durotimi Etti Road, Lekki Phase 1, Lagos.",
      "+234 708 251 8504",
      "For order support, include your order ID and checkout email.",
    ],
    sections: [
      { title: "Order support", body: "Send your order ID, full name, and checkout email so we can locate your order quickly." },
      { title: "Product questions", body: "For sizing, fit, restock, and product care questions, include the item name and preferred size." },
      { title: "Social", body: "You can also reach us on Instagram at @diagramonlinee or Snapchat at @diagramclo." },
    ],
  },
  privacy: {
    eyebrow: "Legal",
    title: "Privacy Policy",
    intro: "How Diagramclo™ handles customer information used for accounts, orders, delivery, and support.",
    sideTitle: "Data Use",
    sideNotes: [
      "We collect only the details needed to run the store and deliver orders.",
      "Customer information is used for checkout, account access, shipping, and support.",
    ],
    sections: [
      { title: "Information we collect", body: "We collect account details, checkout contact details, delivery addresses, order history, and payment status information needed to process purchases." },
      { title: "How we use it", body: "Your information is used to create accounts, confirm orders, arrange delivery, provide support, and improve the shopping experience." },
      { title: "Sharing", body: "Delivery details may be shared with courier partners when needed to fulfill an order. We do not sell customer information." },
      { title: "Access", body: "Customers can update profile details and saved addresses from the account dashboard." },
    ],
  },
  terms: {
    eyebrow: "Legal",
    title: "Terms of Service",
    intro: "The basic terms for using the Diagramclo™ storefront and placing orders.",
    sideTitle: "Store Terms",
    sideNotes: [
      "Orders are subject to product availability and successful confirmation.",
      "Prices, stock, and product details may change before checkout is completed.",
    ],
    sections: [
      { title: "Orders", body: "Placing an order confirms that the checkout information provided is accurate and that you are authorized to use the selected payment method." },
      { title: "Product availability", body: "Items may sell out during launches or limited drops. If an item becomes unavailable after checkout, we will contact you about the next steps." },
      { title: "Delivery", body: "Delivery timelines begin after order confirmation. Delays may occur due to courier coverage, public holidays, incorrect addresses, or launch volume." },
      { title: "Store updates", body: "Diagramclo™ may update these terms as the store, delivery process, or customer services change." },
    ],
  },
  care: {
    eyebrow: "Info",
    title: "Care Guide",
    intro: "Simple care notes to help Diagramclo™ pieces keep their shape, color, and finish.",
    sideTitle: "General Care",
    sideNotes: [
      "Wash less often where possible.",
      "Turn garments inside out before washing.",
      "Avoid high heat when drying or ironing.",
    ],
    sections: [
      { title: "Washing", body: "Wash cold with similar colors. Use mild detergent and avoid bleach unless the garment care label specifically allows it." },
      { title: "Drying", body: "Air dry when possible. If using a dryer, choose low heat to reduce shrinkage and protect prints, embroidery, and fabric finish." },
      { title: "Denim and dark colors", body: "Dark garments and denim can transfer dye. Wash separately for the first few washes and avoid contact with light surfaces while damp." },
      { title: "Storage", body: "Store pieces clean and dry. Fold heavyweight knits and structured items instead of hanging them for long periods." },
    ],
  },
  size: {
    eyebrow: "Info",
    title: "Size Guide",
    intro: "Fit guidance for choosing Diagramclo™ apparel sizes before checkout.",
    sideTitle: "Fit Notes",
    sideNotes: [
      "Check each product's available sizes before adding to cart.",
      "When between sizes, size up for a relaxed fit.",
      "Product-specific measurements can vary by garment style.",
    ],
    sections: [
      { title: "Tops", body: "For tees, shirts, and hoodies, choose your usual size for a standard fit or one size up for a looser streetwear fit." },
      { title: "Bottoms", body: "For trousers, shorts, and denim, use waist fit as the priority and consider leg shape if you prefer relaxed or straight silhouettes." },
      { title: "Outerwear", body: "For jackets, consider the layers you plan to wear underneath. Size up if you want room for hoodies or heavier tops." },
      { title: "Need help", body: "Contact customer care with your height, usual size, and the item you want. We can help you choose the best fit." },
    ],
  },
};

const getRouteFromHash = (): Route => {
  if (window.location.hash === "#new") return "new";
  if (window.location.hash === "#shop") return "shop";
  if (window.location.hash === "#collections") return "collections";
  if (window.location.hash === "#limited") return "limited";
  if (window.location.hash === "#custom") return "custom";
  if (window.location.hash === "#search") return "search";
  if (window.location.hash === "#checkout") return "checkout";
  if (window.location.hash === "#shipping-delivery") return "shipping";
  if (window.location.hash === "#contact") return "contact";
  if (window.location.hash === "#privacy-policy") return "privacy";
  if (window.location.hash === "#terms-of-service") return "terms";
  if (window.location.hash === "#care-guide") return "care";
  if (window.location.hash === "#size-guide") return "size";
  if (window.location.hash === "#order-tracking") return "tracking";
  if (window.location.hash === "#login") return "login";
  if (window.location.hash === "#signup") return "signup";
  if (window.location.hash === "#account") return "account";
  if (window.location.hash === "#admin") return "admin";
  return "home";
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload as T;
}

function App() {
  const [route, setRoute] = useState(getRouteFromHash);
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
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("diagramclo_token") ?? "");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authForm, setAuthForm] = useState<AuthForm>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [trackingForm, setTrackingForm] = useState<TrackingForm>({ orderId: "", email: "" });
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null);
  const [customerOrders, setCustomerOrders] = useState<TrackedOrder[]>([]);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminOrders, setAdminOrders] = useState<TrackedOrder[]>([]);
  const [adminSubscribers, setAdminSubscribers] = useState<Subscriber[]>([]);
  const [adminAnalytics, setAdminAnalytics] = useState<AdminAnalytics | null>(null);
  const [expandedAdminOrderId, setExpandedAdminOrderId] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>("analytics");
  const [adminProductSearch, setAdminProductSearch] = useState("");
  const [adminOrderStatusFilter, setAdminOrderStatusFilter] = useState("all");
  const [adminPaymentFilter, setAdminPaymentFilter] = useState("all");
  const [adminCategories, setAdminCategories] = useState<AdminCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [adminCategoryForm, setAdminCategoryForm] = useState({ name: "", slug: "", description: "" });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState({ name: "", slug: "", description: "" });
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [moveToCategory, setMoveToCategory] = useState("");
  const [subscribeForm, setSubscribeForm] = useState({ name: "", email: "" });
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "busy" | "done">("idle");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [shopSearch, setShopSearch] = useState("");
  const [shopCategory, setShopCategory] = useState("all");
  const [shopSize, setShopSize] = useState("all");
  const [shopColor, setShopColor] = useState("all");
  const [shopAvailability, setShopAvailability] = useState("all");
  const [shopSort, setShopSort] = useState<ShopSort>("featured");
  const [profileForm, setProfileForm] = useState<DashboardProfileForm>({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const emptyVariant = (): NewVariantForm => ({ sku: "", size: "", color: "", priceNaira: "", stockQuantity: "0" });
  const emptyImage = (): NewImageForm => ({ url: "", altText: "" });

  const [adminProduct, setAdminProduct] = useState<AdminProductForm>({
    name: "",
    slug: "",
    description: "",
    categoryId: "",
    images: [],
    variants: [emptyVariant()],
  });
  const [addVariantForms, setAddVariantForms] = useState<Record<string, NewVariantForm>>({});
  const [addImageForms, setAddImageForms] = useState<Record<string, NewImageForm>>({});
  const [uploadAltText, setUploadAltText] = useState<Record<string, string>>({});
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductForm, setEditProductForm] = useState({ name: "", description: "", categoryId: "" });
  const [addressForm, setAddressForm] = useState<AddressForm>({
    email: "",
    phone: "",
    fullName: "",
    line1: "",
    line2: "",
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    postalCode: "",
  });
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
      setRoute(getRouteFromHash());
    };

    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    if (!authToken) {
      setAuthUser(null);
      return;
    }

    request<{ user: AuthUser }>("/auth/me", {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(({ user }) => setAuthUser(user))
      .catch(() => {
        localStorage.removeItem("diagramclo_token");
        setAuthToken("");
        setAuthUser(null);
      });
  }, [authToken]);

  useEffect(() => {
    if (!authUser) return;

    setProfileForm({
      firstName: authUser.firstName ?? "",
      lastName: authUser.lastName ?? "",
      phone: authUser.phone ?? "",
    });
    setCheckout((current) => ({
      ...current,
      email: current.email || authUser.email,
      phone: current.phone || authUser.phone || "",
      fullName: current.fullName || [authUser.firstName, authUser.lastName].filter(Boolean).join(" "),
    }));
  }, [authUser]);

  useEffect(() => {
    if (!authToken || !authUser || authUser.role !== "CUSTOMER") return;

    Promise.all([
      request<{ orders: TrackedOrder[] }>("/orders/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      }),
      request<{ addresses: Address[] }>("/auth/me/addresses", {
        headers: { Authorization: `Bearer ${authToken}` },
      }),
    ])
      .then(([ordersResult, addressesResult]) => {
        setCustomerOrders(ordersResult.orders);
        setAddresses(addressesResult.addresses);
      })
      .catch((error) => {
        console.error(error);
        setCustomerOrders([]);
        setAddresses([]);
      });
  }, [authToken, authUser]);

  useEffect(() => {
    if (!authToken || authUser?.role !== "ADMIN") return;

    request<{ products: Product[] }>("/products/admin/all", {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(({ products: nextProducts }) => setAdminProducts(nextProducts))
      .catch((error) => {
        console.error(error);
        setAdminProducts([]);
      });

    request<{ orders: TrackedOrder[] }>("/orders/admin/all", {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(({ orders }) => setAdminOrders(orders))
      .catch((error) => {
        console.error(error);
        setAdminOrders([]);
      });

    request<{ subscribers: Subscriber[] }>("/newsletter/subscribers", {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(({ subscribers }) => setAdminSubscribers(subscribers))
      .catch((error) => {
        console.error(error);
        setAdminSubscribers([]);
      });

    request<{ analytics: AdminAnalytics }>("/admin/analytics", {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(({ analytics }) => setAdminAnalytics(analytics))
      .catch((error) => {
        console.error(error);
        setAdminAnalytics(null);
      });

    request<{ categories: AdminCategory[] }>("/categories")
      .then(({ categories }) => {
        setAdminCategories(categories);
        setLoadingCategories(false);
      })
      .catch(() => {
        setAdminCategories([]);
        setLoadingCategories(false);
        setNotice("Could not load categories.");
      });
  }, [authToken, authUser]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? products[0],
    [products, selectedProductId],
  );

  const detailProduct = useMemo(
    () => products.find((product) => product.id === detailProductId) ?? null,
    [products, detailProductId],
  );
  const policyPage = policyPages[route as PolicyRoute];

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.category?.name)
            .filter((category): category is string => Boolean(category)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const sizeOptions = useMemo(
    () =>
      Array.from(new Set(products.flatMap((product) => product.variants.map((variant) => variant.size))))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [products],
  );

  const colorOptions = useMemo(
    () =>
      Array.from(new Set(products.flatMap((product) => product.variants.map((variant) => variant.color))))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const shopItems = useMemo(() => {
    const normalizedSearch = shopSearch.trim().toLowerCase();
    const filtered = products.flatMap((product) =>
      product.variants
        .filter((variant) => {
          const searchable = [
            product.name,
            product.description ?? "",
            product.category?.name ?? "",
            variant.color,
            variant.size,
            variant.sku,
          ].join(" ").toLowerCase();

          if (normalizedSearch && !searchable.includes(normalizedSearch)) return false;
          if (shopCategory !== "all" && product.category?.name !== shopCategory) return false;
          if (shopSize !== "all" && variant.size !== shopSize) return false;
          if (shopColor !== "all" && variant.color !== shopColor) return false;
          if (shopAvailability === "in-stock" && variant.stockQuantity < 1) return false;
          if (shopAvailability === "sold-out" && variant.stockQuantity > 0) return false;
          if (route === "limited" && variant.stockQuantity > 5 && !searchable.includes("limited")) return false;
          return true;
        })
        .map((variant) => ({ product, variant })),
    );

    return filtered.sort((a, b) => {
      if (shopSort === "price-low") return a.variant.priceCents - b.variant.priceCents;
      if (shopSort === "price-high") return b.variant.priceCents - a.variant.priceCents;
      if (shopSort === "name") return a.product.name.localeCompare(b.product.name);
      return 0;
    });
  }, [products, route, shopAvailability, shopCategory, shopColor, shopSearch, shopSize, shopSort]);

  const collectionCards = useMemo(
    () =>
      categoryOptions.map((category) => {
        const categoryProducts = products.filter((product) => product.category?.name === category);
        const firstProduct = categoryProducts[0];
        return {
          name: category,
          count: categoryProducts.reduce((sum, product) => sum + product.variants.length, 0),
          image: firstProduct?.images[0],
        };
      }),
    [categoryOptions, products],
  );

  const searchResults = useMemo(() => {
    const query = shopSearch.trim().toLowerCase();
    if (!query) return [];

    return products.filter((product) => {
      const searchable = [
        product.name,
        product.description ?? "",
        product.category?.name ?? "",
        ...product.variants.flatMap((variant) => [variant.color, variant.size, variant.sku]),
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });
  }, [products, shopSearch]);

  const filteredAdminProducts = useMemo(() => {
    const query = adminProductSearch.trim().toLowerCase();
    if (!query) return adminProducts;

    return adminProducts.filter((product) => {
      const searchable = [
        product.name,
        product.slug,
        product.description ?? "",
        product.category?.name ?? "",
        product.archivedAt ? "archived" : product.isActive ? "active" : "inactive",
        ...product.variants.flatMap((variant) => [variant.sku, variant.color, variant.size]),
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });
  }, [adminProductSearch, adminProducts]);

  const filteredAdminOrders = useMemo(
    () =>
      adminOrders.filter((order) => {
        if (adminOrderStatusFilter !== "all" && order.status !== adminOrderStatusFilter) return false;
        if (adminPaymentFilter !== "all" && order.paymentStatus !== adminPaymentFilter) return false;
        return true;
      }),
    [adminOrderStatusFilter, adminOrders, adminPaymentFilter],
  );

  const shopTitle = route === "new" ? "New Arrivals" : route === "limited" ? "Limited" : "Shop All";
  const isShopRoute = route === "shop" || route === "new" || route === "limited";

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

  const saveAuth = (token: string, user: AuthUser) => {
    localStorage.setItem("diagramclo_token", token);
    setAuthToken(token);
    setAuthUser(user);
    setNotice(`Signed in as ${user.email}.`);
    window.location.hash = user.role === "ADMIN" ? "admin" : "account";
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("login");
    try {
      const { token, user } = await request<{ token: string; user: AuthUser }>("/auth/login", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ email: authForm.email, password: authForm.password }),
      });
      saveAuth(token, user);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(null);
    }
  };

  const submitSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("signup");
    try {
      const { token, user } = await request<{ token: string; user: AuthUser }>("/auth/register", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
          firstName: authForm.firstName || undefined,
          lastName: authForm.lastName || undefined,
          phone: authForm.phone || undefined,
        }),
      });
      saveAuth(token, user);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create account.");
    } finally {
      setBusy(null);
    }
  };

  const logout = () => {
    localStorage.removeItem("diagramclo_token");
    setAuthToken("");
    setAuthUser(null);
    setNotice("Signed out.");
    window.location.hash = "login";
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authToken) return;

    setBusy("profile");
    try {
      const { user } = await request<{ user: AuthUser }>("/auth/me", {
        method: "PATCH",
        headers: { ...jsonHeaders, Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          firstName: profileForm.firstName || undefined,
          lastName: profileForm.lastName || undefined,
          phone: profileForm.phone || undefined,
        }),
      });
      setAuthUser(user);
      setNotice("Profile updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update profile.");
    } finally {
      setBusy(null);
    }
  };

  const applyAddressToCheckout = (address: Address) => {
    setSelectedAddressId(address.id);
    setCheckout((current) => ({
      ...current,
      phone: address.phone,
      fullName: address.fullName,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state,
    }));
  };

  const submitAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authToken) return;

    setBusy("address");
    try {
      const { address } = await request<{ address: Address }>("/auth/me/addresses", {
        method: "POST",
        headers: { ...jsonHeaders, Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          fullName: addressForm.fullName,
          phone: addressForm.phone,
          line1: addressForm.line1,
          line2: addressForm.line2 || undefined,
          city: addressForm.city,
          state: addressForm.state,
          country: addressForm.country,
          postalCode: addressForm.postalCode || undefined,
        }),
      });
      setAddresses((current) => [address, ...current]);
      setAddressForm({
        email: "",
        phone: "",
        fullName: "",
        line1: "",
        line2: "",
        city: "Lagos",
        state: "Lagos",
        country: "Nigeria",
        postalCode: "",
      });
      setNotice("Address saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save address.");
    } finally {
      setBusy(null);
    }
  };

  const deleteAddress = async (addressId: string) => {
    if (!authToken) return;

    setBusy(addressId);
    try {
      await request(`/auth/me/addresses/${addressId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setAddresses((current) => current.filter((address) => address.id !== addressId));
      if (selectedAddressId === addressId) {
        setSelectedAddressId("");
      }
      setNotice("Address removed.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not remove address.");
    } finally {
      setBusy(null);
    }
  };

  const submitTracking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("tracking");
    try {
      const { order } = await request<{ order: TrackedOrder }>(
        `/orders/${trackingForm.orderId}?email=${encodeURIComponent(trackingForm.email)}`,
      );
      setTrackedOrder(order);
      setNotice("Order found.");
    } catch (error) {
      setTrackedOrder(null);
      setNotice(error instanceof Error ? error.message : "Order not found.");
    } finally {
      setBusy(null);
    }
  };

  const submitAdminProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authToken || authUser?.role !== "ADMIN") {
      setNotice("Admin access is required.");
      return;
    }

    setBusy("admin-product");
    try {
      const { product } = await request<{ product: Product }>("/products", {
        method: "POST",
        headers: { ...jsonHeaders, Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          name: adminProduct.name,
          slug: adminProduct.slug,
          description: adminProduct.description || undefined,
          categoryId: adminProduct.categoryId,
          images: adminProduct.images.filter((img) => img.url).map((img) => ({
            url: img.url,
            altText: img.altText || adminProduct.name,
          })),
          variants: adminProduct.variants.map((v) => ({
            sku: v.sku,
            size: v.size,
            color: v.color,
            priceCents: Math.round(Number(v.priceNaira) * 100),
            stockQuantity: Number(v.stockQuantity),
          })),
        }),
      });
      setProducts((current) => [product, ...current]);
      setAdminProducts((current) => [product, ...current]);
      setAdminProduct({
        name: "",
        slug: "",
        description: "",
        categoryId: "",
        images: [],
        variants: [emptyVariant()],
      });
      setNotice(`${product.name} created.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create product.");
    } finally {
      setBusy(null);
    }
  };

  const submitSubscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubscribeStatus("busy");
    try {
      await request("/newsletter/subscribe", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ email: subscribeForm.email, name: subscribeForm.name || undefined }),
      });
      setSubscribeStatus("done");
    } catch {
      setSubscribeStatus("idle");
      setNotice("Could not subscribe. Please try again.");
    }
  };

  const toSlug = (name: string) =>
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const refreshAdminCategories = async () => {
    const { categories } = await request<{ categories: AdminCategory[] }>("/categories");
    setAdminCategories(categories);
  };

  const submitAdminCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authToken) return;
    setBusy("admin-category");
    try {
      const { category } = await request<{ category: AdminCategory }>("/categories", {
        method: "POST",
        headers: { ...jsonHeaders, Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          name: adminCategoryForm.name,
          slug: adminCategoryForm.slug,
          description: adminCategoryForm.description || undefined,
        }),
      });
      setAdminCategories((current) => [...current, category]);
      setAdminCategoryForm({ name: "", slug: "", description: "" });
      setNotice(`Category "${category.name}" created.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create category.");
    } finally {
      setBusy(null);
    }
  };

  const saveEditCategory = async (categoryId: string) => {
    if (!authToken) return;
    setBusy(categoryId);
    try {
      const { category } = await request<{ category: AdminCategory }>(`/categories/${categoryId}`, {
        method: "PATCH",
        headers: { ...jsonHeaders, Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          name: editCategoryForm.name,
          slug: editCategoryForm.slug,
          description: editCategoryForm.description || undefined,
        }),
      });
      setAdminCategories((current) => current.map((c) => (c.id === categoryId ? category : c)));
      setEditingCategoryId(null);
      setNotice(`Category "${category.name}" updated.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update category.");
    } finally {
      setBusy(null);
    }
  };

  const deleteAdminCategory = async (categoryId: string) => {
    if (!authToken) return;
    setBusy(categoryId);
    try {
      const url = moveToCategory ? `/categories/${categoryId}?moveTo=${moveToCategory}` : `/categories/${categoryId}`;
      await request(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setAdminCategories((current) => current.filter((c) => c.id !== categoryId));
      setDeletingCategoryId(null);
      setMoveToCategory("");
      setNotice("Category deleted.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not delete category.");
    } finally {
      setBusy(null);
    }
  };

  const swapCategorySortOrder = async (a: AdminCategory, b: AdminCategory) => {
    setAdminCategories((current) =>
      current
        .map((c) => (c.id === a.id ? { ...c, sortOrder: b.sortOrder } : c.id === b.id ? { ...c, sortOrder: a.sortOrder } : c))
        .sort((x, y) => x.sortOrder - y.sortOrder),
    );
    try {
      await Promise.all([
        request(`/categories/${a.id}`, {
          method: "PATCH",
          headers: { ...jsonHeaders, Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ sortOrder: b.sortOrder }),
        }),
        request(`/categories/${b.id}`, {
          method: "PATCH",
          headers: { ...jsonHeaders, Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ sortOrder: a.sortOrder }),
        }),
      ]);
    } catch {
      await refreshAdminCategories();
      setNotice("Reorder failed. Order restored.");
    }
  };

  const saveEditProduct = async (productId: string) => {
    if (!authToken) return;
    setBusy(productId);
    try {
      await request(`/products/${productId}`, {
        method: "PATCH",
        headers: { ...jsonHeaders, Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          name: editProductForm.name || undefined,
          description: editProductForm.description || undefined,
          categoryId: editProductForm.categoryId || undefined,
        }),
      });
      await refreshAdminProducts();
      setEditingProductId(null);
      setNotice("Product updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update product.");
    } finally {
      setBusy(null);
    }
  };

  const submitAddVariant = async (productId: string) => {
    if (!authToken) return;
    const form = addVariantForms[productId];
    if (!form) return;
    setBusy(`add-variant-${productId}`);
    try {
      await request(`/products/${productId}/variants`, {
        method: "POST",
        headers: { ...jsonHeaders, Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          sku: form.sku,
          size: form.size,
          color: form.color,
          priceCents: Math.round(Number(form.priceNaira) * 100),
          stockQuantity: Number(form.stockQuantity),
        }),
      });
      await refreshAdminProducts();
      setAddVariantForms((current) => ({ ...current, [productId]: emptyVariant() }));
      setNotice("Variant added.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not add variant.");
    } finally {
      setBusy(null);
    }
  };

  const submitAddImage = async (productId: string) => {
    if (!authToken) return;
    const form = addImageForms[productId];
    if (!form?.url) return;
    setBusy(`add-image-${productId}`);
    try {
      await request(`/products/${productId}/images`, {
        method: "POST",
        headers: { ...jsonHeaders, Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ url: form.url, altText: form.altText || undefined }),
      });
      await refreshAdminProducts();
      setAddImageForms((current) => ({ ...current, [productId]: emptyImage() }));
      setNotice("Image added.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not add image.");
    } finally {
      setBusy(null);
    }
  };

  const uploadProductImage = async (productId: string, file: File | null) => {
    if (!authToken || !file) return;

    const body = new FormData();
    body.append("image", file);
    const altText = uploadAltText[productId];
    if (altText) body.append("altText", altText);

    setBusy(`upload-image-${productId}`);
    try {
      await request(`/products/${productId}/images/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body,
      });
      await refreshAdminProducts();
      setUploadAltText((current) => ({ ...current, [productId]: "" }));
      setNotice("Image uploaded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not upload image.");
    } finally {
      setBusy(null);
    }
  };

  const deleteProductImage = async (imageId: string, productId: string) => {
    if (!authToken) return;
    setBusy(imageId);
    try {
      await request(`/products/images/${imageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      await refreshAdminProducts();
      setNotice("Image removed.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not remove image.");
    } finally {
      setBusy(null);
    }
  };

  const deleteProductVariant = async (variantId: string) => {
    if (!authToken) return;
    setBusy(variantId);
    try {
      await request(`/products/variants/${variantId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      await refreshAdminProducts();
      setNotice("Variant removed.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not remove variant.");
    } finally {
      setBusy(null);
    }
  };

  const refreshAdminProducts = async () => {
    if (!authToken || authUser?.role !== "ADMIN") return;
    const { products: nextProducts } = await request<{ products: Product[] }>("/products/admin/all", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setAdminProducts(nextProducts);
  };

  const refreshShopProducts = async () => {
    const { products: nextProducts } = await request<{ products: Product[] }>("/products");
    setProducts(nextProducts);
  };

  const updateAdminProduct = async (productId: string, data: Partial<Pick<Product, "isActive" | "name" | "description">>) => {
    if (!authToken || authUser?.role !== "ADMIN") return;

    setBusy(productId);
    try {
      await request(`/products/${productId}`, {
        method: "PATCH",
        headers: { ...jsonHeaders, Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(data),
      });
      await refreshAdminProducts();
      setNotice("Product updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update product.");
    } finally {
      setBusy(null);
    }
  };

  const updateAdminVariant = async (
    variantId: string,
    data: Partial<Pick<ProductVariant, "stockQuantity" | "priceCents" | "isActive">>,
  ) => {
    if (!authToken || authUser?.role !== "ADMIN") return;

    setBusy(variantId);
    try {
      await request(`/products/variants/${variantId}`, {
        method: "PATCH",
        headers: { ...jsonHeaders, Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(data),
      });
      await refreshAdminProducts();
      setNotice("Variant updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update variant.");
    } finally {
      setBusy(null);
    }
  };

  const refreshAdminOrders = async () => {
    if (!authToken || authUser?.role !== "ADMIN") return;
    const { orders } = await request<{ orders: TrackedOrder[] }>("/orders/admin/all", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setAdminOrders(orders);
  };

  const refreshAdminSubscribers = async () => {
    if (!authToken || authUser?.role !== "ADMIN") return;
    const { subscribers } = await request<{ subscribers: Subscriber[] }>("/newsletter/subscribers", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setAdminSubscribers(subscribers);
  };

  const refreshAdminAnalytics = async () => {
    if (!authToken || authUser?.role !== "ADMIN") return;
    const { analytics } = await request<{ analytics: AdminAnalytics }>("/admin/analytics", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setAdminAnalytics(analytics);
  };

  const exportSubscribersCsv = () => {
    const rows = [
      ["email", "name", "createdAt"],
      ...adminSubscribers.map((subscriber) => [
        subscriber.email,
        subscriber.name ?? "",
        subscriber.createdAt,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `diagramclo-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const updateAdminOrder = async (
    orderId: string,
    data: Partial<Pick<TrackedOrder, "status" | "paymentStatus" | "courier" | "trackingNumber" | "internalNotes">>,
  ) => {
    if (!authToken || authUser?.role !== "ADMIN") return;
    setBusy(orderId);

    try {
      const { order } = await request<{ order: TrackedOrder }>(`/orders/admin/${orderId}`, {
        method: "PATCH",
        headers: { ...jsonHeaders, Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(data),
      });
      setAdminOrders((current) => current.map((item) => (item.id === order.id ? order : item)));
      setNotice("Order updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update order.");
    } finally {
      setBusy(null);
    }
  };

  const archiveProduct = async (productId: string) => {
    if (!authToken || authUser?.role !== "ADMIN") return;
    setBusy(productId);
    try {
      await request(`/products/${productId}/archive`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      await Promise.all([refreshAdminProducts(), refreshShopProducts()]);
      setNotice("Product archived.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not archive product.");
    } finally {
      setBusy(null);
    }
  };

  const restoreProduct = async (productId: string) => {
    if (!authToken || authUser?.role !== "ADMIN") return;
    setBusy(productId);
    try {
      await request(`/products/${productId}/restore`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      await Promise.all([refreshAdminProducts(), refreshShopProducts()]);
      setNotice("Product restored.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not restore product.");
    } finally {
      setBusy(null);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!authToken || authUser?.role !== "ADMIN") return;
    if (!window.confirm("Delete this product permanently? Products with order history must be archived instead.")) return;

    setBusy(productId);
    try {
      await request(`/products/${productId}?mode=delete`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      await Promise.all([refreshAdminProducts(), refreshShopProducts()]);
      setNotice("Product deleted.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not delete product.");
    } finally {
      setBusy(null);
    }
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

  const siteFooter = (
    <footer className="home-footer" id="footer">
      <div className="footer-column">
        <h3>Customer Care</h3>
        <a href="#contact">Contact</a>
        <a href="#shipping-delivery">Shipping &amp; Delivery</a>
        <a href="#privacy-policy">Privacy Policy</a>
        <a href="#terms-of-service">Terms of Service</a>
      </div>

      <div className="footer-column">
        <h3>Info</h3>
        <a href="#care-guide">Care Guide</a>
        <a href="#size-guide">Size Guide</a>
        <a href="#order-tracking">Order Tracking</a>
      </div>

      <div className="footer-subscribe">
        <h3>Subscribe</h3>
        <p>Sign up to receive emails from us, so you never miss out on the good stuff.</p>
        {subscribeStatus === "done" ? (
          <p className="subscribe-confirmed">You&rsquo;re in. Thanks for subscribing.</p>
        ) : (
          <form onSubmit={submitSubscribe}>
            <label>
              Name
              <input
                aria-label="Name"
                value={subscribeForm.name}
                onChange={(e) => setSubscribeForm({ ...subscribeForm, name: e.target.value })}
              />
            </label>
            <label>
              Email
              <input
                aria-label="Email"
                type="email"
                required
                value={subscribeForm.email}
                onChange={(e) => setSubscribeForm({ ...subscribeForm, email: e.target.value })}
              />
            </label>
            <button type="submit" disabled={subscribeStatus === "busy"}>
              {subscribeStatus === "busy" ? "Subscribing" : "Subscribe"}
            </button>
          </form>
        )}
      </div>

      <div className="footer-social">
        <div className="footer-social-links">
          <h3>Social</h3>
          <a href="https://www.instagram.com/diagramonlinee/" target="_blank" rel="noreferrer">
            Instagram @diagramonlinee
          </a>
          <a href="https://www.snapchat.com/@diagramclo" target="_blank" rel="noreferrer">
            Snapchat @diagramclo
          </a>
        </div>
        <div className="footer-commerce">
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
          <div className="payment-methods" aria-label="Accepted payment methods">
            {paymentIcons.map((icon) => (
              <img
                className={icon.className ? `payment-logo ${icon.className}` : "payment-logo"}
                src={icon.src}
                alt={icon.label}
                key={icon.label}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="footer-copyright">© 2026 Diagramclo™</p>
      <a className="footer-credit" href="mailto:southcastng@gmail.com">
        Built &amp; managed by Southcast Company.
      </a>
    </footer>
  );

  return (
    <main className={route === "home" ? "home-shell" : "shop-shell"}>
      <header className="topbar">
        <button className="brand" onClick={goHome}>
          <img src={logo} alt="Diagramclo™" />
        </button>
        <nav aria-label="Primary">
          <a href="#new">New</a>
          <a href="#collections">Collections</a>
          <a href="#shop">Shop All</a>
          <a href="#limited">Limited</a>
          <a href="#custom">Custom</a>
        </nav>
        <nav className="utility-nav" aria-label="Account">
          <a href="#search">Search</a>
          <a href={authUser ? (authUser.role === "ADMIN" ? "#admin" : "#account") : "#login"}>
            {authUser ? "Account" : "Login"}
          </a>
        </nav>
        <button className="bag-button" onClick={() => setCartOpen(true)}>
          Cart<sup>{cartCount}</sup>
        </button>
      </header>

      {route === "home" ? (
        <section
          className="hero"
          aria-label="Diagramclo™ homepage"
          style={{ "--hero-image": `url(${homeHero})` } as CSSProperties}
        >
          <h1>DIAGRAMCLO™</h1>
          <a className="hero-shop" href="#shop">Shop</a>
          <a className="signup-tab" href="#signup">Sign up</a>
        </section>
      ) : route === "search" ? (
        <section className="shop shop-page" id="search">
          <div className="shop-page-heading">
            <p>Search Diagramclo™</p>
            <h1>Search</h1>
          </div>
          <div className="search-panel">
            <label>
              <span>Search products</span>
              <input
                autoFocus
                value={shopSearch}
                onChange={(event) => setShopSearch(event.target.value)}
                placeholder="Product, category, color, size, SKU"
                type="search"
              />
            </label>
          </div>
          <div className="shop-toolbar">
            <span>{shopSearch.trim() ? `${searchResults.length} results` : "Enter a search term"}</span>
            <a href="#shop">Open filtered shop</a>
          </div>
          <div className="shop-grid">
            {shopSearch.trim() && searchResults.length ? (
              searchResults.map((product) => (
                <article className="shop-card" key={product.id}>
                  <div className="shop-image">
                    {product.images[0] ? (
                      <button
                        className="shop-image-button"
                        type="button"
                        onClick={() => {
                          setSelectedProductId(product.id);
                          setDetailProductId(product.id);
                        }}
                      >
                        <img
                          src={imageSrc(product.images[0].url, "?auto=format&fit=crop&w=700&q=88")}
                          alt={product.images[0].altText ?? product.name}
                        />
                      </button>
                    ) : null}
                  </div>
                  <div className="shop-card-meta">
                    <div>
                      <h2>{product.name}</h2>
                      <p>{product.category?.name ?? "Product"}</p>
                    </div>
                    <div>
                      <strong>{product.variants[0] ? formatPrice(product.variants[0].priceCents) : "—"}</strong>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="shop-empty">
                <h2>{shopSearch.trim() ? "No results." : "Search the catalog."}</h2>
                <p>{shopSearch.trim() ? "Try another product name, category, color, size, or SKU." : "Start typing to find products."}</p>
              </div>
            )}
          </div>
        </section>
      ) : isShopRoute ? (
        <section className="shop shop-page" id="shop">
          <div className="shop-page-heading">
            <p>{route === "limited" ? "Low stock and limited pieces" : "Diagramclo™ store"}</p>
            <h1>{shopTitle}</h1>
          </div>
          <div className="shop-toolbar">
            <span>
              {shopItems.length} {shopItems.length === 1 ? "item" : "items"} / {notice}
            </span>
            <button
              type="button"
              onClick={() => {
                setShopSearch("");
                setShopCategory("all");
                setShopSize("all");
                setShopColor("all");
                setShopAvailability("all");
                setShopSort("featured");
              }}
            >
              Clear filters
            </button>
          </div>

          <div className="shop-filters" aria-label="Shop filters">
            <label className="shop-search">
              <span>Search</span>
              <input
                value={shopSearch}
                onChange={(event) => setShopSearch(event.target.value)}
                placeholder="Search products"
                type="search"
              />
            </label>
            <label>
              <span>Category</span>
              <select value={shopCategory} onChange={(event) => setShopCategory(event.target.value)}>
                <option value="all">All categories</option>
                {categoryOptions.map((category) => (
                  <option value={category} key={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Size</span>
              <select value={shopSize} onChange={(event) => setShopSize(event.target.value)}>
                <option value="all">All sizes</option>
                {sizeOptions.map((size) => (
                  <option value={size} key={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Color</span>
              <select value={shopColor} onChange={(event) => setShopColor(event.target.value)}>
                <option value="all">All colors</option>
                {colorOptions.map((color) => (
                  <option value={color} key={color}>
                    {color}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Stock</span>
              <select value={shopAvailability} onChange={(event) => setShopAvailability(event.target.value)}>
                <option value="all">All stock</option>
                <option value="in-stock">In stock</option>
                <option value="sold-out">Sold out</option>
              </select>
            </label>
            <label>
              <span>Sort</span>
              <select value={shopSort} onChange={(event) => setShopSort(event.target.value as ShopSort)}>
                <option value="featured">Featured</option>
                <option value="price-low">Price low to high</option>
                <option value="price-high">Price high to low</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>

          <div className="shop-grid">
            {shopItems.length ? (
              shopItems.map(({ product, variant }) => (
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
                          src={imageSrc(product.images[0].url, "?auto=format&fit=crop&w=700&q=88")}
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
              ))
            ) : (
              <div className="shop-empty">
                <h2>No products found.</h2>
                <p>Try another search, size, color, or category.</p>
              </div>
            )}
          </div>
        </section>
      ) : route === "collections" ? (
        <section className="collections-page" id="collections">
          <div className="policy-hero">
            <p>Shop by edit</p>
            <h1>Collections</h1>
            <span>Browse Diagramclo™ pieces by category, then narrow the shop by size, color, stock, and price.</span>
          </div>
          <div className="collection-grid">
            {collectionCards.length ? (
              collectionCards.map((collection) => (
                <a
                  className="collection-card"
                  href="#shop"
                  key={collection.name}
                  onClick={() => {
                    setShopCategory(collection.name);
                    setShopSearch("");
                    setShopSize("all");
                    setShopColor("all");
                    setShopAvailability("all");
                  }}
                >
                  <div>
                    {collection.image ? (
                      <img src={imageSrc(collection.image.url, "?auto=format&fit=crop&w=800&q=88")} alt={collection.image.altText ?? collection.name} />
                    ) : null}
                  </div>
                  <span>{collection.count} items</span>
                  <h2>{collection.name}</h2>
                </a>
              ))
            ) : (
              <div className="shop-empty">
                <h2>No collections yet.</h2>
                <p>Add categories and products from admin.</p>
              </div>
            )}
          </div>
        </section>
      ) : route === "custom" ? (
        <section className="custom-page" id="custom">
          <div className="custom-hero" style={{ "--hero-image": `url(${homeHero})` } as CSSProperties}>
            <p>Custom</p>
            <h1>Custom Work</h1>
          </div>
          <div className="custom-grid">
            <article>
              <span>Studio Service</span>
              <h2>Custom apparel and small-run production.</h2>
              <p>
                Diagramclo™ can support custom pieces, team apparel, event uniforms, and limited private runs
                shaped around your visual direction.
              </p>
            </article>
            <article>
              <span>Enquiries</span>
              <h2>Send the brief, quantity, timeline, and references.</h2>
              <p>
                For custom work, contact customer care with the item type, preferred colors, size range,
                deadline, and any artwork or placement references.
              </p>
            </article>
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
                  {authUser && addresses.length > 0 && (
                    <label>
                      Saved address
                      <select
                        value={selectedAddressId}
                        onChange={(event) => {
                          const address = addresses.find((item) => item.id === event.target.value);
                          if (address) applyAddressToCheckout(address);
                        }}
                      >
                        <option value="">Choose saved address</option>
                        {addresses.map((address) => (
                          <option value={address.id} key={address.id}>
                            {address.fullName} - {address.line1}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
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
      ) : route === "shipping" ? (
        <section className="policy-page" id="shipping-delivery">
          <div className="policy-hero">
            <p>Customer Care</p>
            <h1>Shipping &amp; Delivery</h1>
            <span>
              Delivery information for Diagramclo™ orders, including processing windows,
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
      ) : policyPage ? (
        <section className="policy-page" id={route}>
          <div className="policy-hero">
            <p>{policyPage.eyebrow}</p>
            <h1>{policyPage.title}</h1>
            <span>{policyPage.intro}</span>
          </div>

          <div className="policy-grid">
            <aside>
              <h2>{policyPage.sideTitle}</h2>
              {policyPage.sideNotes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </aside>

            <div className="faq-list">
              {policyPage.sections.map((section) => (
                <article key={section.title}>
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : route === "tracking" ? (
        <section className="account-page" id="order-tracking">
          <div className="account-grid">
            <form className="account-form" onSubmit={submitTracking}>
              <p>Customer Care</p>
              <h1>Order Tracking</h1>
              <span>{notice}</span>
              <label>
                Order ID
                <input
                  required
                  value={trackingForm.orderId}
                  onChange={(event) => setTrackingForm({ ...trackingForm, orderId: event.target.value })}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  required
                  value={trackingForm.email}
                  onChange={(event) => setTrackingForm({ ...trackingForm, email: event.target.value })}
                />
              </label>
              <button disabled={busy === "tracking"} type="submit">
                {busy === "tracking" ? "Checking" : "Track order"}
              </button>
            </form>
            <aside className="account-panel">
              {trackedOrder ? (
                <>
                  <h2>{trackedOrder.status}</h2>
                  <p>Payment: {trackedOrder.paymentStatus}</p>
                  <p>Total: {formatPrice(trackedOrder.totalCents)}</p>
                  <p>Email: {trackedOrder.customerEmail}</p>
                  <div className="tracking-timeline">
                    {(trackedOrder.status === "CANCELLED" ? ["PENDING", "CANCELLED"] : deliverySteps).map((step, index) => {
                      const progress = orderProgress(trackedOrder.status);
                      const isDone = trackedOrder.status === "CANCELLED" ? step === "PENDING" || step === "CANCELLED" : index <= progress;
                      return (
                        <div className={isDone ? "tracking-step done" : "tracking-step"} key={step}>
                          <span />
                          <strong>{step}</strong>
                        </div>
                      );
                    })}
                  </div>
                  <div className="tracking-detail">
                    <strong>Delivery</strong>
                    <p>Courier: {trackedOrder.courier ?? "Not assigned yet"}</p>
                    <p>Tracking: {trackedOrder.trackingNumber ?? "Not available yet"}</p>
                    {trackedOrder.shippingAddress && (
                      <p>
                        Ship to: {trackedOrder.shippingAddress.city}, {trackedOrder.shippingAddress.state}
                      </p>
                    )}
                  </div>
                  <div className="summary-total">
                    <span>Items</span>
                    <strong>{trackedOrder.items.length}</strong>
                  </div>
                  {trackedOrder.items.map((item) => (
                    <div className="summary-line" key={item.id}>
                      <span>
                        {item.productName}<br />
                        {item.color} / {item.size} x {item.quantity}
                      </span>
                      <strong>{formatPrice(item.lineTotalCents)}</strong>
                    </div>
                  ))}
                </>
              ) : (
                <p>Enter your order ID and email to view order status and delivery details.</p>
              )}
            </aside>
          </div>
        </section>
      ) : route === "login" || route === "signup" ? (
        <section className="account-page" id={route}>
          <div className="account-grid">
            <form className="account-form" onSubmit={route === "login" ? submitLogin : submitSignup}>
              <p>Account</p>
              <h1>{route === "login" ? "Login" : "Sign up"}</h1>
              <span>{notice}</span>
              {route === "signup" && (
                <div className="field-pair">
                  <label>
                    First name
                    <input
                      value={authForm.firstName}
                      onChange={(event) => setAuthForm({ ...authForm, firstName: event.target.value })}
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      value={authForm.lastName}
                      onChange={(event) => setAuthForm({ ...authForm, lastName: event.target.value })}
                    />
                  </label>
                </div>
              )}
              <label>
                Email
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  minLength={8}
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                />
              </label>
              {route === "signup" && (
                <label>
                  Phone
                  <input
                    value={authForm.phone}
                    onChange={(event) => setAuthForm({ ...authForm, phone: event.target.value })}
                  />
                </label>
              )}
              <button disabled={busy === route} type="submit">
                {busy === route ? "Please wait" : route === "login" ? "Login" : "Create account"}
              </button>
              <a href={route === "login" ? "#signup" : "#login"}>
                {route === "login" ? "Create an account" : "Already have an account?"}
              </a>
            </form>
            <aside className="account-panel">
              {authUser ? (
                <>
                  <h2>{authUser.email}</h2>
                  <p>Role: {authUser.role}</p>
                  <button type="button" onClick={logout}>Sign out</button>
                  {authUser.role === "ADMIN" && <a href="#admin">Open admin</a>}
                </>
              ) : (
                <p>Sign in to track orders and manage your Diagramclo™ account.</p>
              )}
            </aside>
          </div>
        </section>
      ) : route === "account" ? (
        <section className="account-page" id="account">
          <div className="account-grid">
            <form className="account-form" onSubmit={submitProfile}>
              <p>Account</p>
              <h1>Dashboard</h1>
              <span>{authUser ? `Signed in as ${authUser.email}` : "Login to view your account."}</span>
              {authUser ? (
                <>
                  <div className="field-pair">
                    <label>
                      First name
                      <input
                        value={profileForm.firstName}
                        onChange={(event) => setProfileForm({ ...profileForm, firstName: event.target.value })}
                      />
                    </label>
                    <label>
                      Last name
                      <input
                        value={profileForm.lastName}
                        onChange={(event) => setProfileForm({ ...profileForm, lastName: event.target.value })}
                      />
                    </label>
                  </div>
                  <label>
                    Phone
                    <input
                      value={profileForm.phone}
                      onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
                    />
                  </label>
                  <button disabled={busy === "profile"} type="submit">
                    {busy === "profile" ? "Saving" : "Save profile"}
                  </button>
                  <button type="button" onClick={logout}>Sign out</button>
                </>
              ) : (
                <a href="#login">Login</a>
              )}
            </form>
            <aside className="account-panel">
              <h2>Orders</h2>
              {customerOrders.length ? (
                customerOrders.map((order) => (
                  <div className="summary-line" key={order.id}>
                    <span>
                      {order.id}<br />
                      {order.status} / {order.items.length} item{order.items.length === 1 ? "" : "s"}<br />
                      {order.courier || order.trackingNumber
                        ? `${order.courier ?? "Courier"} / ${order.trackingNumber ?? "Tracking pending"}`
                        : "Delivery details pending"}
                    </span>
                    <strong>{formatPrice(order.totalCents)}</strong>
                  </div>
                ))
              ) : (
                <p>No customer orders found yet.</p>
              )}
              <a href="#order-tracking">Track another order</a>
            </aside>
            {authUser && (
              <section className="address-section">
                <div className="account-panel">
                  <h2>Addresses</h2>
                  {addresses.length ? (
                    addresses.map((address) => (
                      <div className="address-card" key={address.id}>
                        <p>
                          {address.fullName}<br />
                          {address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />
                          {address.city}, {address.state}<br />
                          {address.phone}
                        </p>
                        <div>
                          <button type="button" onClick={() => applyAddressToCheckout(address)}>
                            Use at checkout
                          </button>
                          <button
                            type="button"
                            disabled={busy === address.id}
                            onClick={() => deleteAddress(address.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No saved addresses yet.</p>
                  )}
                </div>
                <form className="account-form" onSubmit={submitAddress}>
                  <p>Delivery</p>
                  <h1>Save Address</h1>
                  <label>
                    Full name
                    <input
                      required
                      value={addressForm.fullName}
                      onChange={(event) => setAddressForm({ ...addressForm, fullName: event.target.value })}
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      required
                      value={addressForm.phone}
                      onChange={(event) => setAddressForm({ ...addressForm, phone: event.target.value })}
                    />
                  </label>
                  <label>
                    Address line 1
                    <input
                      required
                      value={addressForm.line1}
                      onChange={(event) => setAddressForm({ ...addressForm, line1: event.target.value })}
                    />
                  </label>
                  <label>
                    Address line 2
                    <input
                      value={addressForm.line2}
                      onChange={(event) => setAddressForm({ ...addressForm, line2: event.target.value })}
                    />
                  </label>
                  <div className="field-pair">
                    <label>
                      City
                      <input
                        required
                        value={addressForm.city}
                        onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })}
                      />
                    </label>
                    <label>
                      State
                      <input
                        required
                        value={addressForm.state}
                        onChange={(event) => setAddressForm({ ...addressForm, state: event.target.value })}
                      />
                    </label>
                  </div>
                  <div className="field-pair">
                    <label>
                      Country
                      <input
                        required
                        value={addressForm.country}
                        onChange={(event) => setAddressForm({ ...addressForm, country: event.target.value })}
                      />
                    </label>
                    <label>
                      Postal code
                      <input
                        value={addressForm.postalCode}
                        onChange={(event) => setAddressForm({ ...addressForm, postalCode: event.target.value })}
                      />
                    </label>
                  </div>
                  <button disabled={busy === "address"} type="submit">
                    {busy === "address" ? "Saving" : "Save address"}
                  </button>
                </form>
              </section>
            )}
          </div>
        </section>
      ) : (
        <section className="account-page" id="admin">
          <div className="account-grid admin-grid">
            <form className={adminTab === "products" ? "account-form" : "account-form admin-section-hidden"} onSubmit={submitAdminProduct}>
              <p>Admin</p>
              <h1>Product Management</h1>
              <span>{authUser?.role === "ADMIN" ? notice : "Login with an admin account to create products."}</span>
              <label>
                Product name
                <input
                  required
                  value={adminProduct.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setAdminProduct({
                      ...adminProduct,
                      name,
                      slug: adminProduct.slug || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                    });
                  }}
                />
              </label>
              <label>
                Slug
                <input
                  required
                  value={adminProduct.slug}
                  onChange={(event) => setAdminProduct({ ...adminProduct, slug: event.target.value })}
                />
              </label>
              <label>
                Description
                <input
                  value={adminProduct.description}
                  onChange={(event) => setAdminProduct({ ...adminProduct, description: event.target.value })}
                />
              </label>
              <label>
                Category
                <select
                  required
                  value={adminProduct.categoryId}
                  onChange={(event) => setAdminProduct({ ...adminProduct, categoryId: event.target.value })}
                >
                  <option value="">Select category</option>
                  {adminCategories.map((cat) => (
                    <option value={cat.id} key={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </label>

              <p style={{ margin: "0.5rem 0 0.25rem", fontWeight: 600 }}>Images</p>
              {adminProduct.images.map((img, i) => (
                <div className="field-pair" key={i}>
                  <label>
                    Image URL
                    <input
                      type="url"
                      value={img.url}
                      onChange={(event) => {
                        const images = [...adminProduct.images];
                        images[i] = { ...images[i], url: event.target.value };
                        setAdminProduct({ ...adminProduct, images });
                      }}
                    />
                  </label>
                  <label>
                    Alt text
                    <input
                      value={img.altText}
                      onChange={(event) => {
                        const images = [...adminProduct.images];
                        images[i] = { ...images[i], altText: event.target.value };
                        setAdminProduct({ ...adminProduct, images });
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setAdminProduct({ ...adminProduct, images: adminProduct.images.filter((_, j) => j !== i) })}
                  >Remove</button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setAdminProduct({ ...adminProduct, images: [...adminProduct.images, emptyImage()] })}
              >+ Add image</button>

              <p style={{ margin: "0.75rem 0 0.25rem", fontWeight: 600 }}>Variants</p>
              {adminProduct.variants.map((v, i) => (
                <div key={i} style={{ borderLeft: "2px solid #eee", paddingLeft: "0.75rem", marginBottom: "0.5rem" }}>
                  <div className="field-pair">
                    <label>SKU <input required value={v.sku} onChange={(e) => { const variants = [...adminProduct.variants]; variants[i] = { ...variants[i], sku: e.target.value }; setAdminProduct({ ...adminProduct, variants }); }} /></label>
                    <label>Price (NGN) <input required type="number" min="1" value={v.priceNaira} onChange={(e) => { const variants = [...adminProduct.variants]; variants[i] = { ...variants[i], priceNaira: e.target.value }; setAdminProduct({ ...adminProduct, variants }); }} /></label>
                  </div>
                  <div className="field-pair">
                    <label>Size <input required value={v.size} onChange={(e) => { const variants = [...adminProduct.variants]; variants[i] = { ...variants[i], size: e.target.value }; setAdminProduct({ ...adminProduct, variants }); }} /></label>
                    <label>Color <input required value={v.color} onChange={(e) => { const variants = [...adminProduct.variants]; variants[i] = { ...variants[i], color: e.target.value }; setAdminProduct({ ...adminProduct, variants }); }} /></label>
                  </div>
                  <label>Stock <input required type="number" min="0" value={v.stockQuantity} onChange={(e) => { const variants = [...adminProduct.variants]; variants[i] = { ...variants[i], stockQuantity: e.target.value }; setAdminProduct({ ...adminProduct, variants }); }} /></label>
                  {adminProduct.variants.length > 1 && (
                    <button type="button" onClick={() => setAdminProduct({ ...adminProduct, variants: adminProduct.variants.filter((_, j) => j !== i) })}>Remove variant</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setAdminProduct({ ...adminProduct, variants: [...adminProduct.variants, emptyVariant()] })}>+ Add variant</button>
              <button disabled={busy === "admin-product" || authUser?.role !== "ADMIN" || !adminProduct.categoryId} type="submit">
                {busy === "admin-product" ? "Creating" : "Create product"}
              </button>
            </form>
            <aside className="account-panel">
              <h2>Catalog</h2>
              <p>{adminProducts.length || products.length} products loaded.</p>
              <p>{adminOrders.length} recent orders.</p>
              <p>{adminSubscribers.length} newsletter subscribers.</p>
              <div className="admin-tabs" role="tablist" aria-label="Admin sections">
                {(["analytics", "products", "orders", "categories", "subscribers"] as const).map((tab) => (
                  <button
                    className={adminTab === tab ? "active" : ""}
                    type="button"
                    key={tab}
                    onClick={() => setAdminTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {authUser?.role !== "ADMIN" && <a href="#login">Login as admin</a>}
            </aside>
            {authUser?.role === "ADMIN" && (
              <>
                <div className={adminTab === "analytics" ? "" : "admin-section-hidden"}>
                  <AdminAnalyticsPanel
                    analytics={adminAnalytics}
                    formatPrice={formatPrice}
                    onRefresh={refreshAdminAnalytics}
                  />
                </div>

                <section className={adminTab === "categories" ? "admin-categories" : "admin-categories admin-section-hidden"}>
                  <div className="shop-toolbar">
                    <span>Categories</span>
                  </div>
                  <form onSubmit={submitAdminCategory} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                    <div className="field-pair">
                      <label>
                        Name
                        <input
                          required
                          value={adminCategoryForm.name}
                          onChange={(event) => {
                            const name = event.target.value;
                            setAdminCategoryForm((current) => ({
                              ...current,
                              name,
                              slug: current.slug || toSlug(name),
                            }));
                          }}
                        />
                      </label>
                      <label>
                        Slug
                        <input
                          required
                          value={adminCategoryForm.slug}
                          onChange={(event) => setAdminCategoryForm({ ...adminCategoryForm, slug: event.target.value })}
                        />
                      </label>
                    </div>
                    <label>
                      Description (optional)
                      <input
                        value={adminCategoryForm.description}
                        onChange={(event) => setAdminCategoryForm({ ...adminCategoryForm, description: event.target.value })}
                      />
                    </label>
                    {adminCategoryForm.slug.length > 0 && adminCategoryForm.slug.length < 2 && (
                      <small>Slug too short — edit it manually.</small>
                    )}
                    <button
                      type="submit"
                      disabled={busy === "admin-category" || adminCategoryForm.slug.length < 2}
                    >
                      {busy === "admin-category" ? "Creating" : "Add category"}
                    </button>
                  </form>

                  {loadingCategories ? (
                    <p>Loading categories.</p>
                  ) : adminCategories.length === 0 ? (
                    <p>No categories yet. Add one above.</p>
                  ) : (
                    adminCategories.map((cat, index) => (
                      <div key={cat.id}>
                        {editingCategoryId === cat.id ? (
                          <div className="admin-category-edit">
                            <div className="field-pair">
                              <label>
                                Name
                                <input
                                  value={editCategoryForm.name}
                                  onChange={(event) => setEditCategoryForm({ ...editCategoryForm, name: event.target.value })}
                                />
                              </label>
                              <label>
                                Slug
                                <input
                                  value={editCategoryForm.slug}
                                  onChange={(event) => setEditCategoryForm({ ...editCategoryForm, slug: event.target.value })}
                                />
                              </label>
                            </div>
                            <label>
                              Description
                              <input
                                value={editCategoryForm.description}
                                onChange={(event) => setEditCategoryForm({ ...editCategoryForm, description: event.target.value })}
                              />
                            </label>
                            <div className="admin-actions">
                              <button type="button" disabled={busy === cat.id} onClick={() => saveEditCategory(cat.id)}>
                                {busy === cat.id ? "Saving" : "Save"}
                              </button>
                              <button type="button" onClick={() => setEditingCategoryId(null)}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="admin-category-row">
                            <div style={{ flex: 1 }}>
                              <strong>{cat.name}</strong>
                              <span style={{ marginLeft: "0.5rem", opacity: 0.5 }}>{cat.slug}</span>
                              <span style={{ marginLeft: "0.5rem", opacity: 0.5 }}>{cat._count.products} products</span>
                            </div>
                            <div className="admin-actions">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => swapCategorySortOrder(cat, adminCategories[index - 1])}
                              >↑</button>
                              <button
                                type="button"
                                disabled={index === adminCategories.length - 1}
                                onClick={() => swapCategorySortOrder(cat, adminCategories[index + 1])}
                              >↓</button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategoryId(cat.id);
                                  setEditCategoryForm({ name: cat.name, slug: cat.slug, description: cat.description ?? "" });
                                }}
                              >Edit</button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingCategoryId(cat.id);
                                  setMoveToCategory("");
                                }}
                              >Delete</button>
                            </div>
                          </div>
                        )}
                        {deletingCategoryId === cat.id && (
                          <div className="admin-category-edit">
                            {cat._count.products === 0 ? (
                              <p>Delete &ldquo;{cat.name}&rdquo;?</p>
                            ) : (
                              <>
                                <p>{cat._count.products} products will be moved to:</p>
                                <select value={moveToCategory} onChange={(event) => setMoveToCategory(event.target.value)}>
                                  <option value="">— select a category —</option>
                                  {adminCategories.filter((c) => c.id !== cat.id).map((c) => (
                                    <option value={c.id} key={c.id}>{c.name}</option>
                                  ))}
                                </select>
                              </>
                            )}
                            <div className="admin-actions">
                              <button
                                type="button"
                                disabled={busy === cat.id || (cat._count.products > 0 && !moveToCategory)}
                                onClick={() => deleteAdminCategory(cat.id)}
                              >
                                {busy === cat.id ? "Deleting" : "Confirm delete"}
                              </button>
                              <button type="button" onClick={() => { setDeletingCategoryId(null); setMoveToCategory(""); }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </section>

                <section className={adminTab === "orders" ? "admin-orders" : "admin-orders admin-section-hidden"}>
                  <div className="shop-toolbar">
                    <span>{filteredAdminOrders.length} of {adminOrders.length} recent orders</span>
                    <button type="button" onClick={refreshAdminOrders}>Refresh orders</button>
                  </div>
                  <div className="admin-filter-row">
                    <label>
                      Status
                      <select value={adminOrderStatusFilter} onChange={(event) => setAdminOrderStatusFilter(event.target.value)}>
                        <option value="all">All statuses</option>
                        {orderStatuses.map((status) => <option value={status} key={status}>{status}</option>)}
                      </select>
                    </label>
                    <label>
                      Payment
                      <select value={adminPaymentFilter} onChange={(event) => setAdminPaymentFilter(event.target.value)}>
                        <option value="all">All payments</option>
                        {paymentStatuses.map((status) => <option value={status} key={status}>{status}</option>)}
                      </select>
                    </label>
                  </div>
                  {filteredAdminOrders.length ? (
                    filteredAdminOrders.map((order) => (
                      <article className="admin-order-card" key={order.id}>
                        <div>
                          <h2>{order.id}</h2>
                          <p>
                            {order.customerEmail}
                            {order.customerPhone ? ` / ${order.customerPhone}` : ""}
                          </p>
                          <p>{new Date(order.createdAt).toLocaleString()}</p>
                          <p>{order.items.length} items / {formatPrice(order.totalCents)}</p>
                          {(order.courier || order.trackingNumber) && (
                            <p>{order.courier ?? "Courier"} / {order.trackingNumber ?? "No tracking number"}</p>
                          )}
                        </div>
                        <div className="admin-order-controls">
                          <label>
                            Order status
                            <select
                              value={order.status}
                              disabled={busy === order.id}
                              onChange={(event) => updateAdminOrder(order.id, { status: event.target.value })}
                            >
                              {orderStatuses.map((status) => (
                                <option value={status} key={status}>{status}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Payment
                            <select
                              value={order.paymentStatus}
                              disabled={busy === order.id}
                              onChange={(event) => updateAdminOrder(order.id, { paymentStatus: event.target.value })}
                            >
                              {paymentStatuses.map((status) => (
                                <option value={status} key={status}>{status}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Courier
                            <input
                              defaultValue={order.courier ?? ""}
                              disabled={busy === order.id}
                              onBlur={(event) => updateAdminOrder(order.id, { courier: event.target.value || undefined })}
                            />
                          </label>
                          <label>
                            Tracking
                            <input
                              defaultValue={order.trackingNumber ?? ""}
                              disabled={busy === order.id}
                              onBlur={(event) => updateAdminOrder(order.id, { trackingNumber: event.target.value || undefined })}
                            />
                          </label>
                        </div>
                        <div className="admin-actions">
                          <button
                            type="button"
                            onClick={() => setExpandedAdminOrderId(expandedAdminOrderId === order.id ? null : order.id)}
                          >
                            {expandedAdminOrderId === order.id ? "Hide details" : "Details"}
                          </button>
                          {order.shippingAddress && (
                            <button
                              type="button"
                              onClick={() => {
                                const address = `${order.shippingAddress?.fullName}, ${order.shippingAddress?.line1}${order.shippingAddress?.line2 ? `, ${order.shippingAddress.line2}` : ""}, ${order.shippingAddress?.city}, ${order.shippingAddress?.state}, ${order.shippingAddress?.country}`;
                                void navigator.clipboard?.writeText(address);
                                setNotice("Address copied.");
                              }}
                            >
                              Copy address
                            </button>
                          )}
                        </div>
                        <div className="admin-order-items">
                          {order.items.map((item) => (
                            <span key={item.id}>
                              {item.productName} / {item.color} / {item.size} x {item.quantity}
                            </span>
                          ))}
                        </div>
                        {order.shippingAddress && (
                          <p className="admin-order-address">
                            {order.shippingAddress.fullName}, {order.shippingAddress.line1}
                            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}, {order.shippingAddress.city}, {order.shippingAddress.state}
                          </p>
                        )}
                        {expandedAdminOrderId === order.id && (
                          <div className="admin-order-detail">
                            <label>
                              Internal notes
                              <textarea
                                defaultValue={order.internalNotes ?? ""}
                                disabled={busy === order.id}
                                onBlur={(event) => updateAdminOrder(order.id, { internalNotes: event.target.value || undefined })}
                              />
                            </label>
                            <div>
                              <strong>Fulfillment</strong>
                              <p>Status: {order.status}</p>
                              <p>Payment: {order.paymentStatus}</p>
                              <p>Courier: {order.courier ?? "Not set"}</p>
                              <p>Tracking: {order.trackingNumber ?? "Not set"}</p>
                            </div>
                          </div>
                        )}
                      </article>
                    ))
                  ) : (
                    <p className="empty-bag">No orders yet.</p>
                  )}
                </section>

                <section className={adminTab === "subscribers" ? "admin-subscribers" : "admin-subscribers admin-section-hidden"}>
                  <div className="shop-toolbar">
                    <span>{adminSubscribers.length} newsletter subscribers</span>
                    <div className="admin-toolbar-actions">
                      <button type="button" onClick={refreshAdminSubscribers}>Refresh subscribers</button>
                      <button type="button" disabled={!adminSubscribers.length} onClick={exportSubscribersCsv}>Export CSV</button>
                    </div>
                  </div>
                  {adminSubscribers.length ? (
                    <div className="admin-list">
                      {adminSubscribers.map((subscriber) => (
                        <article className="admin-list-row" key={subscriber.id}>
                          <div>
                            <strong>{subscriber.email}</strong>
                            <span>{subscriber.name ?? "No name"}</span>
                          </div>
                          <span>{new Date(subscriber.createdAt).toLocaleString()}</span>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-bag">No subscribers yet.</p>
                  )}
                </section>

                <section className={adminTab === "products" ? "admin-catalog" : "admin-catalog admin-section-hidden"}>
                  <div className="shop-toolbar">
                    <span>{filteredAdminProducts.length} of {adminProducts.length} products / {notice}</span>
                    <button type="button" onClick={refreshAdminProducts}>Refresh catalog</button>
                  </div>
                  <div className="admin-filter-row">
                    <label>
                      Product search
                      <input
                        value={adminProductSearch}
                        onChange={(event) => setAdminProductSearch(event.target.value)}
                        placeholder="Name, SKU, color, category, archived"
                        type="search"
                      />
                    </label>
                  </div>
                  {filteredAdminProducts.map((product) => (
                    <article className="admin-product-card" key={product.id}>
                      {editingProductId === product.id ? (
                        <div className="admin-category-edit">
                          <div className="field-pair">
                            <label>Name <input value={editProductForm.name} onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })} /></label>
                            <label>
                              Category
                              <select value={editProductForm.categoryId} onChange={(e) => setEditProductForm({ ...editProductForm, categoryId: e.target.value })}>
                                <option value="">No category</option>
                                {adminCategories.map((cat) => <option value={cat.id} key={cat.id}>{cat.name}</option>)}
                              </select>
                            </label>
                          </div>
                          <label>Description <input value={editProductForm.description} onChange={(e) => setEditProductForm({ ...editProductForm, description: e.target.value })} /></label>
                          <div className="admin-actions">
                            <button type="button" disabled={busy === product.id} onClick={() => saveEditProduct(product.id)}>{busy === product.id ? "Saving" : "Save"}</button>
                            <button type="button" onClick={() => setEditingProductId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h2>{product.name}</h2>
                          <p>{product.category?.name ?? "—"} · {product.slug}</p>
                          {product.archivedAt && <p>Archived {new Date(product.archivedAt).toLocaleString()}</p>}
                          <p>{product.description}</p>
                        </div>
                      )}
                      <div className="admin-actions">
                        <button type="button" disabled={busy === product.id || Boolean(product.archivedAt)} onClick={() => updateAdminProduct(product.id, { isActive: !product.isActive })}>
                          {product.isActive ? "Deactivate" : "Activate"}
                        </button>
                        {editingProductId !== product.id && (
                          <button type="button" onClick={() => { setEditingProductId(product.id); setEditProductForm({ name: product.name, description: product.description ?? "", categoryId: product.category?.slug ? (adminCategories.find((c) => c.slug === product.category?.slug)?.id ?? "") : "" }); }}>Edit</button>
                        )}
                        {!product.archivedAt && (
                          <button type="button" disabled={busy === product.id} onClick={() => archiveProduct(product.id)}>Archive</button>
                        )}
                        {product.archivedAt && (
                          <button type="button" disabled={busy === product.id} onClick={() => restoreProduct(product.id)}>Restore</button>
                        )}
                        <button type="button" disabled={busy === product.id} onClick={() => deleteProduct(product.id)}>Delete</button>
                      </div>

                      <div className="admin-variants">
                        {product.images.map((image) => (
                          <div className="admin-variant-row" key={image.id}>
                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{image.url}</span>
                            <button type="button" disabled={busy === image.id} onClick={() => deleteProductImage(image.id, product.id)}>Remove image</button>
                          </div>
                        ))}
                        <div className="admin-variant-row">
                          <input
                            type="url"
                            placeholder="Add image URL"
                            value={addImageForms[product.id]?.url ?? ""}
                            onChange={(e) => setAddImageForms((cur) => ({ ...cur, [product.id]: { ...(cur[product.id] ?? emptyImage()), url: e.target.value } }))}
                            style={{ flex: 1 }}
                          />
                          <button type="button" disabled={busy === `add-image-${product.id}` || !addImageForms[product.id]?.url} onClick={() => submitAddImage(product.id)}>
                            {busy === `add-image-${product.id}` ? "Adding" : "+ Image"}
                          </button>
                        </div>
                        <div className="admin-variant-row">
                          <input
                            placeholder="Upload alt text"
                            value={uploadAltText[product.id] ?? ""}
                            onChange={(e) => setUploadAltText((cur) => ({ ...cur, [product.id]: e.target.value }))}
                          />
                          <input
                            type="file"
                            accept="image/*"
                            disabled={busy === `upload-image-${product.id}`}
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              void uploadProductImage(product.id, file);
                              event.currentTarget.value = "";
                            }}
                          />
                          <span>{busy === `upload-image-${product.id}` ? "Uploading image" : "Upload image file"}</span>
                        </div>
                      </div>

                      <div className="admin-variants">
                        {product.variants.map((variant) => (
                          <div className="admin-variant-row" key={variant.id}>
                            <span>
                              {variant.sku}<br />
                              {variant.color} / {variant.size}
                            </span>
                            <label>
                              Stock
                              <input
                                type="number"
                                min="0"
                                defaultValue={variant.stockQuantity}
                                onBlur={(event) => updateAdminVariant(variant.id, { stockQuantity: Number(event.target.value) })}
                              />
                            </label>
                            <label>
                              Price
                              <input
                                type="number"
                                min="1"
                                defaultValue={variant.priceCents / 100}
                                onBlur={(event) => updateAdminVariant(variant.id, { priceCents: Math.round(Number(event.target.value) * 100) })}
                              />
                            </label>
                            <button type="button" disabled={busy === variant.id} onClick={() => updateAdminVariant(variant.id, { isActive: !variant.isActive })}>
                              {variant.isActive ? "Hide" : "Show"}
                            </button>
                            <button type="button" disabled={busy === variant.id} onClick={() => deleteProductVariant(variant.id)}>Delete</button>
                          </div>
                        ))}
                        <div className="admin-variant-row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                          <input placeholder="SKU" value={addVariantForms[product.id]?.sku ?? ""} onChange={(e) => setAddVariantForms((cur) => ({ ...cur, [product.id]: { ...(cur[product.id] ?? emptyVariant()), sku: e.target.value } }))} style={{ width: "80px" }} />
                          <input placeholder="Size" value={addVariantForms[product.id]?.size ?? ""} onChange={(e) => setAddVariantForms((cur) => ({ ...cur, [product.id]: { ...(cur[product.id] ?? emptyVariant()), size: e.target.value } }))} style={{ width: "60px" }} />
                          <input placeholder="Color" value={addVariantForms[product.id]?.color ?? ""} onChange={(e) => setAddVariantForms((cur) => ({ ...cur, [product.id]: { ...(cur[product.id] ?? emptyVariant()), color: e.target.value } }))} style={{ width: "80px" }} />
                          <input placeholder="Price NGN" type="number" min="1" value={addVariantForms[product.id]?.priceNaira ?? ""} onChange={(e) => setAddVariantForms((cur) => ({ ...cur, [product.id]: { ...(cur[product.id] ?? emptyVariant()), priceNaira: e.target.value } }))} style={{ width: "100px" }} />
                          <input placeholder="Stock" type="number" min="0" value={addVariantForms[product.id]?.stockQuantity ?? "0"} onChange={(e) => setAddVariantForms((cur) => ({ ...cur, [product.id]: { ...(cur[product.id] ?? emptyVariant()), stockQuantity: e.target.value } }))} style={{ width: "60px" }} />
                          <button type="button" disabled={busy === `add-variant-${product.id}` || !addVariantForms[product.id]?.sku} onClick={() => submitAddVariant(product.id)}>
                            {busy === `add-variant-${product.id}` ? "Adding" : "+ Variant"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </section>
              </>
            )}
          </div>
        </section>
      )}

      {siteFooter}

      {detailProduct && (
        <div className="detail-backdrop" onClick={() => setDetailProductId(null)}>
          <section className="product-detail" aria-label={detailProduct.name} onClick={(event) => event.stopPropagation()}>
            <button className="detail-close" type="button" onClick={() => setDetailProductId(null)}>
              Close
            </button>
            <div className="detail-image">
              {detailProduct.images[0] && (
                <img
                  src={imageSrc(detailProduct.images[0].url, "?auto=format&fit=crop&w=1000&q=90")}
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
