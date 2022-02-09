import Eth from '@ledgerhq/hw-app-eth';
import ledgerService from '@ledgerhq/hw-app-eth/lib/services/ledger';
import {
  LoadConfig,
  ResolutionConfig,
} from '@ledgerhq/hw-app-eth/lib/services/types';
import { JsonRpcSigner, TransactionRequest } from '@ethersproject/providers';
import { BigNumber } from '@ethersproject/bignumber';
import { Signer, TypedDataSigner } from '@ethersproject/abstract-signer';
import { UnsignedTransaction, serialize } from '@ethersproject/transactions';
import { toUtf8Bytes } from '@ethersproject/strings';
import { Bytes, hexlify, joinSignature } from '@ethersproject/bytes';
import { LedgerHQProvider } from './provider';
import { checkError, convertToUnsigned, toNumber } from './helpers';
import { UnsignedTransactionStrict } from './types';

const defaultPath = "m/44'/60'/0'/0/0";

export class LedgerHQSigner extends Signer implements TypedDataSigner {
  readonly path: string;
  readonly provider: LedgerHQProvider;

  _index = 0;
  _address = '';

  constructor(provider: LedgerHQProvider, path: string = defaultPath) {
    super();

    this.path = path;
    this.provider = provider;
  }

  async withEthApp<T extends unknown>(callback: (eth: Eth) => T): Promise<T> {
    const transport = await this.provider.getTransport();

    try {
      const eth = new Eth(transport);
      await eth.getAppConfiguration();

      return await callback(eth);
    } catch (error) {
      return checkError(error);
    } finally {
      await transport.close();
    }
  }

  async getAddress(): Promise<string> {
    if (!this._address) {
      const account = await this.withEthApp((eth) => eth.getAddress(this.path));

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
    const sig = await this.withEthApp((eth) =>
      eth.signPersonalMessage(this.path, messageHex),
    );

    sig.r = '0x' + sig.r;
    sig.s = '0x' + sig.s;

    return joinSignature(sig);
  }

  async populateUnsigned(
    transaction: UnsignedTransactionStrict,
  ): Promise<UnsignedTransaction> {
    const populated = await this.populateTransaction(transaction);
    const nonce = toNumber(populated.nonce);

    if (populated.type === 0) {
      const { gasLimit, type, chainId, gasPrice, value, data, to } = populated;

      // Allowed transaction keys for Legacy and EIP-155 Transactions
      return { gasLimit, type, chainId, gasPrice, nonce, value, data, to };
    }

    return { ...populated, nonce };
  }

  async signTransaction(
    transaction: TransactionRequest,
    loadConfig: LoadConfig = {},
    resolutionConfig: ResolutionConfig = {},
  ): Promise<string> {
    const unsignedTx = await convertToUnsigned(transaction);
    const populatedTx = await this.populateUnsigned(unsignedTx);

    const serializedTx = serialize(populatedTx).substring(2);
    const resolution = await ledgerService.resolveTransaction(
      serializedTx,
      loadConfig,
      resolutionConfig,
    );

    const sig = await this.withEthApp((eth) =>
      eth.signTransaction(this.path, serializedTx, resolution),
    );

    return serialize(populatedTx, {
      v: BigNumber.from('0x' + sig.v).toNumber(),
      r: '0x' + sig.r,
      s: '0x' + sig.s,
    });
  }

  connect(provider: LedgerHQProvider): JsonRpcSigner {
    return new LedgerHQSigner(provider, this.path);
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

  async _legacySignMessage(message: Bytes | string): Promise<string> {
    throw new Error('method is not implemented');
  }

  async _signTypedData(): Promise<string> {
    throw new Error('method is not implemented');
  }
}
