const OFFICIAL_DOMAIN = 'telegram.org';

/**
 * Returns `true` when the app is served from an official Telegram domain.
 *
 * Used to relax product limits (e.g. the multi-account limit) on custom
 * deployments, which are served from other domains (including `localhost`).
 */
export function isOfficialTelegramDomain(hostname = globalThis.location?.hostname) {
  return hostname === OFFICIAL_DOMAIN || Boolean(hostname?.endsWith(`.${OFFICIAL_DOMAIN}`));
}
