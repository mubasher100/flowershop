import { Locale, localeOf } from "@lib/util/locale"

/**
 * UI strings.
 *
 * Arabic uses the conventional Gulf e-commerce terms — القائمة for menu,
 * السلة for bag, عرض الكل for view all — rather than literal translations,
 * because those are what shoppers here already recognise.
 *
 * This covers interface chrome only. Product names and descriptions are
 * content and live in Medusa, where they can be translated per locale by
 * someone who writes Arabic natively; machine-translated florist copy reads
 * as machine-translated.
 */
export const DICTIONARY = {
  en: {
    // Header and navigation
    "nav.menu": "Menu",
    "nav.bag": "Bag",
    "nav.search": "Search",
    "nav.home": "Home",
    "nav.shop": "Shop",
    "nav.occasions": "Occasions",
    "nav.allFlowers": "All flowers",
    "nav.shopAll": "Shop all flowers",
    "nav.close": "Close menu",
    "nav.open": "Open menu",

    // Standing promise
    "promise.sameDay": "Same-day delivery across Doha · Order before 6pm",
    "promise.title": "Same-day delivery across Doha",
    "promise.body": "Order before 6pm and it arrives today.",

    // Sections
    "section.shopByType": "Shop by type",
    "section.shopByOccasion": "Shop by occasion",
    "section.viewAll": "View all",
    "section.help": "Help",
    "section.collections": "Collections",
    "section.shop": "Shop",

    // Product
    "product.from": "From",
    "product.selectSize": "Select a size",
    "product.addToBag": "Add to bag",
    "product.outOfStock": "Out of stock",
    "product.soldOutSize": "Sold out in this size",
    "product.onlyLeft": "Only {count} left",
    "product.inStock": "In stock — {count} available",
    "product.flowerCare": "Flower care",
    "product.delivery": "Delivery",
    "product.payment": "Payment",

    // Accordion bodies
    "care.trim": "Trim 2cm off each stem at an angle before putting them in water.",
    "care.water": "Change the water every two days, and re-trim while you do.",
    "care.sun": "Keep them out of direct sun and away from air conditioning vents.",
    "care.fruit":
      "Keep them away from ripening fruit — it gives off ethylene, which makes petals drop early.",
    "care.leaves": "Strip any leaves that would sit below the waterline.",

    "delivery.sameDayLabel": "Same-day across Doha",
    "delivery.sameDayBody": "order before 6pm and it arrives today.",
    "delivery.window":
      "Choose a two-hour window at checkout, any time from 10am to 9pm.",
    "delivery.fresh":
      "Every arrangement is made the morning it goes out. Nothing sits in a fridge waiting for an order.",
    "delivery.confirm":
      "We'll message you on WhatsApp to confirm before the courier leaves.",

    "payment.nothingCharged": "Nothing is charged when you place the order.",
    "payment.confirm":
      "We check the flowers are in stock, then confirm the order and payment with you on WhatsApp.",
    "payment.cardSoon": "Card payment is coming soon.",

    // Homepage delivery reassurance strip
    "strip.sameDay": "Same-day across Doha",
    "strip.sameDayDetail": "Order by 6pm, delivered today.",
    "strip.hour": "Choose the hour",
    "strip.hourDetail": "Two-hour delivery windows, 10am to 9pm.",
    "strip.arranged": "Arranged to order",
    "strip.arrangedDetail": "Nothing sits in a fridge waiting.",
    "strip.note": "Free gift note",
    "strip.noteDetail": "Handwritten and sealed, at no charge.",

    // Product page reassurance block
    "product.promiseBody":
      "Order before 6pm and it arrives today. Pick a two-hour window at checkout, and we'll confirm on WhatsApp before it leaves.",

    // Hero carousel
    "hero.1.eyebrow": "Doha · Same-day delivery",
    "hero.1.title": "Flowers worth the journey",
    "hero.1.body":
      "Arranged the morning they're delivered. Order before 6pm and it arrives today.",
    "hero.1.cta": "Shop all flowers",
    "hero.1.alt": "A loose hand-tied bouquet of mixed seasonal flowers",

    "hero.2.eyebrow": "Signature roses",
    "hero.2.title": "Fifty stems, one gesture",
    "hero.2.body":
      "Hand-spiralled so the heads sit level, in glass or wrapped in matte paper.",
    "hero.2.cta": "Shop roses",
    "hero.2.alt": "Roses arranged closely in a clear glass vase",

    "hero.3.eyebrow": "In season",
    "hero.3.title": "Peonies are back, briefly",
    "hero.3.body": "Six weeks a year, and then they're gone until next spring.",
    "hero.3.cta": "Shop the season",
    "hero.3.alt": "Pale garden flowers in soft daylight",

    "hero.4.eyebrow": "The luxury edit",
    "hero.4.title": "For the occasions that matter",
    "hero.4.body":
      "Crystal spheres, hatboxes and hundred-stem arrangements, built to order.",
    "hero.4.cta": "Browse luxury",
    "hero.4.alt": "A luxury flower arrangement in a dark ceramic vase",

    // Homepage metadata
    "meta.homeTitle": "Flowershop — Same-day flower delivery in Doha",
    "meta.homeDescription":
      "Hand-tied bouquets, vase arrangements and signature roses, arranged in Doha and delivered the same day. Order by 6pm.",

    "a11y.skipToContent": "Skip to main content",
    "product.related": "You may also like",
    "home.title": "Same-day flower delivery in Doha",

    // Content pages
    "page.deliveryTitle": "Delivery & areas",
    "page.deliveryIntro":
      "We deliver across Doha and the surrounding municipalities, seven days a week.",
    "page.areasHeading": "Where we deliver",
    "page.areasNote":
      "If your area is not listed, order anyway and we will confirm on WhatsApp before charging anything.",
    "page.windowsHeading": "Delivery windows",
    "page.careTitle": "Flower care",
    "page.careIntro":
      "Cut flowers last far longer with a little attention. This is what we do in the shop.",
    "page.contactTitle": "Contact us",
    "page.contactIntro":
      "The quickest way to reach us is WhatsApp. We answer every order personally.",
    "page.contactOrder": "About an order",
    "page.contactOrderBody":
      "Place the order first — we confirm availability and payment with you on WhatsApp straight afterwards, so there is nothing to arrange in advance.",
    "page.contactHours": "When we answer",
    "page.contactHoursBody": "Every day, 9am to 9pm Doha time.",
    "page.backToShop": "Back to the flowers",

    // 404
    "notFound.title": "We can't find that page",
    "notFound.body":
      "The link may be out of date, or the page may have moved. The flowers are all still here.",
    "notFound.shop": "Browse the flowers",
    "notFound.home": "Go to the homepage",

    // Search
    "search.open": "Search",
    "search.placeholder": "Search flowers, roses, vases…",
    "search.close": "Close search",
    "search.clear": "Clear search",
    "search.empty": "No flowers match “{q}”",
    "search.emptyHint": "Try a colour, an occasion, or a flower name.",
    "search.results": "{count} results",
    "search.oneResult": "1 result",
    "search.viewAll": "See all results",
    "search.hint": "Start typing to search the catalogue.",
    "search.loading": "Loading the catalogue…",

    // Cart
    "cart.title": "Your bag",
    "cart.metaDescription": "Review the flowers in your bag before ordering.",
    "cart.item": "Item",
    "cart.quantity": "Quantity",
    "cart.price": "Price",
    "cart.total": "Total",
    "cart.summary": "Summary",
    "cart.checkout": "Go to checkout",
    "cart.emptyBody": "There is nothing in your bag yet.",
    "cart.browse": "Browse the flowers",

    // Guest checkout
    "checkout.yourDetails": "Your details",
    "checkout.detailsHelp":
      "We'll confirm your order on WhatsApp once we've checked the flowers are in stock.",
    "checkout.name": "Your name",
    "checkout.namePlaceholder": "Full name",
    "checkout.phone": "WhatsApp number",
    "checkout.phonePlaceholder": "e.g. 3312 3456",
    "checkout.phoneHelp":
      "This is how we reach you — please make sure it's on WhatsApp.",
    "checkout.delivery": "Delivery",
    "checkout.recipient": "Who is it for?",
    "checkout.optional": "(optional)",
    "checkout.recipientPlaceholder": "Leave blank if it's for you",
    "checkout.area": "Area",
    "checkout.chooseArea": "Choose an area",
    "checkout.address": "Building, street and any landmark",
    "checkout.addressPlaceholder":
      "Villa 12, Street 850, near Al Sadd Sports Club",
    "checkout.date": "Delivery date",
    "checkout.time": "Preferred time",
    "checkout.speed": "Delivery speed",
    "checkout.giftNote": "Gift note",
    "checkout.giftNotePlaceholder":
      "We'll write this by hand and seal it with the flowers.",
    "checkout.placing": "Sending your order…",
    "checkout.place": "Place order",
    "checkout.noCharge":
      "Nothing is charged now. We'll confirm availability and payment with you on WhatsApp.",

    // Store filters
    "filter.title": "Filters & sort",
    "filter.none": "None",
    "filter.active": "{count} active",
    "filter.search": "Search",
    "filter.searchPlaceholder": "Roses, peonies, vase…",
    "filter.colour": "Colour",
    "filter.category": "Category",
    "filter.price": "Price (QAR)",
    "filter.min": "Min",
    "filter.clearAll": "Clear all filters",
    "filter.emptyTitle": "Nothing matches those filters",
    "filter.emptyBody": "Try widening the price range or clearing a colour.",

    // Sort
    "sort.by": "Sort by",
    "sort.latest": "Latest arrivals",
    "sort.priceAsc": "Price: low to high",
    "sort.priceDesc": "Price: high to low",

    // Colours
    "colour.red": "Red",
    "colour.pink": "Pink",
    "colour.white": "White",
    "colour.purple": "Purple",
    "colour.yellow": "Yellow",
    "colour.green": "Green",
    "colour.orange": "Orange",
    "colour.mixed": "Mixed",

    // Footer
    "footer.tagline": "Arranged in Doha, delivered the same day. Order before 6pm.",
    "footer.deliveryAreas": "Delivery & areas",
    "footer.flowerCare": "Flower care",
    "footer.contact": "Contact us",
    "footer.yourBag": "Your bag",
    "footer.rights": "All rights reserved.",

    // Language
    "lang.switchTo": "العربية",
    "lang.label": "Language",
  },

  ar: {
    "nav.menu": "القائمة",
    "nav.bag": "السلة",
    "nav.search": "البحث",
    "nav.home": "الرئيسية",
    "nav.shop": "تسوق",
    "nav.occasions": "المناسبات",
    "nav.allFlowers": "كل الورود",
    "nav.shopAll": "تسوق كل الورود",
    "nav.close": "إغلاق القائمة",
    "nav.open": "فتح القائمة",

    "promise.sameDay": "توصيل في نفس اليوم داخل الدوحة · اطلب قبل ٦ مساءً",
    "promise.title": "توصيل في نفس اليوم داخل الدوحة",
    "promise.body": "اطلب قبل ٦ مساءً ويصلك اليوم.",

    "section.shopByType": "تسوق حسب النوع",
    "section.shopByOccasion": "تسوق حسب المناسبة",
    "section.viewAll": "عرض الكل",
    "section.help": "المساعدة",
    "section.collections": "المجموعات",
    "section.shop": "تسوق",

    "product.from": "يبدأ من",
    "product.selectSize": "اختر الحجم",
    "product.addToBag": "أضف إلى السلة",
    "product.outOfStock": "نفدت الكمية",
    "product.soldOutSize": "نفدت الكمية بهذا الحجم",
    "product.onlyLeft": "بقي {count} فقط",
    "product.inStock": "متوفر — {count} قطعة",
    "product.flowerCare": "العناية بالورود",
    "product.delivery": "التوصيل",
    "product.payment": "الدفع",

    "care.trim": "قصّ ٢ سم من كل ساق بشكل مائل قبل وضعها في الماء.",
    "care.water": "غيّر الماء كل يومين، وأعد قصّ السيقان في كل مرة.",
    "care.sun": "احفظها بعيداً عن أشعة الشمس المباشرة وعن مخارج التكييف.",
    "care.fruit":
      "أبعدها عن الفواكه الناضجة — فهي تُطلق غاز الإيثيلين الذي يُسرّع تساقط البتلات.",
    "care.leaves": "أزل الأوراق التي تقع تحت مستوى الماء.",

    "delivery.sameDayLabel": "توصيل في نفس اليوم داخل الدوحة",
    "delivery.sameDayBody": "اطلب قبل ٦ مساءً ويصلك اليوم.",
    "delivery.window":
      "اختر فترة زمنية من ساعتين عند إتمام الطلب، من ١٠ صباحاً حتى ٩ مساءً.",
    "delivery.fresh":
      "تُنسّق كل باقة صباح يوم التوصيل. لا شيء ينتظر في الثلاجة حتى يأتي طلب.",
    "delivery.confirm":
      "سنراسلك على واتساب للتأكيد قبل خروج المندوب.",

    "payment.nothingCharged": "لا يتم خصم أي مبلغ عند تقديم الطلب.",
    "payment.confirm":
      "نتأكد من توفر الورود، ثم نؤكد الطلب وطريقة الدفع معك على واتساب.",
    "payment.cardSoon": "الدفع بالبطاقة قريباً.",

    "strip.sameDay": "توصيل في نفس اليوم بالدوحة",
    "strip.sameDayDetail": "اطلب قبل ٦ مساءً، ويصلك اليوم.",
    "strip.hour": "اختر الوقت المناسب",
    "strip.hourDetail": "فترات توصيل من ساعتين، من ١٠ صباحاً حتى ٩ مساءً.",
    "strip.arranged": "تُنسّق عند الطلب",
    "strip.arrangedDetail": "لا شيء ينتظر في الثلاجة.",
    "strip.note": "بطاقة إهداء مجاناً",
    "strip.noteDetail": "مكتوبة بخط اليد ومغلّفة، دون أي رسوم.",

    "product.promiseBody":
      "اطلب قبل ٦ مساءً ويصلك اليوم. اختر فترة من ساعتين عند إتمام الطلب، وسنؤكد لك على واتساب قبل خروج الطلب.",

    "hero.1.eyebrow": "الدوحة · توصيل في نفس اليوم",
    "hero.1.title": "ورود تستحق الانتظار",
    "hero.1.body": "تُنسّق صباح يوم التوصيل. اطلب قبل ٦ مساءً ويصلك اليوم.",
    "hero.1.cta": "تسوق كل الورود",
    "hero.1.alt": "باقة ورد موسمي متنوع مربوطة يدوياً",

    "hero.2.eyebrow": "ورودنا المميزة",
    "hero.2.title": "خمسون ساقاً، لفتة واحدة",
    "hero.2.body":
      "مرتّبة يدوياً بشكل حلزوني لتتساوى الرؤوس، في مزهرية زجاجية أو بغلاف ورقي مطفي.",
    "hero.2.cta": "تسوق الورود",
    "hero.2.alt": "ورود مرتّبة بتقارب في مزهرية زجاجية شفافة",

    "hero.3.eyebrow": "في الموسم",
    "hero.3.title": "عاد البيوني، لفترة قصيرة",
    "hero.3.body": "ستة أسابيع في السنة، ثم يختفي حتى الربيع القادم.",
    "hero.3.cta": "تسوق منتجات الموسم",
    "hero.3.alt": "ورود حديقة فاتحة اللون في ضوء نهار هادئ",

    "hero.4.eyebrow": "تشكيلة الفخامة",
    "hero.4.title": "للمناسبات التي تستحق",
    "hero.4.body":
      "كرات كريستالية وعلب فاخرة وتنسيقات من مئة ساق، تُصنع حسب الطلب.",
    "hero.4.cta": "تصفح الفخامة",
    "hero.4.alt": "تنسيق ورد فاخر في مزهرية خزفية داكنة",

    "meta.homeTitle": "فلاورشوب — توصيل ورود في نفس اليوم بالدوحة",
    "meta.homeDescription":
      "باقات مربوطة يدوياً وتنسيقات مزهريات وورود مميزة، تُنسّق في الدوحة وتُوصّل في نفس اليوم. اطلب قبل ٦ مساءً.",

    "a11y.skipToContent": "تخطَّ إلى المحتوى الرئيسي",
    "product.related": "قد يعجبك أيضاً",
    "home.title": "توصيل ورود في نفس اليوم بالدوحة",

    "page.deliveryTitle": "التوصيل والمناطق",
    "page.deliveryIntro":
      "نوصّل في جميع أنحاء الدوحة والبلديات المجاورة، سبعة أيام في الأسبوع.",
    "page.areasHeading": "مناطق التوصيل",
    "page.areasNote":
      "إذا لم تجد منطقتك في القائمة، أرسل طلبك على أي حال وسنؤكد لك على واتساب قبل أي دفع.",
    "page.windowsHeading": "أوقات التوصيل",
    "page.careTitle": "العناية بالورود",
    "page.careIntro":
      "تدوم الورود المقطوفة أطول بكثير مع القليل من العناية. هذا ما نتّبعه في المتجر.",
    "page.contactTitle": "اتصل بنا",
    "page.contactIntro":
      "أسرع طريقة للتواصل معنا هي واتساب. نرد على كل طلب بأنفسنا.",
    "page.contactOrder": "بخصوص طلب",
    "page.contactOrderBody":
      "أرسل الطلب أولاً — سنؤكد التوفر وطريقة الدفع معك على واتساب مباشرة بعده، فلا حاجة لترتيب أي شيء مسبقاً.",
    "page.contactHours": "أوقات الرد",
    "page.contactHoursBody": "كل يوم، من ٩ صباحاً حتى ٩ مساءً بتوقيت الدوحة.",
    "page.backToShop": "العودة إلى الورود",

    "notFound.title": "لم نتمكن من العثور على الصفحة",
    "notFound.body":
      "قد يكون الرابط قديماً أو تكون الصفحة قد نُقلت. أما الورود فما زالت هنا جميعها.",
    "notFound.shop": "تصفح الورود",
    "notFound.home": "الذهاب إلى الصفحة الرئيسية",

    "search.open": "البحث",
    "search.placeholder": "ابحث عن ورود، مزهريات…",
    "search.close": "إغلاق البحث",
    "search.clear": "مسح البحث",
    "search.empty": "لا توجد ورود تطابق «{q}»",
    "search.emptyHint": "جرّب لوناً أو مناسبة أو اسم زهرة.",
    "search.results": "{count} نتيجة",
    "search.oneResult": "نتيجة واحدة",
    "search.viewAll": "عرض كل النتائج",
    "search.hint": "ابدأ الكتابة للبحث في المتجر.",
    "search.loading": "جارٍ تحميل المتجر…",

    "cart.title": "سلتك",
    "cart.metaDescription": "راجع الورود في سلتك قبل إتمام الطلب.",
    "cart.item": "المنتج",
    "cart.quantity": "الكمية",
    "cart.price": "السعر",
    "cart.total": "الإجمالي",
    "cart.summary": "ملخص الطلب",
    "cart.checkout": "إتمام الطلب",
    "cart.emptyBody": "لا يوجد شيء في سلتك بعد.",
    "cart.browse": "تصفح الورود",

    "checkout.yourDetails": "بياناتك",
    "checkout.detailsHelp":
      "سنؤكد طلبك على واتساب بعد التأكد من توفر الورود.",
    "checkout.name": "الاسم",
    "checkout.namePlaceholder": "الاسم الكامل",
    "checkout.phone": "رقم واتساب",
    "checkout.phonePlaceholder": "مثال: ٣٣١٢ ٣٤٥٦",
    "checkout.phoneHelp": "هذه وسيلة تواصلنا معك — تأكد أن الرقم مفعّل على واتساب.",
    "checkout.delivery": "التوصيل",
    "checkout.recipient": "لمن هذه الهدية؟",
    "checkout.optional": "(اختياري)",
    "checkout.recipientPlaceholder": "اتركه فارغاً إذا كان الطلب لك",
    "checkout.area": "المنطقة",
    "checkout.chooseArea": "اختر المنطقة",
    "checkout.address": "المبنى والشارع وأقرب معلم",
    "checkout.addressPlaceholder": "فيلا ١٢، شارع ٨٥٠، بالقرب من نادي السد الرياضي",
    "checkout.date": "تاريخ التوصيل",
    "checkout.time": "الوقت المفضل",
    "checkout.speed": "سرعة التوصيل",
    "checkout.giftNote": "بطاقة إهداء",
    "checkout.giftNotePlaceholder": "سنكتبها بخط اليد ونرفقها مع الورود.",
    "checkout.placing": "جارٍ إرسال طلبك…",
    "checkout.place": "إتمام الطلب",
    "checkout.noCharge":
      "لن يتم خصم أي مبلغ الآن. سنؤكد التوفر وطريقة الدفع معك على واتساب.",

    "filter.title": "التصفية والترتيب",
    "filter.none": "لا شيء",
    "filter.active": "{count} مفعّل",
    "filter.search": "البحث",
    "filter.searchPlaceholder": "ورود، بيوني، مزهرية…",
    "filter.colour": "اللون",
    "filter.category": "الفئة",
    "filter.price": "السعر (ر.ق)",
    "filter.min": "من",
    "filter.clearAll": "مسح كل الفلاتر",
    "filter.emptyTitle": "لا توجد نتائج مطابقة",
    "filter.emptyBody": "جرّب توسيع نطاق السعر أو إزالة أحد الألوان.",

    "sort.by": "ترتيب حسب",
    "sort.latest": "أحدث المنتجات",
    "sort.priceAsc": "السعر: من الأقل إلى الأعلى",
    "sort.priceDesc": "السعر: من الأعلى إلى الأقل",

    "colour.red": "أحمر",
    "colour.pink": "وردي",
    "colour.white": "أبيض",
    "colour.purple": "بنفسجي",
    "colour.yellow": "أصفر",
    "colour.green": "أخضر",
    "colour.orange": "برتقالي",
    "colour.mixed": "متعدد الألوان",

    "footer.tagline": "تُنسّق في الدوحة وتُوصّل في نفس اليوم. اطلب قبل ٦ مساءً.",
    "footer.deliveryAreas": "التوصيل والمناطق",
    "footer.flowerCare": "العناية بالورود",
    "footer.contact": "اتصل بنا",
    "footer.yourBag": "سلتك",
    "footer.rights": "جميع الحقوق محفوظة.",

    "lang.switchTo": "English",
    "lang.label": "اللغة",
  },
} as const

export type TranslationKey = keyof (typeof DICTIONARY)["en"]

/**
 * Looks up a string, filling {placeholders}.
 *
 * Falls back to English rather than rendering a raw key, so a missing Arabic
 * string degrades to readable text instead of "product.addToBag".
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const table = DICTIONARY[locale] ?? DICTIONARY.en
  let value: string = table[key] ?? DICTIONARY.en[key] ?? key

  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replace(`{${name}}`, String(replacement))
    }
  }

  return value
}

/** Translator bound to a URL segment, for server components. */
export function getTranslations(segment?: string | null) {
  const locale = localeOf(segment)
  return {
    locale,
    t: (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
  }
}
