# Finance / Markets / Investing news sources, newsletters, newswires and data feeds for a US-stock retail investor-developer (as of Nov 2026)

Research-method note (read first): 15 web searches were completed; the shared web-search budget was then exhausted and every direct fetch of a vendor page (newsquawk.com, unusualwhales.com, sec-api.io, alpaca.markets, docs.benzinga.com, skift.com, lseg.com, hammerstonemarkets.com, ctfn.news, substats.io, financedirectory.substack.com, edgartools.io, thenextgennexus.com, tradingtoolshub.com) failed because those hosts are outside this session's network allowlist. Consequently almost every price below comes from search-result snippets of vendor pages or third-party 2026 review sites, not from a fetched primary page. Each price is tagged: [vendor page via search] = vendor's own page surfaced in search; [3rd-party 2026] = review/comparison site dated 2026; [stale] = source older than ~2 years; [self-claim] = vendor marketing claim with no independent check. Items with no retrieved source are listed only under Gaps, never with a number.

## Key Question 1: Real-time news terminals and squawks for individuals (Benzinga Pro, Newsquawk, Hammerstone, TradeTheNews, Fly, Briefing.com, StreetInsider, Seeking Alpha, Bloomberg/LSEG/FactSet/Koyfin, Unusual Whales, Cheddar Flow, Quiver, Earnings Whispers, TipRanks, MarketBeat, etc.)

### Takeaway
For an individual, the realistic "fast headline" stack in 2026 is Benzinga Pro ($37 / $147 / $197 per month across three tiers, squawk from the mid tier, High Beta Squawk +$99), Hammerstone ($39–69/mo, the cheapest text-plus-TTS squawk), and Newsquawk ($199 Basic / $399 Pro per month ex-VAT, the most expensive retail squawk). Institutional terminals (Bloomberg ~US$24K–32K/yr, LSEG Workspace, FactSet ~$12K+) are quote-based and out of retail range; Koyfin (free / ~$39–49 / ~$79 per month) is the budget terminal. Order-flow/insider/congress trackers run $25–120/mo (Quiver $25, Unusual Whales $50/$75/$120, Cheddar Flow $85/$99). No independent latency measurements were found for any retail squawk; speed claims are vendor marketing.

### Cited Findings

Benzinga Pro (benzinga.com/pro) - US equities news terminal with audio squawk, scanners, calendars, chat.
- Three monthly tiers as of a review checked September 8, 2026: Basic $37/mo, Streamlined $147/mo, Essential $197/mo; separate annual pricing and add-ons; Streamlined includes equity audio squawk; Essential adds scanners, signals, calendar tools; High Beta Squawk is a separate $99/mo add-on [3rd-party 2026] — [Trading Tools Hub, Benzinga Pro Pricing Guide 2026](https://tradingtoolshub.com/blog/benzinga-pro-pricing-guide-2026/)
- Older 2026 reviews still cite $27/mo Basic and $177/mo Essential (pre-"Streamlined" lineup), with squawk limited to Essential [3rd-party 2026, likely stale lineup] — [daytradingz Benzinga Pro Review 2026](https://daytradingz.com/benzinga-pro-review/); [TraderHQ review](https://traderhq.com/benzinga-pro-review-key-features-pricing-investors/); [Ecommerce Paradise "$197 a month"](https://ecommerceparadise.com/benzinga-review/)
- One review claims Essential is ~$99/mo, conflicting with all other sources — [InvestingWithAI](https://investingwithai.com/benzinga-pro-review/) (outlier; treat as wrong)
- Two-week / 14-day free trial covering Essential features — [daytradingz](https://daytradingz.com/benzinga-pro-review/); [LuxAlgo review](https://www.luxalgo.com/blog/benzinga-pro-review-is-news-edge-worth-cost/)
- Benzinga's own WebSocket docs describe its streams as "low-latency, push-based" but give no millisecond figure; each API key is limited to one active connection per stream [self-claim] — [Benzinga WS API docs overview](https://docs.benzinga.com/ws-reference/overview)

Newsquawk (newsquawk.com) - audio squawk across six channels (equities, FX, fixed income, energy, etc.) plus equities text suite.
- Pricing page lists Pro at $399/mo (all six squawk channels + equities suite) and Basic at $199/mo (one channel), both excl. VAT; 7-day trial for $29.99 [vendor page via search] — [Newsquawk](https://www.newsquawk.com/)
- A 2023 press release cited plans "starting at $174 per month" and a 14-day free trial / price-match for TradeTheNews users [stale] — [ABNewswire, Newsquawk offers Trade the News users a free 14-day trial](https://www.abnewswire.com/pressreleases/newsquawk-offers-trade-the-news-users-a-free-14-day-trial-and-price-match_648436.html)

Hammerstone Markets (hammerstonemarkets.com) - MarketTalk text news feed + forum, text-to-audio squawk, aimed at active traders.
- Individual plans $39–$69/mo; institutional tier $299–$329/mo; $39 plan = customizable news feed with text-to-audio squawk, $69 plan adds reports [vendor page via search + 3rd-party] — [Hammerstone individual trader page](https://www.hammerstonemarkets.com/individual-trader/); [daytradingz Hammerstone review](https://daytradingz.com/hammerstone-markets-review/); [DayTradeReview Hammerstone](https://daytradereview.com/hammerstone-markets-review/)
- The individual page also advertises a 14-day trial for $1, but that page is ~1,700 days old [stale] — [Hammerstone individual trader page](https://www.hammerstonemarkets.com/individual-trader/)

TradeTheNews (tradethenews.com) - squawk + text headlines, legacy institutional-style service.
- Older reviews list individual tiers at $150 / $225 / $350 per month (roughly 4–6 years old) [stale] — [DayTradeReview TradeTheNews](https://daytradereview.com/tradethenews-review-how-does-this-news-service-compare/); [TopTradeReviews](https://toptradereviews.com/tradethenews-review/)
- A 2026 squawk comparison says no reliable current TradeTheNews price could be verified — [TradingBotExperts, Best News Squawk Services 2026](https://www.tradingbotexperts.com/blog/best-news-squawk-services-for-traders-2026)
- A competitor marketing page (Tradar) lists TradeTheNews at $185/mo and Hammerstone Pro at $299 [competitor claim, unreliable] — [Tradar](https://trytradar.com/)

Fly on the Wall (theflyonthewall.com) - analyst upgrades/downgrades, rumors, "Hot Stocks" headlines; cited in trader forums alongside Briefing.com.
- Only price found: a years-old Elite Trader thread listing it at $25/mo [stale] — [Elite Trader, The Fly vs Briefing.com](https://www.elitetrader.com/et/threads/the-fly-on-the-wall-vs-briefing-com.76788/); [page 3](https://www.elitetrader.com/et/threads/the-fly-on-the-wall-vs-briefing-com.76788/page-3)
- Legal background: Barclays Capital v. Theflyonthewall.com (2nd Cir. 2011) over "hot news" republication of analyst recommendations — [Wikipedia](https://en.wikipedia.org/wiki/Barclays_Capital_Inc._v._Theflyonthewall.com,_Inc.)

StreetInsider (streetinsider.com) - earnings/guidance/analyst/M&A headlines.
- Signup page lists Premium at $149 for 1 month, $1,500 for 12 months, one-week free trial [vendor page via search; date unknown] — [StreetInsider subscription page](https://streetinsider.com/account_new.php?account_subscription.php%3F=)
- Investing.com acquired StreetInsider and most StreetInsider content became free on Investing.com — [Wikipedia, Investing.com](https://en.wikipedia.org/wiki/Investing.com)

Briefing.com - no 2026 price found (see Gaps). Only forum comparison vs Fly — [Elite Trader thread](https://www.elitetrader.com/et/threads/the-fly-on-the-wall-vs-briefing-com.76788/)

Seeking Alpha (seekingalpha.com) - crowd-sourced analysis + news feed; Premium/Pro.
- Premium list price $299/yr, no monthly option; frequent discounts ($269/yr deal; a June 10–July 7, 2026 sale) [3rd-party 2026] — [StockBrokers.com review](https://www.stockbrokers.com/review/tools/seeking-alpha); [MatchMyBroker discount page](https://www.matchmybroker.com/articles/seeking-alpha-discount)
- Pro typically $2,400/yr; intro offers reported as $89 or $99 first month then $2,149 first annual term; one review lists $299.99/mo (conflict) — [TraderHQ Premium vs Pro](https://traderhq.com/seeking-alpha-premium-vs-seeking-alpha-pro/); [isetupedia](https://isetupedia.com/seeking-alpha-pro-vs-premium/)
- Alpha Picks $499/yr; Premium + Alpha Picks bundle $639/yr — [MatchMyBroker review](https://www.matchmybroker.com/tools/seeking-alpha-premium-review); [Seeking Alpha bundle LP](https://subscriptions.seekingalpha.com/lp_premium_bundle_offer_2025)

Bloomberg Terminal, LSEG Workspace, FactSet, Koyfin
- Bloomberg: most-cited figure ~$31,980/seat/yr (~$2,665/mo), $28,320/seat for multi-terminal firms; other sources as low as ~$24,240 — range $24K–32K [3rd-party 2026] — [HaoPicks, "What US$32K/Year Actually Buys"](https://www.haopicks.com/bloomberg-terminal-alternatives-2026); [StockAlarm Pro, Bloomberg vs FactSet 2026](https://pro.stockalarm.io/blog/best-financial-terminals-comparison); [Oreate AI pricing page](https://learn.oreateai.com/learn/current-bloomberg-terminal-pricing-and-subscription-fees)
- LSEG Workspace (ex-Eikon): no public price; estimates ~$3,600–$22,000/yr depending on package — [PageCrawl Bloomberg alternatives](https://pagecrawl.io/blog/bloomberg-terminal-alternatives); [Wikipedia, Eikon](https://en.wikipedia.org/wiki/Eikon)
- FactSet: modular, estimates ~$12K–$20K/yr — [StockAlarm Pro](https://pro.stockalarm.io/blog/best-financial-terminals-comparison)
- Koyfin: free tier, then ~$39/mo (Plus) and ~$79/mo (Pro) per one source; another lists $49/mo [3rd-party 2026, conflicting] — [Hudson Labs, low cost alternatives to Bloomberg 2026](https://www.hudson-labs.com/blog/free-and-low-cost-alternatives-to-bloomberg); [nownews.dev alternatives 2026](https://nownews.dev/blog/bloomberg-terminal-alternatives-2026)

Unusual Whales (unusualwhales.com) - options flow, dark pool, congress trades, news; API.
- Vendor page (checked Oct 2026): free delayed tier; Retail Basic $50/mo, Retail Pro $75/mo, Retail Max $120/mo; lower annual rates [vendor page via search] — [Unusual Whales vs Cheddar Flow](https://unusualwhales.com/vs/cheddar-flow); [UW best options flow tracker LP](https://unusualwhales.com/lp/best-options-flow-tracker)
- Older comparison shows $48/mo (verified 2026-05-04 by that site) and $42/mo — stale relative to Oct 2026 — [OptionsBell alternatives](https://optionsbell.com/blog/unusual-whales-alternatives); [FindMyMoat Quiver vs UW](https://www.findmymoat.com/vs/quiver-quantitative-vs-unusual-whales)
- UW markets itself vs Cheddar Flow as "More Data, Lower Price, Full API" [self-claim] — [UW vs Cheddar Flow](https://unusualwhales.com/vs/cheddar-flow)

Cheddar Flow (cheddarflow.com) - options flow + dark pool.
- Standard ~$85/mo, Pro ~$99/mo; dark pool only on higher tier; 7-day trial on Standard; one source says $97/mo start (outlier) [3rd-party 2026] — [TruthSignal, Cheddar Flow vs UW 2026](https://www.truthsignal.io/blog/cheddar-flow-vs-unusual-whales); [QuantVPS CheddarFlow review](https://www.quantvps.com/blog/cheddarflow-review)

Quiver Quantitative (quiverquant.com) - congressional trading, lobbying, gov contracts, insider, alt data; API.
- $25/mo or $300/yr, 7- or 30-day trial; separate API tier at $375/mo including WebSocket access [3rd-party 2026] — [FindMyMoat Quiver vs UW](https://www.findmymoat.com/vs/quiver-quantitative-vs-unusual-whales)
- Do not confuse with "Quant Data" ($74.99/mo, $62.50/mo yearly, 7-day trial) — [OptionsBell](https://optionsbell.com/blog/unusual-whales-alternatives)

Earnings Whispers (earningswhispers.com) - whisper numbers, earnings calendar.
- 2026 review: $49.95/mo, $499.95/yr [3rd-party 2026] — [Bullish Bears Earnings Whispers review](https://bullishbears.com/earnings-whispers/)

TipRanks (tipranks.com) - analyst consensus, insider, hedge fund trackers, news.
- Sept 2026: Basic free, Premium $359/yr list, Ultimate $599/yr, discounts at checkout; others list $29.95/mo and $49.95/mo; an Oct 2026 page shows Premium at $13.50/mo "down from $30" [3rd-party 2026, conflicting] — [StockSimplifier TipRanks review 2026](https://stocksimplifier.com/reviews/tipranks); [Trading Tools Hub TipRanks pricing 2026](https://tradingtoolshub.com/blog/tipranks-pricing-guide-2026/)

MarketBeat (marketbeat.com) - analyst ratings, earnings, news aggregation, free tier.
- All Access $29/mo or $249/yr; one review cites $399 for "MarketBeat Premium" [3rd-party 2026] — [AskAtlantis MarketBeat review 2026](https://www.askatlantis.com/blog/marketbeat-review-2026); [WallStreetZen MarketBeat review](https://www.wallstreetzen.com/blog/marketbeat-review/); [TraderHQ "$399/year?"](https://traderhq.com/marketbeat-daily-premium-review-stock-picks-analysis/)

Third-party speed/quality observation
- A 2026 roundup of squawk services (Benzinga, Newsquawk, Hammerstone, TradeTheNews) exists but gives no measured latencies — [TradingBotExperts 2026](https://www.tradingbotexperts.com/blog/best-news-squawk-services-for-traders-2026)

### Inferences
- The retail squawk market has stratified into ~$40–70 (Hammerstone), ~$150–200 (Benzinga mid/high tiers), and ~$200–400 (Newsquawk) bands; Newsquawk's explicit price-match offer against TradeTheNews suggests the two compete for the same ex-institutional user.
- The large month-to-month dispersion in TipRanks and Seeking Alpha quoted prices indicates aggressive promotional pricing; list prices are rarely what retail users pay.
- The absence of any measured head-to-head latency between Benzinga Pro, Hammerstone, Newsquawk and TradeTheNews in 2026 means a user wanting proof must run trials in parallel; all vendors offer 7–14 day trials.

### Gaps
- Briefing.com current price (In Play / Trader tiers): no 2026 source retrieved.
- Fly on the Wall current price: only a years-old $25/mo forum figure.
- TradeTheNews current individual price: explicitly unverified in 2026 sources.
- Wall Street Horizon, WhaleWisdom, OpenInsider, Capitol Trades pricing and delivery channels: searches returned nothing (budget exhausted before a dedicated query ran). Background knowledge (unverified, no source retrieved): OpenInsider and Capitol Trades are free web tools; WhaleWisdom has free + paid tiers; Wall Street Horizon is institutional/quote-based.
- TradingView news provider list, Robinhood and Webull news-feed vendors: no source retrieved. Background knowledge (unverified): Alpaca's 2022 Benzinga partnership (cited in KQ2) is the only documented broker-side Benzinga feed found.
- Independent latency measurements for any retail squawk vs Bloomberg/Reuters: none found.
- Delivery-channel detail (Discord/Telegram/X bots) for Benzinga/Hammerstone/Newsquawk: not captured in snippets.

## Key Question 2: Machine-readable / developer news APIs, PR-wire direct feeds, and SEC EDGAR real-time (latency numbers, pricing)

### Takeaway
Latency figures that exist are almost all vendor self-claims: sec-api.io "300 ms after EDGAR publication", RTPR "sub-500 ms / median 312 ms" for PR wires, Polygon/Massive "~25 ms median WebSocket" (another site says ~8 ms), TradingNews "34 ms". The one (thin, single-blog) ordering study says the EDGAR 8-K beats Business Wire by ~3–8 s, PR Newswire by ~10–30 s and GlobeNewswire by ~15–45 s for S&P 500 earnings releases, i.e., the wires do not post before EDGAR. The SEC's own "latest filings" feed is ordered by filing date, so 8-Ks accepted after 5:30 pm ET can be held off the live list until the next business day per Reg S-T Rule 13 — a structural delay independent of vendor. Cheap REST news APIs cluster at $0–50/mo (Marketaux $29, Tiingo $30, Finnhub $49.99+), while institutional feeds (Dow Jones Newswires $5K–50K+, LSEG Headlines Direct, AlphaFlash) are quote-based.

### Cited Findings

Polygon.io / Massive (massive.com, formerly polygon.io) - market data + news WebSocket (Benzinga content).
- One comparison cites a vendor-reported ~25 ms median latency for its WebSocket feed and says Benzinga news is delivered through it [self-claim relayed] — [Qubitlogic, Real-Time Data API Providers 2026](https://qubitlogic.dev/professional-edge/top-5-apis-real-time-financial-data/)
- A different 2026 comparison puts Polygon WebSocket tick latency at ~8 ms and Alpaca at ~12 ms (free IEX feed) [3rd-party, unverified] — [APITube, best financial news API 2026](https://apitube.io/blog/post/best-financial-news-api-trading)

Alpaca (alpaca.markets) - broker API with Benzinga news REST + WebSocket.
- Alpaca and Benzinga partnered Feb 2022 to give Alpaca customers historical and real-time stock and crypto news — [Business Wire, Alpaca–Benzinga partnership](https://www.businesswire.com/news/home/20220222005083/en/Alpaca-and-Benzinga-Partner-to-Offer-Fintech-Apps-Stock-Market-News)
- Alpaca's data pricing page describes websocket access on its $99/mo plan; the snippet also mentions a 15-minute delay, which conflicts with low-latency claims (likely refers to the free tier's delayed SIP data; could not fetch page to confirm) — [Alpaca Market Data](https://alpaca.markets/data)

Benzinga APIs (benzinga.com/apis) - news REST/WebSocket; one connection per key per stream [self-claim] — [Benzinga WS docs](https://docs.benzinga.com/ws-reference/overview); crypto news API page — [Benzinga Crypto News API](https://www.benzinga.com/apis/cloud-product/crypto-news-api/)

Finnhub (finnhub.io)
- Free: 60 calls/min, US data, 1 year company news; paid market data from $49.99/mo; All-In-One $3,500/mo; personal plan may not be used by any business without written approval; news sentiment limited to US companies [3rd-party 2026] — [APILayer, 12 best financial market APIs 2026](https://blog.apilayer.com/12-best-financial-market-apis-for-real-time-data-in-2026/); [Finks AI Finnhub pricing](https://finks.ai/api/compare/finnhub); [Adanos news sentiment APIs 2026](https://adanos.org/insights/blog/best-financial-news-sentiment-apis-2026/)

Tiingo (tiingo.com) - ~$30/mo individual, ~$50/mo internal commercial; news API free or $30/mo; news-history depth described inconsistently (3 months vs back to 2014, likely plan-dependent) [3rd-party 2026] — [Newsdata.io best stock news API 2026](https://newsdata.io/blog/best-stock-news-api/); [Geekflare best stock market APIs](https://geekflare.com/guides/best-stock-market-api/)

Intrinio (intrinio.com) - quote-based; some sources cite ~$150/mo entry; news aimed at US-listed companies [3rd-party 2026] — [Medium/Coinmonks 7 best real-time stock APIs 2026](https://medium.com/coinmonks/the-7-best-real-time-stock-data-apis-for-investors-and-developers-in-2026-in-depth-analysis-61614dc9bf6c)

EODHD (eodhd.com) - ~€19.99/mo basic; free tier 20 calls/day, only ~2–4 news requests/day [3rd-party 2026] — [APILayer 2026](https://blog.apilayer.com/12-best-financial-market-apis-for-real-time-data-in-2026/)

Marketaux (marketaux.com) - free or $29/mo; per-entity sentiment; global stocks/crypto/FX [3rd-party 2026] — [Newsdata.io 2026](https://newsdata.io/blog/best-stock-news-api/)

TradingNews API - claims breaking news "as fast as 34 ms", from $20/mo [self-claim, promo post] — [Medium promo](https://medium.com/@twitterkol556/tradingnews-api-real-time-financial-news-for-algo-traders-starting-at-20-month-6775f43b7e29)

Barchart News API - 100+ sources, symbol filtering, no latency figure — [Barchart news solutions](https://barchart.com/solutions/data/news); [Barchart digital news](https://www.barchart.com/solutions/services/digital/news)

Interactive Brokers TWS API - tick-by-tick news per symbol and "BroadTape" all-news feed; requires news subscription contracts — [tws-mcp NEWS.md](https://glama.ai/mcp/servers/@haymant/tws-mcp/blob/493b5dbe4f2e6560fd3eac12c8b677be48f0f525/docs/NEWS.md)

LSEG (Refinitiv) Headlines Direct / Machine Readable News
- LSEG describes Headlines Direct as its lowest-latency machine-readable feed of Reuters and third-party news, headline-only, built for event trading, delivered from Secaucus, NJ; Standard News Feeds licenses do not permit redistribution; no price listed [self-claim] — [LSEG Headlines Direct fact sheet (PDF)](https://www.lseg.com/content/dam/data-analytics/en_us/documents/fact-sheets/lseg-headlines-direct-fact-sheet.pdf); [LSEG News Services overview](https://developers.lseg.com/en/product/news/overview); [LSEG News Services](https://developers.lseg.com/en/product/news)
- LSEG developer community: Machine Readable News via Elektron is the most comprehensive streaming option; contact account manager — [Refinitiv developer community thread](https://community.developers.refinitiv.com/discussion/comment/31902)

Dow Jones Newswires / Factiva
- Dow Jones launched an Elementized News Feed in 2007 structuring event data for quant parsing; a directory profile says multicast latency is "measured in microseconds" [3rd-party characterization] — [London Strategic Edge directory](https://londonstrategicedge.com/directory/data-providers/dow-jones-newswires/)
- Forum post cites a multicast feed co-located at Equinix NY4 [user-generated] — [Elite Trader ultra-low-latency news thread](https://www.elitetrader.com/et/threads/ultra-low-latency-news-feed-delivery.383001/)
- Vendr estimates: Factiva ~$2,000–3,500/user/yr list; Newswires $5,000–$50,000+ [3rd-party estimate] — [Vendr Dow Jones](https://www.vendr.com/marketplace/dow-jones)
- Retail route: QuoteMedia resells Dow Jones Newswire at $110/user/mo and MT Newswires Live Briefs at $50–$125/mo on its platform — [QuoteMedia Premium News Pricing Guide](https://support.quotemedia.com/support/solutions/articles/13000056015-premium-news-pricing-guide)
- Dow Jones offers data to startups via Fintech Sandbox — [Fintech Sandbox, Dow Jones](https://www.fintechsandbox.org/partner/dow-jones/)

MT Newswires - integration with viaNexus offers content through low-latency APIs/streaming — [CB Insights, MT Newswires](https://www.cbinsights.com/company/mt-newswires)

AlphaFlash (alphaflash.com) - machine-readable macro-economic releases; API feeds and colocation; no public price/latency [self-claim] — [AlphaFlash](https://alphaflash.com/); [About](https://alphaflash.com/about/)

Alliance News - appeared only as an MT Newswires competitor in a directory; no pricing or latency found — [CB Insights MT Newswires](https://www.cbinsights.com/company/mt-newswires)

PR wires (Business Wire, PR Newswire, GlobeNewswire, Accesswire) vs EDGAR
- RTPR (rtpr.io) claims to deliver releases from Business Wire, PR Newswire, GlobeNewswire and AccessWire in under 500 ms via REST and WebSocket, citing a median delivery of 312 ms [self-claim] — [RTPR](https://rtpr.io/); [RTPR API page](https://rtpr.io/real-time-press-release-api)
- A single May 2026 blog post claims that for S&P 500 earnings releases Business Wire typically trails the EDGAR 8-K by ~3–8 s, PR Newswire by ~10–30 s, GlobeNewswire by ~15–45 s (smaller GlobeNewswire sample); no methodology or second source [unverified] — [The Next Gen Nexus, PR Newswire vs BusinessWire vs GlobeNewswire](https://thenextgennexus.com/2026/05/30/pr-newswire-vs-businesswire-vs-globenewswire-data-coverage/)
- Business Wire national release reportedly ~$760; GlobeNewswire quote-based; Business Wire regarded as strongest for AP/Reuters terminal placement — [ContentGrip 2026 pricing compared](https://www.contentgrip.com/best-press-release-distribution-services/); [Everything-PR wires ranked](https://everything-pr.com/best-press-release-distribution-services); [Firecracker PR comparison](https://www.firecrackerpr.com/comparison-of-wire-services-for-press-release-distribution/)

SEC EDGAR real-time
- sec-api.io documentation: new filings available 300 ms after publication on EDGAR; WebSocket at wss://stream.sec-api.io pushes to all connected clients as soon as published; message includes links to filing details/documents [self-claim] — [sec-api.io Stream API docs](https://sec-api.io/docs/stream-api); [sec-api.io](https://sec-api.io/); [API catalog](https://sec-api.io/products/apis); [PyPI sec-api](https://pypi.org/project/sec-api/)
- 2019-era developer post described a real-time EDGAR API with max 30 s delay between EDGAR publish and event trigger [stale] — [Medium, SEC EDGAR API](https://medium.com/@jan_5421/sec-edgar-api-e92049b172b9)
- edgartools analysis: the EDGAR current-filings feed lists filings by filing date, not acceptance time; under Reg S-T Rule 13 a submission accepted after 5:30 pm ET is deemed filed the next business day; the author observed evening-accepted 8-Ks held off the live feed while insider forms kept flowing (single author, one date) — [edgartools, EDGAR Live Feed After-Hours Gap](https://www.edgartools.io/edgar-live-feed-after-hours-filings/)
- edgar.tools offers a Server-Sent-Events live filing stream on its Professional tier; free users get manual refresh — [edgar.tools Live SEC Filing Stream docs](https://app.edgar.tools/docs/features/live-filings)

### Inferences
- For a US-stock developer, EDGAR (via sec-api.io or a self-built poller on the SEC's own feeds) is the earliest structured signal for scheduled corporate events; the PR wire is a few seconds to tens of seconds later per the one available (weak) measurement, and mainstream outlets later still.
- The after-5:30 pm ET filing-date rule means any "latest filings" poller will systematically miss or delay after-hours 8-Ks; developers should also poll full-text search or vendor streams keyed on acceptance time.
- Vendor "ms" claims (8 ms, 25 ms, 34 ms, 300 ms, 312 ms) measure different things (socket delivery vs time-since-source-publication) and are not comparable; none is independently verified.

### Gaps
- Massive/Polygon plan pricing and which tier includes the Benzinga news WebSocket: not retrieved (budget exhausted before query ran).
- Alpaca news API tier details and whether real-time news is in the free plan: page not fetchable.
- Bloomberg B-PIPE / Event-Driven Feeds, Databento news, Nasdaq Data Link news, Tradefeeds, NewsAPI, Dow Jones/Factiva developer licensing terms: no results retrieved.
- Whether BusinessWire/GlobeNewswire offer direct WebSocket/API feeds to individuals: no source retrieved (only the RTPR aggregator was found).
- SEC's own documented delay for the "latest filings" RSS/JSON feeds: only the edgartools single-observer post; no SEC statement retrieved.
- Independent latency benchmarks for any news API: none found; Reddit r/algotrading threads did not surface in search.

## Key Question 3: Finance newsletters, magazines, value blogs, hedge-fund letters and short-seller reports (2026 rankings, prices, where they post first)

### Takeaway
The most-cited curated 2026 list is Michael Fritzell's Finance Directory "Top Finance Newsletters of 2026" (May 1, 2026; 43 starred publications, including Citrini, The Transcript, Net Interest, Yet Another Value Blog, Latticework, Sunday's Idea Brunch, HFI Research). Confirmed prices: Money Stuff free; Doomberg $400/yr standard and $1,200/yr Pro (publisher page; one source says $300); Net Interest $30/mo or $300/yr Pro with a free tier; The Diff has a free weekly issue plus a paid tier (price not confirmed); Axios Pro $600/yr single or ~$1,800/yr bundle (2022 figures). Substats ranks finance Substacks by estimated revenue with Michael Burry's Cassandra Unchained at the top (~341k subscribers). Hindenburg Research shut down in January 2025; Breakout Point counted 42 active short-seller firms (down from 62 in 2020). Short sellers publish on their own websites and launch via X/Twitter (Carson Block cited), with full control over timing.

### Cited Findings

Rankings / lists
- Fritzell's "Top Finance Newsletters of 2026" (May 1, 2026) is award-style, not numbered; 43 publications starred; criteria: insights, cost/value, writing, publishing consistency; named picks include Citrini (thematic), East Asia Econ, The Transcript, Capital Employed, Latticework, Sunday's Idea Brunch, Astutex, HFI Research, Net Interest, Yet Another Value Blog, Collyer Bridge; Fritzell is himself a Substack writer — [Finance Directory, Top Finance Newsletters of 2026](https://financedirectory.substack.com/p/the-top-finance-newsletters-of-2026)
- Wall Street Prep's 2026 picks include Axios Pro Rata, Money Stuff, Quick Takes by Quilt; describes The Daily Upside (founder Patrick Trousdale, ex-banker) as a daily business/finance newsletter — [Wall Street Prep best financial newsletters](https://www.wallstreetprep.com/knowledge/best-financial-newsletters/)
- Finpresso 10 picks include Morning Brew, Money Stuff, Net Interest; says only Net Interest gates deep dives behind a $30/mo ($300/yr) Pro tier — [Finpresso best finance newsletters 2026](https://finpresso.com/blog/best-finance-newsletters)
- Substack Explorer ranks 24 finance Substacks by subscriber count — [Substack Explorer finance](https://www.substackexplorer.com/newsletters/finance)
- Substats ranks by estimated revenue; Michael Burry's Cassandra Unchained at top (~341k subscribers, estimate) — [Substats finance category](https://www.substats.io/category/finance)
- Other 2026 lists: [InboxToKindle best finance Substacks 2026](https://inboxtokindle.com/blog/best-finance-substack-newsletters/); [RhinoInvestory 30 best investing Substacks 2026](https://rhinoinvestory.com/best-investing-substack-newsletters); [Readless 15 best paid Substacks 2026](https://www.readless.app/blog/best-paid-substack-newsletters-2026); [Readless best finance newsletters 2026](https://www.readless.app/blog/best-finance-newsletters-2026); [Goldman Won't Cover This, "I analysed the Top 100 Finance Substacks" (July 2026)](https://goldmanwontcoverthis.substack.com/p/i-analysed-the-top-100-finance-substacks); [Digest Africa top finance Substacks](https://www.digestafrica.com/vintage-brief/top-finance-newsletters-on-substack-your-best-picks-1767647820); [Steal What Works, Substacks making money](https://stealwhatworks.com/blogs/news/substack-newsletters-making-real-money-now)

Individual newsletters
- Money Stuff (Matt Levine, Bloomberg Opinion): free, weekdays; ~300,000 subscribers as of Jan 2024 — [Finpresso](https://finpresso.com/blog/best-finance-newsletters); [Wikipedia, Matt Levine](https://en.wikipedia.org/wiki/Matt_Levine_(columnist))
- Doomberg (anonymous energy/commodities team): publisher About page lists standard $400/yr and Pro $1,200/yr, 6–8 articles/month, group rate; a secondary source (citing A Media Operator) says $300/yr — conflict, publisher page more authoritative — [Doomberg About](https://newsletter.doomberg.com/about); [Everything-PR Doomberg revenue](https://everything-pr.com/doomberg-net-worth-substack-revenue)
- Net Interest (Marc Rubinstein, financials sector): free public tier; Pro $30/mo / $300/yr — [Finpresso](https://finpresso.com/blog/best-finance-newsletters); [Readless 2026](https://www.readless.app/blog/best-finance-newsletters-2026)
- The Diff (Byrne Hobart, tech/finance strategy): free weekly issue; premium adds three more full issues a week; USD price not published on the page checked — [Readless 2026](https://www.readless.app/blog/best-finance-newsletters-2026)
- Axios Pro (incl. Pro Rata deals coverage by Dan Primack): launched 2022 at $600/yr per newsletter or $1,800/yr all-Pro, two-week trial, no monthly option; Wikipedia lists bundle from $599/yr [stale] — [Nieman Lab, Axios Pro launch](https://www.niemanlab.org/2022/01/axios-launches-a-premium-subscription-product-aimed-at-the-dealmakers-among-us/); [Wikipedia Axios](https://en.wikipedia.org/wiki/Axios_(website))
- Semafor (incl. Semafor Business, Liz Hoffman): free, ad-supported; founders have described plans to move to paid — [Wikipedia Semafor](https://en.wikipedia.org/wiki/Semafor_(website)); [Semafor](https://www.semafor.com/)
- Puck (incl. Bill Cohan's Wall Street coverage): Aug 2026 report of RedBird in advanced talks to buy out existing shareholders at ~$250M valuation; subscription price not found — [Axios, Puck–RedBird](https://www.axios.com/2026/08/26/puck-redbird); [Wikipedia Puck](https://en.wikipedia.org/wiki/Puck_(media_company))
- Grant's Interest Rate Observer (James Grant): published 24 times a year; price not found — [Wikipedia James Grant](https://en.wikipedia.org/wiki/James_Grant_(finance)); [Microsoft Store app listing](https://apps.microsoft.com/detail/9wzdncrdsmf7?hl=en-US&gl=US)

Short sellers
- Hindenburg Research (Nate Anderson) announced closure January 2025; its Jan 2, 2025 Carvana report ("father-son accounting grift") sent CVNA down >11% next day before recovering; Anderson said ~100 individuals charged civilly/criminally at least partly via its work (another source: SEC charged 65, DOJ 24) — [CNBC, Hindenburg closing](https://www.cnbc.com/2025/01/15/hindenburg-research-founder-says-hes-closing-short-seller-research-shop.html); [Yahoo Finance, closing up shop](https://finance.yahoo.com/news/short-selling-firm-hindenburg-research-is-closing-up-shop-221608915.html); [Integrity Research](https://www.integrity-research.com/short-seller-hindenburg-research-shutters-business/)
- Breakout Point listed 42 active short-seller firms in 2024, down from 62 in 2020 — [Yahoo Finance, wear and tear of activist short-selling](https://finance.yahoo.com/news/hindenburg-research-shutting-down-highlights-wear-and-tear-of-activist-short-selling-143652817.html)
- Short sellers publish research on their own websites and build social campaigns; Carson Block (Muddy Waters) used Twitter as the launch pad; they choose timing freely (Hindenburg's SmileDirectClub report landed in a post-IPO quiet period) — [BuzzFeed News, Short Sellers' New Favorite Platform: Twitter](https://www.buzzfeednews.com/article/mariahsummers/moving-markets-one-tweet-at-a-time-a-look-at-the-hedge-fund); [IR Impact, how IR responds to short reports](https://www.ir-impact.com/2020/03/drawing-short-straw-how-ir-responds-short-reports/)
- Study: Hindenburg and Muddy Waters reports since 2015 provide real value to long and short investors — [Decoding Markets](https://stocksoftresearch.com/can-you-make-money-with-short-seller-reports/)
- Recent example of a target responding on X: SoFi IR posted a response to "an inaccurate short seller report" (2026; author of report not in snippet) — [SoFi IR on X](https://x.com/SoFiIR/status/2034042433827119122)
- 2026 short-report commentary (DraftKings, Rezolve AI) appears in Whitney Tilson's daily — [Stansberry, Tilson daily](https://stansberryresearch.com/whitney-tilsons-daily/avoid-chinese-penny-stocks-short-seller-reports-on-draftkings-dkng-and-rezolve-ai-rzlv-palantir-technologies-pltr-and-applovin-app-are-still-overvalued-signet-jewelers-sig-could-turn-into)
- Viceroy Research background — [Wikipedia Viceroy](https://en.wikipedia.org/wiki/Viceroy_Research); trader-oriented explainers — [Real Trading](https://realtrading.com/trading-blog/day-trading-short-seller-reports/); [Raging Bull](https://ragingbull.com/jason-bond-picks/short-seller-reports-everything-you-need-to-know/)

### Inferences
- Because short sellers self-publish and launch on X, the fastest retail channel for a short report is following the firm's own X account and website RSS; a terminal headline follows the tweet. This is consistent with the sources but no 2026 timing study was found.
- The newsletter tier that matters for US-stock idea flow (Citrini, YAVB, Transcript, Net Interest) is mostly Substack-hosted, so RSS + email are the universal delivery channels; none of the sources described API or webhook access.

### Gaps
- Prices for The Diff (paid tier), Grant's, Barron's, Institutional Investor, FT (Unhedged/Alphaville), Puck, Term Sheet, Morning Brew (free), Daily Upside (free), Chartr, Exec Sum, Litquidity, Kobeissi Letter, Citrini Research, Not Boring, Yet Another Value Blog, Value Investors Club, SumZero: no 2026 source retrieved (budget exhausted). Background knowledge, unverified: Morning Brew, Daily Upside, Chartr, Exec Sum and Litquidity are free ad-supported; VIC is free with application/guest delay; SumZero requires buy-side credentials.
- Hedge-fund letter aggregation (r/SecurityAnalysis quarterly threads, hedgefundletters, 13F season trackers): no source retrieved.
- Current status and posting channels of Muddy Waters, Culper, Grizzly, Fuzzy Panda, Spruce Point in 2026, and identity of "Hindenburg successors": no source retrieved. Background knowledge, unverified: Nate Anderson said he would open-source Hindenburg's methods; former Hindenburg staff were reported forming new shops in 2025.
- Bloomberg Odd Lots (podcast + newsletter) pricing/cadence: not researched.

## Key Question 4: Dealmaking / M&A scoops and credit intelligence (Reuters/Bloomberg/WSJ/FT deal teams, Dealreporter, Mergermarket, Betaville, CTFN, Dealogic, PitchBook, The Deal; Reorg/Octus, Debtwire, 9fin)

### Takeaway
Every specialist M&A/credit intelligence service found (Dealreporter, Mergermarket, CTFN, Octus/formerly Reorg, 9fin, Debtwire) is enterprise, quote-based pricing; the only concrete figures are a 2017–2019 Debtwire invoice at $72,000 for a regional subscription and an unverified aggregator figure of $50/user/mo for Mergermarket. None publish prices, and nothing was found on Betaville.

### Cited Findings
- Dealreporter (Acuris/ION): markets "Morning Flash" deal commentary and early opportunity flagging to hedge funds and merger-arb investors; no pricing — [Dealreporter about](https://www.dealreporter.com/info/about-dealreporter); [Dealreporter on X](https://x.com/dealreporter?lang=en); [Wikipedia Acuris](https://en.wikipedia.org/wiki/Acuris)
- Mergermarket: FAQ says contact sales for plans/pricing; G2 notes a free trial; a Datarade listing shows $50/user/mo (unverified, conflicts with vendor silence) — [Mergermarket FAQ](https://info.mergermarket.com/faqs/); [G2 Mergermarket pricing](https://www.g2.com/products/mergermarket/pricing); [Datarade Mergermarket](https://datarade.ai/data-providers/mergermarket/profile); [Slashdot comparison](https://slashdot.org/software/comparison/M-A-Deal-Platform-vs-Mergermarket/)
- CTFN: subscription-based M&A and merger-arbitrage news; subscribers get immediate access to stories; no price — [CTFN](https://ctfn.news/)
- Octus (formerly Reorg): listed as "Institutional (quote)" by a comparison site — [newsletters.markets Octus vs 9fin](https://newsletters.markets/compare/octus-vs-ninefin)
- 9fin: pricing page says products can be licensed alone or combined; no figures; listed "Institutional (quote)" — [9fin pricing](https://www.9fin.com/pricing); [Wikipedia 9fin](https://en.wikipedia.org/wiki/9fin); [Slashdot 9fin vs Debtwire](https://slashdot.org/software/comparison/9fin-vs-Debtwire/)
- Debtwire: FAQ (≈3 years old) says "Talk to sales"; a Scribd invoice shows a 2017–2019 North America + LatAm subscription at $72,000 plus $13,208.58 sales tax (one customer, historical) — [Debtwire FAQ](https://debtwire2.wpengine.com/faqs/); [Debtwire](https://info.debtwire.com/); [Scribd invoice](https://www.scribd.com/document/519584148/Invoice-2-test); Debtwire events — [ION Analytics Private Credit Forum NY 2026](https://community.ionanalytics.com/debtwire-private-credit-forum-new-york-2026)
- Comparison of M&A databases (Grata, PitchBook etc.) — [Grata, best M&A databases](https://grata.com/resources/best-ma-databases)

### Inferences
- For a retail investor the realistic merger-arb information diet is the free/cheap layer (Reuters/Bloomberg/WSJ/FT scoops relayed through Benzinga/Fly/StreetInsider headlines, Dealreporter's X account) rather than the $10K+ specialist services, whose value is lead time of hours-to-days on rumors.

### Gaps
- Betaville (Ben Harrington, UK): no result at all; price and alert mechanism unknown.
- Dealogic, PitchBook News, The Deal, Reuters/Bloomberg deal-team scoop cadence and documented "moved the market first" cases: not retrieved.
- Current (2026) Debtwire/Octus/9fin price levels: quote-only.

## Key Question 5: Consumer / retail / auto / industrials / transport trade press and alternative data (Retail Dive, Modern Retail, Chain Store Age, Placer.ai, Automotive News, Electrek, InsideEVs, Cox, Supply Chain Dive, FreightWaves/SONAR, Loadstar, TradeWinds, Splash247, Airline Weekly, Skift, Restaurant Business, NRN, Digiday, AdExchanger, Second Measure, Earnest, Yipit)

### Takeaway
Confirmed 2026-era prices: Skift Pro $55/mo, $155/qtr, $495/yr (team plan from $960/yr for 2–10 seats); Skift Airline Weekly $95/mo or $995/yr ($497.50 first year), quarterly $295 (page ~15 months old); Automotive News base digital+print $299/yr intro, $449 renewal (Jan 2025), $49/yr student digital. FreightWaves SONAR and Placer.ai do not publish prices; third-party estimates are $500/mo (SONAR, contract) to $995/user/mo (Capterra) and $2,394/user/yr (Placer.ai, Capterra). Everything else in this bucket was not reached before the search budget ran out.

### Cited Findings
- Skift Pro individual: Monthly $55, Quarterly $155, Annual $495; team plan from $960/yr for 2–10 seats [vendor page via search] — [Skift subscribe](https://skift.com/subscribe/); [Skift team plan](https://skift.com/subscribe-group/); [Skift individual membership](https://my.skift.com/subscribe/skift-membership-individual); [PricingSaaS Skift history](https://pricingsaas.com/companies/skift); Skift Pro launched July 2020 as a daily news membership — [Skift Pro launch](https://skift.com/2020/07/01/introducing-the-next-phase-of-skifts-evolution-skift-pro-our-daily-news-membership-service/); [Dennis' Online Travel Briefing](https://skift.com/2020/07/22/launching-new-skift-pro-exclusive-dennis-online-travel-briefing/)
- Skift Airline Weekly: Monthly $95 ($1,140/yr), Annual $995 or $497.50 first year, Quarterly $295; page ~467 days old [vendor page via search, possibly stale] — [Airline Weekly subscribe](https://airlineweekly.skift.com/subscribe/)
- Automotive News (Crain): Jan 2025 blog reports renewal $449 for base 1-yr digital+print, up from $299 the prior year, intro still $299/yr; reseller lists $299 for 1-yr premium print+digital; student digital $49/yr; older forum cites $25/mo or $249/yr [mixed, partly stale] — [Indie Auto, subscriptions more costly](https://www.indieauto.org/2025/01/21/automotive-news-subscriptions-have-become-even-more-costly/); [MagazineLine listing](https://www.magazineline.com/automotive-news-magazine); [SheerID student offer](https://shop.sheerid.com/offers/exclusive-student-offer-for-automotive-news/); [Opposite-Lock forum](https://opposite-lock.com/topic/109736/automotive-news-subscription); [Wikipedia Automotive News](https://en.wikipedia.org/wiki/Automotive_News)
- Auto Finance News Premium (annual product page exists; price not in snippet) — [Auto Finance News Premium](https://www.autofinancenews.net/product/auto-finance-news-premium-annual/)
- FreightWaves SONAR: no published price; ITQlick says tiered pricing starts ~$500/mo with contract (~$6,000/yr); Capterra lists $995/user/mo (conflict) [3rd-party estimates] — [ITQlick SONAR pricing](https://www.itqlick.com/sonar/pricing); [Capterra SONAR](https://www.capterra.com/p/199499/SONAR/); context — [Ultraship, best freight analytics tools 2026](https://ultraship.ai/blogs/best-freight-analytics-tools)
- Placer.ai: no official price; Capterra lists starting $2,394/user/yr [3rd-party] — [Capterra Placer.ai](https://www.capterra.com/p/199858/Placer-ai/)

### Inferences
- Travel (Skift/Airline Weekly) and auto (Automotive News) trade press are priced for individuals ($300–1,000/yr); freight (SONAR) and foot-traffic (Placer.ai) data are priced for enterprises ($6K+/yr), so a retail investor is more likely to consume them second-hand via FreightWaves' free articles and Placer.ai's free blog/newsletter rather than the platforms.

### Gaps
- Retail Dive, Supply Chain Dive (Industry Dive, free), Modern Retail / Digiday+ price, Chain Store Age, Electrek, InsideEVs, Cox Automotive (free data releases), Loadstar, TradeWinds, Splash247, Restaurant Business, Nation's Restaurant News, AdExchanger: not reached; no prices or cadence sourced. Background knowledge, unverified: Industry Dive titles, Electrek, InsideEVs and Splash247 are free ad-supported; TradeWinds, Loadstar Premium and Digiday+ are paid.
- Alternative data (Bloomberg Second Measure, Earnest Analytics, YipitData, Consumer Edge): no pricing source retrieved; all are institutional quote-based (background knowledge, unverified).
- Documented cases of trade press moving US tickers (e.g., Electrek on TSLA, FreightWaves on trucking names, AdExchanger on TTD/APP): none retrieved.

## Key Question 6: Korean-language sources covering US stocks fast (연합인포맥스, 한국경제 글로벌마켓, 매일경제 월가월부, 뉴스핌, 더밀크, 서학개미 텔레그램/카카오, 토스증권/키움 피드, 증권사 데일리)

### Takeaway
Very little was sourced. Confirmed: 매일경제 '월가월부' runs a free Telegram channel delivering AI-based real-time information on ~400 watched US companies (Jan 2025 article); 연합인포맥스 is a Yonhap News subsidiary providing real-time financial data and news, and in Nov 2026 it covered 서학개미 buying ~3조원 (US$2.2B) of US stocks in the first week of November, led by SOXL. No prices for 연합인포맥스, 더밀크, 한경 글로벌마켓 or any brokerage feed were found; several AI-briefing apps for 해외증시 exist on the App Store.

### Cited Findings
- 매일경제 '월가월부' Telegram: AI-based US market information, ~400 companies of interest delivered in real time, subscription free (article dated Jan 1, 2025) — [네이트 뉴스, "서학개미는 이 앱 무조건 깔겠네"](https://news.nate.com/view/20250101n17644)
- 연합인포맥스 described as a Yonhap News subsidiary providing financial-market information, real-time data, economic news and analysis — [잡코리아 연합인포맥스](https://www.jobkorea.co.kr/company/16151203); [자소설닷컴 기업분석 2026 하반기](https://jasoseol.com/companies/1882/insights); [더브이씨 연합인포맥스](https://thevc.kr/yonhapinfomax)
- 연합인포맥스 (기자 황보연) and others reported 서학개미 net-bought US$2,197.53M (~3조원) of US stocks Nov 2–6, 2026 (한국예탁결제원 data), led by SOXL (US$1,625.25M) — [Google 뉴스 비즈니스 (연합인포맥스 headline)](https://news.google.com/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtdHZHZ0pMVWlnQVAB?hl=ko&gl=KR&ceid=KR%3Ako); [재경일보](https://news.jkn.co.kr/post/1076046); [스페셜타임스](https://www.specialtimes.co.kr/news/articleView.html?idxno=482790)
- Korean-language AI briefing apps for US/overseas markets exist: '월월 – 해외 증시 AI 뉴스 브리핑', '베스트웨이 – AI 미국 주식 가이드', '미국주식창' — [월월 App Store](https://apps.apple.com/kr/app/%EC%9B%94%EC%9B%94-%ED%95%B4%EC%99%B8-%EC%A6%9D%EC%8B%9C-ai-%EB%89%B4%EC%8A%A4-%EB%B8%8C%EB%A6%AC%ED%95%91/id6755675499?l=ko); [베스트웨이](https://apps.apple.com/kr/app/id6463596274); [미국주식창](https://apps.apple.com/tr/app/app/id1597051402)
- 연합뉴스경제TV YouTube channel exists as a video channel — [YouTube](https://www.youtube.com/channel/UC6kZpTl39-_SqfBrF1-N2oQ)
- kr.investing.com provides Korean-language quotes and financial news — [Investing.com Korea](https://kr.investing.com/)

### Inferences
- Korean outlets' US-stock coverage is downstream of US wires (connected to Yonhap/연합인포맥스's data business), so the lead-time advantage of these sources is translation and Korean-market framing (서학개미 flows, 예탁결제원 data), not speed on US headlines.

### Gaps
- 연합인포맥스 해외주식 subscription price and whether it has a Telegram/app 속보 channel: not found.
- 더밀크(The Miilk) membership price: no result (dedicated query not executed; budget exhausted).
- 한국경제 글로벌마켓, 뉴스핌, 서학개미 텔레그램/카카오 오픈채팅 channels, 토스증권/키움 해외주식 뉴스 피드 (and their news vendors/translation latency), 미래에셋/삼성/KB 미국주식 데일리 cadence: no sources retrieved.
- Speed comparisons between Korean outlets and US originals: none found.
