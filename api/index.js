import { createRequestHandler } from "@react-router/node";

// build/server/index.js is included via vercel.json includeFiles
export default createRequestHandler(
  () => import("../build/server/index.js"),
  process.env.NODE_ENV || "production"
);
