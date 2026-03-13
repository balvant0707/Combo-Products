import process from "node:process";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const apiKey = process.env.SHOPIFY_API_KEY?.trim();
  const destination = new URL(`https://${session.shop}/admin/themes/current/editor`);
  destination.searchParams.set("template", "product");

  if (apiKey) {
    destination.searchParams.set("addAppBlockId", `${apiKey}/combo-builder`);
    destination.searchParams.set("target", "mainSection");
  }

  return Response.redirect(destination.toString(), 302);
};

export default function OpenThemeEditorRoute() {
  return null;
}
