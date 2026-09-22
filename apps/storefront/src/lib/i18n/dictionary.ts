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
    "promise.sameDayShort": "Same-day delivery across Qatar",
    "brand.strapline": "Flowers • Chocolates • Gifts • Happiness",
    "brand.location": "Doha, Qatar",
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
    "product.added": "Added to bag ✓",
    "product.addFailed": "That didn't go in — please try again.",
    "product.outOfStock": "Out of stock",
    "product.soldOutSize": "Sold out in this size",
    "product.onlyLeft": "Only {count} left",
    "product.inStock": "In stock — {count} available",
    // Personalisation, on the product page
    "personalise.heading": "Make it personal",
    "personalise.optional": "Optional",
    "personalise.note": "Gift message",
    "personalise.notePlaceholder":
      "Handwritten on a card and sealed with the flowers.",
    "personalise.noteRemaining": "{count} characters left",
    "personalise.ribbon": "Ribbon",
    "personalise.ribbonNone": "No ribbon",
    "ribbon.blush": "Blush",
    "ribbon.ivory": "Ivory",
    "ribbon.sage": "Sage",
    "ribbon.gold": "Gold",
    "ribbon.burgundy": "Burgundy",

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
    "delivery.midnight":
      "For a birthday, choose 11:59 at checkout: we arrive at one minute to midnight the night before, so it is in their hands as the day begins. Pre-order only — we take tonight's 11:59 orders between 12pm and 6pm.",

    "payment.nothingCharged": "Nothing is charged when you place the order.",
    "payment.confirm":
      "We check the flowers are in stock, then confirm the order and payment with you on WhatsApp.",
    "payment.cardSoon": "Card payment is coming soon.",

    // Homepage delivery reassurance strip
    "strip.sameDay": "Same day delivery",
    "strip.sameDayDetail": "Across Qatar",
    "strip.hour": "Fresh flowers",
    "strip.hourDetail": "Handpicked with care",
    "strip.arranged": "Luxury gifts",
    "strip.arrangedDetail": "For every occasion",
    "strip.note": "Make someone smile",
    "strip.noteDetail": "Because you care",

    // Product page reassurance block
    "product.promiseBody":
      "Order before 6pm and it arrives today. Pick a two-hour window at checkout, and we'll confirm on WhatsApp before it leaves.",

    // Hero carousel
    "hero.1.eyebrow": "Flowers · Chocolates · Gifts",
    "hero.1.title": "Tulips and Truffles",
    "hero.1.body": "Beautiful blooms. Thoughtful gifts. Happier moments.",
    "hero.1.cta": "Shop now",
    "hero.1.alt":
      "A bouquet of pink tulips in blush wrapping, tied with a Tulips and Truffles ribbon, beside a gift box",

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
    "meta.homeTitle": "Tulips and Truffles — Flowers & gifts, same-day delivery in Doha",
    "meta.homeDescription":
      "Beautiful blooms, thoughtful gifts, happier moments. Fresh flowers and luxury gifts, arranged in Doha and delivered across Qatar the same day.",

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
    "checkout.speed": "Delivery",
    "midnight.name": "11:59 Midnight Surprise",
    "midnight.tag": "11:59",
    "midnight.pitch":
      "We arrive at 11:59pm the night before, so it is in their hands the moment the day begins.",
    "midnight.window": "Arrives at 11:59pm",
    "midnight.dateLabel": "The night before — we arrive at 11:59pm",
    "midnight.dateHint":
      "Choose the day before the birthday. The surprise lands as the clock turns midnight.",
    "midnight.pageTitle": "11:59 — the midnight surprise",
    "midnight.pageBody":
      "Some moments should not wait until morning. Choose 11:59 at checkout and our courier arrives at one minute to midnight the night before, so the first thing that happens on their birthday is your flowers at the door.",
    "midnight.priceNote": "An extra {amount} on any bouquet.",
    "midnight.preorder": "Pre-order only",
    "midnight.preorderHint":
      "We take 11:59 orders between 12pm and 6pm for that night. Later nights can be booked any time.",
    "midnight.closedTonight":
      "Tonight's 11:59 orders closed at 6pm, so the earliest night is tomorrow.",
    "midnight.notYetTonight":
      "Tonight's 11:59 orders open at 12pm. Pick another night, or come back after 12.",
    "checkout.giftNote": "Gift note",
    "checkout.giftNotePlaceholder":
      "We'll write this by hand and seal it with the flowers.",
    // Demo payment gateway
    "pay.heading": "Payment",
    "pay.testBanner":
      "Demo mode — this is a simulation. No card is charged and no card details are collected.",
    "pay.method": "How would you like to pay?",
    "pay.onDelivery": "Confirm on WhatsApp",
    "pay.onDeliveryHint":
      "We check the flowers are in stock, then confirm the order and payment with you.",
    "pay.card": "Pay by card (demo)",
    "pay.cardHint": "Simulates a card payment so the flow can be demonstrated.",
    "pay.cardNumber": "Card number",
    "pay.expiry": "Expiry",
    "pay.cvc": "CVC",
    "pay.nameOnCard": "Name on card",
    "pay.testCardNote": "Fixed test card — this field cannot be edited.",
    "pay.outcome": "Simulate result",
    "pay.approve": "Approved",
    "pay.decline": "Declined",
    "pay.processing": "Contacting the bank…",
    "pay.approved": "Payment approved (demo)",
    "pay.declined": "The demo card was declined. Nothing was charged.",
    "pay.payNow": "Pay {amount}",

    "checkout.placing": "Sending your order…",
    "checkout.place": "Place order",
    "product.substitution":
      "Flowers are seasonal. If a variety or colour is unavailable we substitute one of equal or greater value in the same style, and tell you before we change the look of an arrangement.",
    "page.trackTitle": "Track your order",
    "page.trackIntro":
      "Enter your order number and the phone number on the order, and we will show you where it is.",
    "track.orderNumber": "Order number",
    "track.orderNumberPlaceholder": "e.g. 14",
    "track.phone": "Phone number on the order",
    "track.find": "Find my order",
    "track.searching": "Looking…",
    "track.order": "Order",
    "track.delivery": "Delivery",
    "track.recipient": "For",
    "track.preparing": "Preparing",
    "track.sent": "On its way",
    "track.cancelled": "Cancelled",
    "track.help": "Something not right? Message us on WhatsApp and we will sort it out.",
    "footer.track": "Track your order",
    "checkout.recipientPhone": "Recipient's phone",
    "checkout.recipientPhoneHelp":
      "Our driver calls this number at the door. If the flowers are for you, use your own.",
    "checkout.instructions": "Delivery instructions",
    "checkout.instructionsPlaceholder":
      "Floor, gate code, or leave with reception",
    "checkout.sameDayClosed":
      "Today's deliveries have closed. The earliest we can deliver is tomorrow.",
    "checkout.summaryHeading": "In your bag",
    "cart.shippingAtCheckout": "Chosen at checkout",
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
    "section.legal": "Legal",
    "footer.privacy": "Privacy policy",
    "footer.terms": "Terms and conditions",
    "footer.returns": "Returns and cancellation",
    "legal.tradingName": "Trading name",
    "legal.cr": "Commercial registration",
    "legal.address": "Address",
    "legal.whatsapp": "WhatsApp",
    "legal.email": "Email",
    "legal.lastUpdated": "Last updated 21 September 2026.",
    "common.and": "and",
    "checkout.agree": "By placing your order you agree to our",
    "checkout.cancelNote": "You can cancel free of charge until we start preparing your flowers — see",
    "checkout.pricesNote": "All prices are in Qatari Riyal and are the full amount you pay. Delivery is shown above; Qatar applies no VAT.",

    "page.privacyTitle": "Privacy policy",
    "page.privacyIntro": "How we handle the personal data you give us when you order, under Qatar's Personal Data Privacy Protection Law (Law No. 13 of 2016).",
    "privacy.s1.h": "What we collect",
    "privacy.s1.b": "Your name and phone number; the recipient's name, delivery area and address; the delivery date and time; and your gift message. If you pay by card, a payment reference. We never see or store card numbers — those are handled by the payment provider.",
    "privacy.s2.h": "Why we use it",
    "privacy.s2.b": "To prepare and deliver your order, to contact you on WhatsApp to confirm it, and to sort out any problem with a delivery. We do not use your details for marketing, and we do not sell them or share them with anyone for their own purposes.",
    "privacy.s3.h": "Who handles it",
    "privacy.s3.b": "Orders are stored with our hosting providers, Supabase and Railway, in Singapore, and the website is served through Cloudflare. They act only on our instructions. Deliveries are made by our own team, who see the recipient's name, address, phone number and gift message and nothing else.",
    "privacy.s4.h": "Cookies",
    "privacy.s4.b": "The site sets only the cookies it needs to work: one that remembers your bag and one that keeps pages loading quickly. There are no advertising or tracking cookies and no analytics, which is why we do not ask for cookie consent.",
    "privacy.s5.h": "How long we keep it",
    "privacy.s5.b": "Order records, including the gift message, are kept for five years to meet accounting obligations and then deleted. If you never placed an order, nothing about you is kept.",
    "privacy.s6.h": "Your rights",
    "privacy.s6.b": "You can ask what we hold about you, ask us to correct it, or ask us to delete it where the law allows. Message us on WhatsApp or write to the address below and we will answer within 30 days. If you are not satisfied, you may complain to the Compliance and Data Protection Department of the National Cyber Security Agency.",
    "privacy.s7.h": "Who we are",

    "page.termsTitle": "Terms and conditions",
    "page.termsIntro": "The terms on which we sell flowers and gifts online in Qatar. Placing an order means you accept them.",
    "terms.s1.h": "Who we are",
    "terms.s2.h": "Orders and confirmation",
    "terms.s2.b": "An order is placed when you press Place order at checkout. We confirm it by WhatsApp, and the contract is made when we confirm. If we cannot fulfil an order — a flower out of season, an address we do not reach — we tell you before preparing it and offer an alternative or a full refund.",
    "terms.s3.h": "Prices and payment",
    "terms.s3.b": "All prices are in Qatari Riyal (QAR) and are the full amount you pay: delivery is shown separately at checkout before you order, and Qatar applies no VAT. Until online card payment is available, payment is taken on delivery or as agreed on WhatsApp.",
    "terms.s4.h": "Delivery",
    "terms.s4.b": "We deliver across the areas listed on our Delivery page, within the time slot you choose. 11:59 orders arrive at one minute to midnight on the night you choose and must be placed between 12pm and 6pm that day. If nobody is available at the address we call the number on the order; if we cannot reach anyone we try once more the same day at no charge, after which redelivery is charged as a new delivery.",
    "terms.s5.h": "Substitutions",
    "terms.s5.b": "Flowers are seasonal. If a variety or colour is unavailable we may substitute one of equal or greater value in the same style. We will not change the overall look of an arrangement without telling you first.",
    "terms.s6.h": "Cancellation, returns and refunds",
    "terms.s6.b": "Our Returns and cancellation policy forms part of these terms.",
    "terms.s7.h": "Our responsibility",
    "terms.s7.b": "We are responsible for delivering what you ordered, in good condition, at the agreed time. We are not responsible for a delivery that fails because the address or phone number given was wrong, or for anything beyond our reasonable control. Nothing in these terms limits your rights under Qatar's Consumer Protection Law No. 8 of 2008.",
    "terms.s8.h": "Governing law",
    "terms.s8.b": "These terms are governed by the laws of the State of Qatar and any dispute is for the courts of Qatar. You may also complain to the Consumer Protection Department of the Ministry of Commerce and Industry.",

    "page.returnsTitle": "Returns, cancellation and refunds",
    "page.returnsIntro": "Fresh flowers are perishable, so the rules differ from other online shopping. This is how it works, in plain terms.",
    "returns.s1.h": "Cancelling an order",
    "returns.s1.b": "Cancel free of charge any time before we start preparing your flowers — normally up to 2 hours before your delivery slot, or before 6pm for an 11:59 delivery. Message us on WhatsApp with your order number. Once preparation has started the flowers are already cut and arranged for you, so the order can no longer be cancelled.",
    "returns.s2.h": "Changing an order",
    "returns.s2.b": "The address, the time or the gift message can be changed free of charge until the driver has left. Message us on WhatsApp.",
    "returns.s3.h": "Damaged or not what you ordered",
    "returns.s3.b": "If your flowers arrive damaged, wilted or different from what you ordered, tell us within 24 hours with a photo. We replace them at no charge or refund you in full — your choice.",
    "returns.s4.h": "Returns",
    "returns.s4.b": "Because fresh flowers are perishable, they cannot be returned once accepted in good condition. Unopened, non-perishable items such as vases may be returned within 7 days of delivery in their original condition; the delivery charge is not refunded.",
    "returns.s5.h": "Refunds",
    "returns.s5.b": "Refunds go back the way you paid, within 14 days of our agreeing them. An order paid on delivery is refunded by bank transfer.",
    "returns.s6.h": "Complaints",
    "returns.s6.b": "Contact us on WhatsApp first — most problems are solved the same day. You also have the right to complain to the Consumer Protection Department of the Ministry of Commerce and Industry, hotline 16001.",

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
    "promise.sameDayShort": "توصيل في نفس اليوم في جميع أنحاء قطر",
    "brand.strapline": "ورود • شوكولاتة • هدايا • سعادة",
    "brand.location": "الدوحة، قطر",
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
    "product.added": "أُضيف إلى السلة ✓",
    "product.addFailed": "لم تتم الإضافة — يرجى المحاولة مرة أخرى.",
    "product.outOfStock": "نفدت الكمية",
    "product.soldOutSize": "نفدت الكمية بهذا الحجم",
    "product.onlyLeft": "بقي {count} فقط",
    "product.inStock": "متوفر — {count} قطعة",
    "personalise.heading": "أضف لمستك الخاصة",
    "personalise.optional": "اختياري",
    "personalise.note": "بطاقة إهداء",
    "personalise.notePlaceholder": "تُكتب بخط اليد على بطاقة وتُرفق مع الورود.",
    "personalise.noteRemaining": "بقي {count} حرفاً",
    "personalise.ribbon": "الشريطة",
    "personalise.ribbonNone": "بدون شريطة",
    "ribbon.blush": "وردي فاتح",
    "ribbon.ivory": "عاجي",
    "ribbon.sage": "أخضر فاتح",
    "ribbon.gold": "ذهبي",
    "ribbon.burgundy": "عنابي",

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
    "delivery.midnight":
      "لعيد ميلاد، اختر ١١:٥٩ عند إتمام الطلب: نصل قبل منتصف الليل بدقيقة في الليلة السابقة، لتكون الهدية بين يديه مع بداية اليوم. بالطلب المسبق فقط — نستقبل طلبات الليلة من ١٢ ظهراً حتى ٦ مساءً.",

    "payment.nothingCharged": "لا يتم خصم أي مبلغ عند تقديم الطلب.",
    "payment.confirm":
      "نتأكد من توفر الورود، ثم نؤكد الطلب وطريقة الدفع معك على واتساب.",
    "payment.cardSoon": "الدفع بالبطاقة قريباً.",

    "strip.sameDay": "توصيل في نفس اليوم",
    "strip.sameDayDetail": "في جميع أنحاء قطر",
    "strip.hour": "ورود طازجة",
    "strip.hourDetail": "مختارة بعناية",
    "strip.arranged": "هدايا فاخرة",
    "strip.arrangedDetail": "لكل مناسبة",
    "strip.note": "أسعد من تحب",
    "strip.noteDetail": "لأنك تهتم",

    "product.promiseBody":
      "اطلب قبل ٦ مساءً ويصلك اليوم. اختر فترة من ساعتين عند إتمام الطلب، وسنؤكد لك على واتساب قبل خروج الطلب.",

    "hero.1.eyebrow": "ورود · شوكولاتة · هدايا",
    "hero.1.title": "Tulips and Truffles",
    "hero.1.body": "أزهار جميلة. هدايا مدروسة. لحظات أسعد.",
    "hero.1.cta": "تسوق الآن",
    "hero.1.alt":
      "باقة توليب وردية بغلاف وردي فاتح، مربوطة بشريطة Tulips and Truffles، بجانب علبة هدايا",

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

    "meta.homeTitle": "Tulips and Truffles — ورود وهدايا، توصيل في نفس اليوم بالدوحة",
    "meta.homeDescription":
      "أزهار جميلة، هدايا مدروسة، لحظات أسعد. ورود طازجة وهدايا فاخرة، تُنسّق في الدوحة وتُوصّل في جميع أنحاء قطر في نفس اليوم.",

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
    "checkout.speed": "التوصيل",
    "midnight.name": "مفاجأة منتصف الليل ١١:٥٩",
    "midnight.tag": "١١:٥٩",
    "midnight.pitch":
      "نصل الساعة ١١:٥٩ مساءً في الليلة السابقة، لتكون الهدية بين يديه لحظة بداية اليوم.",
    "midnight.window": "يصل الساعة ١١:٥٩ مساءً",
    "midnight.dateLabel": "الليلة السابقة — نصل الساعة ١١:٥٩ مساءً",
    "midnight.dateHint":
      "اختر اليوم الذي يسبق عيد الميلاد. تصل المفاجأة مع دقّة منتصف الليل.",
    "midnight.pageTitle": "١١:٥٩ — مفاجأة منتصف الليل",
    "midnight.pageBody":
      "بعض اللحظات لا تحتمل الانتظار حتى الصباح. اختر ١١:٥٩ عند إتمام الطلب، ويصل مندوبنا قبل منتصف الليل بدقيقة في الليلة السابقة، ليكون أول ما يحدث في عيد ميلاده هو ورودك على الباب.",
    "midnight.priceNote": "رسوم إضافية {amount} على أي باقة.",
    "midnight.preorder": "بالطلب المسبق فقط",
    "midnight.preorderHint":
      "نستقبل طلبات ١١:٥٩ من ١٢ ظهراً حتى ٦ مساءً لليلة نفسها. الليالي اللاحقة يمكن حجزها في أي وقت.",
    "midnight.closedTonight":
      "أُغلقت طلبات ١١:٥٩ لهذه الليلة عند ٦ مساءً، وأقرب ليلة متاحة هي الغد.",
    "midnight.notYetTonight":
      "تفتح طلبات ١١:٥٩ لهذه الليلة عند ١٢ ظهراً. اختر ليلة أخرى أو عُد بعد الظهر.",
    "checkout.giftNote": "بطاقة إهداء",
    "checkout.giftNotePlaceholder": "سنكتبها بخط اليد ونرفقها مع الورود.",
    "pay.heading": "الدفع",
    "pay.testBanner":
      "وضع تجريبي — هذه محاكاة. لا يتم خصم أي مبلغ ولا تُجمع أي بيانات بطاقة.",
    "pay.method": "كيف تفضّل الدفع؟",
    "pay.onDelivery": "التأكيد عبر واتساب",
    "pay.onDeliveryHint":
      "نتأكد من توفر الورود، ثم نؤكد الطلب وطريقة الدفع معك.",
    "pay.card": "الدفع بالبطاقة (تجريبي)",
    "pay.cardHint": "محاكاة لعملية دفع بالبطاقة لعرض الخطوات فقط.",
    "pay.cardNumber": "رقم البطاقة",
    "pay.expiry": "تاريخ الانتهاء",
    "pay.cvc": "رمز التحقق",
    "pay.nameOnCard": "الاسم على البطاقة",
    "pay.testCardNote": "بطاقة تجريبية ثابتة — لا يمكن تعديل هذا الحقل.",
    "pay.outcome": "محاكاة النتيجة",
    "pay.approve": "مقبولة",
    "pay.decline": "مرفوضة",
    "pay.processing": "جارٍ الاتصال بالبنك…",
    "pay.approved": "تمت الموافقة على الدفع (تجريبي)",
    "pay.declined": "رُفضت البطاقة التجريبية. لم يتم خصم أي مبلغ.",
    "pay.payNow": "ادفع {amount}",

    "checkout.placing": "جارٍ إرسال طلبك…",
    "checkout.place": "إتمام الطلب",
    "product.substitution":
      "الورود موسمية. إذا لم يتوفر نوع أو لون معيّن نستبدله بآخر من القيمة نفسها أو أعلى وبالأسلوب نفسه، ونخبرك قبل تغيير شكل التنسيق.",
    "page.trackTitle": "تتبع طلبك",
    "page.trackIntro":
      "أدخل رقم الطلب ورقم الهاتف المسجّل عليه، وسنعرض لك أين وصل.",
    "track.orderNumber": "رقم الطلب",
    "track.orderNumberPlaceholder": "مثال ١٤",
    "track.phone": "رقم الهاتف المسجّل على الطلب",
    "track.find": "ابحث عن طلبي",
    "track.searching": "جارٍ البحث…",
    "track.order": "الطلب",
    "track.delivery": "التوصيل",
    "track.recipient": "إلى",
    "track.preparing": "قيد التجهيز",
    "track.sent": "في الطريق",
    "track.cancelled": "ملغى",
    "track.help": "هل هناك ما يحتاج إلى مراجعة؟ راسلنا على واتساب وسنتكفل بالأمر.",
    "footer.track": "تتبع طلبك",
    "checkout.recipientPhone": "رقم هاتف المستلم",
    "checkout.recipientPhoneHelp":
      "يتصل مندوبنا بهذا الرقم عند الباب. إذا كانت الورود لك، استخدم رقمك.",
    "checkout.instructions": "تعليمات التوصيل",
    "checkout.instructionsPlaceholder":
      "الطابق أو رمز البوابة أو التسليم للاستقبال",
    "checkout.sameDayClosed":
      "أُغلقت توصيلات اليوم. أقرب موعد للتوصيل هو الغد.",
    "checkout.summaryHeading": "في سلتك",
    "cart.shippingAtCheckout": "يُحدد عند إتمام الطلب",
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
    "section.legal": "الشروط والسياسات",
    "footer.privacy": "سياسة الخصوصية",
    "footer.terms": "الشروط والأحكام",
    "footer.returns": "الإرجاع والإلغاء",
    "legal.tradingName": "الاسم التجاري",
    "legal.cr": "السجل التجاري",
    "legal.address": "العنوان",
    "legal.whatsapp": "واتساب",
    "legal.email": "البريد الإلكتروني",
    "legal.lastUpdated": "آخر تحديث ٢١ سبتمبر ٢٠٢٦.",
    "common.and": "و",
    "checkout.agree": "بإتمام الطلب فإنك توافق على",
    "checkout.cancelNote": "يمكنك الإلغاء مجاناً قبل أن نبدأ بتجهيز الورود — راجع",
    "checkout.pricesNote": "جميع الأسعار بالريال القطري وهي المبلغ الكامل الذي تدفعه. رسوم التوصيل موضحة أعلاه، ولا تُطبّق قطر ضريبة قيمة مضافة.",

    "page.privacyTitle": "سياسة الخصوصية",
    "page.privacyIntro": "كيف نتعامل مع بياناتك الشخصية التي تزوّدنا بها عند الطلب، وفقاً لقانون حماية خصوصية البيانات الشخصية في قطر (القانون رقم ١٣ لسنة ٢٠١٦).",
    "privacy.s1.h": "ما الذي نجمعه",
    "privacy.s1.b": "اسمك ورقم هاتفك؛ اسم المستلم ومنطقة وعنوان التوصيل؛ تاريخ ووقت التوصيل؛ ورسالة الإهداء. وإذا دفعت بالبطاقة، مرجع الدفع. لا نطّلع على أرقام البطاقات ولا نخزّنها أبداً — فهي بعهدة مزوّد خدمة الدفع.",
    "privacy.s2.h": "لماذا نستخدمها",
    "privacy.s2.b": "لتجهيز طلبك وتوصيله، وللتواصل معك عبر واتساب لتأكيده، ولمعالجة أي مشكلة في التوصيل. لا نستخدم بياناتك للتسويق، ولا نبيعها ولا نشاركها مع أي جهة لأغراضها الخاصة.",
    "privacy.s3.h": "من يتعامل معها",
    "privacy.s3.b": "تُخزَّن الطلبات لدى مزوّدي الاستضافة Supabase وRailway في سنغافورة، ويُقدَّم الموقع عبر Cloudflare. وهم يعملون وفق تعليماتنا فقط. يقوم فريقنا بالتوصيل بنفسه، ولا يرى سوى اسم المستلم وعنوانه ورقم هاتفه ورسالة الإهداء.",
    "privacy.s4.h": "ملفات تعريف الارتباط",
    "privacy.s4.b": "لا يستخدم الموقع سوى ملفات تعريف الارتباط اللازمة لعمله: واحد يتذكر سلتك وآخر يحافظ على سرعة تحميل الصفحات. لا توجد ملفات إعلانية أو تتبّع ولا أدوات تحليلات، ولهذا لا نطلب موافقتك عليها.",
    "privacy.s5.h": "مدة الاحتفاظ بها",
    "privacy.s5.b": "نحتفظ بسجلات الطلبات، بما فيها رسالة الإهداء، لخمس سنوات وفاءً بالالتزامات المحاسبية ثم نحذفها. وإن لم تقدّم طلباً، فلا نحتفظ بأي شيء عنك.",
    "privacy.s6.h": "حقوقك",
    "privacy.s6.b": "يحق لك أن تسأل عمّا نحتفظ به عنك، وأن تطلب تصحيحه أو حذفه حيث يسمح القانون. راسلنا عبر واتساب أو على العنوان أدناه وسنرد خلال ٣٠ يوماً. وإن لم تكن راضياً، يمكنك تقديم شكوى إلى إدارة الامتثال وحماية البيانات في الوكالة الوطنية للأمن السيبراني.",
    "privacy.s7.h": "من نحن",

    "page.termsTitle": "الشروط والأحكام",
    "page.termsIntro": "الشروط التي نبيع بموجبها الورود والهدايا عبر الإنترنت في قطر. تقديم الطلب يعني قبولك لها.",
    "terms.s1.h": "من نحن",
    "terms.s2.h": "الطلبات والتأكيد",
    "terms.s2.b": "يُقدَّم الطلب عند الضغط على «إتمام الطلب». نؤكده عبر واتساب، وينعقد العقد عند تأكيدنا. وإذا تعذّر علينا تنفيذ الطلب — وردة خارج موسمها أو عنوان لا نصل إليه — نخبرك قبل التجهيز ونعرض بديلاً أو استرداداً كاملاً.",
    "terms.s3.h": "الأسعار والدفع",
    "terms.s3.b": "جميع الأسعار بالريال القطري وهي المبلغ الكامل الذي تدفعه: رسوم التوصيل تظهر منفصلة عند إتمام الطلب قبل تأكيده، ولا تُطبّق قطر ضريبة قيمة مضافة. وإلى حين توفر الدفع الإلكتروني بالبطاقة، يتم الدفع عند الاستلام أو حسب الاتفاق عبر واتساب.",
    "terms.s4.h": "التوصيل",
    "terms.s4.b": "نوصّل إلى المناطق المذكورة في صفحة التوصيل، ضمن الفترة الزمنية التي تختارها. طلبات ١١:٥٩ تصل قبل منتصف الليل بدقيقة في الليلة التي تختارها ويجب تقديمها بين ١٢ ظهراً و٦ مساءً من اليوم نفسه. إذا لم يتواجد أحد في العنوان نتصل بالرقم المسجّل في الطلب؛ وإن تعذّر الوصول إلى أحد نحاول مرة أخرى في اليوم نفسه دون رسوم، وبعدها تُحتسب إعادة التوصيل كتوصيل جديد.",
    "terms.s5.h": "الاستبدال",
    "terms.s5.b": "الورود موسمية. إذا لم يتوفر نوع أو لون معيّن فقد نستبدله بآخر من القيمة نفسها أو أعلى وبالأسلوب نفسه. ولن نغيّر الشكل العام للتنسيق دون إخبارك أولاً.",
    "terms.s6.h": "الإلغاء والإرجاع والاسترداد",
    "terms.s6.b": "سياسة الإرجاع والإلغاء جزء لا يتجزأ من هذه الشروط.",
    "terms.s7.h": "مسؤوليتنا",
    "terms.s7.b": "نحن مسؤولون عن توصيل ما طلبته، بحالة جيدة، في الوقت المتفق عليه. ولسنا مسؤولين عن تعذّر التوصيل بسبب خطأ في العنوان أو رقم الهاتف المقدَّم، أو عن أي أمر خارج عن سيطرتنا المعقولة. ولا شيء في هذه الشروط يحدّ من حقوقك بموجب قانون حماية المستهلك القطري رقم ٨ لسنة ٢٠٠٨.",
    "terms.s8.h": "القانون الواجب التطبيق",
    "terms.s8.b": "تخضع هذه الشروط لقوانين دولة قطر، وتختص محاكم قطر بأي نزاع. ويمكنك أيضاً تقديم شكوى إلى إدارة حماية المستهلك بوزارة التجارة والصناعة.",

    "page.returnsTitle": "الإرجاع والإلغاء والاسترداد",
    "page.returnsIntro": "الورود الطازجة سريعة التلف، لذا تختلف القواعد عن التسوق الإلكتروني المعتاد. إليك كيف تسير الأمور ببساطة.",
    "returns.s1.h": "إلغاء الطلب",
    "returns.s1.b": "ألغِ مجاناً في أي وقت قبل أن نبدأ بتجهيز الورود — عادةً حتى ساعتين قبل فترة التوصيل، أو قبل ٦ مساءً لتوصيل ١١:٥٩. راسلنا عبر واتساب مع رقم طلبك. وبمجرد بدء التجهيز تكون الورود قد قُطفت ونُسّقت لك، فلا يمكن إلغاء الطلب بعدها.",
    "returns.s2.h": "تعديل الطلب",
    "returns.s2.b": "يمكن تغيير العنوان أو الوقت أو رسالة الإهداء مجاناً حتى انطلاق المندوب. راسلنا عبر واتساب.",
    "returns.s3.h": "وصلت تالفة أو مختلفة عمّا طلبت",
    "returns.s3.b": "إذا وصلت الورود تالفة أو ذابلة أو مختلفة عمّا طلبته، أخبرنا خلال ٢٤ ساعة مع صورة. نستبدلها دون رسوم أو نردّ لك المبلغ كاملاً — الخيار لك.",
    "returns.s4.h": "الإرجاع",
    "returns.s4.b": "لأن الورود الطازجة سريعة التلف، لا يمكن إرجاعها بعد استلامها بحالة جيدة. أما المنتجات غير القابلة للتلف وغير المفتوحة مثل المزهريات فيمكن إرجاعها خلال ٧ أيام من التوصيل بحالتها الأصلية؛ ولا تُردّ رسوم التوصيل.",
    "returns.s5.h": "الاسترداد",
    "returns.s5.b": "يُردّ المبلغ بالطريقة نفسها التي دفعت بها، خلال ١٤ يوماً من موافقتنا على الاسترداد. والطلب المدفوع عند الاستلام يُردّ عبر تحويل بنكي.",
    "returns.s6.h": "الشكاوى",
    "returns.s6.b": "تواصل معنا عبر واتساب أولاً — تُحل معظم المشكلات في اليوم نفسه. ويحق لك أيضاً تقديم شكوى إلى إدارة حماية المستهلك بوزارة التجارة والصناعة على الخط الساخن ١٦٠٠١.",

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
