import { listBoxes } from "../models/boxes.server";
import { getSettings } from "../models/settings.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return Response.json({ error: "shop parameter required" }, { status: 400, headers: CORS_HEADERS });
  }

  // Use origin for uploaded-banner URLs so the browser can fetch them directly
  const origin = url.origin;

  const [boxes, settings] = await Promise.all([
    listBoxes(shop, true, false),  // bannerImageMimeType still returned to detect uploads
    getSettings(shop),
  ]);

  const publicBoxes = boxes.map((box) => {
    // Prefer external URL; fall back to dedicated binary-serving route for uploads
    let bannerImageUrl = box.bannerImageUrl || null;
    if (!bannerImageUrl && box.bannerImageMimeType) {
      bannerImageUrl = `${origin}/api/storefront/boxes/${box.id}/banner`;
    }
    return {
      id: box.id,
      boxName: box.boxName,
      displayTitle: box.displayTitle,
      itemCount: box.itemCount,
      bundlePrice: parseFloat(box.bundlePrice),
      isGiftBox: box.isGiftBox,
      allowDuplicates: box.allowDuplicates,
      bannerImageUrl,
      giftMessageEnabled: box.giftMessageEnabled,
      shopifyVariantId: box.shopifyVariantId,
      sortOrder: box.sortOrder,
    };
  });

  const publicSettings = {
    widgetHeadingText: settings.widgetHeadingText || null,
    ctaButtonLabel: settings.ctaButtonLabel || null,
    addToCartLabel: settings.addToCartLabel || null,
    buttonColor: settings.buttonColor || "#2A7A4F",
    activeSlotColor: settings.activeSlotColor || "#2A7A4F",
    showSavingsBadge: settings.showSavingsBadge,
    showProductPrices: settings.showProductPrices,
    presetTheme: settings.presetTheme || "custom",
    widgetMaxWidth: settings.widgetMaxWidth ?? 1140,
  };

  return Response.json({ boxes: publicBoxes, settings: publicSettings }, { headers: CORS_HEADERS });
};
