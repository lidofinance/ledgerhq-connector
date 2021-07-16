import { JsonRpcProvider, Network } from '@ethersproject/providers';
import { TransactionRequest } from '@ethersproject/providers';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { LedgerHQSigner } from './signer';

export class LedgerHQProvider extends JsonRpcProvider {
  constructor(...args: ConstructorParameters<typeof JsonRpcProvider>) {
    super(...args);
  }

  public signer?: LedgerHQSigner;

  getSigner(): LedgerHQSigner {
    return new LedgerHQSigner(this);
  }

  listAccounts(): Promise<Array<string>> {
    throw new Error('method is not implemented');
  }

  async detectNetwork(): Promise<Network> {
    return this._network;
  }

  async getAddress(): Promise<string> {
    if (!this.signer) {
      this.signer = this.getSigner();
    }

    return await this.signer.getAddress();
  }

  async request({
    method,
    params,
  }: {
    method: string;
    params: Array<unknown>;
  }): Promise<unknown> {
    if (method === 'eth_sendTransaction') {
      const signer = this.getSigner();
      const unsignedTx = params[0] as TransactionRequest & {
        gas?: BigNumberish;
      };

      const baseTx = {
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

      const populatedTx = await signer.populateTransaction(baseTx);
      const signedTx = await signer.signTransaction(populatedTx);

      return this.send('eth_sendRawTransaction', [signedTx]);
    }

    if (method === 'eth_chainId') return this._network.chainId;
    if (method === 'eth_accounts') return [await this.getAddress()];

    return this.send(method, params);
  }
}
