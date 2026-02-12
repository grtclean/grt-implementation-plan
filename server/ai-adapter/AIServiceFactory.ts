/**
 * GRT Intelligent System - AI Service Factory (Adapter Pattern)
 * Version: 1.3.77
 * 
 * 根据APP_REGION动态选择AI模型，确保合规性
 * - US区域: OpenAI
 * - CN区域: DeepSeek
 * - 离线环境: Ollama Local
 */

// =============================================================================
// 类型定义
// =============================================================================

export type AppRegion = 'US' | 'DE' | 'CN' | 'OFFLINE';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIGenerateTextOptions {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIGenerateTextResult {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface BOMItem {
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  category: string;
  supplier?: string;
  leadTime?: number;
  unitPrice?: number;
}

export interface BOMAnalysisResult {
  items: BOMItem[];
  totalCost: number;
  riskItems: string[];
  suggestions: string[];
  provider: string;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: string;
}

// =============================================================================
// AI服务接口
// =============================================================================

export interface IAIService {
  readonly provider: string;
  readonly region: AppRegion;
  
  generateText(options: AIGenerateTextOptions): Promise<AIGenerateTextResult>;
  analyzeBOM(bomContent: string, projectContext?: string): Promise<BOMAnalysisResult>;
  translateDocument(text: string, targetLanguage: string, sourceLanguage?: string): Promise<TranslationResult>;
  
  // 健康检查
  healthCheck(): Promise<boolean>;
}

// =============================================================================
// OpenAI适配器 (US区域)
// =============================================================================

export class OpenAIAdapter implements IAIService {
  readonly provider = 'OpenAI';
  readonly region: AppRegion = 'US';
  
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  
  constructor(apiKey?: string, model: string = 'gpt-4o') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = 'https://api.openai.com/v1';
    this.model = model;
  }
  
  async generateText(options: AIGenerateTextOptions): Promise<AIGenerateTextResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: options.stream ?? false,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      model: this.model,
      provider: this.provider,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }
  
  async analyzeBOM(bomContent: string, projectContext?: string): Promise<BOMAnalysisResult> {
    const systemPrompt = `You are an expert BOM (Bill of Materials) analyst for industrial cleaning equipment manufacturing. 
Analyze the provided BOM and return a structured analysis in JSON format.
Include: items array, total cost estimate, risk items (long lead time, single source), and optimization suggestions.`;
    
    const userPrompt = `Analyze this BOM:
${bomContent}

${projectContext ? `Project Context: ${projectContext}` : ''}

Return JSON with structure:
{
  "items": [{"partNumber": "", "description": "", "quantity": 0, "unit": "", "category": "", "supplier": "", "leadTime": 0, "unitPrice": 0}],
  "totalCost": 0,
  "riskItems": [""],
  "suggestions": [""]
}`;
    
    const result = await this.generateText({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });
    
    try {
      const parsed = JSON.parse(result.content);
      return { ...parsed, provider: this.provider };
    } catch {
      return {
        items: [],
        totalCost: 0,
        riskItems: ['Failed to parse BOM analysis'],
        suggestions: [result.content],
        provider: this.provider,
      };
    }
  }
  
  async translateDocument(text: string, targetLanguage: string, sourceLanguage?: string): Promise<TranslationResult> {
    const result = await this.generateText({
      messages: [
        {
          role: 'system',
          content: `You are a professional translator specializing in industrial and technical documents. 
Translate the following text to ${targetLanguage}. Maintain technical accuracy and professional tone.
Only return the translated text, no explanations.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    });
    
    return {
      originalText: text,
      translatedText: result.content,
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage,
      provider: this.provider,
    };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await this.generateText({
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 5,
      });
      return true;
    } catch {
      return false;
    }
  }
}

// =============================================================================
// DeepSeek适配器 (CN区域)
// =============================================================================

export class DeepSeekAdapter implements IAIService {
  readonly provider = 'DeepSeek';
  readonly region: AppRegion = 'CN';
  
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  
  constructor(apiKey?: string, model: string = 'deepseek-chat') {
    this.apiKey = apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.baseUrl = 'https://api.deepseek.com/v1';
    this.model = model;
  }
  
  async generateText(options: AIGenerateTextOptions): Promise<AIGenerateTextResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: options.stream ?? false,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      model: this.model,
      provider: this.provider,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }
  
  async analyzeBOM(bomContent: string, projectContext?: string): Promise<BOMAnalysisResult> {
    const systemPrompt = `你是一位工业清洗设备制造的BOM（物料清单）分析专家。
分析提供的BOM并以JSON格式返回结构化分析。
包括：物料数组、总成本估算、风险物料（长交期、单一来源）和优化建议。`;
    
    const userPrompt = `分析此BOM：
${bomContent}

${projectContext ? `项目背景：${projectContext}` : ''}

返回JSON结构：
{
  "items": [{"partNumber": "", "description": "", "quantity": 0, "unit": "", "category": "", "supplier": "", "leadTime": 0, "unitPrice": 0}],
  "totalCost": 0,
  "riskItems": [""],
  "suggestions": [""]
}`;
    
    const result = await this.generateText({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    });
    
    try {
      const parsed = JSON.parse(result.content);
      return { ...parsed, provider: this.provider };
    } catch {
      return {
        items: [],
        totalCost: 0,
        riskItems: ['BOM分析解析失败'],
        suggestions: [result.content],
        provider: this.provider,
      };
    }
  }
  
  async translateDocument(text: string, targetLanguage: string, sourceLanguage?: string): Promise<TranslationResult> {
    const result = await this.generateText({
      messages: [
        {
          role: 'system',
          content: `你是一位专业的工业和技术文档翻译专家。
将以下文本翻译成${targetLanguage}。保持技术准确性和专业语气。
只返回翻译后的文本，不需要解释。`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    });
    
    return {
      originalText: text,
      translatedText: result.content,
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage,
      provider: this.provider,
    };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await this.generateText({
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 5,
      });
      return true;
    } catch {
      return false;
    }
  }
}

// =============================================================================
// Ollama本地适配器 (离线环境)
// =============================================================================

export class OllamaLocalAdapter implements IAIService {
  readonly provider = 'Ollama';
  readonly region: AppRegion = 'OFFLINE';
  
  private baseUrl: string;
  private model: string;
  
  constructor(baseUrl?: string, model: string = 'llama3.1') {
    this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
    this.model = model;
  }
  
  async generateText(options: AIGenerateTextOptions): Promise<AIGenerateTextResult> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 4096,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.message.content,
      model: this.model,
      provider: this.provider,
      usage: data.eval_count ? {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count,
        totalTokens: (data.prompt_eval_count || 0) + data.eval_count,
      } : undefined,
    };
  }
  
  async analyzeBOM(bomContent: string, projectContext?: string): Promise<BOMAnalysisResult> {
    const systemPrompt = `You are an expert BOM analyst. Analyze the BOM and return JSON with items, totalCost, riskItems, and suggestions.`;
    
    const result = await this.generateText({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze BOM:\n${bomContent}\n${projectContext ? `Context: ${projectContext}` : ''}` },
      ],
      temperature: 0.3,
    });
    
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { ...parsed, provider: this.provider };
      }
    } catch {
      // Fall through to default return
    }
    
    return {
      items: [],
      totalCost: 0,
      riskItems: ['Local analysis - limited capability'],
      suggestions: [result.content],
      provider: this.provider,
    };
  }
  
  async translateDocument(text: string, targetLanguage: string, sourceLanguage?: string): Promise<TranslationResult> {
    const result = await this.generateText({
      messages: [
        {
          role: 'system',
          content: `Translate to ${targetLanguage}. Return only the translation.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    });
    
    return {
      originalText: text,
      translatedText: result.content,
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage,
      provider: this.provider,
    };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// =============================================================================
// Gemini适配器 (备用)
// =============================================================================

export class GeminiAdapter implements IAIService {
  readonly provider = 'Gemini';
  readonly region: AppRegion = 'US';
  
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  
  constructor(apiKey?: string, model: string = 'gemini-1.5-pro') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = model;
  }
  
  async generateText(options: AIGenerateTextOptions): Promise<AIGenerateTextResult> {
    const contents = options.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
    
    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 4096,
          },
        }),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.candidates[0].content.parts[0].text,
      model: this.model,
      provider: this.provider,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount,
      } : undefined,
    };
  }
  
  async analyzeBOM(bomContent: string, projectContext?: string): Promise<BOMAnalysisResult> {
    const result = await this.generateText({
      messages: [
        {
          role: 'user',
          content: `As a BOM analyst, analyze this BOM and return JSON with items, totalCost, riskItems, suggestions:\n${bomContent}\n${projectContext ? `Context: ${projectContext}` : ''}`,
        },
      ],
      temperature: 0.3,
    });
    
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { ...parsed, provider: this.provider };
      }
    } catch {
      // Fall through
    }
    
    return {
      items: [],
      totalCost: 0,
      riskItems: [],
      suggestions: [result.content],
      provider: this.provider,
    };
  }
  
  async translateDocument(text: string, targetLanguage: string, sourceLanguage?: string): Promise<TranslationResult> {
    const result = await this.generateText({
      messages: [
        {
          role: 'user',
          content: `Translate to ${targetLanguage}. Return only the translation:\n${text}`,
        },
      ],
      temperature: 0.3,
    });
    
    return {
      originalText: text,
      translatedText: result.content,
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage,
      provider: this.provider,
    };
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await this.generateText({
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 5,
      });
      return true;
    } catch {
      return false;
    }
  }
}

// =============================================================================
// AI服务工厂
// =============================================================================

export class AIServiceFactory {
  private static instance: IAIService | null = null;
  private static currentRegion: AppRegion | null = null;
  
  /**
   * 获取AI服务实例（单例模式）
   */
  static getInstance(forceRegion?: AppRegion): IAIService {
    const region = forceRegion || this.detectRegion();
    
    // 如果区域改变，重新创建实例
    if (this.instance && this.currentRegion === region) {
      return this.instance;
    }
    
    this.instance = this.createAdapter(region);
    this.currentRegion = region;
    return this.instance;
  }
  
  /**
   * 根据区域创建适配器
   */
  static createAdapter(region: AppRegion): IAIService {
    switch (region) {
      case 'US':
      case 'DE':
        // US和DE区域优先使用OpenAI，备选Gemini
        if (process.env.OPENAI_API_KEY) {
          return new OpenAIAdapter();
        }
        if (process.env.GEMINI_API_KEY) {
          return new GeminiAdapter();
        }
        // 回退到Ollama
        return new OllamaLocalAdapter();
        
      case 'CN':
        // CN区域使用DeepSeek
        if (process.env.DEEPSEEK_API_KEY) {
          return new DeepSeekAdapter();
        }
        // 回退到Ollama
        return new OllamaLocalAdapter();
        
      case 'OFFLINE':
      default:
        return new OllamaLocalAdapter();
    }
  }
  
  /**
   * 检测当前区域
   */
  static detectRegion(): AppRegion {
    const envRegion = process.env.APP_REGION?.toUpperCase();
    
    if (envRegion === 'US' || envRegion === 'DE' || envRegion === 'CN') {
      return envRegion as AppRegion;
    }
    
    // 检查是否有网络连接（简化检测）
    if (process.env.OFFLINE_MODE === 'true') {
      return 'OFFLINE';
    }
    
    // 默认US
    return 'US';
  }
  
  /**
   * 获取所有可用的适配器
   */
  static getAvailableAdapters(): { region: AppRegion; provider: string; available: boolean }[] {
    return [
      {
        region: 'US',
        provider: 'OpenAI',
        available: !!process.env.OPENAI_API_KEY,
      },
      {
        region: 'US',
        provider: 'Gemini',
        available: !!process.env.GEMINI_API_KEY,
      },
      {
        region: 'CN',
        provider: 'DeepSeek',
        available: !!process.env.DEEPSEEK_API_KEY,
      },
      {
        region: 'OFFLINE',
        provider: 'Ollama',
        available: true, // 假设本地Ollama总是可用
      },
    ];
  }
  
  /**
   * 健康检查所有适配器
   */
  static async healthCheckAll(): Promise<{ region: AppRegion; provider: string; healthy: boolean }[]> {
    const results: { region: AppRegion; provider: string; healthy: boolean }[] = [];
    
    const adapters: [AppRegion, IAIService][] = [
      ['US', new OpenAIAdapter()],
      ['CN', new DeepSeekAdapter()],
      ['OFFLINE', new OllamaLocalAdapter()],
    ];
    
    for (const [region, adapter] of adapters) {
      try {
        const healthy = await adapter.healthCheck();
        results.push({ region, provider: adapter.provider, healthy });
      } catch {
        results.push({ region, provider: adapter.provider, healthy: false });
      }
    }
    
    return results;
  }
}

// =============================================================================
// 导出便捷函数
// =============================================================================

/**
 * 获取AI服务
 */
export function getAIService(region?: AppRegion): IAIService {
  return AIServiceFactory.getInstance(region);
}

/**
 * 生成文本
 */
export async function generateText(options: AIGenerateTextOptions, region?: AppRegion): Promise<AIGenerateTextResult> {
  const service = getAIService(region);
  return service.generateText(options);
}

/**
 * 分析BOM
 */
export async function analyzeBOM(bomContent: string, projectContext?: string, region?: AppRegion): Promise<BOMAnalysisResult> {
  const service = getAIService(region);
  return service.analyzeBOM(bomContent, projectContext);
}

/**
 * 翻译文档
 */
export async function translateDocument(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string,
  region?: AppRegion
): Promise<TranslationResult> {
  const service = getAIService(region);
  return service.translateDocument(text, targetLanguage, sourceLanguage);
}
