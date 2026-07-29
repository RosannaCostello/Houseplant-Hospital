import "@shopify/ui-extensions/preact";
import { render } from "preact";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  return (
    <s-tile
      heading="Houseplant Hospital"
      subheading="Load pending payment"
      onClick={() => shopify.action.presentModal()}
    />
  );
}
