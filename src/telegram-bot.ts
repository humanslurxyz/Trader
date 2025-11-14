import TelegramBot from 'node-telegram-bot-api';
import { config, validateConfig } from './config.js';
import { PumpPortalService } from './services/pump-portal.js';
import { TokenValidator } from './services/token-validator.js';
import { AIAnalysisService } from './services/ai-analysis.js';
import { PositionMonitor } from './services/position-monitor.js';

// Validate configuration
validateConfig();

// Initialize services
const pumpPortal = new PumpPortalService();
const validator = new TokenValidator();
const aiAnalysis = new AIAnalysisService();
const positionMonitor = new PositionMonitor(pumpPortal);

// Create bot
const bot = new TelegramBot(config.telegramBotToken, { polling: true });

console.log('🤖 Human Slur Trader Bot Started!');
console.log(`💼 Trading Wallet: ${pumpPortal.getWalletAddress()}`);
console.log(`🔐 Authorized Users: ${config.authorizedUsers.join(', ') || 'ALL (⚠️ WARNING: Set AUTHORIZED_USERS!)'}`);

// Authorization check
function isAuthorized(userId: number): boolean {
  if (config.authorizedUsers.length === 0) {
    return true; // No restrictions
  }
  return config.authorizedUsers.includes(userId.toString());
}

// Command: /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, `
🤖 *Human Slur Trader Bot*

Welcome to the autonomous Pump.fun trading bot powered by AI!

*Commands:*
/buy <token_address> - Analyze and buy a token
/positions - View active positions
/sell <token_address> - Manually sell a position
/wallet - Show wallet address and balance
/help - Show this help message

*Quick Start:*
Just send any Pump.fun token contract address to get instant analysis!

⚠️ *Risk Warning:* Trading crypto is risky. Only invest what you can afford to lose.
  `, { parse_mode: 'Markdown' });
});

// Command: /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, `
📖 *How to Use Human Slur Trader*

*Analyze & Buy:*
Simply send a Solana token address, and the bot will:
1. ✅ Validate the token (liquidity, risk, holders)
2. 🤖 AI analysis with recommendations
3. 💰 Show buy buttons with preset amounts

*Commands:*
• \`/buy <address>\` - Force buy without analysis
• \`/positions\` - See your open positions
• \`/sell <address>\` - Manually exit a position
• \`/wallet\` - Check your wallet

*Auto-Sell Conditions:*
• 🎯 Take Profit: ${config.takeProfitPercent}%
• 🛑 Stop Loss: ${config.stopLossPercent}%
• ⏰ Max Hold: ${config.maxHoldTime / 60000} minutes

*Example:*
\`3WPtHU8HPDrYcrKiiq2n9XQrK9q9TW3aVteSfes8pump\`
  `, { parse_mode: 'Markdown' });
});

// Command: /wallet
bot.onText(/\/wallet/, async (msg) => {
  const chatId = msg.chat.id;
  
  if (!isAuthorized(msg.from!.id)) {
    bot.sendMessage(chatId, '🚫 Unauthorized. Contact admin.');
    return;
  }
  
  try {
    bot.sendMessage(chatId, `
💼 *Wallet Information*

Address: \`${pumpPortal.getWalletAddress()}\`

View on Solscan:
https://solscan.io/account/${pumpPortal.getWalletAddress()}
    `, { parse_mode: 'Markdown' });
  } catch (error: any) {
    bot.sendMessage(chatId, `❌ Error: ${error.message}`);
  }
});

// Command: /positions
bot.onText(/\/positions/, (msg) => {
  const chatId = msg.chat.id;
  
  if (!isAuthorized(msg.from!.id)) {
    bot.sendMessage(chatId, '🚫 Unauthorized. Contact admin.');
    return;
  }
  
  const positions = positionMonitor.getActivePositions();
  
  if (positions.length === 0) {
    bot.sendMessage(chatId, '📊 No active positions.');
    return;
  }
  
  let message = '📊 *Active Positions:*\n\n';
  
  for (const pos of positions) {
    const timeHeld = Math.floor((Date.now() - pos.entryTime) / 60000);
    message += `*${pos.tokenSymbol}*\n`;
    message += `Entry: $${pos.entryPrice.toFixed(8)}\n`;
    message += `Amount: ${pos.amountSol} SOL\n`;
    message += `Time: ${timeHeld}m\n`;
    message += `\`${pos.tokenMint}\`\n\n`;
  }
  
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Handle token address (main analysis flow)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  
  // Skip if it's a command
  if (text.startsWith('/')) {
    return;
  }
  
  // Check if it looks like a Solana address (base58, 32-44 chars)
  const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  
  if (!solanaAddressRegex.test(text.trim())) {
    return; // Not a token address
  }
  
  if (!isAuthorized(msg.from!.id)) {
    bot.sendMessage(chatId, '🚫 Unauthorized. Contact admin.');
    return;
  }
  
  const tokenMint = text.trim();
  
  // Send analyzing message
  const analyzingMsg = await bot.sendMessage(chatId, '🔍 Analyzing token...');
  
  try {
    // Validate token
    const validation = await validator.validateToken(tokenMint);
    const metadata = await validator.getTokenMetadata(tokenMint);
    
    // Get AI analysis
    const analysis = await aiAnalysis.analyzeToken(tokenMint, metadata, validation);
    
    // Build analysis message
    let message = `🪙 *${metadata.name} (${metadata.symbol})*\n\n`;
    message += `📊 *Market Data:*\n`;
    message += `• MC: $${validation.marketCap.toLocaleString()}\n`;
    message += `• Liquidity: $${validation.liquidity.toLocaleString()}\n`;
    message += `• Holders: ${validation.holderCount}\n`;
    message += `• Top Holder: ${validation.topHolderPercent.toFixed(1)}%\n\n`;
    message += `⚠️ *Risk Score: ${validation.riskScore}/10*\n\n`;
    message += `🤖 *AI Analysis:*\n${analysis.summary}\n\n`;
    message += `📋 *Key Points:*\n${validation.reasons.slice(0, 4).join('\n')}`;
    
    // Delete analyzing message
    bot.deleteMessage(chatId, analyzingMsg.message_id);
    
    // Send analysis with buy buttons
    const keyboard = {
      inline_keyboard: [
        [
          { text: `Buy 0.1 SOL`, callback_data: `buy:${tokenMint}:0.1` },
          { text: `Buy 0.5 SOL`, callback_data: `buy:${tokenMint}:0.5` }
        ],
        [
          { text: `Buy 1 SOL`, callback_data: `buy:${tokenMint}:1` },
          { text: `Custom`, callback_data: `buy:${tokenMint}:custom` }
        ]
      ]
    };
    
    if (validation.isValid) {
      bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } else {
      bot.sendMessage(chatId, message + '\n\n❌ *Token did not pass validation. Trading disabled.*', {
        parse_mode: 'Markdown'
      });
    }
  } catch (error: any) {
    bot.deleteMessage(chatId, analyzingMsg.message_id);
    bot.sendMessage(chatId, `❌ Analysis failed: ${error.message}`);
  }
});

// Handle buy button callbacks
bot.on('callback_query', async (query) => {
  const chatId = query.message!.chat.id;
  const data = query.data || '';
  
  if (!isAuthorized(query.from.id)) {
    bot.answerCallbackQuery(query.id, { text: '🚫 Unauthorized' });
    return;
  }
  
  if (data.startsWith('buy:')) {
    const [, tokenMint, amountStr] = data.split(':');
    
    if (amountStr === 'custom') {
      bot.answerCallbackQuery(query.id, { text: 'Custom amounts coming soon!' });
      return;
    }
    
    const amount = parseFloat(amountStr);
    
    // Check if we already have a position
    if (positionMonitor.hasActivePosition(tokenMint)) {
      bot.answerCallbackQuery(query.id, { text: '⚠️ Already have a position in this token!' });
      return;
    }
    
    bot.answerCallbackQuery(query.id, { text: `Buying ${amount} SOL worth...` });
    
    try {
      const buyingMsg = await bot.sendMessage(chatId, `🔵 Buying ${amount} SOL of this token...`);
      
      // Execute buy
      const signature = await pumpPortal.buyToken(tokenMint, amount);
      
      // Get entry price
      const metadata = await validator.getTokenMetadata(tokenMint);
      const marketData = await validator.getMarketData(tokenMint);
      
      // Add to position monitor
      await positionMonitor.addPosition(tokenMint, metadata.symbol, marketData.price, amount);
      
      bot.deleteMessage(chatId, buyingMsg.message_id);
      
      bot.sendMessage(chatId, `
✅ *Buy Successful!*

Token: ${metadata.symbol}
Amount: ${amount} SOL
Entry Price: $${marketData.price.toFixed(8)}

Transaction:
https://solscan.io/tx/${signature}

🤖 Now monitoring position for auto-sell...
      `, { parse_mode: 'Markdown' });
    } catch (error: any) {
      bot.sendMessage(chatId, `❌ Buy failed: ${error.message}`);
    }
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  positionMonitor.stopAll();
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down bot...');
  positionMonitor.stopAll();
  bot.stopPolling();
  process.exit(0);
});
