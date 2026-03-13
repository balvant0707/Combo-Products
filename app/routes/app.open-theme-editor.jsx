import process from "node:process";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { redirect } = await authenticate.admin(request);
  const apiKey = process.env.SHOPIFY_API_KEY?.trim();
  const destination = new URL("shopify://admin/themes/current/editor");
  destination.searchParams.set("template", "product");

  if (apiKey) {
    destination.searchParams.set("addAppBlockId", `${apiKey}/combo-builder`);
    destination.searchParams.set("target", "mainSection");
  }

  return redirect(destination.toString(), { target: "_top" });
};

export default function OpenThemeEditorRoute() {
  return null;
}
