# Ledger connector

Connector for [web3-react](https://github.com/NoahZinsmeister/web3-react) based on `@ledgerhq/hw-transport-webhid`

## Install

```bash
yarn add web3-ledgerhq-connector
```

## Arguments

```ts
new LedgerHQConnector({
  chainId: number;
  url: string;
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
