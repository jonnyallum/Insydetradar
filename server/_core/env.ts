export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // Broker
  alpacaApiKey: process.env.ALPACA_API_KEY ?? "",
  alpacaSecretKey: process.env.ALPACA_SECRET_KEY ?? "",
  alpacaPaper: process.env.ALPACA_PAPER !== "false",

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
};
