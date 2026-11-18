import { allowedOrigins } from "./cors.config.js";

export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...allowedOrigins, "https://*.supabase.co"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: process.env.NODE_ENV === "production"
    ? { maxAge: 15552000, includeSubDomains: true }
    : false,
};
