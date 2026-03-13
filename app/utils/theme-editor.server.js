import process from "node:process";
import { Buffer } from "node:buffer";
import db from "../db.server";

const GET_MAIN_THEME_ID_QUERY = `#graphql
  query GetMainThemeId {
    themes(first: 1, roles: [MAIN]) {
      nodes {
        id
      }
    }
  }
`;

const GET_THEME_FILES_QUERY = `#graphql
  query GetThemeFiles($themeId: ID!, $filenames: [String!]!) {
    theme(id: $themeId) {
      files(filenames: $filenames) {
        nodes {
          filename
          body {
            ... on OnlineStoreThemeFileBodyText {
              content
            }
            ... on OnlineStoreThemeFileBodyBase64 {
              contentBase64
            }
          }
        }
        userErrors {
          code
          filename
        }
      }
    }
  }
`;

function getStoreHandle(shop) {
  return shop.replace(/\.myshopify\.com$/i, "");
}

function extractNumericId(gid) {
  if (!gid) return null;
  const match = String(gid).match(/\/(\d+)$/);
  return match?.[1] || null;
}

function getFileContent(file) {
  if (!file?.body) return null;
  if (typeof file.body.content === "string") return file.body.content;
  if (typeof file.body.contentBase64 === "string") {
    return Buffer.from(file.body.contentBase64, "base64").toString("utf8");
  }
  return null;
}

function parseJsonContent(content) {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function findMainSection(templateJson) {
  const sections = templateJson?.sections;
  if (!sections || typeof sections !== "object") return null;

  const entries = Object.entries(sections);
  return (
    entries.find(([id]) => id === "main") ||
    entries.find(([, section]) => typeof section?.type === "string" && section.type.startsWith("main-")) ||
    entries.find(([, section]) => typeof section?.type === "string" && section.type.includes("product")) ||
    null
  );
}

function sectionSupportsAppBlocks(sectionSource) {
  if (!sectionSource) return false;
  const schemaMatch = sectionSource.match(
    /\{%\s+schema\s+%}([\s\S]*?)\{%\s+endschema\s+%}/m,
  );
  if (!schemaMatch?.[1]) return false;

  try {
    const schema = JSON.parse(schemaMatch[1]);
    return Array.isArray(schema?.blocks)
      ? schema.blocks.some((block) => block?.type === "@app")
      : false;
  } catch {
    return false;
  }
}

async function getPreviewProductHandle(shop) {
  const product = await db.comboBoxProduct.findFirst({
    where: {
      productHandle: { not: null },
      box: {
        shop,
        deletedAt: null,
        isActive: true,
      },
    },
    orderBy: [{ boxId: "asc" }, { id: "asc" }],
    select: {
      productHandle: true,
    },
  });

  return product?.productHandle || null;
}

async function getThemeEditorContext(admin) {
  const themeResponse = await admin.graphql(GET_MAIN_THEME_ID_QUERY);
  const themeJson = await themeResponse.json();
  const themeId = themeJson?.data?.themes?.nodes?.[0]?.id || null;

  if (!themeId) {
    return {
      themeNumericId: null,
      sectionTarget: "newAppsSection",
    };
  }

  const templateFilesResponse = await admin.graphql(GET_THEME_FILES_QUERY, {
    variables: {
      themeId,
      filenames: ["templates/product.json"],
    },
  });
  const templateFilesJson = await templateFilesResponse.json();
  const templateFile = templateFilesJson?.data?.theme?.files?.nodes?.[0] || null;
  const templateContent = getFileContent(templateFile);
  const templateJsonContent = parseJsonContent(templateContent);
  const mainSection = findMainSection(templateJsonContent);

  if (!mainSection) {
    return {
      themeNumericId: extractNumericId(themeId),
      sectionTarget: "newAppsSection",
    };
  }

  const [sectionId, sectionConfig] = mainSection;
  const sectionType = sectionConfig?.type;

  if (!sectionType) {
    return {
      themeNumericId: extractNumericId(themeId),
      sectionTarget: "newAppsSection",
    };
  }

  const sectionFilesResponse = await admin.graphql(GET_THEME_FILES_QUERY, {
    variables: {
      themeId,
      filenames: [`sections/${sectionType}.liquid`],
    },
  });
  const sectionFilesJson = await sectionFilesResponse.json();
  const sectionFile = sectionFilesJson?.data?.theme?.files?.nodes?.[0] || null;
  const sectionContent = getFileContent(sectionFile);

  return {
    themeNumericId: extractNumericId(themeId),
    sectionTarget: sectionSupportsAppBlocks(sectionContent)
      ? `sectionId:${sectionId}`
      : "newAppsSection",
  };
}

export async function buildThemeEditorUrl({ shop, admin }) {
  const storeHandle = getStoreHandle(shop);
  const apiKey = process.env.SHOPIFY_API_KEY?.trim();
  const [previewProductHandle, themeContext] = await Promise.all([
    getPreviewProductHandle(shop),
    getThemeEditorContext(admin),
  ]);

  const themeIdSegment = themeContext.themeNumericId || "current";
  const destination = new URL(
    `https://admin.shopify.com/store/${storeHandle}/themes/${themeIdSegment}/editor`,
  );

  destination.searchParams.set("template", "product");

  if (previewProductHandle) {
    destination.searchParams.set("previewPath", `/products/${previewProductHandle}`);
  }

  if (apiKey) {
    destination.searchParams.set("addAppBlockId", `${apiKey}/combo-builder`);
    destination.searchParams.set("target", themeContext.sectionTarget || "newAppsSection");
  }

  return destination.toString();
}
