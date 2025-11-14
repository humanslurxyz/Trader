# 🤖 Human Slur Trader

> AI-Powered Autonomous Trading Bot for Pump.fun SPL Tokens on Solana

An intelligent Telegram bot that analyzes and trades Pump.fun tokens using AI, automatic risk assessment, and smart position management. Built for the Human Slur ecosystem.

## ✨ Features

### 🎯 Core Capabilities
- **AI-Powered Analysis** - Uses Meta's Llama 3.3 70B or GPT-4 for token insights
- **Automated Trading** - Buy and sell Pump.fun tokens via PumpPortal API
- **Risk Assessment** - 10-point risk scoring system with safety checks
- **Position Monitoring** - Auto-sell based on profit targets, stop loss, and time limits
- **Telegram Interface** - Easy-to-use bot with inline buttons for instant trading

### 🛡️ Safety Features
- Token validation (liquidity, mint authority, holder distribution)
- Configurable position size limits
- Daily loss limits
- Emergency stop mechanism
- Risk score filtering

### 📊 What It Checks
- ✅ Liquidity & Market Cap
- ✅ Mint Authority Status
- ✅ Freeze Authority Status  
- ✅ Holder Distribution
- ✅ Top Holder Concentration
- ✅ AI Risk Analysis

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- A Solana wallet with SOL for trading
- Helius API key (free tier: https://www.helius.dev)
- Telegram Bot Token (from @BotFather)
- OpenRouter or OpenAI API key (for AI analysis)

### Installation

1. **Clone or download this folder**
```bash
cd human-slur-trader
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
```

4. **Edit `.env` file** with your credentials:

```bash
# Required
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
WALLET_PRIVATE_KEY=your_base58_private_key
TELEGRAM_BOT_TOKEN=your_bot_token
AUTHORIZED_USERS=your_telegram_user_id

# For AI Analysis (choose one)
OPENROUTER_API_KEY=your_openrouter_key
# OR
OPENAI_API_KEY=your_openai_key
```

### 🔐 Getting Your Credentials

#### 1. Helius API Key
- Visit https://www.helius.dev
- Sign up for free account
- Create new API key
- Copy the RPC URL with your key

#### 2. Wallet Private Key
```bash
# If you have Solana CLI installed:
solana-keygen new

# Or use Phantom wallet:
# Settings → Show Secret Recovery Phrase → Export Private Key
```
⚠️ **Never share your private key!**

#### 3. Telegram Bot Token
- Open Telegram and message @BotFather
- Type `/newbot` and follow instructions
- Copy the bot token

#### 4. Your Telegram User ID
- Message @userinfobot on Telegram
- Copy your user ID number

#### 5. AI API Key
**Option A: OpenRouter** (Recommended - cheaper)
- Visit https://openrouter.ai/keys
- Create account and generate key

**Option B: OpenAI**
- Visit https://platform.openai.com/api-keys  
- Create API key

### 🎮 Running the Bot

```bash
npm run bot
```

You should see:
```
🤖 Human Slur Trader Bot Started!
💼 Trading Wallet: YOUR_WALLET_ADDRESS
🔐 Authorized Users: YOUR_USER_ID
```

## 📱 How to Use

### Step 1: Start the Bot
Send `/start` to your bot on Telegram

### Step 2: Analyze a Token
Simply paste any Pump.fun token contract address:

```
3WPtHU8HPDrYcrKiiq2n9XQrK9q9TW3aVteSfes8pump
```

### Step 3: Review Analysis
The bot will show:
- 📊 Market data (MC, liquidity, holders)
- ⚠️ Risk score (0-10)
- 🤖 AI analysis and recommendation
- 📋 Key risk factors

### Step 4: Buy
If the token passes validation, click one of the buy buttons:
- **Buy 0.1 SOL** - Small test position
- **Buy 0.5 SOL** - Medium position
- **Buy 1 SOL** - Large position

### Step 5: Monitor
The bot automatically monitors your position and will sell when:
- 🎯 **Profit target hit** (default: +20%)
- 🛑 **Stop loss hit** (default: -10%)
- ⏰ **Max hold time reached** (default: 5 minutes)

## 🎛️ Configuration

Edit `.env` to customize trading parameters:

### Trading Settings
```bash
# Buy amounts for quick buttons (in SOL)
DEFAULT_BUY_AMOUNT_1=0.1
DEFAULT_BUY_AMOUNT_2=0.5
DEFAULT_BUY_AMOUNT_3=1.0

# Slippage tolerance (percentage)
BUY_SLIPPAGE=10
SELL_SLIPPAGE=15

# Priority fee (SOL) - higher = faster execution
PRIORITY_FEE=0.0001
```

### Risk Management
```bash
# Profit target (percentage)
TAKE_PROFIT_PERCENT=20

# Stop loss (percentage - use negative)
STOP_LOSS_PERCENT=-10

# Auto-sell after this time (milliseconds)
MAX_HOLD_TIME=300000  # 5 minutes

# Maximum position size (SOL)
MAX_POSITION_SIZE=2.0

# Maximum daily loss (SOL)
MAX_DAILY_LOSS=5.0
```

### Token Validation
```bash
# Minimum requirements for trading
MIN_LIQUIDITY=1000       # USD
MIN_MARKET_CAP=5000      # USD
MAX_RISK_SCORE=7         # 0-10 scale
```

## 📋 Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and introduction |
| `/help` | Show detailed help and examples |
| `/wallet` | Display wallet address and link to Solscan |
| `/positions` | View all active positions being monitored |
| `/sell <address>` | Manually exit a position |

## 🔧 Advanced Usage

### Running in Production

For 24/7 operation, use PM2:

```bash
# Install PM2
npm install -g pm2

# Build the project
npm run build

# Start with PM2
pm2 start dist/telegram-bot.js --name human-slur-trader

# View logs
pm2 logs human-slur-trader

# Restart on reboot
pm2 startup
pm2 save
```

### Custom AI Analysis

To use your own AI analysis logic, edit:
```typescript
// src/services/ai-analysis.ts

async analyzeToken(...) {
  // Your custom analysis here
}
```

### Webhook Integration

Instead of polling, use webhooks:

```typescript
// In telegram-bot.ts, replace:
const bot = new TelegramBot(token, { polling: true });

// With:
const bot = new TelegramBot(token, { webHook: {
  port: 8443,
  host: '0.0.0.0'
}});
```

## ⚠️ Important Warnings

### Security
- **NEVER** share your `.env` file or private keys
- **NEVER** commit `.env` to git (it's in `.gitignore`)
- Set `AUTHORIZED_USERS` to restrict bot access
- Use a dedicated trading wallet, not your main wallet

### Risk Disclaimer
- **Trading cryptocurrencies involves substantial risk of loss**
- This bot is experimental and may have bugs
- Only trade with money you can afford to lose completely
- Past performance does not guarantee future results
- The developers are not responsible for any trading losses

### Pump.fun Specific Risks
- Extremely high volatility
- Risk of rug pulls despite validation
- Low liquidity can cause high slippage
- Bot activity can affect prices
- Many tokens go to zero

## 🐛 Troubleshooting

### Bot not responding
```bash
# Check if bot is running
pm2 list

# View logs for errors
pm2 logs human-slur-trader

# Restart bot
pm2 restart human-slur-trader
```

### "Insufficient funds" error
- Ensure your wallet has enough SOL
- Check wallet balance: https://solscan.io/account/YOUR_WALLET

### "Slippage tolerance exceeded"
- Increase `BUY_SLIPPAGE` or `SELL_SLIPPAGE` in `.env`
- Very volatile tokens may need 15-25% slippage

### AI analysis failed
- Verify `OPENROUTER_API_KEY` or `OPENAI_API_KEY` is set
- Check API key credits/balance
- Bot falls back to rule-based analysis if AI fails

## 📚 Project Structure

```
human-slur-trader/
├── src/
│   ├── config.ts                 # Configuration loader
│   ├── telegram-bot.ts           # Main bot entry point
│   └── services/
│       ├── pump-portal.ts        # PumpPortal trading API
│       ├── token-validator.ts    # Token safety checks
│       ├── ai-analysis.ts        # AI-powered analysis
│       └── position-monitor.ts   # Auto-sell monitoring
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔗 Resources

- **PumpPortal API**: https://pumpportal.fun
- **Helius RPC**: https://www.helius.dev
- **DEX Screener**: https://dexscreener.com
- **Solscan**: https://solscan.io
- **Human Slur**: https://humanslur.xyz

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This is part of the Human Slur ecosystem. Contributions are welcome!

1. Fork the repository
2. Create your feature branch
3. Test thoroughly
4. Submit a pull request

## 💬 Support

- Telegram: https://t.me/humanslurxyz
- Website: https://humanslur.xyz

---

**Built with 💀 by the Human Slur community**

*Remember: This is experimental software. Trade responsibly and never invest more than you can afford to lose.*
