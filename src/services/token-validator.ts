import axios from 'axios';
import { Connection, PublicKey } from '@solana/web3.js';
import { config } from '../config.js';

export interface TokenValidation {
  isValid: boolean;
  riskScore: number; // 0-10, higher = riskier
  liquidity: number;
  marketCap: number;
  holderCount: number;
  topHolderPercent: number;
  hasLiquidityLock: boolean;
  canMint: boolean;
  canFreeze: boolean;
  reasons: string[];
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
}

export class TokenValidator {
  private connection: Connection;
  
  constructor() {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
  }
  
  async validateToken(tokenMint: string): Promise<TokenValidation> {
    console.log(`🔍 Validating token: ${tokenMint}`);
    
    const reasons: string[] = [];
    let riskScore = 0;
    
    try {
      // Get token metadata from Helius
      const metadata = await this.getTokenMetadata(tokenMint);
      
      // Get market data from DEX Screener
      const marketData = await this.getMarketData(tokenMint);
      
      // Check mint authority
      const mintInfo = await this.connection.getParsedAccountInfo(new PublicKey(tokenMint));
      const mintData = mintInfo.value?.data;
      
      let canMint = false;
      let canFreeze = false;
      
      if (mintData && 'parsed' in mintData) {
        canMint = mintData.parsed.info.mintAuthority !== null;
        canFreeze = mintData.parsed.info.freezeAuthority !== null;
      }
      
      // Risk scoring
      if (canMint) {
        riskScore += 3;
        reasons.push('⚠️ Mint authority still enabled');
      }
      
      if (canFreeze) {
        riskScore += 2;
        reasons.push('⚠️ Freeze authority still enabled');
      }
      
      if (marketData.liquidity < config.minLiquidity) {
        riskScore += 2;
        reasons.push(`⚠️ Low liquidity: $${marketData.liquidity.toFixed(0)}`);
      }
      
      if (marketData.marketCap < config.minMarketCap) {
        riskScore += 1;
        reasons.push(`⚠️ Low market cap: $${marketData.marketCap.toFixed(0)}`);
      }
      
      // Get holder distribution
      const { holderCount, topHolderPercent } = await this.getHolderDistribution(tokenMint);
      
      if (topHolderPercent > 50) {
        riskScore += 2;
        reasons.push(`⚠️ Concentrated ownership: ${topHolderPercent.toFixed(1)}% in top holder`);
      }
      
      if (holderCount < 10) {
        riskScore += 1;
        reasons.push(`⚠️ Few holders: ${holderCount}`);
      }
      
      // Positive signals
      if (!canMint && !canFreeze) {
        reasons.push('✅ Mint and freeze authority revoked');
      }
      
      if (marketData.liquidity >= config.minLiquidity * 2) {
        reasons.push(`✅ Strong liquidity: $${marketData.liquidity.toFixed(0)}`);
      }
      
      const isValid = riskScore <= config.maxRiskScore && 
                      marketData.liquidity >= config.minLiquidity &&
                      marketData.marketCap >= config.minMarketCap;
      
      return {
        isValid,
        riskScore,
        liquidity: marketData.liquidity,
        marketCap: marketData.marketCap,
        holderCount,
        topHolderPercent,
        hasLiquidityLock: false, // TODO: Implement liquidity lock check
        canMint,
        canFreeze,
        reasons
      };
    } catch (error: any) {
      console.error('Validation error:', error.message);
      return {
        isValid: false,
        riskScore: 10,
        liquidity: 0,
        marketCap: 0,
        holderCount: 0,
        topHolderPercent: 0,
        hasLiquidityLock: false,
        canMint: true,
        canFreeze: true,
        reasons: ['❌ Failed to validate token']
      };
    }
  }
  
  async getTokenMetadata(tokenMint: string): Promise<TokenMetadata> {
    try {
      const response = await axios.post(config.rpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'getAsset',
        params: { id: tokenMint }
      });
      
      const asset = response.data.result;
      
      return {
        name: asset.content?.metadata?.name || 'Unknown',
        symbol: asset.content?.metadata?.symbol || 'UNKNOWN',
        decimals: asset.token_info?.decimals || 9,
        supply: asset.token_info?.supply || 0
      };
    } catch (error) {
      return {
        name: 'Unknown',
        symbol: 'UNKNOWN',
        decimals: 9,
        supply: 0
      };
    }
  }
  
  async getMarketData(tokenMint: string): Promise<{ liquidity: number; marketCap: number; price: number }> {
    try {
      const response = await axios.get(`https://api.dexscreener.com/tokens/v1/solana/${tokenMint}`);
      
      if (response.data && response.data.length > 0) {
        const pair = response.data.sort((a: any, b: any) => 
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];
        
        return {
          liquidity: pair.liquidity?.usd || 0,
          marketCap: pair.marketCap || 0,
          price: parseFloat(pair.priceUsd || '0')
        };
      }
      
      return { liquidity: 0, marketCap: 0, price: 0 };
    } catch (error) {
      return { liquidity: 0, marketCap: 0, price: 0 };
    }
  }
  
  async getHolderDistribution(tokenMint: string): Promise<{ holderCount: number; topHolderPercent: number }> {
    try {
      // Use Helius to get top holders
      const response = await axios.post(config.rpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenLargestAccounts',
        params: [tokenMint]
      });
      
      const accounts = response.data.result?.value || [];
      
      if (accounts.length === 0) {
        return { holderCount: 0, topHolderPercent: 0 };
      }
      
      const totalSupply = accounts.reduce((sum: number, acc: any) => sum + (acc.amount || 0), 0);
      const topHolderAmount = accounts[0]?.amount || 0;
      const topHolderPercent = totalSupply > 0 ? (topHolderAmount / totalSupply) * 100 : 0;
      
      return {
        holderCount: accounts.length,
        topHolderPercent
      };
    } catch (error) {
      return { holderCount: 0, topHolderPercent: 0 };
    }
  }
}
