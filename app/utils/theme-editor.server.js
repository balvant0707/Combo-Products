import process from "node:process";

export function buildThemeEditorUrl(shop) {
  const destination = new URL(`https://${shop}/admin/themes/current/editor`);
  const apiKey = process.env.SHOPIFY_API_KEY?.trim();

  destination.searchParams.set("template", "product");

  if (apiKey) {
    destination.searchParams.set("addAppBlockId", `${apiKey}/combo-builder`);
    destination.searchParams.set("target", "mainSection");
  }

  return destination.toString();
}
