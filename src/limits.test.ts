import { describe, expect, test } from 'vitest';

import { MULTIACCOUNT_MAX_SLOTS } from './config';
import { DEFAULT_LIMITS } from './limits';

describe('Default limits', () => {
  test('allows all account slots on non-official domains', () => {
    // The test environment is served from localhost, which is not an official Telegram domain
    expect(DEFAULT_LIMITS.moreAccounts).toEqual([MULTIACCOUNT_MAX_SLOTS, MULTIACCOUNT_MAX_SLOTS]);
  });
});
