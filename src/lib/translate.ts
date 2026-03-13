// ═══════════════════════════════════════════════════════════
//  SMM Translation Engine — Local Dictionary (No API needed)
//  Translates English SMM service/category names to Arabic
// ═══════════════════════════════════════════════════════════

// ── Platform Names ──
const PLATFORMS: Record<string, string> = {
  "instagram": "انستجرام",
  "facebook": "فيسبوك",
  "tiktok": "تيك توك",
  "tik tok": "تيك توك",
  "youtube": "يوتيوب",
  "twitter": "تويتر",
  "x.com": "تويتر",
  "telegram": "تيليجرام",
  "snapchat": "سناب شات",
  "spotify": "سبوتيفاي",
  "threads": "ثريدز",
  "linkedin": "لينكدإن",
  "pinterest": "بنترست",
  "reddit": "ريديت",
  "discord": "ديسكورد",
  "twitch": "تويتش",
  "whatsapp": "واتساب",
  "google": "جوجل",
  "kwai": "كواي",
  "likee": "لايكي",
  "soundcloud": "ساوند كلاود",
  "clubhouse": "كلوب هاوس",
  "vk": "في كي",
  "vkontakte": "في كونتاكتي",
  "dailymotion": "ديلي موشن",
  "vimeo": "فيميو",
  "tumblr": "تمبلر",
  "quora": "كورا",
  "periscope": "بريسكوب",
  "shazam": "شازام",
  "deezer": "ديزر",
  "apple music": "أبل ميوزك",
  "reverbnation": "ريفيرب نيشن",
  "mixcloud": "ميكس كلاود",
  "audiomack": "أوديوماك",
};

// ── Core SMM Terms ──
const SMM_TERMS: Record<string, string> = {
  // Engagement types
  "followers": "متابعين",
  "follower": "متابع",
  "following": "متابعة",
  "likes": "لايكات",
  "like": "لايك",
  "views": "مشاهدات",
  "view": "مشاهدة",
  "subscribers": "مشتركين",
  "subscriber": "مشترك",
  "comments": "تعليقات",
  "comment": "تعليق",
  "shares": "مشاركات",
  "share": "مشاركة",
  "reactions": "تفاعلات",
  "reaction": "تفاعل",
  "impressions": "مرات ظهور",
  "impression": "ظهور",
  "reach": "وصول",
  "engagement": "تفاعل",
  "members": "أعضاء",
  "member": "عضو",
  "plays": "تشغيلات",
  "streams": "استماعات",
  "stream": "استماع",
  "saves": "حفظ",
  "save": "حفظ",
  "reposts": "إعادة نشر",
  "repost": "إعادة نشر",
  "retweets": "ريتويتات",
  "retweet": "ريتويت",
  "clicks": "نقرات",
  "click": "نقرة",
  "visits": "زيارات",
  "visit": "زيارة",
  "traffic": "زيارات",
  "votes": "تصويتات",
  "vote": "تصويت",
  "pins": "بنات",
  "pin": "بن",
  "reviews": "مراجعات",
  "review": "مراجعة",
  "ratings": "تقييمات",
  "rating": "تقييم",
  "upvotes": "تصويت إيجابي",
  "downvotes": "تصويت سلبي",
  "bookmarks": "إشارات مرجعية",
  "favorites": "مفضلات",
  "friends": "أصدقاء",

  // Content types
  "story": "ستوري",
  "stories": "ستوريز",
  "reel": "ريلز",
  "reels": "ريلز",
  "post": "منشور",
  "posts": "منشورات",
  "video": "فيديو",
  "videos": "فيديوهات",
  "photo": "صورة",
  "photos": "صور",
  "shorts": "شورتس",
  "short": "شورت",
  "live": "بث مباشر",
  "livestream": "بث مباشر",
  "live stream": "بث مباشر",
  "poll": "استطلاع",
  "polls": "استطلاعات",
  "igtv": "IGTV",
  "page": "صفحة",
  "pages": "صفحات",
  "group": "مجموعة",
  "groups": "مجموعات",
  "channel": "قناة",
  "channels": "قنوات",
  "profile": "بروفايل",
  "account": "حساب",
  "tweet": "تغريدة",
  "tweets": "تغريدات",
  "space": "مساحة",
  "spaces": "مساحات",

  // Quality descriptors
  "real": "حقيقي",
  "active": "نشط",
  "premium": "مميز",
  "high quality": "جودة عالية",
  "hq": "جودة عالية",
  "ultra": "فائق",
  "super": "سوبر",
  "organic": "عضوي",
  "targeted": "مستهدف",
  "worldwide": "عالمي",
  "global": "عالمي",
  "usa": "أمريكي",
  "arab": "عربي",
  "arabic": "عربي",
  "mixed": "متنوع",
  "male": "ذكور",
  "female": "إناث",
  "bot": "بوت",
  "cheap": "رخيص",
  "fast": "سريع",
  "instant": "فوري",
  "slow": "بطيء",
  "gradual": "تدريجي",
  "drip feed": "تغذية تدريجية",
  "drip-feed": "تغذية تدريجية",
  "non drop": "بدون نقص",
  "non-drop": "بدون نقص",
  "no drop": "بدون نقص",
  "nodrop": "بدون نقص",
  "lifetime": "مدى الحياة",
  "permanent": "دائم",
  "stable": "مستقر",
  "verified": "موثّق",
  "exclusive": "حصري",
  "vip": "VIP",
  "pro": "احترافي",
  "basic": "أساسي",
  "standard": "قياسي",
  "starter": "مبتدئ",
  "advanced": "متقدم",
  "max": "أقصى",
  "min": "أدنى",
  "default": "افتراضي",
  "custom": "مخصص",
  "random": "عشوائي",
  "niche": "مخصص",
  "natural": "طبيعي",
  "legit": "حقيقي",

  // Speed & delivery
  "speed": "سرعة",
  "delivery": "توصيل",
  "start": "بدء",
  "instant start": "بدء فوري",
  "fast start": "بدء سريع",
  "slow start": "بدء بطيء",
  "per day": "يومياً",
  "per hour": "بالساعة",
  "daily": "يومي",
  "hourly": "ساعي",

  // Guarantee & refill
  "guarantee": "ضمان",
  "guaranteed": "مضمون",
  "warranty": "ضمان",
  "refill": "تعويض",
  "refill button": "زر التعويض",
  "auto refill": "تعويض تلقائي",
  "auto-refill": "تعويض تلقائي",
  "no refill": "بدون تعويض",
  "30 days": "30 يوم",
  "60 days": "60 يوم",
  "90 days": "90 يوم",
  "365 days": "365 يوم",
  "lifetime guarantee": "ضمان مدى الحياة",
  "cancel": "إلغاء",
  "cancelable": "قابل للإلغاء",
  "refund": "استرجاع",
  "replacement": "استبدال",

  // Actions
  "boost": "تعزيز",
  "promote": "ترويج",
  "increase": "زيادة",
  "grow": "نمو",
  "buy": "شراء",
  "add": "إضافة",
  "get": "احصل",
  "send": "إرسال",
  "watch": "مشاهدة",
  "watch hours": "ساعات مشاهدة",
  "watch time": "وقت المشاهدة",
  "monetization": "تحقيق الدخل",

  // YouTube specific
  "subs": "مشتركين",
  "watchtime": "ساعات مشاهدة",
  "premiere": "العرض الأول",
  "live viewers": "مشاهدين بث مباشر",
  "concurrent": "متزامن",
  "retention": "نسبة المشاهدة",
  "high retention": "نسبة مشاهدة عالية",
  "low retention": "نسبة مشاهدة منخفضة",
  "thumbs up": "إعجاب",
  "thumbs down": "عدم إعجاب",
  "dislikes": "عدم إعجاب",
  "dislike": "عدم إعجاب",
  "youtube seo": "تحسين محركات البحث يوتيوب",

  // Instagram specific
  "explore": "اكسبلور",
  "explore page": "صفحة الاكسبلور",
  "ig": "انستجرام",
  "igtv views": "مشاهدات IGTV",
  "carousel": "منشور متعدد",
  "highlight": "هايلايت",
  "bio link": "رابط البايو",

  // Facebook specific
  "fb": "فيسبوك",
  "fan page": "صفحة معجبين",
  "fanpage": "صفحة معجبين",
  "event": "حدث",
  "events": "أحداث",
  "emoticons": "إيموجي",
  "emoji": "إيموجي",
  "haha": "هاها",
  "love": "حب",
  "wow": "واو",
  "sad": "حزين",
  "angry": "غاضب",
  "care": "اهتمام",

  // Twitter/X specific
  "x": "إكس",
  "quote tweets": "اقتباسات",
  "hashtag": "هاشتاق",
  "trend": "ترند",
  "trending": "ترند",
  "space listeners": "مستمعين المساحات",

  // Telegram specific
  "tg": "تيليجرام",
  "channel members": "أعضاء القناة",
  "group members": "أعضاء المجموعة",
  "post views": "مشاهدات المنشور",
  "auto views": "مشاهدات تلقائية",

  // TikTok specific
  "fyp": "صفحة لك",
  "for you page": "صفحة لك",
  "duet": "ديويت",
  "stitch": "ستيتش",

  // Spotify specific
  "monthly listeners": "مستمعين شهريين",
  "playlist": "قائمة تشغيل",
  "playlist followers": "متابعين القائمة",
  "track": "مقطع",

  // General
  "service": "خدمة",
  "services": "خدمات",
  "package": "باقة",
  "packages": "باقات",
  "plan": "خطة",
  "server": "سيرفر",
  "panel": "لوحة",
  "api": "API",
  "seo": "تحسين محركات البحث",
  "smm": "تسويق سوشيال ميديا",
  "social media": "وسائل التواصل",
  "website": "موقع إلكتروني",
  "web": "ويب",
  "app": "تطبيق",
  "link": "رابط",
  "url": "رابط",
  "username": "اسم المستخدم",
  "mention": "إشارة",
  "mentions": "إشارات",
  "tag": "وسم",
  "new": "جديد",
  "old": "قديم",
  "update": "تحديث",
  "best": "أفضل",
  "top": "أفضل",
  "hot": "رائج",
  "sale": "تخفيض",
  "offer": "عرض",
  "discount": "خصم",
  "special": "خاص",
  "limited": "محدود",
  "recommended": "موصى به",
  "popular": "شائع",
  "test": "تجربة",
  "trial": "تجربة",
  "free": "مجاني",
  "paid": "مدفوع",
  "country": "دولة",
  "countries": "دول",
  "region": "منطقة",
  "geo": "جغرافي",
  "geo-targeted": "مستهدف جغرافياً",
};

// ── Category translations (full phrases) ──
const CATEGORY_PHRASES: Record<string, string> = {
  "instagram followers": "متابعين انستجرام",
  "instagram likes": "لايكات انستجرام",
  "instagram views": "مشاهدات انستجرام",
  "instagram comments": "تعليقات انستجرام",
  "instagram story": "ستوري انستجرام",
  "instagram reels": "ريلز انستجرام",
  "instagram auto": "انستجرام تلقائي",
  "instagram live": "بث مباشر انستجرام",
  "facebook followers": "متابعين فيسبوك",
  "facebook likes": "لايكات فيسبوك",
  "facebook views": "مشاهدات فيسبوك",
  "facebook page": "صفحة فيسبوك",
  "facebook group": "مجموعة فيسبوك",
  "facebook comments": "تعليقات فيسبوك",
  "facebook shares": "مشاركات فيسبوك",
  "facebook reactions": "تفاعلات فيسبوك",
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
  "snapchat followers": "متابعين سناب شات",
  "snapchat views": "مشاهدات سناب شات",
  "spotify plays": "تشغيلات سبوتيفاي",
  "spotify followers": "متابعين سبوتيفاي",
  "spotify listeners": "مستمعين سبوتيفاي",
  "threads followers": "متابعين ثريدز",
  "threads likes": "لايكات ثريدز",
  "linkedin followers": "متابعين لينكدإن",
  "linkedin likes": "لايكات لينكدإن",
  "discord members": "أعضاء ديسكورد",
  "twitch followers": "متابعين تويتش",
  "pinterest followers": "متابعين بنترست",
  "pinterest pins": "بنات بنترست",
  "reddit upvotes": "تصويتات ريديت",
  "google reviews": "مراجعات جوجل",
  "website traffic": "زيارات موقع",
  "seo services": "خدمات تحسين محركات البحث",
};

// ══════════════════════════════════════════
//  TRANSLATION FUNCTION
// ══════════════════════════════════════════

/**
 * Check if text is already Arabic
 */
function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/**
 * Translate a single SMM service/category name from English to Arabic.
 * Uses phrase matching first, then word-by-word translation.
 * Preserves numbers, symbols, and already-Arabic text.
 */
export function translateToArabic(text: string): string {
  if (!text || text.trim().length === 0) return text;

  // Already Arabic? Return as-is
  if (isArabic(text)) return text;

  const lower = text.toLowerCase().trim();

  // 1. Try full phrase match in categories
  for (const [eng, ar] of Object.entries(CATEGORY_PHRASES)) {
    if (lower === eng || lower.startsWith(eng + " ") || lower.includes(eng)) {
      // Replace the matched phrase and translate the rest
      const remaining = lower.replace(eng, "").trim();
      if (remaining) {
        return CATEGORY_PHRASES[eng] + " " + translateWords(remaining);
      }
      return CATEGORY_PHRASES[eng];
    }
  }

  // 2. Word-by-word translation with smart merging
  return translateWords(lower);
}

/**
 * Translate word by word, preserving structure
 */
function translateWords(text: string): string {
  // Split by common delimiters but keep them
  const parts = text.split(/(\s+[-|/~•·⚡🔥✅⭐]+\s+|\s+-\s+|\s+\|\s+)/);
  const translatedParts = parts.map(part => {
    if (/^[\s\-|/~•·⚡🔥✅⭐]+$/.test(part)) return part; // Keep delimiters

    // Try multi-word phrases first (longest match)
    let result = part.trim();
    const words = result.split(/\s+/);
    const translated: string[] = [];
    let i = 0;

    while (i < words.length) {
      let matched = false;

      // Try 3-word phrase, then 2-word, then single
      for (let len = Math.min(3, words.length - i); len >= 1; len--) {
        const phrase = words.slice(i, i + len).join(" ").toLowerCase();

        // Check platforms first
        if (PLATFORMS[phrase]) {
          translated.push(PLATFORMS[phrase]);
          i += len;
          matched = true;
          break;
        }

        // Then SMM terms
        if (SMM_TERMS[phrase]) {
          translated.push(SMM_TERMS[phrase]);
          i += len;
          matched = true;
          break;
        }
      }

      if (!matched) {
        const word = words[i].toLowerCase();
        // Keep numbers, special chars, and short codes as-is
        if (/^\d+[kKmM]?$/.test(word) || /^[#@$€£¥%]+/.test(word) || word.length <= 1) {
          translated.push(words[i]); // Keep original casing for non-translated
        } else if (PLATFORMS[word]) {
          translated.push(PLATFORMS[word]);
        } else if (SMM_TERMS[word]) {
          translated.push(SMM_TERMS[word]);
        } else {
          // Keep untranslated words as-is (brand names, technical terms)
          translated.push(words[i]);
        }
        i++;
      }
    }

    return translated.join(" ");
  });

  return translatedParts.join("").trim();
}

/**
 * Translate a category name
 */
export function translateCategory(name: string): string {
  if (!name || isArabic(name)) return name;
  return translateToArabic(name);
}

/**
 * Batch translate an array of service names
 */
export function translateBatch(names: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of names) {
    result[name] = translateToArabic(name);
  }
  return result;
}

/**
 * Get the appropriate name based on language
 */
export function getLocalizedName(nameAr: string, nameEn: string, lang: "ar" | "en" = "ar"): string {
  if (lang === "en") return nameEn || nameAr;
  return nameAr || nameEn;
}

// Export dictionaries for potential UI use
export { PLATFORMS, SMM_TERMS, CATEGORY_PHRASES };
