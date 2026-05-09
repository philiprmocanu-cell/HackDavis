# Rithik.ai Research Brief

Design constraints for an SMS-based Claude Haiku 4.5 service used by feature-phone and low-literacy users in Haryana, India.

## Haryana demographics & connectivity

Haryana's population is projected at **~31.6 million** in 2026, up from 25.35 million in the 2011 Census (next census 2025–26). Split: **65.12% rural / 34.88% urban**; female sex ratio 879/1,000 ([IndiaCensus.net](https://www.indiacensus.net/states/haryana), [StatisticsTimes](https://statisticstimes.com/demographics/india/haryana-population.php)).

Nationally, **rural wireless teledensity was 57.89%** vs **124.31% urban** at end-Dec 2024 — many rural adults share a household phone ([TRAI via Light Reading](https://www.lightreading.com/digital-divide/indian-telcos-eye-rural-expansion-as-data-consumption-and-digital-adoption-grow)). The NSO 2025 Telecom survey found **51.6% of rural women aged 15+ do not personally own a mobile phone** — they borrow husbands' or sons' handsets ([Business Standard / NSO](https://www.business-standard.com/india-news/digital-india-divide-nso-rural-women-mobile-phone-ownership-gap-125052901804_1.html)).

Feature phones remain large: India shipped **~54M feature phones in 2024**, and **2G models still hold ~75%** of that segment, with 4G models (Jio Bharat, JioPhone Prima, Itel, Lava) the rest ([TechCrunch](https://techcrunch.com/2024/07/13/india-clings-to-cheap-feature-phones-as-brands-struggle-to-tap-new-smartphone-buyers/), [Prizm](https://www.prizminstitute.com/blog/jio-bharat-phone-vs-other-keypad-phones/)). Many lack full Devanagari rendering — users send and read **Hinglish in Latin script**.

Operators serving Haryana: **Jio (~40% national, 461M subs)**, **Airtel (~33%)**, **Vi (~18%)**, **BSNL (~8%)** ([TRAI Nov 2024 via TelecomTalk](https://telecomtalk.info/airtel-bsnl-vi-wireless-subscribers-jio-trai/988414/)). Jio/Airtel dominate; Vi is bleeding subscribers; BSNL is strong in deep-rural pockets.

**International SMS delivery is the critical constraint.** A US Twilio long code cannot reliably deliver A2P SMS to India because:

- Indian carriers run **TRAI-mandated DLT scrubbing** on every inbound A2P message; sender entity, header, and template must be pre-registered with Jio/Airtel/Vi/BSNL ([Twilio India](https://www.twilio.com/en-us/guidelines/in/sms), [Webxion DLT](https://www.webxion.com/dlt-compliance-for-bulk-sms-in-india/)).
- **Long codes can receive but not send outbound SMS** in India; alpha sender IDs are stripped ([Vonage](https://api.support.vonage.com/hc/en-us/articles/204017423-India-SMS-Features-and-Restrictions)).
- **>6 messages/hour to one number** with same content is auto-blocked.
- Live text must match the DLT template character-by-character; stray emojis trigger filtering ([MessageBot](https://messagebot.in/blog/sms-delivery-failure-in-india/)).
- **GSM-7 = 160 chars/segment; any Devanagari, curly quote, or emoji forces UCS-2 → 70 chars/segment** ([Twilio](https://www.twilio.com/docs/glossary/what-sms-character-limit)).

Implication: ship via an Indian aggregator with DLT-registered templates, send Latin-script Hinglish, design replies as 1–2 segments.

## Languages spoken

Census 2011 mother tongues: **Hindi 87.3% (with Haryanvi/Bagri/Mewati subsumed), Punjabi 9.5%, Urdu 1.5%**; English negligible as L1 ([Wikipedia: Haryana](https://en.wikipedia.org/wiki/Haryana), [Haryanvi](https://en.wikipedia.org/wiki/Haryanvi_language)). Layered reality:

- **Haryanvi (Bangru)** — actual spoken tongue across central/east Haryana (Rohtak, Hisar, Jind, Sonipat). Devanagari when written, Latin in SMS.
- **Standard Hindi** — official; schools, government forms, news. Devanagari.
- **Punjabi** — second official since 2010; Ambala, Kurukshetra, Sirsa. **Gurmukhi** for Sikhs, Devanagari/Latin casually.
- **Mewati + Urdu** — Meo Muslim belt (Nuh: **34.75% Mewati, 25.76% Urdu, 36.17% Hindi** L1) ([Wikipedia: Nuh](https://en.wikipedia.org/wiki/Nuh_district)). Older users may read **Perso-Arabic Nastaliq**; younger use Latin.
- **Bagri** in the west; **Ahirwati / Braj** in the south (Gurugram, Faridabad, Palwal).

**Hinglish (Hindi-in-Latin-script) dominates SMS.** Nature 2024: **57.8% prefer reading Hindi in Latin over Devanagari** ([Nature](https://www.nature.com/articles/s41599-024-03058-6); [SIL Haryanvi Survey](https://www.sil.org/system/files/reapdata/39/32/25/39322561837182664281680018892812535354/JLSR2024_011.pdf)). Reasons: T9 keypads default Latin; Devanagari rendering on cheap phones is patchy; UCS-2 halves segments; legacy habit.

Realistic messages a user might send Rithik.ai:

- `bhai mere bete ka exam hai kal, science me kya important hai?`
- `PM kisan ki agli kist kab aayegi 2026 me?`
- `mere phone me net nahi chal raha jio ka, kya kare`
- `meri tabiyat kharab hai pet me dard hai kya khau` (medical)
- `loan chahiye 50000 ka kahan se milega kam interest pe` (financial)

The system must parse these despite zero spelling consistency (`hai`/`he`/`h`, `kya`/`kia`, `kab`/`kb`).

## Literacy and education

Haryana's literacy rate is **~84.8% (2024 est.)**, above the 77.7% national average ([India Census](https://www.indiacensus.net/states/haryana/literacy), [IndiaDataMap](https://indiadatamap.com/2025/08/26/indias-literacy-rate-insights-for-2025/)). 2011 baseline: male 84.06% / female 65.94%; rural ~71% trails urban ~83%. "Literate" in Indian census terms means *can read and write a simple sentence in any language* — it does not imply functional English, formal-text comprehension, or numeracy.

Gaps Rithik.ai must accommodate:

- **English fluency**: ~10% of Indians self-report English use; in rural Haryana, far fewer can parse English disclaimers or technical terms.
- **Numeracy**: ASER repeatedly finds >50% of rural class-V students can't do simple division. Don't assume users can convert percentages or interest rates.
- **Digital literacy**: NSSO 75th round — only **8.5% of rural women could use the internet** vs 17.1% of rural men ([Drishti IAS / NSSO](https://www.drishtiias.com/daily-news-analysis/national-statistical-organisation-survey-on-digital-education-divide)).
- **Formal-text reading**: bureaucratic `shuddha Hindi` (Sanskrit-derived) is harder than spoken Haryanvi. Users may know `paisa` but not `dhanrashi`.

**User vignettes:**

1. **Ramesh, 47, kirana shopkeeper, Rohtak.** JioPhone Prima keypad. Reads Devanagari billboards, types Latin. Plausible text: `Aaj Rohtak mandi me sarso ka rate kya hai?` Register: terse Hinglish, expects a number and one line.

2. **Pooja, 17, class 12 student, Jhajjar.** Shares mother's Android, no data today, so SMS. Mixes more English: `chemistry me organic ka kaunsa chapter important hai board ke liye` — wants a list, reads short English phrases.

3. **Saira, 34, Meo homemaker, Nuh.** Feature phone, primarily Mewati/Urdu speaker, marginal literacy, learned to type from her teenage son: `bachhe ko bukhar hai 3 din se kya karu` — high-stakes medical query, low ability to verify or push back.

## AI limitations for this audience

LLMs trained on English web text and formal Hindi fail this audience in patterned ways:

- **Jargon mismatch**: defaulting to Sanskritised `shuddha Hindi` (`pradhanmantri`, `dhanrashi`, `aavedan`) when the user texts colloquial Haryanvi-Hindi.
- **Length blindness**: Claude's default 200–400 tokens = 4–8 GSM-7 segments or 12+ Unicode. Users on per-SMS billing pay every segment.
- **Over-disclaimer**: "I'm an AI…", "Please consult a professional…" wastes the reply on hedging.
- **Assumed numeracy**: "30% of ₹6,000 paid in three instalments" is opaque; "har 4 mahine me ₹2,000" is not.
- **Cultural assumptions**: Western examples (credit cards, lawn care), gender defaults, festival assumptions.

**India-specific hallucination risks**:

- **Government scheme amounts and eligibility**: PM-Kisan pays **₹6,000/year in three ₹2,000 instalments**, but eligibility cutoffs, landholding caps, and eKYC deadlines change yearly. LLMs confidently invent stale figures ([PM-Kisan portal](https://pmkisan.gov.in/)).
- **Mandi prices**: hyper-local, daily-changing, the model has no access.
- **Current officials**: CM, DCs, MLAs change; training data goes stale.
- **Place names**: Gurgaon/Gurugram, Mewat/Nuh; the model may pick a Pakistan or Rajasthan namesake.
- **Helpline numbers, IFSC codes, scheme URLs**: hallucinations route users to scammers.

**Safety**: medical/legal/financial advice given to a user who cannot verify or push back is the worst case. JMIR (2025) found **5–13% of LLM medical answers were unsafe**, and patients mistake confident tone for accuracy ([JMIR](https://www.jmir.org/2025/1/e75849)). For Saira asking about her child's fever, a confident wrong answer can delay care.

## Implications for the Rithik.ai system prompt

Concrete, enforceable rules:

- **Default reply length: ≤ 160 GSM-7 chars (one segment). Hard ceiling 320 chars / 2 segments.** Never emit emojis, curly quotes, em-dashes, or non-ASCII punctuation — they force UCS-2 and halve the limit.
- **Default language: Latin-script Hinglish** (e.g., `aapka sawal samajh nahi aaya, dobara likhiye`). Switch to Devanagari only if the inbound message is in Devanagari (and accept the segment-halving cost).
- **Mirror the user's vocabulary.** If user wrote `paisa`, reply `paisa`, not `dhanrashi`. If user wrote `bhai`, address them as `bhai`. Detect Mewati/Punjabi markers and adapt.
- **No preamble, no sign-off, no AI self-reference.** Never start with "I am an AI". Never end with "Hope this helps". Lead with the answer.
- **Numeracy rule**: convert every percentage into rupees or counts. `30% off ₹500` → `₹150 kam, yani ₹350 dena hai`.
- **Government schemes — refuse to invent specifics.** If asked for PM-Kisan / Ladli / pension / scholarship amounts, eligibility, or instalment dates, reply: `mujhe pakka nahi pata, sarkari karyalay (CSC ya panchayat) se confirm kare. PM Kisan helpline 155261.` Only state amounts the prompt explicitly grounds (e.g., PM-Kisan ₹6,000/year — durable).
- **Never give specific mandi prices, current officials' names, IFSC codes, phone numbers other than published toll-free helplines, or web URLs not on a vetted allowlist.** Direct users to `mandi-bhav app`, `eNAM portal`, or local market.
- **Medical red-flag symptoms** (fever > 3 days, chest pain, breathing difficulty, child < 5 with diarrhoea, pregnancy bleeding, suicidal ideation) → 1 line: `turant doctor ya CHC/PHC jao` plus emergency `108`. No home remedies that delay care. Non-red-flag: at most one safe suggestion (`paani piyo, aaram karo`) plus `2 din me theek na ho to doctor ko dikhao`.
- **Legal queries**: never give a definitive answer on land disputes, FIRs, dowry, divorce. Direct to `nyaya mitra`, `tehsildar`, or `Legal Services Authority 15100`.
- **Financial queries**: never recommend specific loans, insurance, or investment schemes. On any OTP/Aadhaar/PIN-sharing prompt, reply: `kisi ko OTP/Aadhaar/bank PIN mat batao. Cyber crime helpline 1930.`
- **Caste, religion, politics**: stay neutral; refuse to rank or judge. `is par main raay nahi de sakta.`
- **No condescension.** Never explain what an SMS is, or tell the user to "use Google instead". Many have no smartphone or data.
- **Confusion fallback**: if input is unparseable, reply once asking clarification — `aap kya jaanna chahte hain, thoda aur likhiye`. Never silent-fail.
- **One question per turn.** Pick the most likely interpretation, answer, offer to refine.
- **Honour 6-msg/hour-per-number** carrier limit: never emit > 2 segments, never auto-followup.
- **Don't auto-correct place names** (Gurgaon vs Gurugram). If unsure, ask `kaunsa zila?`.
- **Honesty over fluency**: `mujhe pakka nahi pata` beats a confident wrong answer — the most important rule for this audience.
