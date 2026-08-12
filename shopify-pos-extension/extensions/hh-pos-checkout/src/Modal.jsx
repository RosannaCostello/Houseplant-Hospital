import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { API_BASE, API_SECRET } from "./config.js";

export default async () => {
  render(<Extension />, document.body);
};

const POLL_MS = 3000;

async function fetchPending() {
  const response = await fetch(`${API_BASE}/api/shopify/pos/pending`, {
    headers: { Authorization: `Bearer ${API_SECRET}` },
  });

  if (!response.ok) {
    throw new Error(`Could not load pending payments (${response.status})`);
  }

  const json = await response.json();
  return json.pending ?? [];
}

function networkErrorMessage(err) {
  const message = err instanceof Error ? err.message : "Failed to load";
  if (message === "Load failed" || message.toLowerCase().includes("failed to fetch")) {
    return "Could not reach Houseplant Hospital API (network/CORS). Check deploy + API_SECRET.";
  }
  return message;
}

function Extension() {
  const [pending, setPending] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState(null);

  const refreshPending = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const items = await fetchPending();
      setPending(items);
      setError(null);
    } catch (err) {
      if (!silent) {
        setError(networkErrorMessage(err));
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshPending({ silent: false });

    const interval = window.setInterval(() => {
      void refreshPending({ silent: true });
    }, POLL_MS);

    function onVisibility() {
      if (document.visibilityState === "visible") {
        void refreshPending({ silent: true });
      }
    }

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshPending]);

  async function loadCheckout(item) {
    setLoadingId(item.id);
    setError(null);

    try {
      await shopify.cart.clearCart();

      for (const line of item.lineItems ?? []) {
        const variantId = Number(line.variantId);
        const quantity = Number(line.quantity) || 1;
        const properties = Object.fromEntries(
          (line.properties ?? []).map((property) => [property.name, property.value]),
        );

        await shopify.cart.addLineItem(variantId, quantity, { properties });
      }

      if (item.shopifyCustomerId) {
        await shopify.cart.setCustomer({ id: Number(item.shopifyCustomerId) });
      }

      await fetch(`${API_BASE}/api/shopify/pos/pending`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: item.type, id: item.id }),
      });

      shopify.toast.show("Cart loaded");
      window.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load cart");
    } finally {
      setLoadingId(null);
    }
  }

  if (loading && pending.length === 0 && !error) {
    return (
      <s-page heading="Houseplant Hospital">
        <s-scroll-box>
          <s-box padding="small">
            <s-text>Loading pending payments…</s-text>
          </s-box>
        </s-scroll-box>
      </s-page>
    );
  }

  if (error && pending.length === 0) {
    return (
      <s-page heading="Houseplant Hospital">
        <s-scroll-box>
          <s-box padding="small">
            <s-text>{error}</s-text>
          </s-box>
          <s-box padding="small">
            <s-button onClick={() => void refreshPending({ silent: false })}>Refresh</s-button>
          </s-box>
        </s-scroll-box>
      </s-page>
    );
  }

  if (pending.length === 0) {
    return (
      <s-page heading="Houseplant Hospital">
        <s-scroll-box>
          <s-box padding="small">
            <s-text>
              No pending payments. Queue a check-in cart or wait for an unpaid collection visit to
              appear. This list refreshes automatically.
            </s-text>
          </s-box>
          <s-box padding="small">
            <s-button onClick={() => void refreshPending({ silent: false })}>Refresh</s-button>
          </s-box>
        </s-scroll-box>
      </s-page>
    );
  }

  return (
    <s-page heading="Pending payments">
      <s-scroll-box>
        {error ? (
          <s-box padding="small">
            <s-text>{error}</s-text>
          </s-box>
        ) : null}
        <s-box padding="small">
          <s-button onClick={() => void refreshPending({ silent: false })}>Refresh</s-button>
        </s-box>
        {pending.map((item) => (
          <s-box key={`${item.type}-${item.id}`} padding="small">
            <s-button onClick={() => void loadCheckout(item)} loading={loadingId === item.id}>
              {item.customerName}
            </s-button>
          </s-box>
        ))}
      </s-scroll-box>
    </s-page>
  );
}
