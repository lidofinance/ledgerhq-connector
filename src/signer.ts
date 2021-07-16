import Eth from '@ledgerhq/hw-app-eth';
import { JsonRpcSigner, TransactionRequest } from '@ethersproject/providers';
import { BigNumber } from '@ethersproject/bignumber';
import { Signer } from '@ethersproject/abstract-signer';
import { resolveProperties } from '@ethersproject/properties';
import { UnsignedTransaction, serialize } from '@ethersproject/transactions';
import { toUtf8Bytes } from '@ethersproject/strings';
import { Bytes, hexlify, joinSignature } from '@ethersproject/bytes';
import { transports } from './transport';
import { LedgerHQProvider } from './provider';

const defaultPath = "m/44'/60'/0'/0/0";

export class LedgerHQSigner extends Signer {
  readonly type: keyof typeof transports;
  readonly path: string;
  readonly provider: LedgerHQProvider;

  _index = 0;
  _address = '';

  constructor(
    provider: LedgerHQProvider,
    type: keyof typeof transports = 'default',
    path: string = defaultPath,
  ) {
    super();

    this.path = path;
    this.type = type;
    this.provider = provider;
  }

  async withEthApp<T extends unknown>(callback: (eth: Eth) => T): Promise<T> {
    const transport = await transports[this.type].create();

    try {
      const eth = new Eth(transport);
      await eth.getAppConfiguration();

      return await callback(eth);
    } finally {
      await transport.close();
    }
  }

  async getAddress(): Promise<string> {
    if (!this._address) {
      const account = await this.withEthApp(eth => eth.getAddress(this.path));

      const address = this.provider.formatter.address(account.address);
      this._address = address;
    }

    return this._address;
  }

  async signMessage(message: Bytes | string): Promise<string> {
    if (typeof message === 'string') {
      message = toUtf8Bytes(message);
    }

    const messageHex = hexlify(message).substring(2);
    const sig = await this.withEthApp(eth =>
      eth.signPersonalMessage(this.path, messageHex),
    );

    sig.r = '0x' + sig.r;
    sig.s = '0x' + sig.s;

    return joinSignature(sig);
  }

  async signTransaction(transaction: TransactionRequest): Promise<string> {
    const tx = await resolveProperties(transaction);

    const baseTx: UnsignedTransaction = {
      chainId: tx.chainId,
      data: tx.data,
      gasLimit: tx.gasLimit,
      gasPrice: tx.gasPrice,
      nonce: tx.nonce ? BigNumber.from(tx.nonce).toNumber() : undefined,
      to: tx.to,
      value: tx.value,
    };

    const unsignedTx = serialize(baseTx).substring(2);
    const sig = await this.withEthApp(eth =>
      eth.signTransaction(this.path, unsignedTx),
    );

    return serialize(baseTx, {
      v: BigNumber.from('0x' + sig.v).toNumber(),
      r: '0x' + sig.r,
      s: '0x' + sig.s,
    });
  }

  connect(provider: LedgerHQProvider): JsonRpcSigner {
    return new LedgerHQSigner(provider, this.type, this.path);
  }

  connectUnchecked(): JsonRpcSigner {
    throw new Error('method is not implemented');
  }

  sendUncheckedTransaction(): Promise<string> {
    throw new Error('method is not implemented');
  }

  async unlock(): Promise<boolean> {
    throw new Error('method is not implemented');
  }

  _signTypedData(): Promise<string> {
    throw new Error('method is not implemented');
  }
}
