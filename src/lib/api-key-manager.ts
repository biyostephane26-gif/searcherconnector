
// =================================================================
// SEARCHER CONNECTOR — API KEY MANAGER
// Rotation automatique des clés API zéro dépense
// =================================================================

interface KeyConfig {
  keys: string[]
  currentIndex: number
  usagePercent: number
}

const KEY_CONFIGS: Record<string, KeyConfig> = {
  scrapingbee: {
    keys: [
      process.env.SCRAPINGBEE_KEY_1 || '',
      process.env.SCRAPINGBEE_KEY_2 || '',
      process.env.SCRAPINGBEE_KEY_3 || '',
      process.env.SCRAPINGBEE_KEY_4 || '',
      process.env.SCRAPINGBEE_KEY_5 || '',
      process.env.SCRAPINGBEE_KEY_6 || '',
      process.env.SCRAPINGBEE_KEY_7 || '',
      process.env.SCRAPINGBEE_KEY_8 || '',
      process.env.SCRAPINGBEE_KEY_9 || '',
      process.env.SCRAPINGBEE_KEY_10 || '',
    ].filter(Boolean),
    currentIndex: 0,
    usagePercent: 0,
  },
  zenrows: {
    keys: [
      process.env.ZENROWS_KEY_1 || '',
      process.env.ZENROWS_KEY_2 || '',
      process.env.ZENROWS_KEY_3 || '',
      process.env.ZENROWS_KEY_4 || '',
      process.env.ZENROWS_KEY_5 || '',
      process.env.ZENROWS_KEY_6 || '',
      process.env.ZENROWS_KEY_7 || '',
      process.env.ZENROWS_KEY_8 || '',
      process.env.ZENROWS_KEY_9 || '',
      process.env.ZENROWS_KEY_10 || '',
    ].filter(Boolean),
    currentIndex: 0,
    usagePercent: 0,
  },
  apify: {
    keys: [
      process.env.APIFY_API_KEY || '',
      process.env.APIFY_API_KEY_2 || '',
      process.env.APIFY_API_KEY_3 || '',
      process.env.APIFY_API_KEY_4 || '',
      process.env.APIFY_API_KEY_5 || '',
      process.env.APIFY_API_KEY_6 || '',
      process.env.APIFY_API_KEY_7 || '',
      process.env.APIFY_API_KEY_8 || '',
      process.env.APIFY_API_KEY_9 || '',
      process.env.APIFY_API_KEY_10 || '',
    ].filter(Boolean),
    currentIndex: 0,
    usagePercent: 0,
  },
  elevenlabs: {
    keys: [
      process.env.ELEVENLABS_KEY_1 || '',
      process.env.ELEVENLABS_KEY_2 || '',
      process.env.ELEVENLABS_KEY_3 || '',
      process.env.ELEVENLABS_KEY_4 || '',
      process.env.ELEVENLABS_KEY_5 || '',
      process.env.ELEVENLABS_KEY_6 || '',
      process.env.ELEVENLABS_KEY_7 || '',
      process.env.ELEVENLABS_KEY_8 || '',
      process.env.ELEVENLABS_KEY_9 || '',
      process.env.ELEVENLABS_KEY_10 || '',
    ].filter(Boolean),
    currentIndex: 0,
    usagePercent: 0,
  },
  openai: {
    keys: [
      process.env.OPENAI_KEY_1 || '',
      process.env.OPENAI_KEY_2 || '',
      process.env.OPENAI_KEY_3 || '',
      process.env.OPENAI_KEY_4 || '',
      process.env.OPENAI_KEY_5 || '',
      process.env.OPENAI_KEY_6 || '',
      process.env.OPENAI_KEY_7 || '',
      process.env.OPENAI_KEY_8 || '',
      process.env.OPENAI_KEY_9 || '',
      process.env.OPENAI_KEY_10 || '',
    ].filter(Boolean),
    currentIndex: 0,
    usagePercent: 0,
  },
  groq: {
    keys: [
      process.env.GROQ_API_KEY_1 || '',
      process.env.GROQ_API_KEY_2 || '',
      process.env.GROQ_API_KEY_3 || '',
      process.env.GROQ_API_KEY_4 || '',
      process.env.GROQ_API_KEY_5 || '',
      process.env.GROQ_API_KEY_6 || '',
      process.env.GROQ_API_KEY_7 || '',
      process.env.GROQ_API_KEY_8 || '',
      process.env.GROQ_API_KEY_9 || '',
      process.env.GROQ_API_KEY_10 || '',
    ].filter(Boolean),
    currentIndex: 0,
    usagePercent: 0,
  },
  gemini: {
    keys: [
      process.env.GEMINI_KEY_1 || '',
      process.env.GEMINI_KEY_2 || '',
      process.env.GEMINI_KEY_3 || '',
      process.env.GEMINI_KEY_4 || '',
      process.env.GEMINI_KEY_5 || '',
      process.env.GEMINI_KEY_6 || '',
      process.env.GEMINI_KEY_7 || '',
      process.env.GEMINI_KEY_8 || '',
      process.env.GEMINI_KEY_9 || '',
      process.env.GEMINI_KEY_10 || '',
    ].filter(Boolean),
    currentIndex: 0,
    usagePercent: 0,
  },
}

export function getApiKey(serviceName: string): string | null {
  const config = KEY_CONFIGS[serviceName]
  if (!config || config.keys.length === 0) {
    return null
  }
  
  return config.keys[config.currentIndex]
}

export function rotateKey(serviceName: string): boolean {
  const config = KEY_CONFIGS[serviceName]
  if (!config || config.keys.length === 0) {
    return false
  }

  config.currentIndex = (config.currentIndex + 1) % config.keys.length
  config.usagePercent = 0
  return true
}

export function setUsagePercent(serviceName: string, percent: number): void {
  const config = KEY_CONFIGS[serviceName]
  if (!config) return
  
  config.usagePercent = percent
  
  if (percent >= 80) {
    rotateKey(serviceName)
  }
}

export function getKeyStats(serviceName: string): {
  activeKeyIndex: number
  totalKeys: number
  usagePercent: number
} {
  const config = KEY_CONFIGS[serviceName]
  if (!config) {
    return { activeKeyIndex: 0, totalKeys: 0, usagePercent: 0 }
  }

  return {
    activeKeyIndex: config.currentIndex,
    totalKeys: config.keys.length,
    usagePercent: config.usagePercent,
  }
}

export function getAllServicesStats(): Record<
  string,
  { activeKeyIndex: number; totalKeys: number; usagePercent: number }
> {
  const stats: Record<string, any> = {}
  for (const service in KEY_CONFIGS) {
    stats[service] = getKeyStats(service)
  }
  return stats
}
