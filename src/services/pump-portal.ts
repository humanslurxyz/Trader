import { Connection, Keypair, VersionedTransaction, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import axios from 'axios';
import { config } from '../config.js';

const PUMPPORTAL_API = 'https://pumpportal.fun/api/trade-local';

export interface TradeParams {
  tokenMint: string;
  action: 'buy' | 'sell';
  amount: number;
  denominatedInSol: boolean;
  slippage?: number;
  priorityFee?: number;
}

export class PumpPortalService {
  private connection: Connection;
  private wallet: Keypair;
  
  constructor() {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    
    if (!config.walletPrivateKey) {
      throw new Error('Wallet private key not configured');
    }
    
    try {
      const privateKey = bs58.decode(config.walletPrivateKey);
      this.wallet = Keypair.fromSecretKey(privateKey);
      console.log('💼 Wallet loaded:', this.wallet.publicKey.toString());
    } catch (error) {
      throw new Error('Invalid wallet private key format. Must be base58 encoded.');
    }
  }
  
  async buyToken(tokenMint: string, amountInSol: number): Promise<string> {
    console.log(`🔵 Buying ${amountInSol} SOL worth of ${tokenMint}...`);
    
    try {
      const response = await axios.post(PUMPPORTAL_API, {
        publicKey: this.wallet.publicKey.toString(),
        action: 'buy',
        mint: tokenMint,
        denominatedInSol: 'true',
        amount: amountInSol,
        slippage: config.buySlippage,
        priorityFee: config.priorityFee,
        pool: 'pump'
      }, {
        responseType: 'arraybuffer'
      });
      
      // Deserialize transaction
      const txBuffer = Buffer.from(response.data);
      const tx = VersionedTransaction.deserialize(txBuffer);
      
      // Sign transaction
      tx.sign([this.wallet]);
      
      // Send transaction
      const signature = await this.connection.sendTransaction(tx, {
        skipPreflight: true,
        maxRetries: 3
      });
      
      console.log(`✅ Buy transaction sent: ${signature}`);
      
      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');
      console.log(`✅ Buy confirmed: https://solscan.io/tx/${signature}`);
      
      return signature;
    } catch (error: any) {
      console.error('❌ Buy failed:', error.message);
      throw new Error(`Failed to buy token: ${error.message}`);
    }
  }
  
  async sellToken(tokenMint: string, percentage: number = 100): Promise<string> {
    console.log(`🔴 Selling ${percentage}% of ${tokenMint}...`);
    
    try {
      const response = await axios.post(PUMPPORTAL_API, {
        publicKey: this.wallet.publicKey.toString(),
        action: 'sell',
        mint: tokenMint,
        denominatedInSol: 'false',
        amount: percentage === 100 ? '100%' : percentage.toString(),
        slippage: config.sellSlippage,
        priorityFee: config.priorityFee,
        pool: 'pump'
      }, {
        responseType: 'arraybuffer'
      });
      
      const txBuffer = Buffer.from(response.data);
      const tx = VersionedTransaction.deserialize(txBuffer);
      tx.sign([this.wallet]);
      
      const signature = await this.connection.sendTransaction(tx, {
        skipPreflight: true,
        maxRetries: 3
      });
      
      console.log(`✅ Sell transaction sent: ${signature}`);
      
      await this.connection.confirmTransaction(signature, 'confirmed');
      console.log(`✅ Sell confirmed: https://solscan.io/tx/${signature}`);
      
      return signature;
    } catch (error: any) {
      console.error('❌ Sell failed:', error.message);
      throw new Error(`Failed to sell token: ${error.message}`);
    }
  }
  
  async getTokenBalance(tokenMint: string): Promise<number> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.wallet.publicKey,
        { mint: new PublicKey(tokenMint) }
      );
      
      if (tokenAccounts.value.length === 0) {
        return 0;
      }
      
      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      return balance || 0;
    } catch (error) {
      console.error('Failed to get token balance:', error);
      return 0;
    }
  }
  
  getWalletAddress(): string {
    return this.wallet.publicKey.toString();
  }
}
