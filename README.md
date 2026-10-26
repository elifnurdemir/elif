# ا Elif

**[elifnurdemir.github.io/elif](https://elifnurdemir.github.io/elif/)**

*Elif* hem bir isim, hem bir harf: alfabenin ilki. Tek, dimdik bir çizgi.

Gece, bir çayır. Çimenler rüzgârda sallanır, aralarında ateşböcekleri yanıp söner. Her biri bir hata.
Birine tıklarsan yakalanır, kavanoza uçar ve bir bilet olarak kayda geçer. *Testleri çalıştır* dersen
hakkımdaki her şey bir test dosyası gibi koşar: geçenler yeşil, hâlâ öğrendiğim sarı.

---

*Elif* is a name, and a letter: the first of the alphabet. A single straight line.

A meadow at night. The grass sways in the wind, and fireflies blink between the blades. Each one is a bug.
Click one and it's caught: it flies into the jar and is logged as a ticket. *Run the tests*, and everything
about me runs like a test file: what passes in green, what I'm still learning in yellow.

— Elif, QA Engineer

## Canlı gökyüzü

Site ziyaretçinin saatine ve havasına bürünür. Güneşin yüksekliği tarayıcı saatinden ve konumdan hesaplanır
(gece → mavi saat → alacakaranlık → gündüz), hava [Open-Meteo](https://open-meteo.com)'dan gelir: açık, parçalı
bulutlu, kapalı, sis, çisenti, yağmur, kar, fırtına. Konum izni verilmezse Kocaeli kullanılır. Şehir adı için
koordinatlar [BigDataCloud](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api)'a gönderilir.
Geceleri buglar ateşböceği, gündüzleri uğur böceğidir. İmleç bir böcek kepçesidir: savrulunca çemberinin geçtiği böcekler fileye girer, kepçe kavanoza götürülünce içine dökülürler (telefonda kendiliğinden).

Sol alttaki *Test ortamı* ile saat ve hava elle seçilebilir; adresten de olur:
`?time=dawn|noon|sunset|night` ve `?weather=clear|partly|cloudy|fog|drizzle|rain|snow|storm`.

## Geliştirme

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
npm run deploy   # GitHub Pages: https://elifnurdemir.github.io/elif/
```

İçerik (hakkımda, test akışı, çalışmalar, iletişim bağlantıları, yakalanan hatalar) tek bir dosyada: `src/content.ts`.
