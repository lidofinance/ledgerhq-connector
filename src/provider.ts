import invariant from 'tiny-invariant';
import { JsonRpcBatchProvider, Network } from '@ethersproject/providers';
import { TransactionRequest } from '@ethersproject/providers';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { LedgerHQSigner } from './signer';
import { checkError, hasEIP1559 } from './helpers';

import type TransportHID from '@ledgerhq/hw-transport-webhid';

export class LedgerHQProvider extends JsonRpcBatchProvider {
  public signer?: LedgerHQSigner;
  public device?: HIDDevice;
  public transport?: typeof TransportHID;

  getSigner(): LedgerHQSigner {
    return new LedgerHQSigner(this);
  }

  listAccounts(): Promise<Array<string>> {
    throw new Error('method is not implemented');
  }

  async detectNetwork(): Promise<Network> {
    return this._network;
  }

  async getTransport(): Promise<TransportHID> {
    invariant(this.transport, 'Transport is not defined');

    try {
      const transport = (await this.transport?.create()) as TransportHID;
      this.device = transport.device;

      return transport;
    } catch (error) {
      return checkError(error);
    }
  }

  async enable(): Promise<string> {
    try {
      const { default: TransportHID } = await import(
        '@ledgerhq/hw-transport-webhid'
      );
      this.transport = TransportHID;

      const { hid } = window.navigator;

      const onDisconnect = (event: HIDConnectionEvent) => {
        if (this.device === event.device) {
          hid.removeEventListener('disconnect', onDisconnect);
          this.emit('disconnect');
        }
      };

      hid.addEventListener('disconnect', onDisconnect);

      if (!this.signer) {
        this.signer = this.getSigner();
      }

      return await this.getAddress();
    } catch (error) {
      return checkError(error);
    }
  }

  async getAddress(): Promise<string> {
    invariant(this.signer, 'Signer is not defined');
    return await this.signer.getAddress();
  }

  async request({
    method,
    params,
  }: {
    method: string;
    params: Array<unknown>;
  }): Promise<unknown> {
    invariant(this.signer, 'Signer is not defined');

    if (method === 'eth_sendTransaction') {
      const unsignedTx = params[0] as TransactionRequest & {
        gas?: BigNumberish;
      };

      const baseTx: TransactionRequest = {
        chainId: unsignedTx.chainId,
        data: unsignedTx.data,
        gasLimit: unsignedTx.gasLimit || unsignedTx.gas,
        gasPrice: unsignedTx.gasPrice,
        nonce: unsignedTx.nonce
          ? BigNumber.from(unsignedTx.nonce).toNumber()
          : undefined,
        to: unsignedTx.to,
        value: unsignedTx.value,
        type: unsignedTx.type || 0,
      };

      if (hasEIP1559(unsignedTx)) {
        baseTx.maxFeePerGas = unsignedTx.maxFeePerGas;
        baseTx.maxPriorityFeePerGas = unsignedTx.maxPriorityFeePerGas;
        baseTx.type = 2;
      }

      const signedTx = await this.signer.signTransaction(baseTx);

      return this.send('eth_sendRawTransaction', [signedTx]);
    }

    if (method === 'eth_accounts') return [await this.getAddress()];

    return this.send(method, params);
  }
}
