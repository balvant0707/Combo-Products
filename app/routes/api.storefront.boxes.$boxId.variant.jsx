import db from "../db.server";
import { unauthenticated } from "../shopify.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const GET_PRODUCT_DEFAULT_VARIANT_QUERY = `#graphql
  query GetProductDefaultVariant($id: ID!) {
    product(id: $id) {
      id
      variants(first: 1) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`;

function toNumericShopifyId(gid) {
  if (!gid) return null;
  const raw = String(gid);
  return raw.includes("/") ? raw.split("/").pop() : raw;
}

export const loader = async ({ request, params }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) {
    return Response.json(
      { error: "shop parameter required" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const boxId = parseInt(params.boxId, 10);
  if (isNaN(boxId)) {
    return Response.json(
      { error: "Invalid box ID" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const box = await db.comboBox.findFirst({
    where: { id: boxId, shop, isActive: true, deletedAt: null },
    select: { id: true, shopifyProductId: true, shopifyVariantId: true },
  });

  if (!box || !box.shopifyProductId) {
    return Response.json(
      { error: "Combo product not linked" },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  try {
    const { admin } = await unauthenticated.admin(shop);
    const resp = await admin.graphql(GET_PRODUCT_DEFAULT_VARIANT_QUERY, {
      variables: { id: box.shopifyProductId },
    });
    const json = await resp.json();
    const freshVariantId =
      json?.data?.product?.variants?.edges?.[0]?.node?.id || null;

    if (!freshVariantId) {
      return Response.json(
        { error: "Variant not found for combo product" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    if (freshVariantId !== box.shopifyVariantId) {
      await db.comboBox.update({
        where: { id: box.id },
        data: { shopifyVariantId: freshVariantId },
      });
    }

    return Response.json(
      {
        shopifyProductId: toNumericShopifyId(box.shopifyProductId),
        shopifyVariantId: toNumericShopifyId(freshVariantId),
      },
      { headers: CORS_HEADERS },
    );
  } catch (e) {
    console.error("[api.storefront.boxes.$boxId.variant] error:", e);
    return Response.json(
      { error: "Failed to resolve combo variant" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};
