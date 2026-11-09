export const reservedPubSlugs = new Set(["login", "orders"]);
export const isPubSlug = (slug) =>
  typeof slug === "string" &&
  slug.length <= 64 &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
  !reservedPubSlugs.has(slug);
