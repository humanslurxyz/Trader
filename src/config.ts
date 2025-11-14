import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Solana RPC
  rpcUrl: process.env.HELIUS_RPC_URL || process.env.ALCHEMY_RPC_URL || 'https://api.mainnet-beta.solana.com',
  
  // Wallet
  walletPrivateKey: process.env.WALLET_PRIVATE_KEY || '',
  
  // Telegram
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  authorizedUsers: (process.env.AUTHORIZED_USERS || '').split(',').filter(Boolean),
  
  // AI
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  
  // Trading defaults
  defaultBuyAmounts: [
    parseFloat(process.env.DEFAULT_BUY_AMOUNT_1 || '0.1'),
    parseFloat(process.env.DEFAULT_BUY_AMOUNT_2 || '0.5'),
    parseFloat(process.env.DEFAULT_BUY_AMOUNT_3 || '1.0'),
  ],
  buySlippage: parseFloat(process.env.BUY_SLIPPAGE || '10'),
  sellSlippage: parseFloat(process.env.SELL_SLIPPAGE || '15'),
  priorityFee: parseFloat(process.env.PRIORITY_FEE || '0.0001'),
  
  // Risk management
  takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENT || '20'),
  stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT || '-10'),
  maxHoldTime: parseInt(process.env.MAX_HOLD_TIME || '300000'),
  maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '2.0'),
  maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS || '5.0'),
  
  // Token validation
  minLiquidity: parseFloat(process.env.MIN_LIQUIDITY || '1000'),
  minMarketCap: parseFloat(process.env.MIN_MARKET_CAP || '5000'),
  maxRiskScore: parseInt(process.env.MAX_RISK_SCORE || '7'),
};

// Validate required config
export function validateConfig() {
  const required = {
    'HELIUS_RPC_URL or ALCHEMY_RPC_URL': config.rpcUrl,
    'WALLET_PRIVATE_KEY': config.walletPrivateKey,
    'TELEGRAM_BOT_TOKEN': config.telegramBotToken,
  };
  
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (config.authorizedUsers.length === 0) {
    console.warn('⚠️  No AUTHORIZED_USERS set - bot will accept commands from anyone!');
  }
}
