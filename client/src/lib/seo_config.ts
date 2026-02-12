/**
 * PHASE 5: SEO优化元数据配置
 * 定义结构化数据、元标签和搜索引擎优化配置
 */

// 页面SEO配置接口
export interface PageSEOConfig {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl?: string;
  ogType: 'website' | 'article' | 'product';
  ogImage?: string;
  twitterCard: 'summary' | 'summary_large_image';
  structuredData?: StructuredData;
  noIndex?: boolean;
  noFollow?: boolean;
}

// 结构化数据类型
export interface StructuredData {
  '@context': 'https://schema.org';
  '@type': string;
  [key: string]: unknown;
}

// 组织结构化数据
export const ORGANIZATION_SCHEMA: StructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'GRT智能系统',
  alternateName: 'GRT Intelligent System',
  url: 'https://grt-system.com',
  logo: 'https://grt-system.com/logo.png',
  description: '工业清洗设备智能化解决方案提供商',
  foundingDate: '2020',
  industry: 'Industrial Cleaning Equipment',
  areaServed: {
    '@type': 'GeoCircle',
    geoMidpoint: {
      '@type': 'GeoCoordinates',
      latitude: 31.2304,
      longitude: 121.4737,
    },
    geoRadius: '5000',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+86-21-12345678',
    contactType: 'customer service',
    availableLanguage: ['Chinese', 'English'],
  },
  sameAs: [
    'https://www.linkedin.com/company/grt-system',
    'https://twitter.com/grt_system',
  ],
};

// 产品结构化数据模板
export function createProductSchema(product: {
  name: string;
  description: string;
  image: string;
  sku: string;
  brand?: string;
  category?: string;
}): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'GRT',
    },
    category: product.category || 'Industrial Cleaning Equipment',
    manufacturer: {
      '@type': 'Organization',
      name: 'GRT智能系统',
    },
  };
}

// 服务结构化数据模板
export function createServiceSchema(service: {
  name: string;
  description: string;
  provider?: string;
  areaServed?: string;
}): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description,
    provider: {
      '@type': 'Organization',
      name: service.provider || 'GRT智能系统',
    },
    areaServed: service.areaServed || 'Global',
    serviceType: 'Industrial Cleaning Solutions',
  };
}

// 文章结构化数据模板
export function createArticleSchema(article: {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: string;
}): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.headline,
    description: article.description,
    image: article.image,
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'GRT智能系统',
      logo: {
        '@type': 'ImageObject',
        url: 'https://grt-system.com/logo.png',
      },
    },
  };
}

// 默认页面SEO配置
export const DEFAULT_SEO_CONFIG: PageSEOConfig = {
  title: 'GRT智能系统 | 工业清洗设备智能化解决方案',
  description: 'GRT智能系统提供工业清洗设备全生命周期数字化管理，包括MES制造执行、AI采购、财务管控、项目门径管理等核心模块。',
  keywords: [
    '工业清洗设备',
    '智能制造',
    'MES系统',
    '数字化转型',
    'AI采购',
    '项目管理',
    'VDA 19.1',
    'ISO 14644',
  ],
  ogType: 'website',
  twitterCard: 'summary_large_image',
  structuredData: ORGANIZATION_SCHEMA,
};

// 各页面SEO配置
export const PAGE_SEO_CONFIGS: Record<string, PageSEOConfig> = {
  '/': {
    ...DEFAULT_SEO_CONFIG,
    title: 'GRT智能系统 | 首页',
  },
  '/public': {
    ...DEFAULT_SEO_CONFIG,
    title: 'GRT智能系统 | 公开能力展示',
    description: '了解GRT智能系统的核心能力：MES制造执行、AI赋能采购、3-3-3-1财务管控、门径管理、工作流引擎、智能人才网格。',
    keywords: [...DEFAULT_SEO_CONFIG.keywords, '能力展示', '解决方案'],
  },
  '/capabilities': {
    ...DEFAULT_SEO_CONFIG,
    title: 'GRT智能系统 | 技术能力',
    description: 'GRT智能系统技术能力详解：ZKP零知识证明验证、区块链智能合约、AI智能体、ISO安全网关。',
    keywords: [...DEFAULT_SEO_CONFIG.keywords, 'ZKP', '区块链', 'AI智能体'],
    structuredData: createServiceSchema({
      name: 'GRT技术能力服务',
      description: '提供ZKP验证、区块链集成、AI智能体等先进技术服务',
    }),
  },
  '/customer-portal': {
    ...DEFAULT_SEO_CONFIG,
    title: 'GRT客户门户 | 项目状态查询',
    description: '安全访问您的GRT项目状态，查看项目进度、交付物和ZKP能力验证结果。',
    keywords: ['客户门户', '项目查询', '状态追踪'],
    noIndex: true, // 客户门户不需要被搜索引擎索引
  },
  '/subsystem-help': {
    ...DEFAULT_SEO_CONFIG,
    title: 'GRT智能系统 | 子系统操作手册',
    description: '各子系统的详细操作指南，包括前期输入要求、操作流程和执行效果说明。',
    keywords: [...DEFAULT_SEO_CONFIG.keywords, '操作手册', '使用指南'],
  },
};

// 获取页面SEO配置
export function getPageSEOConfig(path: string): PageSEOConfig {
  return PAGE_SEO_CONFIGS[path] || DEFAULT_SEO_CONFIG;
}

// 生成meta标签
export function generateMetaTags(config: PageSEOConfig): string {
  const tags: string[] = [];
  
  // 基础meta标签
  tags.push(`<title>${config.title}</title>`);
  tags.push(`<meta name="description" content="${config.description}">`);
  tags.push(`<meta name="keywords" content="${config.keywords.join(', ')}">`);
  
  // Open Graph标签
  tags.push(`<meta property="og:title" content="${config.title}">`);
  tags.push(`<meta property="og:description" content="${config.description}">`);
  tags.push(`<meta property="og:type" content="${config.ogType}">`);
  if (config.ogImage) {
    tags.push(`<meta property="og:image" content="${config.ogImage}">`);
  }
  
  // Twitter Card标签
  tags.push(`<meta name="twitter:card" content="${config.twitterCard}">`);
  tags.push(`<meta name="twitter:title" content="${config.title}">`);
  tags.push(`<meta name="twitter:description" content="${config.description}">`);
  
  // 规范链接
  if (config.canonicalUrl) {
    tags.push(`<link rel="canonical" href="${config.canonicalUrl}">`);
  }
  
  // 索引控制
  if (config.noIndex || config.noFollow) {
    const robotsContent: string[] = [];
    if (config.noIndex) robotsContent.push('noindex');
    if (config.noFollow) robotsContent.push('nofollow');
    tags.push(`<meta name="robots" content="${robotsContent.join(', ')}">`);
  }
  
  return tags.join('\n');
}

// 生成JSON-LD结构化数据
export function generateJsonLd(data: StructuredData): string {
  return `<script type="application/ld+json">${JSON.stringify(data, null, 2)}</script>`;
}
