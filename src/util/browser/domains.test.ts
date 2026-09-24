import { describe, expect, test } from 'vitest';

import { isOfficialTelegramDomain } from './domains';

describe('Official Telegram domain check', () => {
  test.each([
    ['web.telegram.org', true],
    ['telegram.org', true],
    ['webk.telegram.org', true],
    ['weba-staging.telegram.org', true],
    ['tgweb.alexa.dpdns.org', false],
    ['localhost', false],
    ['127.0.0.1', false],
    ['webtelegram.org', false],
    ['evil-telegram.org', false],
    ['telegram.org.evil.com', false],
    ['fake.web.telegram.org.evil.com', false],
  ])('"%s" is an official domain: %s', (hostname, expected) => {
    expect(isOfficialTelegramDomain(hostname)).toBe(expected);
  });

  test('falls back to false without a hostname', () => {
    expect(isOfficialTelegramDomain(undefined)).toBe(false);
  });

  test('checks the current location by default', () => {
    // The test environment is served from localhost
    expect(isOfficialTelegramDomain()).toBe(false);
  });
});
