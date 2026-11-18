import { allowedOrigins } from "./cors.config.js";
import { appConfig } from "./app.config.js";

export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...allowedOrigins, "https://*.supabase.co"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: appConfig.isProduction
    ? { maxAge: 15552000, includeSubDomains: true }
    : false,
};
