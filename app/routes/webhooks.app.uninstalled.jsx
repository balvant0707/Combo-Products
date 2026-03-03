import { authenticate } from "../shopify.server";
import db from "../db.server";
import { markShopUninstalled } from "../models/shop.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  await markShopUninstalled(shop);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // Deleting by shop keeps this idempotent even when webhook retries happen.
  await db.session.deleteMany({ where: { shop } });

  return new Response();
};
