import { authenticate } from "../shopify.server";
import { buildThemeEditorUrl } from "../utils/theme-editor.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return Response.redirect(buildThemeEditorUrl(session.shop), 302);
};

export default function OpenThemeEditorRoute() {
  return null;
}
