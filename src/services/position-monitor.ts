import axios from 'axios';
import { config } from '../config.js';
import { PumpPortalService } from './pump-portal.js';

export interface Position {
  tokenMint: string;
  tokenSymbol: string;
  entryPrice: number;
  entryTime: number;
  amountSol: number;
  active: boolean;
}

export class PositionMonitor {
  private positions: Map<string, Position> = new Map();
  private pumpPortal: PumpPortalService;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(pumpPortal: PumpPortalService) {
    this.pumpPortal = pumpPortal;
  }
  
  async addPosition(tokenMint: string, tokenSymbol: string, entryPrice: number, amountSol: number) {
    const position: Position = {
      tokenMint,
      tokenSymbol,
      entryPrice,
      entryTime: Date.now(),
      amountSol,
      active: true
    };
    
    this.positions.set(tokenMint, position);
    console.log(`📊 Monitoring position: ${tokenSymbol} (Entry: $${entryPrice})`);
    
    // Start monitoring this position
    this.startMonitoring(tokenMint);
  }
  
  private startMonitoring(tokenMint: string) {
    // Check price every 5 seconds
    const interval = setInterval(async () => {
      await this.checkPosition(tokenMint);
    }, 5000);
    
    this.monitoringIntervals.set(tokenMint, interval);
  }
  
  private async checkPosition(tokenMint: string) {
    const position = this.positions.get(tokenMint);
    
    if (!position || !position.active) {
      return;
    }
    
    try {
      const currentPrice = await this.getCurrentPrice(tokenMint);
      
      if (!currentPrice || currentPrice === 0) {
        return;
      }
      
      const profitPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
      const timeHeld = Date.now() - position.entryTime;
      
      console.log(`💹 ${position.tokenSymbol}: $${currentPrice.toFixed(8)} (${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%) | Held: ${Math.floor(timeHeld / 1000)}s`);
      
      // Check exit conditions
      const shouldExit = 
        profitPercent >= config.takeProfitPercent ||  // Take profit
        profitPercent <= config.stopLossPercent ||     // Stop loss
        timeHeld >= config.maxHoldTime;                // Max hold time
      
      if (shouldExit) {
        let reason = '';
        if (profitPercent >= config.takeProfitPercent) {
          reason = `🎯 Take profit hit: +${profitPercent.toFixed(2)}%`;
        } else if (profitPercent <= config.stopLossPercent) {
          reason = `🛑 Stop loss hit: ${profitPercent.toFixed(2)}%`;
        } else {
          reason = `⏰ Max hold time reached: ${Math.floor(timeHeld / 60000)}min`;
        }
        
        console.log(reason);
        await this.exitPosition(tokenMint, reason);
      }
    } catch (error: any) {
      console.error(`Error monitoring ${position.tokenSymbol}:`, error.message);
    }
  }
  
  private async exitPosition(tokenMint: string, reason: string) {
    const position = this.positions.get(tokenMint);
    
    if (!position || !position.active) {
      return;
    }
    
    console.log(`🚪 Exiting position: ${position.tokenSymbol} - ${reason}`);
    
    try {
      const signature = await this.pumpPortal.sellToken(tokenMint, 100);
      
      position.active = false;
      
      // Stop monitoring
      const interval = this.monitoringIntervals.get(tokenMint);
      if (interval) {
        clearInterval(interval);
        this.monitoringIntervals.delete(tokenMint);
      }
      
      console.log(`✅ Position closed: https://solscan.io/tx/${signature}`);
      
      return {
        reason,
        signature,
        finalPrice: await this.getCurrentPrice(tokenMint)
      };
    } catch (error: any) {
      console.error(`Failed to exit position:`, error.message);
      throw error;
    }
  }
  
  async manualExit(tokenMint: string): Promise<string> {
    const position = this.positions.get(tokenMint);
    
    if (!position || !position.active) {
      throw new Error('No active position for this token');
    }
    
    const result = await this.exitPosition(tokenMint, '👤 Manual exit');
    return result?.signature || '';
  }
  
  private async getCurrentPrice(tokenMint: string): Promise<number> {
    try {
      const response = await axios.get(`https://price.jup.ag/v4/price?ids=${tokenMint}`);
      return response.data.data[tokenMint]?.price || 0;
    } catch (error) {
      // Fallback to DEX Screener
      try {
        const response = await axios.get(`https://api.dexscreener.com/tokens/v1/solana/${tokenMint}`);
        if (response.data && response.data.length > 0) {
          return parseFloat(response.data[0].priceUsd || '0');
        }
      } catch (e) {
        console.error('Failed to get price from both Jupiter and DEX Screener');
      }
      return 0;
    }
  }
  
  getActivePositions(): Position[] {
    return Array.from(this.positions.values()).filter(p => p.active);
  }
  
  hasActivePosition(tokenMint: string): boolean {
    const position = this.positions.get(tokenMint);
    return position?.active || false;
  }
  
  stopAll() {
    console.log('🛑 Stopping all position monitors...');
    
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }
    
    this.monitoringIntervals.clear();
  }
}
