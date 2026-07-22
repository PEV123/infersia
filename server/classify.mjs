// User-agent and referrer classification for first-party analytics.
// Pure functions, no deps.

const BOT_PATTERNS = [
  // search / SEO crawlers
  'googlebot', 'adsbot', 'mediapartners', 'google-inspectiontool', 'google-extended', 'storebot-google',
  'bingbot', 'bingpreview', 'msnbot', 'yandex', 'baiduspider', 'duckduckbot', 'applebot', 'petalbot',
  'seznambot', 'sogou', 'exabot', 'facebot',
  // AI crawlers
  'gptbot', 'oai-searchbot', 'chatgpt-user', 'ccbot', 'claudebot', 'claude-web', 'anthropic-ai',
  'perplexitybot', 'perplexity-user', 'amazonbot', 'youbot', 'diffbot', 'cohere-ai', 'timpibot', 'omgili',
  // social unfurlers
  'facebookexternalhit', 'twitterbot', 'linkedinbot', 'slackbot', 'discordbot', 'whatsapp', 'telegrambot',
  'pinterest', 'redditbot', 'skypeuripreview', 'vkshare', 'embedly',
  // SEO tools
  'semrush', 'ahrefs', 'mj12bot', 'dotbot', 'dataforseo', 'rogerbot', 'screaming frog', 'sitebulb', 'serpstat',
  'blexbot', 'barkrowler',
  // monitoring / perf
  'uptimerobot', 'pingdom', 'statuscake', 'lighthouse', 'pagespeed', 'gtmetrix', 'chrome-lighthouse',
  'headlesschrome', 'phantomjs', 'puppeteer', 'playwright',
  // generic scrapers / libraries
  'python-requests', 'python-urllib', 'scrapy', 'curl/', 'wget', 'go-http-client', 'java/', 'okhttp',
  'axios', 'node-fetch', 'libwww', 'httpclient', 'aiohttp', 'guzzlehttp', 'winhttp', 'crawler', 'spider',
  'bytespider', 'bot;', 'bot/', 'bot)', '+bot', '-bot', ' bot ',
]

const BOT_NAMES = [
  ['googlebot', 'Googlebot'], ['adsbot', 'Google AdsBot'], ['mediapartners', 'Google AdSense'],
  ['google-inspectiontool', 'Google Inspection'], ['google-extended', 'Google-Extended (AI)'],
  ['storebot-google', 'Google StoreBot'],
  ['bingbot', 'Bingbot'], ['bingpreview', 'Bing Preview'], ['yandex', 'YandexBot'], ['baiduspider', 'Baidu'],
  ['duckduckbot', 'DuckDuckBot'], ['applebot', 'Applebot'], ['petalbot', 'PetalBot (Huawei)'],
  ['gptbot', 'OpenAI GPTBot'], ['oai-searchbot', 'OpenAI SearchBot'], ['chatgpt-user', 'ChatGPT (user fetch)'],
  ['ccbot', 'CommonCrawl'], ['claudebot', 'ClaudeBot'], ['claude-web', 'Claude-Web'],
  ['anthropic-ai', 'Anthropic AI'], ['perplexitybot', 'PerplexityBot'], ['perplexity-user', 'Perplexity (user)'],
  ['amazonbot', 'Amazonbot'], ['bytespider', 'ByteSpider (TikTok)'],
  ['facebookexternalhit', 'Facebook'], ['twitterbot', 'Twitter/X'], ['linkedinbot', 'LinkedIn'],
  ['slackbot', 'Slack'], ['discordbot', 'Discord'], ['whatsapp', 'WhatsApp'], ['telegrambot', 'Telegram'],
  ['redditbot', 'Reddit'], ['pinterest', 'Pinterest'],
  ['semrush', 'Semrush'], ['ahrefs', 'Ahrefs'], ['mj12bot', 'Majestic'], ['dotbot', 'Moz DotBot'],
  ['dataforseo', 'DataForSEO'], ['screaming frog', 'Screaming Frog'], ['blexbot', 'BLEXBot'],
  ['uptimerobot', 'UptimeRobot'], ['pingdom', 'Pingdom'], ['statuscake', 'StatusCake'],
  ['lighthouse', 'Lighthouse'], ['headlesschrome', 'Headless Chrome'], ['puppeteer', 'Puppeteer'],
  ['playwright', 'Playwright'],
  ['python-requests', 'python-requests'], ['scrapy', 'Scrapy'], ['curl/', 'curl'], ['wget', 'wget'],
  ['go-http-client', 'Go HTTP client'], ['okhttp', 'OkHttp'], ['axios', 'axios'], ['node-fetch', 'node-fetch'],
]

export function classifyUA(uaRaw) {
  const ua = String(uaRaw || '').toLowerCase()
  if (!ua) return { bot: true, name: 'Unknown (no UA)' }
  for (const p of BOT_PATTERNS) {
    if (ua.includes(p)) {
      const named = BOT_NAMES.find(([pat]) => ua.includes(pat))
      return { bot: true, name: named ? named[1] : 'Other bot' }
    }
  }
  // human: build "Browser · OS"
  let browser = 'Browser'
  if (ua.includes('edg/') || ua.includes('edga') || ua.includes('edgios')) browser = 'Edge'
  else if (ua.includes('samsungbrowser')) browser = 'Samsung'
  else if (ua.includes('opr/') || ua.includes('opera')) browser = 'Opera'
  else if (ua.includes('firefox') || ua.includes('fxios')) browser = 'Firefox'
  else if (ua.includes('crios')) browser = 'Chrome'
  else if (ua.includes('chrome')) browser = 'Chrome'
  else if (ua.includes('safari')) browser = 'Safari'
  let os = ''
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod') || ua.includes('ios')) os = 'iOS'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('mac os') || ua.includes('macintosh')) os = 'macOS'
  else if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('linux')) os = 'Linux'
  return { bot: false, name: os ? `${browser} · ${os}` : browser }
}

const SEARCH_ENGINES = [
  ['google.', 'Google Search'], ['bing.com', 'Bing'], ['duckduckgo', 'DuckDuckGo'],
  ['search.yahoo', 'Yahoo'], ['ecosia.org', 'Ecosia'], ['search.brave', 'Brave Search'],
  ['startpage.com', 'Startpage'], ['baidu.com', 'Baidu'], ['yandex.', 'Yandex'], ['qwant.com', 'Qwant'],
]
const AI_SOURCES = [
  ['chatgpt.com', 'ChatGPT'], ['chat.openai.com', 'ChatGPT'], ['perplexity.ai', 'Perplexity'],
  ['claude.ai', 'Claude'], ['copilot.microsoft', 'Copilot'], ['gemini.google', 'Gemini'],
  ['bard.google', 'Gemini'], ['you.com', 'You.com'], ['phind.com', 'Phind'],
]
const SOCIAL_SOURCES = [
  ['t.co', 'Twitter/X'], ['x.com', 'Twitter/X'], ['twitter.com', 'Twitter/X'], ['linkedin.com', 'LinkedIn'],
  ['lnkd.in', 'LinkedIn'], ['facebook.com', 'Facebook'], ['fb.com', 'Facebook'], ['reddit.com', 'Reddit'],
  ['news.ycombinator', 'Hacker News'], ['youtube.com', 'YouTube'], ['instagram.com', 'Instagram'],
  ['mastodon', 'Mastodon'], ['bsky.app', 'Bluesky'],
]

const SEARCH_TERM_PARAMS = ['q', 'query', 'p', 'text', 'wd', 'kw']

// classify a full referrer URL + our own landing query params.
// landingParams: object of whitelisted marketing params from the visited URL.
export function classifyReferrer(refRaw, landingParams = {}) {
  const lp = landingParams || {}
  // paid: a click id or paid medium on the landing URL wins regardless of referrer
  const gclid = lp.gclid || lp.gbraid || lp.wbraid
  const medium = String(lp.utm_medium || '').toLowerCase()
  const source = lp.utm_source ? String(lp.utm_source) : null
  const isPaid = !!gclid || medium === 'cpc' || medium === 'ppc' || medium === 'paid' || !!lp.msclkid
  const campaign = lp.utm_campaign || null

  let host = ''
  let term = null
  let refUrl = String(refRaw || '')
  try {
    if (refUrl) {
      const u = new URL(refUrl)
      host = u.hostname.toLowerCase()
      for (const key of SEARCH_TERM_PARAMS) {
        const v = u.searchParams.get(key)
        if (v) { term = v.slice(0, 80); break }
      }
    }
  } catch {
    host = ''
  }

  const isInternal = host.includes('infersia')

  if (isPaid) {
    const label = gclid ? 'Google Ads' : lp.msclkid ? 'Microsoft Ads' : source ? `Paid · ${source}` : 'Paid'
    return { channel: 'paid', label, term: term || lp.utm_term || null, campaign }
  }

  // utm-tagged non-paid (email, newsletter, partner)
  if (source && !isInternal) {
    return { channel: medium === 'email' ? 'email' : 'campaign', label: `${source}${campaign ? ` · ${campaign}` : ''}`, term: lp.utm_term || null, campaign }
  }

  if (!refUrl || isInternal) return { channel: 'direct', label: 'Direct / none', term: null, campaign: null }

  for (const [needle, name] of AI_SOURCES) if (host.includes(needle)) return { channel: 'ai', label: name, term, campaign: null }
  for (const [needle, name] of SEARCH_ENGINES) if (host.includes(needle)) return { channel: 'organic', label: name, term, campaign: null }
  for (const [needle, name] of SOCIAL_SOURCES) if (host.includes(needle)) return { channel: 'social', label: name, term, campaign: null }

  return { channel: 'referral', label: host.replace(/^www\./, '') || 'referral', term, campaign: null }
}

export const CHANNEL_LABELS = {
  organic: 'Organic search',
  paid: 'Paid search / ads',
  ai: 'AI assistants',
  social: 'Social',
  referral: 'Referral sites',
  email: 'Email',
  campaign: 'Campaigns',
  direct: 'Direct / none',
}
