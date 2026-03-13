import { authenticate } from "../shopify.server";
import { buildThemeEditorUrl } from "../utils/theme-editor.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  return Response.redirect(
    await buildThemeEditorUrl({ shop: session.shop, admin }),
    302,
  );
};

export default function OpenThemeEditorRoute() {
  return null;
}
