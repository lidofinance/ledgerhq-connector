import invariant from 'tiny-invariant';
import { AbstractConnector } from '@web3-react/abstract-connector';
import { isHIDSupported } from './helpers';

import type { LedgerHQProvider }  from './provider';
import type { ConnectorUpdate } from '@web3-react/types';

type LedgerHQConnectorArguments = {
  chainId: number;
  url: string;
};

export class LedgerHQConnector extends AbstractConnector {
  public provider?: LedgerHQProvider;
  public url: string;
  public chainId: number;

  constructor({ chainId, url }: LedgerHQConnectorArguments) {
    super({ supportedChainIds: [chainId] });

    this.chainId = chainId;
    this.url = url;

    this.handleNetworkChanged = this.handleNetworkChanged.bind(this);
    this.handleChainChanged = this.handleChainChanged.bind(this);
    this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
    this.handleClose = this.handleClose.bind(this);
  }

  private handleNetworkChanged(networkId: string): void {
    this.emitUpdate({ provider: this.provider, chainId: networkId });
  }

  private handleChainChanged(chainId: string): void {
    this.emitUpdate({ chainId });
  }

  private handleAccountsChanged(accounts: string[]): void {
    this.emitUpdate({ account: accounts.length === 0 ? null : accounts[0] });
  }

  private handleClose(): void {
    this.emitDeactivate();
  }

  public isSupported(): boolean {
    return isHIDSupported()
  }

  public async getProviderInstance(): Promise<LedgerHQProvider> {
    const { LedgerHQProvider } = await import('./provider');
    const Provider = new LedgerHQProvider(this.url, this.chainId);

    return Provider;
  }

  public async activate(): Promise<ConnectorUpdate> {
    if (!this.provider) {
      this.provider = await this.getProviderInstance()
    }

    this.provider.on('networkChanged', this.handleNetworkChanged);
    this.provider.on('chainChanged', this.handleChainChanged);
    this.provider.on('accountsChanged', this.handleAccountsChanged);
    this.provider.on('close', this.handleClose);

    const account = await this.getAccount();

    return { provider: this.provider, account };
  }

  public async getProvider(): Promise<LedgerHQProvider | undefined> {
    return this.provider;
  }

  public async getChainId(): Promise<number> {
    return this.chainId;
  }

  public async getAccount(): Promise<string> {
    invariant(this.provider, 'Provider is not defined');

    return this.provider.getAddress();
  }

  public deactivate(): void {
    invariant(this.provider, 'Provider is not defined');

    this.provider.removeListener('networkChanged', this.handleNetworkChanged);
    this.provider.removeListener('chainChanged', this.handleChainChanged);
    this.provider.removeListener('accountsChanged', this.handleAccountsChanged);
    this.provider.removeListener('close', this.handleClose);
  }
}

export default LedgerHQConnector