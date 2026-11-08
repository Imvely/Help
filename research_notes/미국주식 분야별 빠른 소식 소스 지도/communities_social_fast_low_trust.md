# Fast-but-low-reliability community & social sources for US-listed stocks (Reddit, HN, X, Discord/Telegram, StockTwits/Blind, prediction markets, Korean/Chinese communities, alt signals)

Research date: 2026-11-08. Scope: where market-moving information about US-listed equities surfaces *before* mainstream media, how to consume it, and how far to trust it. Prices in USD unless noted (KRW for Korean items).

Method note: ~35 web searches were run; the session's search budget was then exhausted, and WebFetch to several primary hosts was blocked by the session network allow-list (docs.x.com, docs.kalshi.com, support.reddithelp.com, www.sec.gov, fortune.com, theins.press, techloy.com all failed to resolve). Where a claim rests only on a vendor blog, a search snippet, or my general knowledge, it is marked **[unverified]**. Community URLs are given as pointers; a URL by itself is not evidence of the descriptive claims next to it.

**Reliability scale used throughout (my assessment, not an external standard):**
- **R5** primary/official (regulator filings, company status pages, exchange data) — not the focus here
- **R4** professional squawk/aggregator with editorial accountability; fast; occasional errors
- **R3** fast, often right, but routinely relays unconfirmed items; must be verified against a primary source
- **R2** anonymous/retail forum; useful for sentiment/flow and for *first-hand observations* (outages, layoffs) but hype- and hoax-prone
- **R1** manipulation-prone venue; treat any specific ticker claim as adversarial

## Master catalog (one row per community/channel)

| Source | URL | What surfaces first | Who posts | Speed vs media | Reliability | Consumption | Key caveat |
|---|---|---|---|---|---|---|---|
| r/wallstreetbets | https://www.reddit.com/r/wallstreetbets | Retail flow, meme momentum, options YOLOs, occasional DD | Retail, anonymous | Attention spikes often precede press coverage of meme moves; not a news source | R2 (pre-2021 DD had measurable alpha; eliminated post-GME per RFS 2024) | Reddit Data API (free tier; commercial paid since Jul 2023), ApeWisdom, Quiver, SwaggyStocks, TrendSpider | Mention counts measure attention, not conviction |
| r/stocks, r/investing, r/options, r/thetagang, r/SecurityAnalysis, r/ValueInvesting | reddit.com/r/… | Discussion, not breaking news; occasional thoughtful DD | Retail/semi-pro | Slower; reacts to news | R2 | Same Reddit tooling | No evidence found in this research of early-signal value **[gap]** |
| r/Superstonk, r/Shortsqueeze, r/pennystocks, r/Biotechplays | reddit.com/r/… | Squeeze narratives, microcap/biotech catalysts | Retail, promoters | Fast on narratives | R1–R2 | Same | Promotion/pump risk; no moderation study retrieved (search budget exhausted) **[gap]** |
| r/sysadmin, r/crowdstrike, r/devops | https://www.reddit.com/r/sysadmin | **First-hand outage reports** (e.g., CrowdStrike BSOD 2024-07-19) | IT admins (first-hand) | Hours before mainstream press in the CrowdStrike case (inference; see §1) | R3 for *observations*, R2 for interpretations | Reddit API / RSS (`/r/sysadmin/new.rss`) + keyword alerts | Scale of impact must be confirmed via company status pages / 8-K |
| r/Layoffs, r/cscareerquestions, company subs (r/nvidia, r/Amd, r/hardware, r/teslamotors) | reddit.com/r/… | Layoff chatter, product/firmware issues, delivery issues | Employees/customers | Variable | R2 | Same | Not researched in depth **[gap]** |
| Hacker News | https://news.ycombinator.com | Tech/security/AI/outage news; HN discussion often appears same-hour as incident | Engineers, founders | Fast on tech incidents; no latency study found **[gap]** | R3 | Official Firebase API (github.com/HackerNews/API), Algolia search API (hn.algolia.com/api), hnrss.org RSS **[pointers; not fetched]** | Algolia search ingestion has had outages while the official API stayed current |
| X/Twitter squawk accounts (@DeItaone "Walter Bloomberg", @FirstSquawk, @Financialjuice, @LiveSquawk, @unusual_whales, @KobeissiLetter, @StockMKTNewz, @Fxhedgers, @PiQSuite, @spectatorindex, @BNONews, @disclosetv, @WatcherGuru, @zerohedge) | x.com/<handle> | Headlines (terminal re-posts), geopolitical flashes, options flow screenshots | Anonymous aggregators, small firms | Seconds-to-minutes; often ahead of wires' public feeds | R3 (Walter Bloomberg/Hammer Capital spread the 2025-04-07 fake tariff-pause headline) | X API now pay-per-use (no free tier since 2026-02-06 **[secondary sources]**); X Lists; Telegram mirrors | Fake "Bloomberg"-branded accounts/sites have moved markets in 2015, 2023, 2025 |
| Unusual Whales Discord | https://discord.com/servers/unusual-whales-710524439133028512 | Options flow, alerts, news | Subscribers + staff | Real-time for paid; free tier delayed | R3 | Discord; premium bot streams flow into own server | Pricing varies by source ($30–$90/mo quoted) |
| Telegram channels (Bloomberg official; Walter Bloomberg mirror; Korean 서학개미 channels) | t.me/… | Headline relays, Korean-language summaries | Aggregators | Minutes | R3–R2 | `t.me/s/<channel>` public preview; Telegram Bot API **[pointer]** | Korean channel ecosystem documented only indirectly |
| StockTwits | https://stocktwits.com | Retail sentiment, trending tickers | Retail | Reactive | R2 | Official API restricted/approval-based; Alpaca/Improvado integrations; scrapers (ToS risk) | "Trending" = message velocity, not bullish/bearish |
| Blind (TeamBlind) | https://www.teamblind.com | **Layoff pre-signals** (sign-up surges, "kill list" rumors), internal morale | Verified employees (company email) | Days before announcements (Meta 2022, Microsoft 2023) | R3 for mood/surge data, R2 for specific claims | App only; no public API found **[gap]** | Rumors are unverified employee posts |
| WARN notices / layofftracker.us | https://www.layofftracker.us | Statutory layoff filings | Employers (legal filings) | Lags internal rumor, leads press for small firms | R5 (primary) / aggregator R4 | Aggregator pages; state labor sites | Aggregator showed date anomalies |
| 4chan /biz/ | https://boards.4chan.org/biz/ | Crypto moonshots, hoaxes | Anonymous | Fast | R1 | No stable API; third-party trackers unreliable | Origin of the Vitalik "death" hoax |
| Bluesky finance feeds | https://bsky.app | Finance commentary; custom feeds | Journalists, some pros | Not established as early | R3 | AT Protocol open feeds | Evidence of early-signal value is promotional only |
| Threads / Mastodon / Substack Notes | — | No finance early-signal evidence found | — | — | n/a | — | **[gap]** |
| Polymarket | https://polymarket.com | Odds on Fed, elections, geopolitics; *insider-informed* bets on military events | Global crypto users | Minutes-to-hours ahead on geopolitical events (documented insider cases) | R3 as aggregator; odds can reflect MNPI | Gamma API, CLOB API, Data API (public reads; 15,000 req/10 s) | Repeated 2026 insider-trading cases; no clear federal insider statute |
| Kalshi | https://kalshi.com | Fed decisions, economic prints, elections, sports | US users; CFTC-regulated DCM | Fast; large US liquidity | R3–R4 | REST + WebSocket API, AsyncAPI spec, Python SDK **[limits unverified]** | State-level legal fights over sports contracts |
| Metaculus / Manifold | https://www.metaculus.com, https://manifold.markets | Forecasts (no real money / play money) | Forecasters | Slow, deliberative | R3 | Public APIs **[not researched]** | **[gap]** |
| Benzinga Live / Schwab Network / X Spaces (e.g., The Bitcoin Layer) | benzinga.videonest.co; schwabnetwork.com | Live FOMC/earnings reaction | Media hosts | Real-time | R3–R4 | YouTube live | "Meet Kevin" specifics not found **[gap]** |
| Toss Securities community (토스증권 커뮤니티) | https://toss.im/service/securities | Korean retail sentiment on US names; holder-verified posts | Korean retail (4M MAU) | Reactive | R2–R3 | In-app only | Marketing-heavy sources |
| DC인사이드 해외주식/미국주식 갤러리, 에펨코리아 주식게시판, 클리앙, 뽐뿌, 네이버 종목토론방, 카카오 오픈채팅 | gall.dcinside.com; fmkorea.com; clien.net; ppomppu.co.kr; finance.naver.com | Korean retail memes/flow | Anonymous | Fast but reactive | R2–R1 | Web scraping only | **No direct sources found**; descriptions unverified |
| Weibo / Xueqiu (雪球) | https://weibo.com, https://xueqiu.com | China-side rumors on NVDA, AAPL, TSLA supply chain | Chinese retail/media | Fast; rumor-heavy | R2 (Nvidia issued Weibo rebuttals Dec 2024) | Scraping; no official API covered | Xueqiu-specific evidence not found **[gap]** |
| PTT Stock board (Taiwan) | https://www.ptt.cc/bbs/Stock/ | TSMC/supply-chain news relays and skepticism | Taiwanese retail, some industry insiders | Mostly reposts of media; community skepticism valuable | R2–R3 | Scraping (pttweb.cc mirror) | No confirmed "PTT first" case found |
| Corporate-jet tracking (JetTrack/Paragon, Quandl/Nasdaq, JetNet) | https://www.jetnet.com/products/jettrack | M&A pre-signals | Vendors | Days ahead (occasionally) | R3 | Paid datasets | Evasion (NetJets, neutral cities); hedge-fund analyst: "not that useful" historically |
| Google Trends / Wikipedia pageviews | https://trends.google.com; https://pageviews.wmcloud.org | Attention spikes before market falls (2013 studies) | Public | Weekly granularity in studies | R3 | Free APIs | Authors cautioned the effect may not persist |

---

## Key question 1 — Reddit (subs, API/pricing since 2023, trackers, academic evidence)

### Takeaway
Reddit's value is in (a) first-hand observations from practitioner subs (r/sysadmin and r/crowdstrike surfaced the 2024-07-19 CrowdStrike outage within hours of the 01:10 EDT incident start) and (b) attention/flow data from r/wallstreetbets; peer-reviewed work finds WSB recommendations predicted returns *before* the GameStop squeeze but not after. Pushshift is gone (May 2023), the Data API has been paid for commercial use since July 2023, and 2025–2026 vendor reports claim registration tightened further.

### Cited Findings
- Reddit's June 2023 announcement: "the rate for apps that require higher usage limits is $0.24 per 1K API calls," effective July 1, 2023; "over 90% of apps fall into this category and can continue to access the Data API for free" — [Reddit r/reddit thread (mirror)](https://twt.omada.cafe/r/reddit/comments/145bram/addressing_the_community_about_changes_to_our_api/jnkcwrn); blackout coverage at [Marketing-Interactive](https://www.marketing-interactive.com/thousands-of-reddit-forums-go-dark-as-users-protest-api-data-charges).
- Pushshift: Reddit revoked public access on May 2, 2023; a June 2023 agreement limited it to verified moderators for moderation use only — [Xpoz tutorial](https://www.xpoz.ai/blog/tutorials/how-to-get-historical-reddit-data-after-pushshift/) **[vendor blog]**.
- 2026 vendor claims: commercial tier "about $12K+/year minimum"; self-service registration closed under a "Responsible Builder Policy" (late 2025) so new OAuth tokens need manual approval; Arctic Shift described as the main Pushshift successor (free archive 2005–present) — [Techloy guide](https://www.techloy.com/reddit-api-pricing-in-2026-complete-guide-for-developers-and-businesses/); [Xpoz alternatives](https://www.xpoz.ai/blog/comparisons/best-reddit-api-alternatives-2026/) **[unverified; both sell alternatives; official page unreachable]**.
- Academic (peer-reviewed): Bradley, Hanousek, Jame & Xiao, "Place Your Bets? The Value of Investment Research on Reddit's Wallstreetbets," *Review of Financial Studies* 37(5), 2024, pp. 1409–1459, DOI 10.1093/rfs/hhad098: "before the Gamestop (GME) short squeeze, recommendations are significant predictors of returns and cash-flow news. This predictability is eliminated post-GME." — [EconPapers](https://econpapers.repec.org/RePEc:oup:rfinst:v:37:y:2024:i:5:p:1409-1459.); the earlier working paper reported average 'buy' recommendations produced two-day announcement returns of 1.1% — [IDEAS/RePEc WP 76/2021](https://ideas.repec.org/p/men/wpaper/76_2021.html); coverage — [SuchScience](https://suchscience.net/?p=33659).
- Digital Finance (2023): a strategy buying WSB-recommended stocks weighted by posts per day yielded higher average returns than the market but with higher risk — [Springer PDF](https://link.springer.com/content/pdf/10.1007/s42521-023-00084-y.pdf).
- A study of WSB's top 40 posters found their picks ranged from +14.86% to −14.73% long-short CAR and "no evidence ... that WSB can produce alpha"; it notes the literature is "mixed" — search snippet; candidate source [Middlesex repository paper](https://mdx-repository.prod-uk.cayuse.com/download/28578f8f27b10061fa08e1166b5519ade1b166885a75b7d528cf6c6ede2169f9/891056/m78749-wang%20paper.pdf) **[attribution to this exact paper unverified]**.
- NHH master's thesis (2020–2021 data): WSB sentiment "explain[s] returns better the day after sentiment is recorded" — [NHH Open Access](https://openaccess.nhh.no/nhh-xmlui/handle/11250/2774809).
- Additional literature on Reddit's role in the GME squeeze — [IIMB working paper](https://research.iimb.ac.in/work_papers/602); [PMC article](https://pmc.ncbi.nlm.nih.gov/articles/PMC9210333).
- CrowdStrike 2024-07-19: an r/sysadmin poster reported "just had 160 all BSOD"; r/crowdstrike megathread passed 22,000 upvotes — [Shacknews](https://shacknews.com/article/140633/crowdstrike-microsoft-windows-bsod); thread mirror — [r/crowdstrike BSOD thread](https://cal1.lr.ggtyler.dev/r/crowdstrike/comments/1e6vmkf/bsod_error_in_latest_crowdstrike_update/ldw3twc/?context=3). Incident start logged as 01:10 EDT — [ServiceChannel status page](https://status.servicechannel.com/incidents/mc1538s1277n). Official confirmations came later: [CISA alert](https://cisa.gov/news-events/alerts/2024/07/19/widespread-it-outage-due-crowdstrike-update); [CrowdStrike 8-K](https://www.sec.gov/Archives/edgar/data/1535527/000110465924081571/tm2419936d1_8k.htm). "IT professionals convened on Reddit" — [Business Insider](https://businessinsider.in/tech/news/inundated-it-workers-commiserate-marvel-at-historic-crowdstrike-outage/amp_articleshow/111871364.cms).
- Trackers: ApeWisdom — free web, paid API tiers; reviewer warns data can lag and bots distort sentiment — [AltIndex review](https://altindex.com/reviews/ape-wisdom); [NexusFi listing](https://nexusfi.com/d/data-providers/ape-wisdom/). SwaggyStocks — freemium, premium ~$10/month via Patreon — [Bullish Bears](https://bullishbears.com/reddit-wallstreetbets-sentiment-tracker-swaggystocks/). Quiver Quantitative WSB dataset (daily mentions) on QuantConnect — [QuantConnect docs](https://www.quantconnect.com/docs/v2/writing-algorithms/datasets/quiver-quantitative/wallstreetbets); MarketBeat uses Quiver's 30-day WSB rankings — [MarketBeat](https://www.marketbeat.com/originals/the-3-most-talked-about-investments-on-wallstreetbets-right-now). TrendSpider WSB mentions — [TrendSpider](https://trendspider.com/marketdata/wall-street-bets-social-mentions/). Provider comparison — [Sentisense 2026](https://sentisense.ai/blog/best-stock-sentiment-data-providers-2026/).
- "Mention-count rankings measure attention rather than conviction" — [Gotrade blog](https://www.heygotrade.com/en/blog/reddit-top-stock-picks-2026-wisdom-or-hype/).

### Inferences
- For *news*, the useful Reddit surfaces are practitioner subs (sysadmin/devops/crowdstrike) where posts are first-hand observations; their lead over press is hours, but magnitude must be confirmed elsewhere.
- For *flow*, WSB mention data is a crowding indicator; post-2021 evidence suggests it is better for gauging retail positioning than for stock selection.
- Efficient consumption: subreddit `/new.rss` or `/new.json` feeds plus keyword alerts (ticker, "BSOD", "outage", "layoff") on a free-tier OAuth app; budget for paid access or a vendor if volume is commercial.

### Gaps
- Official Reddit Data API terms page (support.reddithelp.com) was unreachable; current free-tier QPM and the "Responsible Builder Policy" text are unverified.
- HypeEquity and Stocknear: no sources retrieved.
- No study retrieved on r/Superstonk or r/Shortsqueeze moderation/hoax rates (search budget exhausted).
- No timestamped evidence that r/sysadmin beat all other channels on CrowdStrike; "hours ahead" is an inference from the 01:10 EDT start and early-morning threads.

---

## Key question 2 — Hacker News

### Takeaway
HN is a fast, engineer-sourced venue for tech/security/outage/AI news, consumable through free official and Algolia APIs and hnrss; however, no study of HN front-page latency vs. press was found, and Algolia's HN search has had ingestion outages while the official API stayed current.

### Cited Findings
- HN search (Algolia) halted new data ingestion "as of Friday evening, though the HN API still reflects current data from the live front page" (undated incident) — [WebProNews](https://www.webpronews.com/hacker-news-algolia-search-outage-halts-new-data-ingestion); [Feedbagel](https://feedbagel.com/post/hn-search-service-halts-data-ingestion-since-friday) (says Algolia has powered HN search since ~2019).
- Algolia status history shows many cluster incidents 2025–2026, none specifically naming HN — [IsDown Algolia history](https://isdown.app/status/algolia/outage-history).
- Tool pointers **[not fetched in this research]**: official HN API https://github.com/HackerNews/API ; Algolia HN Search API https://hn.algolia.com/api ; hnrss https://hnrss.org (supports query/points thresholds).

### Inferences
- For market use, HN matters mainly for software/security names (CRWD, MSFT, NET, OKTA, etc.) and AI-supply-chain chatter; pair an hnrss keyword feed with a points threshold to cut noise.

### Gaps
- No quantitative HN-vs-press latency data found. No HN-specific CrowdStrike timeline found.

---

## Key question 3 — X/Twitter squawk accounts, API costs, fake-headline incidents, verification

### Takeaway
X squawk accounts relay terminal headlines within seconds but have twice (2023 Pentagon image, 2025 tariff-pause headline) amplified fakes that moved trillions in market cap for minutes; verification norm among traders is to check the originating wire/terminal/official account. X API access moved to pay-per-use in 2026 with no free tier (per multiple secondary sources; official docs unreachable).

### Cited Findings
- 2025-04-07 fake tariff-pause: "a wild stock-market swing based on false information added $2.4 trillion in value and erased it almost as quickly Monday morning" — [Wealth Professional](https://wealthprofessional.ca/news/industry-news/fake-headline-sends-wall-street-into-us24-trillion-whiplash/388836); NPR/AP coverage — [APR](https://www.apr.org/business-education/2025-04-07/how-a-false-x-post-about-pausing-tariffs-led-to-multitrillion-dollar-market-swings).
- Sequence: FT reported "Hammer Capital" posted at 10:11 a.m., ahead of Walter Bloomberg (10:13 a.m., with siren emoji), CNBC and Reuters; Walter Bloomberg later deleted and claimed Reuters as its source — [Babel summary of FT](https://babel.ua/en/news/116947-ft-anonymous-account-in-x-caused-chaos-in-financial-markets-the-reasons); PolitiFact: "it's still unclear where that purported headline originated" and major outlets published later than the X accounts — [PolitiFact](https://www.politifact.com/factchecks/2025/apr/08/tweets/trump-hassett-tariff-pause-stock-market-rally-x/); The Insider's account of Hammer Capital first — [The Insider](https://theins.press/en/news/280377) **[could not fetch]**.
- Walter Bloomberg "is not affiliated with Bloomberg News" but "often shares the news organization's headlines"; Reuters and CNBC issued corrections; White House rapid-response called it fake news — [Fortune](https://www.fortune.com/2025/04/07/trump-tariff-pause-walter-bloomberg-fake-report-debunked-markets); [TechCrunch](https://techcrunch.com/2025/04/07/how-one-tweet-wreaked-havoc-on-the-stock-market); [Euronews](https://www.euronews.com/2025/04/08/how-a-false-headline-about-a-tariff-pause-triggered-a-wild-stock-market-jump); White House denial within about an hour — [Lead Stories](https://leadstories.com/hoax-alert/2025/04/fact-check-no-evidence-trump-plans-90-day-pause-on-tariffs.html). Follower counts cited as 850k–900k+ (sources differ).
- 2023-05-22 Pentagon AI image: S&P 500 fell about 0.3% to a session low just past 10 a.m. NY; Bloomberg called it "possibly the first instance of an AI-generated image moving the market" — [Bloomberg](https://www.bloomberg.com/news/articles/2023-05-22/fake-ai-photo-of-pentagon-blast-goes-viral-trips-stocks-briefly). Spread via verified accounts including a fake "Bloomberg Feed" account later suspended — [Euronews](https://www.euronews.com/2023/05/23/fake-news-about-an-explosion-at-the-pentagon-spreads-on-verified-accounts-on-twitter). PFPA/Arlington statement: "There is NO explosion or incident taking place at or near the Pentagon reservation" — [WHRO/NPR](https://www.whro.org/national-news/2023-05-22/fake-viral-images-of-an-explosion-at-the-pentagon-were-probably-created-by-ai). The "$500 billion" market-cap swing figure circulating online was not verifiable.
- 2015 spoofed Bloomberg website claiming a $31B Twitter takeover sent TWTR up; shares retreated within ~10 minutes — [Fortune](https://www.fortune.com/2015/07/14/fake-twitter-bloomberg-report/); [City A.M.](https://cityam.com/?p=426416); [WatersTechnology](https://www.waterstechnology.com/node/1622952). Older PairGain fake-takeover hoax (+30%) — [CBS News](https://cbsnews.com/news/the-25-billion-scam) **[year not confirmed here; historically 1999]**.
- X API pricing (all secondary; docs.x.com unreachable): pay-per-use became default on 2026-02-06 with no free tier; legacy Basic $200/mo and Pro $5,000/mo closed to new customers; Basic subscribers migrated after 2026-06-01; Pro deprecation announced 2026-08-14 — [WeAreFounders](https://www.wearefounders.uk/the-x-api-price-hike-a-blow-to-indie-hackers/); [PostProxy](https://www.postproxy.dev/blog/x-api-pricing-2026/); [SocialCrawl](https://www.socialcrawl.dev/blog/x-twitter-api-2026); read cost quoted as $0.005/post by one source — [Upload-Post calculator](https://www.upload-post.com/x-api-pricing/); Enterprise quoted $42k–$50k/month — [OpenTweet (checked 28 Sep 2026)](https://opentweet.io/x-api-pricing); [Bundle.social](https://bundle.social/blog/x-api-pricing-2026-costs-limits). **Sources conflict on dates; treat as indicative.**
- Verification practice: the common thread across hoaxes is that fakes were exposed by checking the primary source (the actual Terminal, the outlet's own site, official agency accounts) — [Cottrill Research](https://cottrillresearch.com/dont-believe-everything-you-read-bloomberg-website-hoax-sends-twitters-shares-soaring/); [StockTwits News on the 2025 episode](https://stocktwits.com/news-articles/markets/equity/how-one-social-media-post-briefly-flipped-markets/chflHOjRbJB).

### Inferences
- Squawk accounts are best treated as *alerts to go verify*, not as sources. A practical rule: headline from an aggregator → check the named wire (Reuters/Bloomberg/CNBC) or official account within 60 seconds; if absent, assume unconfirmed.
- At pay-per-use rates, programmatic monitoring of dozens of high-volume accounts is costly; Telegram mirrors or X Lists viewed manually are the cheaper path for individuals.

### Gaps
- Official X API rate card could not be fetched. No source found for X Premium subscription prices in 2026.
- Descriptive claims about individual accounts (@FirstSquawk, @Financialjuice, @LiveSquawk, @PiQSuite, @KobeissiLetter, etc.) and trader X Lists were not researched; handles listed as pointers only.

---

## Key question 4 — Discord / Telegram

### Takeaway
Discord trading servers (Unusual Whales the best-documented) gate real-time flow behind subscriptions (~$30–$90/mo quoted) and offer bots to pipe flow into your own server; Telegram carries both official (Bloomberg News, ~3 posts/day) and unofficial headline mirrors (Walter Bloomberg) plus a large Korean channel ecosystem documented only indirectly.

### Cited Findings
- Unusual Whales Discord "is open to all! Subscribers to the Options Flow service unlock exclusive subscriber only content" — [Discord server page](https://discord.com/servers/unusual-whales-710524439133028512). A "Premium Discord Bot" can stream live options flow into a server — [Unusual Whales Substack](https://unusualwhales.substack.com/p/how-to-setup-the-unusual-whales-discord). Free plan reportedly shows flow 2 days late, news 15 minutes late, alerts 30 minutes late — [OptionsTradingIQ review](https://optionstradingiq.com/unusual-whales-review/) **[third-party]**. Pricing quoted at $30/mo, $35–$90/mo, or $48/mo by different reviewers — [TradingTools](https://tradingtools-directory.pages.dev/tools/unusual-whales/); [Pineify](https://pineify.app/unusual-whales/unusual-whales-review); [PurePowerPicks](https://purepowerpicks.com/unusual-whales-review/) **[affiliate-style; check unusualwhales.com]**.
- Bloomberg News official Telegram (since Dec 2019, after closing WhatsApp): "expect about three messages each day" — [Bloomberg](https://www.bloomberg.com/news/articles/2019-12-04/how-to-follow-bloomberg-on-telegram); [Digiday](https://digiday.com/media/bloomberg-news-using-telegram).
- Walter Bloomberg Telegram mirror appears in a third-party Telegram-tracking aggregator as a "Markets source… Tier 3" — [news.jeremywhittaker.com](https://news.jeremywhittaker.com/item/walterbloomberg-31246/) **[low quality]**.
- Korean Telegram: a Korean newsletter curates foreign stock Telegram channels and references a list of Korean-run stock/coin channels — [Maily.so 미국 주식 인사이더](https://maily.so/insidertracking/posts/1gz2e53nz3q); Korean-targeted *coin* Telegram channels alone exceed 500 — [한경 매거진](https://magazine.hankyung.com/business/article/202406045759b).
- Discord chats evolving into funds — [Reportify (BI repost)](https://reportify.cn/news/1194873287579275264).
- Tool pointers **[standard docs, not fetched]**: Telegram public channel preview `https://t.me/s/<channel>` (scrapeable without login); Telegram Bot API https://core.telegram.org/bots/api ; Discord webhooks https://discord.com/developers/docs/resources/webhook.

### Inferences
- Cheapest pipeline for individuals: Telegram channels → a bot/forwarder → keyword filter → Discord webhook or push notification; Discord's webhook posting is free, while Telegram's `t.me/s` preview can be polled.

### Gaps
- No sources retrieved on Market Chameleon Discord or other named flow Discords.
- SEC pump-and-dump enforcement involving Discord/Twitter influencers (the Dec 2022 "Atlas Trading" $100M case) is known from general knowledge but could not be retrieved (sec.gov unreachable; search budget exhausted) **[unverified here]**.
- No data on Walter Bloomberg Telegram subscriber count or whether traders rely on it.

---

## Key question 5 — StockTwits, Blind, Glassdoor/Levels.fyi, Layoffs.fyi, TrueUp, WARN, Fishbowl

### Takeaway
Blind is the best-documented pre-announcement layoff signal (thousands of Meta/Microsoft employees joined days before cuts), while WARN filings are the primary legal source and lag internal rumor; StockTwits data is accessible mainly via partners or scrapers, and its "trending" metric is volume, not direction.

### Cited Findings
- Blind: "Some 6,000 Microsoft employees signed up for accounts on Blind… between Jan. 13 and Jan. 18" 2023, per internal data shared with CNN — [CNN](https://www.cnn.com/2023/01/31/tech/blind-app). Meta Nov 2022: "nearly 3,000 Meta staff joined prior to Zuckerberg's announcement" — [Business Insider India](https://businessinsider.in/tech/news/thousands-of-meta-workers-signed-up-to-blind-the-day-before-mark-zuckerberg-announced-mass-layoffs/amp_articleshow/95639938.cms); [Asiae](https://www.asiae.co.kr/en/article/2022112109504888728). LinkedIn "kill list" rumor started from a Blind post — [Entrepreneur](https://entrepreneur.com/business-news/linkedin-employees-found-a-secret-layoff-list-with-500-names/463891). 2026 NYT reporting (via Inquirer) on workers turning to Blind for scarce layoff information — [Inquirer](https://www.inquirer.com/business/teach-workers-morale-blind-layoffs-anonymous-employees-meta-amazon-oracle-microsoft-20260524.html). Blind self-reports 7M+ verified users at 300k+ companies (self-reported).
- WARN aggregator: layofftracker.us lists ~3,043–3,053 WARN notices filed in 2026, a snapshot of ~274,784 affected workers at ~1,600 companies, California top state, April peak; notes employers may amend filings; some entries carry future dates (data-quality flag) — [layofftracker.us 2026](https://www.layofftracker.us/layoffs/year/2026?page=70).
- StockTwits API: official docs at api.stocktwits.com/developers but "access tiers and availability have changed over time — some endpoints require approval or have been restricted" — [Eulerpool](https://eulerpool.com/developers/api/alternative/stocktwits); Alpaca partner integration — [Alpaca blog](https://alpaca.markets/blog/provide-real-time-social-sentiment-to-customers-with-alpacas-stocktwits-integration/); Improvado connector (historical backfill depends on tier) — [Improvado](https://improvado.io/integrations/stocktwits); unofficial Apify scrapers — [Apify](https://apify.com/ghostgrid/stocktwits-sentiment-scraper); trending = discussion velocity, not sentiment — [Algofin Substack](https://algofin.substack.com/p/using-stocktwits-to-understand-investor).

### Inferences
- A Blind sign-up surge or spike in "layoff" threads for a company is a multi-day leading indicator for headcount news; the subsequent WARN filing is the confirmation.
- StockTwits is a sentiment confirmation tool, not an early-news source.

### Gaps
- No sources retrieved on Layoffs.fyi, TrueUp, Glassdoor, Levels.fyi, or Fishbowl as market signals. No evidence found on how often Blind rumors prove accurate.

---

## Key question 6 — 4chan /biz/, Substack Notes, Bluesky, Threads, Mastodon

### Takeaway
/biz/ has real but crypto-centric discovery value and a documented hoax record (Vitalik "death"); Bluesky has an organized finance community but only promotional evidence of signal; nothing was found for Threads, Mastodon or Substack Notes as equity early-signal venues.

### Cited Findings
- /biz/ is 4chan's main crypto hub, credited with spreading the Chainlink community and the Pepe memecoin; "the fake news that Vitalik Buterin had died in a car crash started there"; X and Telegram have become competitors — [Cointelegraph Magazine (May 2025)](https://cointelegraph.com/magazine/4chan-rises-from-the-dead-how-the-imageboard-moves-crypto-markets).
- A third-party "4chan mentions" tracker shows zero for every month (unusable) — [AltIndex](https://altindex.com/ticker/bxc/4chan-mentions).
- Bluesky's own blog (2026-01-19) says finance happens in real time there "from Wall Street professionals tracking sentiment to individuals"; custom feeds on an open protocol — [Bluesky blog](https://bsky.social/about/blog/01-19-2026-the-smart-money-is-on-bluesky) **[promotional]**; financial-services view — [Cognito](https://www.cognitomedia.com/?p=8005).
- Threads: most users arrive via Instagram; no finance-specific evidence — [Sendible](https://www.sendible.com/insights/bluesky-vs-threads).

### Inferences
- For US equities, /biz/ is R1 noise except as a sentiment gauge for crypto-adjacent names (COIN, MSTR, miners). Bluesky is worth following for journalists who moved from X, not for speed.

### Gaps
- No sources on Substack Notes, Mastodon, or Threads finance communities.

---

## Key question 7 — Prediction markets (Polymarket, Kalshi, Metaculus, Manifold)

### Takeaway
Polymarket/Kalshi are the fastest public aggregators for Fed, election and geopolitical odds, with free public read APIs; but 2026 brought a string of insider-trading cases (US–Iran strike, Maduro, ceasefire, ~150 wallets/$8M on military markets) and there is no clear federal insider statute covering event contracts. Evidence on accuracy vs polls is positive for 2024 (Vanderbilt preprint) but mixed overall.

### Cited Findings
- Polymarket APIs: Gamma (`gamma-api.polymarket.com`, discovery, no auth), CLOB (`clob.polymarket.com`, order books/prices public, orders authenticated), Data API (`data-api.polymarket.com`, positions/trades/holders) — [Polymarket docs: API](https://docs.polymarket.com/getting-started/api); [API intro](https://docs.polymarket.com/api-reference/introduction.md); general limit 15,000 requests per 10 seconds — [Rate limits](https://docs.polymarket.com/api-reference/rate-limits.md); Gamma→CLOB token-ID linking — [Dwellir guide](https://www.dwellir.com/guides/polymarket-api-guide).
- Kalshi API: public REST trading API plus WebSocket streams for market data/orders/positions, AsyncAPI definition, official Python SDK — [API Evangelist](https://providers.apievangelist.com/providers/kalshi/); ~10 req/s per key and 5–10 WebSocket connections per key, silent disconnect after ~60 s idle — [pm.wiki](https://pm.wiki/nl/learn/kalshi-api-python-recipes) **[unverified; affiliate site; docs.kalshi.com unreachable]**.
- Kalshi legal status: CFTC-regulated DCM; "legal in over 40 states… restricted or limited in nine" (Apr 2026) — [pm.wiki](https://pm.wiki/th/learn/is-kalshi-legal); Aug 2026: federal judge let Utah enforce gambling law; eight states with authority to ban/restrict — [InGame](https://www.ingame.com/?p=52560); Ninth Circuit (CA/OH) oral argument July 10, ruling pending; AZ/CT/MT unresolved — [Lines.com guide](https://www.lines.com/guides/u-s-prediction-market-legal-status-state-by-state); Trump administration backing Kalshi/Polymarket — [TribLive](https://triblive.com/news/world/trump-administration-backs-kalshi-polymarket-as-states-move-to-ban-prediction-markets); overview — [SI](https://www.si.com/prediction-markets/news/the-legal-landscape-why-prediction-markets-are-being-tested-in-court).
- Insider cases: six new wallets earned ~$1M betting on a US strike on Iran "hours before the first explosions were reported in Tehran" (Mar 2026) — [Cointelegraph](https://regional-front.cointelegraph.com/news/polymarket-traders-1m-us-iran-strike-insider-trading-concerns); DOJ charged a US Army soldier (Green Beret) for bets on the Maduro capture using classified knowledge (Apr 2026) — [Crypto Briefing](https://cryptobriefing.com/polymarket-insider-trading-army-charges/); [Money.com on refunds](https://money.com/polymarket-refunds-insider-trading-arrest/); new accounts bet on a US–Iran ceasefire just before the 2026-04-09 announcement — [Value The Markets](https://www.valuethemarkets.com/cryptocurrency/news/insider-trading-investigation-shakes-polymarket-amid-millions-in-profits); Bubblemaps: nine linked accounts, $2.4M, 98% win rate on military bets — [Civolatility Substack](https://civolatility.substack.com/p/polymarkets-insider-trading-problem); 152 wallets / ~$8M on US military markets (Aug 2026) — [Inkl via SMU PDF](https://skbi.smu.edu.sg/sites/skbi.smu.edu.sg/files/%5Bcurrent-domain%3Amachine_name%5D/news_room/20260821_Inkl_Polymarket%20faces%20fresh%20insider%20trading%20scrutiny%20after%20152%20wallets%20allegedly%20made%20%248%20million%20betting%20on%20US%20military%20markets_%20report.pdf) **[figures not verified to primary]**; Polymarket integrity rules + Chainalysis surveillance — [Cointelegraph](https://cointelegraph.com/news/polymarket-chainalysis-insider-betting-detection-prediction-markets?rand=329); House Oversight letters to Kalshi/Polymarket CEOs — [Cointelegraph](https://www.cointelegraph.com/news/us-house-probe-kalshi-polymarket-insider-trading); "no federal insider trading statute that clearly applies to prediction market contracts" — [Fortune (2026-04-02)](https://fortune.com/2026/04/02/prediction-markets-insider-trading/) **[could not fetch full text]**; Bloomberg on the reckoning — [Bloomberg (2026-04-25)](https://www.bloomberg.com/news/articles/2026-04-25/insider-trading-cases-threaten-reckoning-for-prediction-markets).
- Accuracy: Vanderbilt preprint — Polymarket "superior to polling in predicting the outcome of the 2024 presidential election, particularly in swing states"; from mid-October 2024 its 95% intervals contained the outcome — [arXiv 2507.08921](https://arxiv.org/abs/2507.08921); divergence from polls dated ~Oct 18, 2024, cause unclear — [Emergent Mind](https://www.emergentmind.com/open-problems/cause-of-divergence-polymarket-vs-polls-2024-election). Erikson & Wlezien (2012): after polling matured, markets stopped adding predictive edge — via [Casino.org blog](https://www.casino.org/blog/prediction-markets-vs-polls/) **[low-quality secondary]**. 2026 midterms coverage — [WLRN/NPR](https://www.wlrn.org/elections-coverage/2026-11-02/prediction-markets-take-some-thunder-from-election-polls-and-add-a-financial-incentive).

### Inferences
- Sudden odds moves on geopolitical/military markets are themselves a fast signal — and sometimes leaked MNPI — which makes them informative but ethically fraught to trade on.
- For Fed/CPI-style events, Kalshi odds are a clean, legal US read; for geopolitics, Polymarket is deeper but subject to insider distortion.

### Gaps
- Metaculus and Manifold APIs not researched. Kalshi official rate limits/fees unavailable. Primary documents (DOJ complaint, House letters) not retrieved.

---

## Key question 8 — YouTube/Twitch live and X Spaces

### Takeaway
Benzinga and Schwab Network run live FOMC/earnings streams, and some newsletters run FOMC X Spaces; no source was found on "Meet Kevin" or on measurable speed advantages of live streams.

### Cited Findings
- Benzinga live FOMC streams, e.g., "WATCH LIVE: Fed Chair Powell Press Conference | FOMC Rate Decision | June 18, 2025" — [Benzinga Videonest](https://benzinga.videonest.co/videos/1548947/watch-live-fed-chair-powell-press-conference-fomc-DpkDLKjasp); Schwab Network FOMC segment — [Schwab Network](https://schwabnetwork.com/video/fomc-leads-market-discussions-25bps-rate-cut-near-certain).
- The Bitcoin Layer "covering all FOMC meetings, LIVE on Twitter Spaces" — [TBL Substack](https://thebitcoinlayer.substack.com/p/tbl-live-coverage-of-todays-fomc).

### Inferences
- Live streams are reaction/interpretation, not early information; their value is color during the first minutes after a release.

### Gaps
- Meet Kevin, Twitch finance streams, Bloomberg live YouTube: no sources retrieved.

---

## Key question 9 — Korean communities (서학개미)

### Takeaway
Korean retail (서학개미) is large, young (20s ≈ 39% in one broker's data), Tesla/leveraged-ETF heavy, and increasingly organized inside broker apps (Toss Securities community: ~4M MAU, holder-verified badges, AI filtering); direct evidence on DC인사이드/에펨코리아/네이버 종목토론방 speed or reliability was **not found** in this research.

### Cited Findings
- Toss Securities community reached ~4M monthly users (2026) — [헤럴드경제](https://www.heraldk.com/article/2026051418383462717); differentiator is showing whether a poster actually holds the stock ("주주" 인증) plus account-based profiles and AI filtering of unhealthy content — [이코노미스트](https://economist.co.kr/article/view/ecn202508260072); [CEO스코어데일리](https://www.ceoscoredaily.com/page/view/2025032715392052893); Toss also runs a real-time earnings-call (어닝콜) service — [Toss Securities](https://toss.im/service/securities); 4.2M customers within a year of launch (2022) — [한경 매거진](https://magazine.hankyung.com/money/article/202203286343c).
- Demographics: among 서학개미 at one broker, those in their 20s were 39.3% — [에너지경제](https://m.ekn.kr/view.php?key=525868). Overseas-stock settlement value 2020: $198.3B, +383.89% y/y; Tesla and Apple most bought — [딜사이트](https://dealsite.co.kr/articles/69599).
- Korean retail following WSB names (AMC 2021) — [이투데이](https://www.etoday.co.kr/news/view/2038037); Korean press now reports Reddit discussion of Korean-popular names (2026) — [아시아경제](https://view.asiae.co.kr/article/2026070308214283487); in-app community features drive the boom; 20-somethings study via YouTube — [위키트리](https://www.wikitree.co.kr/articles/1099147).
- Flow data (official): 한국예탁결제원 SEIBro weekly net-buy rankings are the primary source used by press — e.g., Tesla top net buy — [블록미디어](https://www.blockmedia.co.kr/archives/282597); TSLL (2x Tesla ETF) bought ~$50M more than TSLA in a month — [머니투데이](https://www.mt.co.kr/stock/2023/09/18/2023091814071936742); July 2025 Tesla net sell $347.55M amid Musk–Trump feud — [한국경제](https://www.hankyung.com/article/2025071010431); authorities blaming 서학개미 for KRW weakness and brokers halting overseas-stock events (Nov 2025) — [한국경제](https://www.hankyung.com/article/2025112425871); [한국경제](https://www.hankyung.com/article/2025111815581).
- Korean Telegram channel curation — [Maily.so 미국 주식 인사이더](https://maily.so/insidertracking/posts/1gz2e53nz3q).

### Inferences
- Korean communities are *reactive* amplifiers of US-hours news (time-zone lag: US close = 05:00–06:00 KST), useful mainly for gauging Korean retail positioning in TSLA/NVDA/leveraged ETFs, which has been large enough to be cited as an FX factor.
- Toss's holder-verification is the only moderation/verification norm found; anonymous galleries (DC, 에펨코리아) should be assumed R2–R1.

### Gaps
- No sources found on DC인사이드 해외주식/미국주식 갤러리, 에펨코리아 주식게시판, 클리앙, 뽐뿌, 네이버 종목토론방(해외), 카카오 오픈채팅, or Blind Korea 주식 라운지 — names, URLs and gallery IDs should be confirmed directly. No speed or reliability measurement exists in retrieved sources.

---

## Key question 10 — Chinese/Taiwanese communities (Weibo, Xueqiu, PTT, Mobile01)

### Takeaway
Chinese social media (Weibo) has generated Nvidia rumors that drew official company rebuttals and small pre-market moves; PTT's Stock board mostly relays media reports about TSMC and is notably skeptical of unconfirmed items; no Xueqiu- or Mobile01-specific evidence was found.

### Cited Findings
- Dec 2024: rumors about Nvidia spread in China after Beijing's antitrust probe, including a false claim Jensen Huang mocked Chinese people; Nvidia rebutted on its official Weibo — [RFA fact check](https://rfa.org/english/factcheck/2024/12/20/afcl-china-nivida-rumors/). Nvidia denied social-media claims it would cut China supply; NVDA −0.55% pre-market — [Benzinga](https://www.benzinga.com/news/24/12/42458637/nvidia-refutes-claims-of-reducing-supplies-to-china-amid-antitrust-investigation); Nvidia denial of a China AI-chip report — [HDFC Sky](https://hdfcsky.com/news/nvidia-stock-slips-0-33percent-even-as-company-denies-china-ai-chip-report).
- PTT Stock board: news thread relaying TSMC Arizona acceleration (June 2025) — [pttweb](https://www.pttweb.cc/bbs/Stock/M.1749646964.A.062); PTT users dismissed a Kaohsiung 2nm conversion report ("等台積宣布再說吧!又想炒?") and noted the stock's non-reaction as evidence it was unconfirmed (July 2023) — [中時](https://wantrich.chinatimes.com/news/20230717900468-420101); PTT bullish-pledge post — [ETtoday](https://finance.ettoday.net/news/1903157); board URL https://www.ptt.cc/bbs/Stock/ .
- TSMC 7nm China supply rumor with company responses — [Longport](https://longportapp.cn/news/219148857).

### Inferences
- For TSM/NVDA/AAPL supply-chain, Taiwanese press (DigiTimes, 經濟日報) is usually the origin and PTT the relay; PTT's value is crowd skepticism and occasional insider comments, not primacy.

### Gaps
- No Xueqiu (雪球) or Mobile01 evidence; no confirmed case of a PTT rumor preceding and being confirmed by mainstream media.

---

## Key question 11 — Insider-adjacent / alternative signals (jet tracking, Google Trends, Wikipedia, app rankings, web traffic, jobs, satellite)

### Takeaway
Corporate-jet tracking is a commercialized M&A pre-signal with celebrated hits (Occidental/Omaha) and admitted misses; Google Trends and Wikipedia pageview studies (2013–2014) found attention spikes preceded market falls, with the authors cautioning against expecting persistence. App-store, web-traffic, job-posting and satellite data were not researched here.

### Cited Findings
- Jet tracking case study (Patterson buyers) — [Neudata](https://neudata.co/intelligence/using-corporate-jet-activity-to-identify-patterson-buyers); Quandl Corporate Aviation Intelligence dataset launch — [WatersTechnology](https://waterstechnology.com/node/3608906); JetTrack (Paragon Intel) use cases incl. backtesting historical M&A — [Bloomberg JetTrack PDF](https://data.bloomberglp.com/professional/sites/10/JetTrack-Overview_Use-Cases.pdf); JetNet "Corporate Activity Prediction" — [JetNet](https://www.jetnet.com/products/jettrack); Occidental's jet in Omaha two days before Buffett's $10B investment; analyst: "Historically, flight tracking services have not been that useful"; evasion via neutral cities or NetJets — [The National](https://www.thenational.ae/business/jet-tracking-can-prove-a-gift-for-hedge-funds-sometimes-1.858870); [Marcellus](https://marcellus.in/story/hedge-funds-are-tracking-private-jets-to-find-the-next-megadeal/).
- Wikipedia pageviews (Moat, Preis et al., Sci. Rep. 2013): increases in views of finance pages preceded market falls; edit activity did not — [Finextra](https://finextra.com/newsarticle/24802/wikipedia-page-views-can-predict-markets---study). Google Trends (Preis, Moat, Stanley 2013): 98 keywords; a simulated DJIA strategy "could have led to substantial profit," authors "not suggesting that the strategy will continue to generate profit" — [CFI.co](https://cfi.co/northamerica/2013/12/tobias-preis-beating-the-stock-market-with-googles-big-data); Curme et al. PNAS 2014 on which topics precede falls — [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4136609); [Risk.net](https://www.risk.net/derivatives/structured-products/2269027/lookback-google-and-wikipedia-searches-can-predict-market-movements-say-researchers).

### Inferences
- These are slow (daily/weekly) attention indicators best used to confirm whether a community-driven narrative is spreading beyond the forum, not as breaking-news sources.

### Gaps
- Sensor Tower/Appfigures, Similarweb, job-posting trackers, satellite imagery and Quiver's flight tracker: not researched (search budget exhausted).

---

## Cross-cutting — legal/ethical caveats and verification norms

### Takeaway
The venues above routinely surface (a) material non-public information (Blind leaks, prediction-market insider bets), (b) deliberate hoaxes (fake Bloomberg accounts/sites), and (c) coordinated promotion (/biz/, squeeze subs); the documented cases show regulators act after the fact and that the legal framework for event contracts is unsettled.

### Cited Findings
- No federal insider-trading statute clearly covers prediction-market contracts; proposed "Public Integrity in Financial Prediction Markets Act of 2026" (Rep. Torres) — [Fortune](https://fortune.com/2026/04/02/prediction-markets-insider-trading/); [Cointelegraph on House probe](https://www.cointelegraph.com/news/us-house-probe-kalshi-polymarket-insider-trading).
- DOJ's Maduro-bet prosecution is described as the first federal insider case of its kind for these markets — [Crypto Briefing](https://cryptobriefing.com/polymarket-insider-trading-army-charges/).
- Hoax pattern: look-alike "Bloomberg" branding was the vector in 2015 (fake site), 2023 (verified "Bloomberg Feed" account), 2025 (unaffiliated "Walter Bloomberg" relay) — [Fortune 2015](https://www.fortune.com/2015/07/14/fake-twitter-bloomberg-report/); [Euronews 2023](https://www.euronews.com/2023/05/23/fake-news-about-an-explosion-at-the-pentagon-spreads-on-verified-accounts-on-twitter); [Fortune 2025](https://www.fortune.com/2025/04/07/trump-tariff-pause-walter-bloomberg-fake-report-debunked-markets).
- Scraping StockTwits via third-party actors "skirt[s] official API access" and users should review terms — [Apify listing context](https://apify.com/ghostgrid/stocktwits-sentiment-scraper); Reddit's commercial API terms since 2023 — [Reddit announcement mirror](https://twt.omada.cafe/r/reddit/comments/145bram/addressing_the_community_about_changes_to_our_api/jnkcwrn).

### Inferences
- Operating rules consistent with the evidence: (1) treat any employee-sourced specific (dates, headcounts, deal names) as potential MNPI and do not trade on it; (2) treat sudden prediction-market odds moves on military/political events as possibly insider-driven and legally ambiguous; (3) never act on a screenshot — confirm against the originating wire, company IR/8-K, agency status page, or official account; (4) assume squeeze/microcap subs and /biz/ contain coordinated promotion.

### Gaps
- SEC social-media pump-and-dump enforcement details (e.g., Dec 2022 Discord/Twitter influencer case) could not be retrieved; Reddit/X/Telegram/Discord Terms-of-Service text on automated collection not fetched.
- Blocked hosts to re-check if network access is widened: docs.x.com, docs.kalshi.com, support.reddithelp.com, www.sec.gov, fortune.com, theins.press, techloy.com.
