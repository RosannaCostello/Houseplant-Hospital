import "@shopify/ui-extensions/preact";
import { render } from "preact";

const API_BASE = "https://YOUR_HH_DOMAIN";
const API_SECRET = "YOUR_CRON_SECRET";

type PendingCheckout = {
  id: string;
  type: "draft" | "visit";
  customerName: string;
  summary?: string;
  lineItems: Array<{
    variantId: string;
    quantity: number;
    properties: Array<{ name: string; value: string }>;
  }>;
  shopifyCustomerId: string | null;
  cartNote: string;
};

async function fetchPending(): Promise<PendingCheckout[]> {
  const response = await fetch(`${API_BASE}/api/shopify/pos/pending`, {
    headers: { Authorization: `Bearer ${API_SECRET}` },
  });

  if (!response.ok) {
    throw new Error(`Pending checkouts failed (${response.status})`);
  }

  const json = (await response.json()) as {
    pending: Array<PendingCheckout & { queuedAt: string }>;
  };

  return json.pending;
}

export default function extension() {
  render(<Tile />, document.body);
}

function Tile() {
  return (
    <s-tile
      heading="Houseplant Hospital"
      subheading="Load check-in cart"
      onClick={() => shopify.action.presentModal()}
    />
  );
}

export function Modal() {
  return <PendingList />;
}

function PendingList() {
  const [pending, setPending] = useState<PendingCheckout[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchPending()
      .then(setPending)
      .catch((err: Error) => setError(err.message));
  }, []);

  async function loadCheckout(item: PendingCheckout) {
    setLoadingId(item.id);
    setError(null);

    try {
      await shopify.cart.bulkCartUpdate({
        note: item.cartNote,
        lineItems: item.lineItems.map((line) => ({
          variantId: Number(line.variantId),
          quantity: line.quantity,
          properties: Object.fromEntries(line.properties.map((p) => [p.name, p.value])),
        })),
        customerId: item.shopifyCustomerId ? Number(item.shopifyCustomerId) : undefined,
      });

      await fetch(`${API_BASE}/api/shopify/pos/pending`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: item.type, id: item.id }),
      });

      shopify.toast.show("Cart loaded");
      shopify.action.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load cart");
    } finally {
      setLoadingId(null);
    }
  }

  if (error) {
    return (
      <s-page heading="Houseplant Hospital">
        <s-text>{error}</s-text>
      </s-page>
    );
  }

  if (pending.length === 0) {
    return (
      <s-page heading="Houseplant Hospital">
        <s-text>No pending check-ins.</s-text>
      </s-page>
    );
  }

  return (
    <s-page heading="Pending check-ins">
      {pending.map((item) => (
        <s-button
          key={`${item.type}-${item.id}`}
          onClick={() => void loadCheckout(item)}
          loading={loadingId === item.id}
        >
          {item.customerName}
        </s-button>
      ))}
    </s-page>
  );
}

// Minimal hooks for scaffold — replace with @shopify/ui-extensions imports in real app
function useState<T>(initial: T): [T, (value: T) => void] {
  const ref = { current: initial };
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  return [
    ref.current,
    (value: T) => {
      ref.current = value;
      rerender();
    },
  ];
}

function useEffect(effect: () => void, deps: unknown[]) {
  void deps;
  effect();
}

function useReducer(reducer: (state: number) => number, initial: number) {
  return [initial, () => undefined] as const;
}
