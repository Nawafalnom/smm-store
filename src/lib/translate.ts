// ═══════════════════════════════════════════════════════════════════
//  SMM Translation Engine v2 — Rich Arabic Output with Emoji Tags
//  Converts: "Instagram Followers Real Non Drop 30 Days Refill"
//  Into:     "متابعين إنستغرام |🔥حقيقية |💧بدون نقص |♻️30 يوم ضمان"
// ═══════════════════════════════════════════════════════════════════

// ── Platform detection ──
const PLATFORMS: [RegExp, string][] = [
  [/\binstagram\b|\binsta\b|\b(?:^|\s)ig(?:\s|$)\b/i, "إنستغرام"],
  [/\bfacebook\b|\b(?:^|\s)fb(?:\s|$)\b/i, "فيسبوك"],
  [/\btik\s*tok\b/i, "تيك توك"],
  [/\byoutube\b|\b(?:^|\s)yt(?:\s|$)\b/i, "يوتيوب"],
  [/\btwitter\b|\b(?:^|\s)x\.com\b|\bx\s+(?:followers|likes|views|retweets)\b/i, "تويتر"],
  [/\btelegram\b|\b(?:^|\s)tg(?:\s|$)\b/i, "تيليجرام"],
  [/\bsnapchat\b|\bsnap\b/i, "سناب شات"],
  [/\bspotify\b/i, "سبوتيفاي"],
  [/\bthreads\b/i, "ثريدز"],
  [/\blinkedin\b/i, "لينكدإن"],
  [/\bpinterest\b/i, "بنترست"],
  [/\breddit\b/i, "ريديت"],
  [/\bdiscord\b/i, "ديسكورد"],
  [/\btwitch\b/i, "تويتش"],
  [/\bwhatsapp\b/i, "واتساب"],
  [/\bgoogle\b/i, "جوجل"],
  [/\bkwai\b/i, "كواي"],
  [/\blikee\b/i, "لايكي"],
  [/\bsoundcloud\b/i, "ساوند كلاود"],
  [/\bclubhouse\b/i, "كلوب هاوس"],
  [/\bvimeo\b/i, "فيميو"],
  [/\bdeezer\b/i, "ديزر"],
  [/\bapple\s*music\b/i, "أبل ميوزك"],
  [/\beverbnation\b/i, "ريفيرب نيشن"],
  [/\baudiomack\b/i, "أوديوماك"],
  [/\bdailymotion\b/i, "ديلي موشن"],
];

// ── Service type detection → Arabic name ──
const SERVICE_TYPES: [RegExp, string][] = [
  [/\bfollowers?\b/i, "متابعين"],
  [/\bsubscribers?\b|\bsubs?\b/i, "مشتركين"],
  [/\blikes?\b|\bthumb(?:s)?\s*up\b/i, "لايكات"],
  [/\bviews?\b/i, "مشاهدات"],
  [/\bcomments?\b/i, "تعليقات"],
  [/\bshares?\b/i, "مشاركات"],
  [/\breactions?\b/i, "تفاعلات"],
  [/\bretweets?\b/i, "ريتويتات"],
  [/\breposts?\b/i, "إعادة نشر"],
  [/\bmembers?\b/i, "أعضاء"],
  [/\bplays?\b|\bstreams?\b/i, "تشغيلات"],
  [/\bmonthly\s*listeners?\b/i, "مستمعين شهريين"],
  [/\bwatch\s*hours?\b|\bwatch\s*time\b/i, "ساعات مشاهدة"],
  [/\bstory\s*views?\b|\bstories\s*views?\b/i, "مشاهدات ستوري"],
  [/\breel\s*(?:views?|likes?|plays?)\b|\breels?\b/i, "ريلز"],
  [/\bshorts?\s*(?:views?|likes?)?\b/i, "شورتس"],
  [/\bigtv\s*views?\b/i, "مشاهدات IGTV"],
  [/\blive\s*(?:viewers?|views?|stream)\b/i, "مشاهدين بث مباشر"],
  [/\bpost\s*views?\b/i, "مشاهدات المنشور"],
  [/\bsaves?\b|\bbookmarks?\b/i, "حفظ"],
  [/\bimpressions?\b/i, "مرات ظهور"],
  [/\bclicks?\b/i, "نقرات"],
  [/\btraffic\b|\bvisits?\b/i, "زيارات"],
  [/\breviews?\b/i, "مراجعات"],
  [/\bratings?\b/i, "تقييمات"],
  [/\bvotes?\b|\bupvotes?\b/i, "تصويتات"],
  [/\bfriends?\b/i, "أصدقاء"],
  [/\bmentions?\b/i, "إشارات"],
  [/\bfavorites?\b/i, "مفضلات"],
  [/\bplaylist\s*followers?\b/i, "متابعين القائمة"],
  [/\bchannel\s*(?:members?|subs?)\b/i, "أعضاء القناة"],
  [/\bgroup\s*members?\b/i, "أعضاء المجموعة"],
  [/\bpage\s*(?:likes?|followers?)\b/i, "إعجابات الصفحة"],
  [/\bspace\s*listeners?\b/i, "مستمعين المساحات"],
  [/\bemoji\b|\bemoticons?\b/i, "إيموجي"],
  [/\bdislikes?\b/i, "عدم إعجاب"],
  [/\bhashtag\b/i, "هاشتاق"],
  [/\btrend(?:ing)?\b/i, "ترند"],
];

// ── Facebook reaction sub-types ──
const FB_REACTIONS: [RegExp, string][] = [
  [/\blove\b/i, "❤️ حب"],
  [/\bhaha\b/i, "😂 هاها"],
  [/\bwow\b/i, "😮 واو"],
  [/\bsad\b/i, "😢 حزين"],
  [/\bangry\b/i, "😡 غاضب"],
  [/\bcare\b/i, "🤗 اهتمام"],
];

// ── Scope / targeting tags ──
const SCOPE_TAGS: [RegExp, string][] = [
  [/\b(?:page\s*\+?\s*profile|profile\s*\+?\s*page)\b/i, "صفحة + بروفايل"],
  [/\bpage\s*only\b|\bfan\s*page\b/i, "صفحة فقط"],
  [/\bprofile\s*only\b/i, "بروفايل فقط"],
  [/\bgroup\b/i, "مجموعة"],
  [/\bchannel\b/i, "قناة"],
];

// ── Quality / attribute detection → emoji + Arabic ──
interface AttrMatch { regex: RegExp; emoji: string; text: string | ((m: RegExpMatchArray) => string); priority: number; }

const ATTRIBUTES: AttrMatch[] = [
  // Instant / speed
  { regex: /\binstant\s*(?:start)?\b/i, emoji: "⚡", text: "فوري", priority: 10 },
  { regex: /\bfast\s*(?:start)?\b/i, emoji: "⚡", text: "فوري", priority: 10 },

  // Speed with number
  { regex: /\bspeed[:\s]*(\d+[\.,]?\d*)\s*[kK]\s*(?:\/|\s*per\s*)\s*(?:day|hr|hour)/i, emoji: "⚡", text: (m) => `السرعة +${formatNumber(m[1])} ألف/اليوم`, priority: 20 },
  { regex: /(\d+[\.,]?\d*)\s*[kK]\s*(?:\/|\s*per\s*)\s*(?:day)/i, emoji: "⚡", text: (m) => `السرعة +${formatNumber(m[1])} ألف/اليوم`, priority: 20 },
  { regex: /(\d+[\.,]?\d*)\s*[kK]\s*(?:\/|\s*per\s*)\s*(?:hr|hour)/i, emoji: "⚡", text: (m) => `السرعة +${formatNumber(m[1])} ألف/الساعة`, priority: 20 },
  { regex: /\bspeed[:\s]*(\d+[\.,]?\d*)\s*(?:\/|\s*per\s*)\s*(?:day)/i, emoji: "⚡", text: (m) => `السرعة +${m[1]}/اليوم`, priority: 20 },
  { regex: /\bslow\b/i, emoji: "🐢", text: "بطيء", priority: 20 },
  { regex: /\bgradual\b|\bdrip[\s-]*feed\b/i, emoji: "💧", text: "تدريجي", priority: 20 },

  // Drop quality
  { regex: /\bnon[\s-]*drop\b|\bno[\s-]*drop\b|\bnodrop\b/i, emoji: "💧", text: "بدون نقص", priority: 30 },
  { regex: /\blow[\s-]*drop\b|\bmin(?:imal)?\s*drop\b/i, emoji: "💧", text: "نقص قليل", priority: 30 },
  { regex: /\bstable\b/i, emoji: "💧", text: "مستقر", priority: 30 },

  // Account quality
  { regex: /\breal\s*(?:&|and|\+)?\s*active\b/i, emoji: "🔥", text: "حسابات حقيقية + نشطة", priority: 40 },
  { regex: /\breal\s*(?:accounts?|users?|people)?\s*(?:\+|with|&)?\s*(?:posts?|photos?|pics?)\b/i, emoji: "🔥", text: "حسابات حقيقية + منشورات", priority: 40 },
  { regex: /\breal\s*(?:accounts?|users?|people)\b/i, emoji: "🔥", text: "حسابات حقيقية", priority: 40 },
  { regex: /\breal\b/i, emoji: "🔥", text: "حقيقي", priority: 40 },
  { regex: /\borganic\b/i, emoji: "🌱", text: "عضوي", priority: 40 },
  { regex: /\bactive\b/i, emoji: "🔥", text: "نشط", priority: 40 },
  { regex: /\bbot(?:s)?\b/i, emoji: "🤖", text: "الجودة بوتات", priority: 40 },
  { regex: /\bpremium\b/i, emoji: "⭐", text: "مميز", priority: 40 },
  { regex: /\bhigh\s*quality\b|\bhq\b/i, emoji: "⭐", text: "جودة عالية", priority: 40 },
  { regex: /\bultra\b/i, emoji: "🔥", text: "فائق الجودة", priority: 40 },
  { regex: /\bverified\b/i, emoji: "✅", text: "موثّق", priority: 40 },
  { regex: /\blegit\b/i, emoji: "✅", text: "حقيقي", priority: 40 },
  { regex: /\bnatural\b/i, emoji: "🌿", text: "طبيعي", priority: 40 },
  { regex: /\bvip\b/i, emoji: "👑", text: "VIP", priority: 40 },
  { regex: /\bexclusive\b/i, emoji: "💎", text: "حصري", priority: 40 },

  // Targeting
  { regex: /\b100\s*%?\s*(?:real|arab(?:ic)?|egypt(?:ian)?)\b/i, emoji: "🎯", text: (m) => { const t = m[0].toLowerCase(); if (/egypt/i.test(t)) return "100% مصريين"; if (/arab/i.test(t)) return "100% عرب"; return "100% حقيقي"; }, priority: 45 },
  { regex: /\barab(?:ic)?\s*(?:target(?:ed)?|only|country|countries)?\b/i, emoji: "🎯", text: "عرب", priority: 45 },
  { regex: /\begypt(?:ian)?\b/i, emoji: "🎯", text: "مصريين", priority: 45 },
  { regex: /\busa\b|\bunited\s*states\b|\bamerican\b/i, emoji: "🎯", text: "أمريكي", priority: 45 },
  { regex: /\btarget(?:ed)?\b/i, emoji: "🎯", text: "مستهدف", priority: 45 },
  { regex: /\bworldwide\b|\bglobal\b|\bmixed\b/i, emoji: "🌍", text: "من أنحاء العالم", priority: 45 },
  { regex: /\bmale\b/i, emoji: "👨", text: "ذكور", priority: 45 },
  { regex: /\bfemale\b/i, emoji: "👩", text: "إناث", priority: 45 },
  { regex: /\bgeo[\s-]*target(?:ed)?\b/i, emoji: "🎯", text: "مستهدف جغرافياً", priority: 45 },

  // Guarantee / Refill
  { regex: /\b(\d+)\s*days?\s*(?:refill|guarantee|warranty)\b/i, emoji: "♻️", text: (m) => `${m[1]} يوم ضمان`, priority: 50 },
  { regex: /\b(?:refill|guarantee|warranty)\s*(\d+)\s*days?\b/i, emoji: "♻️", text: (m) => `${m[1]} يوم ضمان`, priority: 50 },
  { regex: /\blifetime\s*(?:refill|guarantee|warranty)\b|\b(?:refill|guarantee)\s*lifetime\b/i, emoji: "♻️", text: "ضمان مدى الحياة", priority: 50 },
  { regex: /\b365\s*days?\b/i, emoji: "♻️", text: "365 يوم ضمان", priority: 50 },
  { regex: /\bpermanent\b/i, emoji: "♻️", text: "دائم", priority: 50 },
  { regex: /\bauto[\s-]*refill\b/i, emoji: "♻️", text: "تعويض تلقائي", priority: 50 },
  { regex: /\brefill\s*(?:button|enabled)\b/i, emoji: "♻️", text: "زر التعويض", priority: 50 },
  { regex: /\brefill\b(?!\s*\d)/i, emoji: "♻️", text: "تعويض", priority: 50 },
  { regex: /\bno\s*(?:refill|guarantee|warranty)\b/i, emoji: "⛔", text: "بدون ضمان", priority: 50 },
  { regex: /\bcancel(?:l?able)?\b/i, emoji: "🚫", text: "قابل للإلغاء", priority: 55 },

  // Completion
  { regex: /\binstant\s*(?:completion|delivery|complete)\b/i, emoji: "🔥", text: "اكتمال فوري", priority: 15 },

  // Retention (YouTube)
  { regex: /\bhigh\s*retention\b/i, emoji: "📈", text: "نسبة مشاهدة عالية", priority: 42 },
  { regex: /\blow\s*retention\b/i, emoji: "📉", text: "نسبة مشاهدة منخفضة", priority: 42 },

  // Monetization
  { regex: /\bmonetiz(?:ation|e)\b/i, emoji: "💰", text: "تحقيق الدخل", priority: 42 },

  // Explore / FYP
  { regex: /\bexplore\s*page\b|\bexplore\b/i, emoji: "🔍", text: "اكسبلور", priority: 42 },
  { regex: /\bfyp\b|\bfor\s*you\s*page\b/i, emoji: "🔍", text: "صفحة لك", priority: 42 },
];

// ── Helpers ──
function formatNumber(n: string): string {
  const num = parseFloat(n.replace(",", "."));
  if (num >= 1000) return `${Math.round(num / 1000)} مليون`;
  return n.replace(".", ",");
}

function isArabic(text: string): boolean {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  return arabicChars > text.length * 0.3; // More than 30% Arabic = already Arabic
}

// ═══════════════════════════════════════════════════════
//  MAIN TRANSLATION FUNCTION
// ═══════════════════════════════════════════════════════

export function translateToArabic(text: string): string {
  if (!text || text.trim().length === 0) return text;
  if (isArabic(text)) return text;

  const input = text.trim();

  // 1. Detect platform
  let platform = "";
  let platformUsed = "";
  for (const [regex, ar] of PLATFORMS) {
    const m = input.match(regex);
    if (m) {
      platform = ar;
      platformUsed = m[0];
      break;
    }
  }

  // 2. Detect service type
  let serviceType = "";
  let serviceTypeUsed = "";
  for (const [regex, ar] of SERVICE_TYPES) {
    const m = input.match(regex);
    if (m) {
      serviceType = ar;
      serviceTypeUsed = m[0];
      break;
    }
  }

  // 3. Detect Facebook reaction type
  let fbReaction = "";
  for (const [regex, ar] of FB_REACTIONS) {
    if (regex.test(input)) {
      fbReaction = ar;
      break;
    }
  }

  // 4. Detect scope tags (page+profile, channel, etc.)
  let scope = "";
  for (const [regex, ar] of SCOPE_TAGS) {
    if (regex.test(input)) {
      scope = ar;
      break;
    }
  }

  // 5. Collect all matching attributes (with dedup by category)
  const matched: { emoji: string; text: string; priority: number }[] = [];
  const usedCategories = new Set<string>();

  // Helper: get category key for dedup
  function getCatKey(emoji: string, priority: number): string {
    if (emoji === "💧") return "drop";
    if (emoji === "♻️" || emoji === "⛔") return "guarantee";
    if (emoji === "🔥" || emoji === "🌱" || emoji === "⭐" || emoji === "✅" || emoji === "🌿" || emoji === "👑" || emoji === "💎" || emoji === "🤖") return "quality";
    if (emoji === "🎯" || emoji === "🌍" || emoji === "👨" || emoji === "👩") return "target";
    if (priority === 10) return "instant";
    if (priority === 20) return "speed";
    return `${emoji}_${priority}`;
  }

  // Sort attributes: "no refill/guarantee" patterns first, then longer patterns first
  const sortedAttrs = [...ATTRIBUTES].sort((a, b) => {
    // "No" patterns win over positive patterns in same category
    const aNo = a.regex.source.includes("\\bno");
    const bNo = b.regex.source.includes("\\bno");
    if (aNo && !bNo) return -1;
    if (!aNo && bNo) return 1;
    // Longer regex patterns first (more specific)
    return b.regex.source.length - a.regex.source.length;
  });

  for (const attr of sortedAttrs) {
    const m = input.match(attr.regex);
    if (m) {
      const txt = typeof attr.text === "function" ? attr.text(m) : attr.text;
      const catKey = getCatKey(attr.emoji, attr.priority);

      // Skip if we already have a match in this category
      if (usedCategories.has(catKey)) continue;
      usedCategories.add(catKey);

      matched.push({ emoji: attr.emoji, text: txt, priority: attr.priority });
    }
  }

  // Sort by priority
  matched.sort((a, b) => a.priority - b.priority);

  // 6. Build output
  const parts: string[] = [];

  // Service name: "متابعين إنستغرام" or "مشاهدات تيك توك"
  let mainTitle = "";
  if (serviceType && platform) {
    mainTitle = `${serviceType} ${platform}`;
  } else if (serviceType) {
    mainTitle = serviceType;
  } else if (platform) {
    mainTitle = platform;
  } else {
    // Fallback: simple word-by-word
    return translateSimple(input);
  }

  // Add scope in parentheses: "متابعين فيسبوك (صفحة + بروفايل)"
  if (scope) {
    mainTitle += ` (${scope})`;
  }

  // Add fb reaction if present
  if (fbReaction) {
    mainTitle += ` - ${fbReaction}`;
  }

  // Check for instant tag — put it in brackets after title
  const hasInstant = matched.some(m => m.priority === 10);
  if (hasInstant) {
    mainTitle += " [ ⚡فوري ]";
  }

  parts.push(mainTitle);

  // Add attribute tags (skip instant since already added in brackets)
  for (const m of matched) {
    if (m.priority === 10) continue; // instant already in brackets
    parts.push(`${m.emoji}${m.text}`);
  }

  return parts.join(" |");
}

// ═══════════════════════════════════════════════════════
//  SIMPLE TRANSLATION (fallback for non-standard names)
// ═══════════════════════════════════════════════════════

const SIMPLE_DICT: Record<string, string> = {
  "instagram": "إنستغرام", "facebook": "فيسبوك", "tiktok": "تيك توك", "tik tok": "تيك توك",
  "youtube": "يوتيوب", "twitter": "تويتر", "telegram": "تيليجرام", "snapchat": "سناب شات",
  "spotify": "سبوتيفاي", "threads": "ثريدز", "linkedin": "لينكدإن", "pinterest": "بنترست",
  "reddit": "ريديت", "discord": "ديسكورد", "twitch": "تويتش", "whatsapp": "واتساب",
  "google": "جوجل", "kwai": "كواي",
  "followers": "متابعين", "likes": "لايكات", "views": "مشاهدات", "comments": "تعليقات",
  "shares": "مشاركات", "subscribers": "مشتركين", "members": "أعضاء", "reactions": "تفاعلات",
  "retweets": "ريتويتات", "plays": "تشغيلات", "saves": "حفظ", "impressions": "مرات ظهور",
  "story": "ستوري", "stories": "ستوريز", "reels": "ريلز", "reel": "ريلز", "shorts": "شورتس",
  "live": "بث مباشر", "post": "منشور", "posts": "منشورات", "video": "فيديو", "videos": "فيديوهات",
  "page": "صفحة", "group": "مجموعة", "channel": "قناة", "profile": "بروفايل",
  "real": "حقيقي", "active": "نشط", "premium": "مميز", "high quality": "جودة عالية",
  "hq": "جودة عالية", "fast": "سريع", "instant": "فوري", "slow": "بطيء",
  "non drop": "بدون نقص", "no drop": "بدون نقص", "refill": "تعويض", "guarantee": "ضمان",
  "worldwide": "عالمي", "global": "عالمي", "targeted": "مستهدف", "organic": "عضوي",
  "bot": "بوت", "bots": "بوتات", "cheap": "رخيص", "new": "جديد", "best": "أفضل",
  "recommended": "موصى به", "popular": "شائع", "special": "خاص", "exclusive": "حصري",
  "service": "خدمة", "services": "خدمات", "package": "باقة", "server": "سيرفر",
  "traffic": "زيارات", "website": "موقع", "seo": "SEO", "daily": "يومي",
  "custom": "مخصص", "random": "عشوائي", "default": "افتراضي", "auto": "تلقائي",
  "male": "ذكور", "female": "إناث", "arab": "عربي", "arabic": "عربي",
  "watch hours": "ساعات مشاهدة", "watch time": "وقت المشاهدة",
};

function translateSimple(text: string): string {
  if (isArabic(text)) return text;
  let result = text.toLowerCase();

  // Sort by length desc to match longer phrases first
  const entries = Object.entries(SIMPLE_DICT).sort((a, b) => b[0].length - a[0].length);
  for (const [eng, ar] of entries) {
    const regex = new RegExp(`\\b${eng.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    result = result.replace(regex, ar);
  }

  // Clean up extra spaces
  return result.replace(/\s+/g, " ").trim();
}

// ═══════════════════════════════════════════════════════
//  CATEGORY TRANSLATION
// ═══════════════════════════════════════════════════════

const CATEGORY_MAP: Record<string, string> = {
  "instagram followers": "متابعين إنستغرام",
  "instagram likes": "لايكات إنستغرام",
  "instagram views": "مشاهدات إنستغرام",
  "instagram comments": "تعليقات إنستغرام",
  "instagram story": "ستوري إنستغرام",
  "instagram reels": "ريلز إنستغرام",
  "instagram auto": "إنستغرام تلقائي",
  "instagram live": "بث مباشر إنستغرام",
  "instagram igtv": "IGTV إنستغرام",
  "facebook followers": "متابعين فيسبوك",
  "facebook likes": "لايكات فيسبوك",
  "facebook page likes": "إعجابات صفحة فيسبوك",
  "facebook views": "مشاهدات فيسبوك",
  "facebook page": "صفحة فيسبوك",
  "facebook group": "مجموعة فيسبوك",
  "facebook comments": "تعليقات فيسبوك",
  "facebook shares": "مشاركات فيسبوك",
  "facebook reactions": "تفاعلات فيسبوك",
  "facebook emoticons": "تفاعلات فيسبوك",
  "tiktok followers": "متابعين تيك توك",
  "tiktok likes": "لايكات تيك توك",
  "tiktok views": "مشاهدات تيك توك",
  "tiktok comments": "تعليقات تيك توك",
  "tiktok shares": "مشاركات تيك توك",
  "tiktok live": "بث مباشر تيك توك",
  "youtube subscribers": "مشتركين يوتيوب",
  "youtube views": "مشاهدات يوتيوب",
  "youtube likes": "لايكات يوتيوب",
  "youtube comments": "تعليقات يوتيوب",
  "youtube watch hours": "ساعات مشاهدة يوتيوب",
  "youtube shorts": "شورتس يوتيوب",
  "youtube live": "بث مباشر يوتيوب",
  "twitter followers": "متابعين تويتر",
  "twitter likes": "لايكات تويتر",
  "twitter retweets": "ريتويتات تويتر",
  "twitter views": "مشاهدات تويتر",
  "telegram members": "أعضاء تيليجرام",
  "telegram views": "مشاهدات تيليجرام",
  "telegram reactions": "تفاعلات تيليجرام",
  "telegram channel": "قناة تيليجرام",
  "telegram group": "مجموعة تيليجرام",
  "snapchat followers": "متابعين سناب شات",
  "snapchat views": "مشاهدات سناب شات",
  "spotify plays": "تشغيلات سبوتيفاي",
  "spotify followers": "متابعين سبوتيفاي",
  "spotify listeners": "مستمعين سبوتيفاي",
  "spotify monthly listeners": "مستمعين شهريين سبوتيفاي",
  "threads followers": "متابعين ثريدز",
  "threads likes": "لايكات ثريدز",
  "linkedin followers": "متابعين لينكدإن",
  "linkedin likes": "لايكات لينكدإن",
  "discord members": "أعضاء ديسكورد",
  "twitch followers": "متابعين تويتش",
  "pinterest followers": "متابعين بنترست",
  "reddit upvotes": "تصويتات ريديت",
  "google reviews": "مراجعات جوجل",
  "website traffic": "زيارات الموقع",
  "seo services": "خدمات SEO",
};

export function translateCategory(name: string): string {
  if (!name || isArabic(name)) return name;
  const lower = name.toLowerCase().trim();

  // Try exact match
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];

  // Try partial match
  for (const [eng, ar] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(eng)) return ar;
  }

  // Fallback: simple translate
  return translateSimple(name);
}

/**
 * Batch translate
 */
export function translateBatch(names: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of names) result[name] = translateToArabic(name);
  return result;
}

/**
 * Get localized name based on language
 */
export function getLocalizedName(nameAr: string, nameEn: string, lang: "ar" | "en" = "ar"): string {
  if (lang === "en") return nameEn || nameAr;
  return nameAr || nameEn;
}

export { SIMPLE_DICT as PLATFORMS_DICT, CATEGORY_MAP };
