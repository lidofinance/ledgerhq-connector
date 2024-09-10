# ⚠️ DEPRECATION WARNING ⚠️
### The ledger connector for web3-react is not maintained anymore.
### The ledger connector for wagmi can be found in the [reef-knot package](https://github.com/lidofinance/reef-knot/tree/main/packages/connectors/ledger-connector) and continues to be supported and developed there.

# Ledger connector

Connector for [web3-react](https://github.com/NoahZinsmeister/web3-react) based on `@ledgerhq/hw-transport-webhid`

## Install

```bash
yarn add web3-ledgerhq-connector
```

## Arguments

```ts
new LedgerHQConnector({
  chainId: number,
  url: string,
});
```

## Example

```ts
import { LedgerHQConnector } from 'web3-ledgerhq-connector';

const LedgerHQFrame = new LedgerHQConnector({
  chainId: 1,
  url: 'https://your.rpc/endpoint',
});
```
