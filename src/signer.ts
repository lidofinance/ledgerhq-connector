import Eth from '@ledgerhq/hw-app-eth';
import ledgerService from '@ledgerhq/hw-app-eth/lib/services/ledger';
import {
  LoadConfig,
  ResolutionConfig,
} from '@ledgerhq/hw-app-eth/lib/services/types';
import { JsonRpcSigner, TransactionRequest } from '@ethersproject/providers';
import { BigNumber } from '@ethersproject/bignumber';
import { Signer, TypedDataSigner } from '@ethersproject/abstract-signer';
import { resolveProperties } from '@ethersproject/properties';
import { UnsignedTransaction, serialize } from '@ethersproject/transactions';
import { toUtf8Bytes } from '@ethersproject/strings';
import { Bytes, hexlify, joinSignature } from '@ethersproject/bytes';
import { LedgerHQProvider } from './provider';
import { checkError, hasEIP1559 } from './helpers';

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

  async signTransaction(
    transaction: TransactionRequest,
    loadConfig: LoadConfig = {},
    resolutionConfig: ResolutionConfig = {},
  ): Promise<string> {
    const tx = await resolveProperties(transaction);

    const baseTx: UnsignedTransaction = {
      chainId: tx.chainId,
      data: tx.data,
      gasLimit: tx.gasLimit,
      gasPrice: tx.gasPrice,
      nonce: tx.nonce == null ? undefined : BigNumber.from(tx.nonce).toNumber(),
      to: tx.to,
      value: tx.value,
      type: tx.type == null ? undefined : BigNumber.from(tx.type).toNumber(),
    };

    if (hasEIP1559(tx)) {
      baseTx.maxFeePerGas = tx.maxFeePerGas;
      baseTx.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
      baseTx.type = 2;
    }

    const unsignedTx = serialize(baseTx).substring(2);
    const resolution = await ledgerService.resolveTransaction(
      unsignedTx,
      loadConfig,
      resolutionConfig,
    );

    const sig = await this.withEthApp((eth) =>
      eth.signTransaction(this.path, unsignedTx, resolution),
    );

    return serialize(baseTx, {
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
