import OpenAI from 'openai';
import { config } from '../config.js';
import type { TokenValidation, TokenMetadata } from './token-validator.js';

export interface TokenAnalysis {
  summary: string;
  recommendation: 'BUY' | 'HOLD' | 'AVOID';
  confidence: number; // 0-100
  keyPoints: string[];
}

export class AIAnalysisService {
  private client: OpenAI;
  
  constructor() {
    if (config.openRouterApiKey) {
      this.client = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: config.openRouterApiKey,
        defaultHeaders: {
          'HTTP-Referer': 'https://humanslur.xyz',
          'X-Title': 'Human Slur Trader'
        }
      });
    } else if (config.openAiApiKey) {
      this.client = new OpenAI({
        apiKey: config.openAiApiKey
      });
    } else {
      throw new Error('No AI API key configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY');
    }
  }
  
  async analyzeToken(
    tokenMint: string,
    metadata: TokenMetadata,
    validation: TokenValidation
  ): Promise<TokenAnalysis> {
    console.log(`🤖 AI analyzing token: ${metadata.symbol}...`);
    
    const prompt = this.buildAnalysisPrompt(tokenMint, metadata, validation);
    
    try {
      const response = await this.client.chat.completions.create({
        model: config.openRouterApiKey ? 'meta-llama/llama-3.3-70b-instruct' : 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a Wojak-style crypto analyst. Provide brutally honest, slightly pessimistic but insightful analysis of tokens. Be concise and use crypto slang where appropriate.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      const analysis = response.choices[0].message.content || '';
      
      // Parse the AI response
      const recommendation = this.extractRecommendation(analysis, validation);
      const confidence = this.calculateConfidence(validation);
      const keyPoints = this.extractKeyPoints(analysis);
      
      return {
        summary: analysis,
        recommendation,
        confidence,
        keyPoints
      };
    } catch (error: any) {
      console.error('AI analysis failed:', error.message);
      
      // Fallback to rule-based analysis
      return this.fallbackAnalysis(validation);
    }
  }
  
  private buildAnalysisPrompt(tokenMint: string, metadata: TokenMetadata, validation: TokenValidation): string {
    return `Analyze this Pump.fun token for trading:

Token: ${metadata.name} (${metadata.symbol})
Contract: ${tokenMint}

Market Data:
- Market Cap: $${validation.marketCap.toLocaleString()}
- Liquidity: $${validation.liquidity.toLocaleString()}
- Holders: ${validation.holderCount}
- Top Holder: ${validation.topHolderPercent.toFixed(1)}%

Risk Factors:
- Risk Score: ${validation.riskScore}/10
- Can Mint: ${validation.canMint ? 'Yes ⚠️' : 'No ✓'}
- Can Freeze: ${validation.canFreeze ? 'Yes ⚠️' : 'No ✓'}

Issues/Signals:
${validation.reasons.join('\n')}

Provide a brief analysis (2-3 sentences) focusing on:
1. Is this worth aping into?
2. Main risks
3. Quick profit potential

End with one of: STRONG BUY, BUY, HOLD, or AVOID.`;
  }
  
  private extractRecommendation(analysis: string, validation: TokenValidation): 'BUY' | 'HOLD' | 'AVOID' {
    const lowerAnalysis = analysis.toLowerCase();
    
    if (lowerAnalysis.includes('strong buy') || (lowerAnalysis.includes('buy') && validation.riskScore <= 3)) {
      return 'BUY';
    }
    
    if (lowerAnalysis.includes('avoid') || validation.riskScore >= 7) {
      return 'AVOID';
    }
    
    if (lowerAnalysis.includes('buy') && validation.riskScore <= 5) {
      return 'BUY';
    }
    
    return 'HOLD';
  }
  
  private calculateConfidence(validation: TokenValidation): number {
    // Confidence decreases with risk score
    const baseConfidence = 100 - (validation.riskScore * 10);
    
    // Adjust for liquidity and market cap
    let adjustment = 0;
    if (validation.liquidity >= config.minLiquidity * 3) adjustment += 10;
    if (validation.marketCap >= config.minMarketCap * 3) adjustment += 10;
    if (!validation.canMint && !validation.canFreeze) adjustment += 15;
    
    return Math.min(100, Math.max(0, baseConfidence + adjustment));
  }
  
  private extractKeyPoints(analysis: string): string[] {
    const lines = analysis.split('\n').filter(line => line.trim());
    const points: string[] = [];
    
    for (const line of lines) {
      if (line.match(/^[\d\.\-\*]/) || line.includes(':')) {
        points.push(line.trim());
      }
    }
    
    return points.slice(0, 4);
  }
  
  private fallbackAnalysis(validation: TokenValidation): TokenAnalysis {
    let summary = '⚠️ AI analysis unavailable. Using rule-based assessment:\n\n';
    let recommendation: 'BUY' | 'HOLD' | 'AVOID' = 'HOLD';
    
    if (validation.riskScore >= 7) {
      summary += 'HIGH RISK token. Multiple red flags detected. Proceed with extreme caution.';
      recommendation = 'AVOID';
    } else if (validation.riskScore <= 3) {
      summary += 'LOW RISK token. Looks relatively safe. Consider buying with proper position sizing.';
      recommendation = 'BUY';
    } else {
      summary += 'MEDIUM RISK token. Some concerns but potentially tradeable. Use tight stop loss.';
      recommendation = 'HOLD';
    }
    
    return {
      summary,
      recommendation,
      confidence: this.calculateConfidence(validation),
      keyPoints: validation.reasons
    };
  }
}
