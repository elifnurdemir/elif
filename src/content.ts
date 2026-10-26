import type { WeatherKind } from "./scene/weather";

export type Lang = "tr" | "en";
export type Text = Record<Lang, string>;

export const PROFILE = {
  name: "Elif",
  title: { tr: "QA Engineer", en: "QA Engineer" } as Text,
  location: { tr: "Kocaeli, Türkiye", en: "Kocaeli, Türkiye" } as Text,
  /** what she does, plainly, under the name */
  intro: {
    tr: "Web uygulamalarında manuel test, API testi ve hata analizi üzerine çalışıyorum.",
    en: "I work on manual testing, API testing and bug analysis for web applications.",
  } as Text,
};

export const ABOUT: Text = {
  tr: "E-ticaret uygulamaları üzerinde çalışan bir QA Engineer'ım. Kullanıcı akışlarını ve API'leri test ediyor, hataları tespit edip raporluyorum. Test otomasyonu alanında kendimi geliştiriyorum.",
  en: "I'm a QA Engineer working on e-commerce applications. I test user flows and APIs, find bugs and report them. I'm growing into test automation.",
};

/** the short facts beside the about text */
export const FACTS: { label: Text; value: Text }[] = [
  { label: { tr: "Unvan", en: "Title" }, value: PROFILE.title },
  { label: { tr: "Konum", en: "Location" }, value: PROFILE.location },
  { label: { tr: "Alan", en: "Field" }, value: { tr: "Yazılım testi ve kalite güvencesi", en: "Software testing and quality assurance" } },
  { label: { tr: "Araçlar", en: "Tools" }, value: { tr: "Postman · Jira · Playwright", en: "Postman · Jira · Playwright" } },
  { label: { tr: "Gelişim odağı", en: "Growing into" }, value: { tr: "Test otomasyonu", en: "Test automation" } },
];

/** The profile as a test file: every suite a `describe`, every skill a test. `todo` ones are still being learned. */
export type Suite = { name: Text; tests: { title: Text; todo?: boolean }[] };

export const SUITES: Suite[] = [
  {
    name: { tr: "beceriler", en: "skills" },
    tests: [
      { title: { tr: "manuel test", en: "manual testing" } },
      { title: { tr: "API testi", en: "API testing" } },
      { title: { tr: "test senaryosu hazırlama", en: "writing test cases" } },
      { title: { tr: "hata raporlama", en: "bug reporting" } },
      { title: { tr: "regresyon testi", en: "regression testing" } },
    ],
  },
  {
    name: { tr: "araçlar", en: "tools" },
    tests: [
      { title: { tr: "Postman · API istekleri ve koleksiyonlar", en: "Postman · API requests and collections" } },
      { title: { tr: "Jira · hata kaydı ve takibi", en: "Jira · logging and tracking bugs" } },
      { title: { tr: "Playwright · tarayıcıda kullanıcı akışları", en: "Playwright · user flows in the browser" } },
    ],
  },
  {
    name: { tr: "gelişim", en: "growing" },
    tests: [{ title: { tr: "test otomasyonu", en: "test automation" }, todo: true }],
  },
];

/**
 * The work, as test cases. Written from the profile: rewrite these with your own projects, numbers and links.
 * `todo` marks something still in progress.
 */
export const WORK: { title: Text; body: Text; tags: string[]; todo?: boolean; link?: { href: string; label: string } }[] = [
  {
    title: { tr: "Sepet ve ödeme akışı testleri", en: "Cart and checkout flow testing" },
    body: {
      tr: "E-ticaret uygulamalarında sepet, kupon, ödeme ve sipariş adımlarını uçtan uca test ediyor, değişikliklerden sonra regresyon testleri yapıyorum.",
      en: "I test the cart, coupons, payment and order steps of e-commerce applications end to end, and run regression tests after changes.",
    },
    tags: ["Manuel test", "Regresyon", "E-ticaret"],
  },
  {
    title: { tr: "API testleri", en: "API testing" },
    body: {
      tr: "Servislerin isteklerini Postman koleksiyonlarıyla doğruluyor; durum kodlarını, hata mesajlarını ve uç durumları kontrol ediyorum.",
      en: "I check services' requests with Postman collections: status codes, error messages and edge cases.",
    },
    tags: ["Postman", "REST", "API"],
  },
  {
    title: { tr: "Hata analizi ve raporlama", en: "Bug analysis and reporting" },
    body: {
      tr: "Bulduğum hataları tekrar edilebilir adımlar, beklenen ve gerçekleşen sonuçlarla Jira'ya raporluyor, düzeltmeden sonra yeniden doğruluyorum.",
      en: "I report the bugs I find in Jira with steps to reproduce and expected and actual results, and verify them again once fixed.",
    },
    tags: ["Jira", "Test senaryosu"],
  },
  {
    title: { tr: "Playwright ile test otomasyonu", en: "Test automation with Playwright" },
    body: {
      tr: "Sık tekrarlanan kullanıcı akışlarını Playwright ile otomatikleştirmeyi öğreniyorum.",
      en: "I'm learning to automate frequently repeated user flows with Playwright.",
    },
    tags: ["Playwright", "Otomasyon"],
    todo: true,
  },
];

/** Contact links; the ones left empty are hidden. Fill in your own. */
export const CONTACT: { label: string; href: string; text?: string }[] = [
  { label: "E-posta", href: "" /* "mailto:you@example.com", text: "you@example.com" */ },
  { label: "LinkedIn", href: "" },
  { label: "GitHub", href: "" },
];

export type Severity = "critical" | "high" | "medium" | "low";

export const SEVERITY: Record<Severity, Text> = {
  critical: { tr: "Kritik", en: "Critical" },
  high: { tr: "Yüksek", en: "High" },
  medium: { tr: "Orta", en: "Medium" },
  low: { tr: "Düşük", en: "Low" },
};

/** What each caught bug turns out to be, in the order they are caught. */
export const BUGS: { title: Text; severity: Severity }[] = [
  { severity: "critical", title: { tr: "Ödeme butonuna çift tıklayınca iki sipariş oluşuyor", en: "Double-clicking Pay creates two orders" } },
  { severity: "high", title: { tr: "Sepetteki ürün adedi eksiye düşürülebiliyor", en: "Cart quantity can go below zero" } },
  { severity: "medium", title: { tr: "Kupon kodu büyük/küçük harfe duyarlı", en: "Coupon codes are case-sensitive" } },
  { severity: "high", title: { tr: "API geçersiz token'a 500 dönüyor, 401 olmalı", en: "API answers an invalid token with 500, not 401" } },
  { severity: "medium", title: { tr: "Arama ı, ş, ğ içeren kelimelerde sonuç vermiyor", en: "Search finds nothing for words with ı, ş, ğ" } },
  { severity: "high", title: { tr: "Stokta olmayan ürün sepete eklenebiliyor", en: "Out-of-stock items can be added to the cart" } },
  { severity: "critical", title: { tr: "Şifre sıfırlama bağlantısı iki kez kullanılabiliyor", en: "A password reset link works twice" } },
  { severity: "low", title: { tr: "Kargo takip numarası onay e-postasında yok", en: "Tracking number missing from the confirmation email" } },
  { severity: "medium", title: { tr: "Mobilde filtre menüsü kapanmıyor", en: "The filter menu won't close on mobile" } },
  { severity: "high", title: { tr: "Para birimi değişince fiyat güncellenmiyor", en: "Prices don't update when the currency changes" } },
  { severity: "low", title: { tr: "Oturum kapanınca favoriler kayboluyor", en: "Favourites vanish after logging out" } },
  { severity: "critical", title: { tr: "Sayfa yenilenince indirim iki kez uygulanıyor", en: "Refreshing the page applies the discount twice" } },
];

export const bugId = (i: number) => `BUG-${101 + i}`;

export const WEATHER: Record<WeatherKind, Text> = {
  clear: { tr: "Açık", en: "Clear" },
  partly: { tr: "Parçalı bulutlu", en: "Partly cloudy" },
  cloudy: { tr: "Kapalı", en: "Overcast" },
  fog: { tr: "Sisli", en: "Fog" },
  drizzle: { tr: "Çisenti", en: "Drizzle" },
  rain: { tr: "Yağmurlu", en: "Rain" },
  snow: { tr: "Karlı", en: "Snow" },
  storm: { tr: "Fırtına", en: "Storm" },
};

export type TimePick = "live" | "dawn" | "noon" | "sunset" | "night";

export const TIMES: Record<TimePick, Text> = {
  live: { tr: "Canlı", en: "Live" },
  dawn: { tr: "Şafak", en: "Dawn" },
  noon: { tr: "Öğle", en: "Noon" },
  sunset: { tr: "Gün batımı", en: "Sunset" },
  night: { tr: "Gece", en: "Night" },
};

export const UI = {
  about: { tr: "Hakkımda", en: "About" },
  work: { tr: "Çalışmalarım", en: "Work" },
  contact: { tr: "İletişim", en: "Contact" },
  tagline: { tr: "Hataları ışığa çıkarırım.", en: "I bring bugs to light." },
  toJar: { tr: "Kepçeyi kavanoza götür, böcekler içine dökülsün.", en: "Bring the net to the jar to tip the bugs in." },
  catchNight: { tr: "Işıklar birer hata. Kepçeyle yakala.", en: "Each light is a bug. Catch one with the net." },
  catchDay: { tr: "Uğur böcekleri birer hata. Kepçeyle yakala.", en: "Each ladybug is a bug. Catch one with the net." },
  run: { tr: "Testleri çalıştır", en: "Run the tests" },
  reachOut: { tr: "İletişime geç", en: "Get in touch" },
  scroll: { tr: "Aşağı kaydır", en: "Scroll down" },
  replay: { tr: "Tekrar çalıştır", en: "Run again" },
  demoNote: { tr: "Etkileşimli tanıtım · süreler temsilîdir", en: "Interactive intro · timings are illustrative" },
  running: { tr: "{n} test, 1 worker ile çalışıyor", en: "Running {n} tests using 1 worker" },
  summary: { tr: "{p} başarılı · {t} geliştiriliyor", en: "{p} passed · {t} in progress" },
  workIntro: {
    tr: "Üzerinde çalıştığım alanlar, birer test senaryosu olarak.",
    en: "What I work on, written as test cases.",
  },
  passed: { tr: "Başarılı", en: "Passed" },
  inProgress: { tr: "Geliştiriliyor", en: "In progress" },
  contactTitle: { tr: "Birlikte test edelim.", en: "Let's test it together." },
  contactText: {
    tr: "Bir QA Engineer arıyorsanız ya da test süreçleri üzerine konuşmak isterseniz bana yazın.",
    en: "If you're looking for a QA Engineer or want to talk about testing, write to me.",
  },
  contactMissing: {
    tr: "Geliştirici notu: iletişim bağlantılarını src/content.ts içindeki CONTACT listesine ekle. (Bu not yayında görünmez.)",
    en: "Developer note: add contact links to CONTACT in src/content.ts. (This note doesn't show on the live site.)",
  },
  jar: { tr: "{n} hata yakalandı", en: "{n} bugs caught" },
  jarEmpty: {
    tr: "Kavanoz boş. Çimenlerin arasındaki böceklere tıkla.",
    en: "The jar is empty. Click the bugs in the grass.",
  },
  board: { tr: "Yakalanan hatalar", en: "Caught bugs" },
  logged: { tr: "kaydedildi", en: "logged" },
  open: { tr: "Açık", en: "Open" },
  fixedStatus: { tr: "Düzeltildi", en: "Fixed" },
  fixAll: { tr: "Hepsini düzelt", en: "Fix them all" },
  regression: { tr: "Regresyon testi geçti ✓ · {n} hata kapatıldı", en: "Regression test passed ✓ · {n} bugs closed" },
  released: { tr: "Böcekler serbest.", en: "The bugs are free." },
  close: { tr: "Kapat", en: "Close" },
  soundOn: { tr: "Sesi aç", en: "Sound on" },
  soundOff: { tr: "Sesi kapat", en: "Sound off" },
  env: { tr: "Test ortamı", en: "Test environment" },
  envTime: { tr: "Saat", en: "Time" },
  envWeather: { tr: "Hava", en: "Weather" },
  envNote: {
    tr: "Canlı: tarayıcının saati ve konumundaki gerçek hava.",
    en: "Live: your browser's clock and the real weather where you are.",
  },
  yourPlace: { tr: "Konumun", en: "Your location" },
} satisfies Record<string, Text>;

export const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
