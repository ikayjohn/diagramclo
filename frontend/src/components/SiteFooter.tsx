import type { FormEvent } from "react";
import bankTransferIcon from "../assets/icons/bank-transfer-svgrepo-com.svg";
import mastercardIcon from "../assets/icons/mastercard-svgrepo-com(2).svg";
import paypalIcon from "../assets/icons/paypal-svgrepo-com.svg";
import paystackIcon from "../assets/icons/paystack-2.svg";
import stripeIcon from "../assets/icons/credit-card-stripe-svgrepo-com.svg";
import verveIcon from "../assets/icons/verve-2-svgrepo-com.svg";
import visaIcon from "../assets/icons/visa-svgrepo-com.svg";

const paymentIcons: Array<{ label: string; src: string; className?: string }> = [
  { label: "Visa", src: visaIcon },
  { label: "Mastercard", src: mastercardIcon },
  { label: "Verve", src: verveIcon },
  { label: "Paystack", src: paystackIcon, className: "paystack-logo" },
  { label: "Stripe", src: stripeIcon },
  { label: "PayPal", src: paypalIcon },
  { label: "Bank transfer", src: bankTransferIcon },
];

type CurrencyOption = {
  code: string;
  label: string;
};

type SubscribeForm = {
  name: string;
  email: string;
};

type SiteFooterProps = {
  currencies: readonly CurrencyOption[];
  currency: string;
  subscribeForm: SubscribeForm;
  subscribeStatus: "idle" | "busy" | "done";
  onCurrencyChange: (currency: string) => void;
  onSubscribe: (event: FormEvent<HTMLFormElement>) => void;
  onSubscribeFormChange: (form: SubscribeForm) => void;
};

export function SiteFooter({
  currencies,
  currency,
  subscribeForm,
  subscribeStatus,
  onCurrencyChange,
  onSubscribe,
  onSubscribeFormChange,
}: SiteFooterProps) {
  return (
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
          <form onSubmit={onSubscribe}>
            <label>
              Name
              <input
                aria-label="Name"
                value={subscribeForm.name}
                onChange={(event) => onSubscribeFormChange({ ...subscribeForm, name: event.target.value })}
              />
            </label>
            <label>
              Email
              <input
                aria-label="Email"
                type="email"
                required
                value={subscribeForm.email}
                onChange={(event) => onSubscribeFormChange({ ...subscribeForm, email: event.target.value })}
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
            <select value={currency} onChange={(event) => onCurrencyChange(event.target.value)}>
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
}
