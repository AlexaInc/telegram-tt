import type { SharedState } from '../types';
import type { ClientBoundMessageEvent, WorkerBoundMessageEvent } from './sharedWorker';

import { deepFreeze } from '../../util/data/freeze';
import { deepDiff } from '../../util/deepDiff';
import { deepMerge } from '../../util/deepMerge';

declare const self: SharedWorkerGlobalScope;

const PASSCODE_NAVIGATION_DEK_LIFETIME_MS = 8000;

type PasscodeNavigationDek = {
  dek: ArrayBuffer;
  expiresAt: number;
  generation: string;
};

let state: SharedState | undefined;
let passcodeNavigationDek: PasscodeNavigationDek | undefined;
let clearPasscodeNavigationDekTimeout: number | undefined;

const ports: MessagePort[] = [];

self.onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  ports.push(port);
  port.start();

  port.onmessage = (event: MessageEvent<WorkerBoundMessageEvent>) => {
    const data = event.data;
    switch (data.type) {
      case 'reqGetFullState': {
        const localState = data.localState;
        if (!state) {
          // First tab to load, use this state as the source of truth.
          state = localState;
        }
        sendToClient(port, { type: 'fullState', state });
        break;
      }

      case 'reqUpdateState': {
        if (!state) return; // Client should request full state first
        const prevState = state;
        state = deepMerge(state, data.update as SharedState);
        state.isInitial = undefined; // Remove the flag

        const diff = deepDiff(prevState, state);
        if (typeof diff !== 'symbol') {
          broadcast({ type: 'stateUpdate', update: diff }, port);
        }
        break;
      }

      case 'retainPasscodeNavigationDek': {
        retainPasscodeNavigationDek(data.dek, data.generation);
        break;
      }

      case 'requestPasscodeNavigationDek': {
        sendToClient(port, {
          type: 'passcodeNavigationDek',
          dek: getPasscodeNavigationDek(data.generation),
          generation: data.generation,
        });
        break;
      }

      case 'clearPasscodeNavigationDek': {
        clearPasscodeNavigationDek(data.generation);
        break;
      }

      case 'resetSharedState': {
        state = undefined;
        break;
      }
    }
  };
};

function retainPasscodeNavigationDek(dek: ArrayBuffer, generation: string) {
  clearPasscodeNavigationDek();
  passcodeNavigationDek = {
    dek,
    expiresAt: Date.now() + PASSCODE_NAVIGATION_DEK_LIFETIME_MS,
    generation,
  };
  clearPasscodeNavigationDekTimeout = self.setTimeout(
    clearPasscodeNavigationDek,
    PASSCODE_NAVIGATION_DEK_LIFETIME_MS,
  );
}

function getPasscodeNavigationDek(generation: string) {
  if (!passcodeNavigationDek) return undefined;
  if (passcodeNavigationDek.expiresAt <= Date.now()) {
    clearPasscodeNavigationDek();
    return undefined;
  }
  if (passcodeNavigationDek.generation !== generation) return undefined;

  return passcodeNavigationDek.dek;
}

function clearPasscodeNavigationDek(generation?: string) {
  if (generation && passcodeNavigationDek?.generation !== generation) return;

  passcodeNavigationDek = undefined;
  if (clearPasscodeNavigationDekTimeout !== undefined) {
    self.clearTimeout(clearPasscodeNavigationDekTimeout);
    clearPasscodeNavigationDekTimeout = undefined;
  }
}

function sendToClient(port: MessagePort, message: ClientBoundMessageEvent) {
  port.postMessage(message);
}

function broadcast(message: ClientBoundMessageEvent, ignorePort?: MessagePort) {
  // Iterate backwards to safely remove ports if needed.
  for (let i = ports.length - 1; i >= 0; i--) {
    if (ports[i] === ignorePort) { // Prevent infinite loopback
      continue;
    }

    try {
      sendToClient(ports[i], message);
    } catch (e) {
      ports.splice(i, 1);
    }
  }
}

// DEBUG
(self as any).getState = () => deepFreeze(state);
