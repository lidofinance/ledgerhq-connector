import type Transport from '@ledgerhq/hw-transport';
import type TransportWebHID from '@ledgerhq/hw-transport-webhid';

let hidCache: typeof TransportWebHID;

const hidWrapper = Object.freeze({
  async create(): Promise<Transport> {
    if (hidCache) return hidCache.create();

    if (!hidCache) {
      const hid = await import('@ledgerhq/hw-transport-webhid');
      hidCache = hid.default;
    }

    return hidCache.create();
  },
});

export const transports = Object.freeze({
  hid: hidWrapper,
  default: hidWrapper,
});
