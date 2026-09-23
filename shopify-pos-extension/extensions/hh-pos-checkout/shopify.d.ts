import '@shopify/ui-extensions';

//@ts-expect-error Shopify POS generated ambient module for Tile.
declare module './src/Tile.jsx' {
  const shopify: import('@shopify/ui-extensions/pos.home.tile.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-expect-error Shopify POS generated ambient module for Modal.
declare module './src/Modal.jsx' {
  const shopify: import('@shopify/ui-extensions/pos.home.modal.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-expect-error Shopify POS generated ambient module for config.
declare module './src/config.js' {
  const shopify: import('@shopify/ui-extensions/pos.home.modal.render').Api;
  const globalThis: { shopify: typeof shopify };
}
