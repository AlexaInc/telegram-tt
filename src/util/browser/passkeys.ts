import type { ApiPasskeyOption, ApiPasskeyRegistrationOption } from '../../api/types';

import { IS_WEBAUTHN_SIGNAL_API_SUPPORTED } from './windowEnvironment';

export function toCredentialCreationOptions(option: ApiPasskeyRegistrationOption): CredentialCreationOptions {
  const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(option.publicKey);

  return {
    publicKey,
  };
}

export function toCredentialRequestOptions(option: ApiPasskeyOption): CredentialRequestOptions {
  const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(option.publicKey);

  return {
    publicKey,
  };
}

// WebAuthn requires the origin to be equal to the RP ID or one of its subdomains,
// so passkeys issued for other domains (e.g. `web.telegram.org`) cannot be used
export function isPasskeyRpIdMatchingOrigin(option: ApiPasskeyOption): boolean {
  const rpId = option.publicKey.rpId;

  // Without an RP ID the browser falls back to the current domain
  if (!rpId) return true;

  const hostname = window.location.hostname;

  return hostname === rpId || hostname.endsWith(`.${rpId}`);
}

export function signalUnknownPasskey(credentialId: string) {
  if (!IS_WEBAUTHN_SIGNAL_API_SUPPORTED) return;

  void PublicKeyCredential.signalUnknownCredential({
    rpId: window.location.hostname,
    credentialId,
  }).catch(() => undefined);
}
