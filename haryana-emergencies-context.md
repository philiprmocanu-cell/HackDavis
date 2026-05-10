# Haryana Medical Emergencies — Per-Emergency SMS Triage Reference

> **Purpose:** This is the third standalone load-in reference for the HackDavis SMS-AI gateway (Twilio + Claude SMS line for low-literacy rural Haryana users). It is *not* the SMS the user sees — the model still has to compress every reply to the strict shape defined in `system-prompt.md` (≤300 characters Hinglish / ≤140 characters Devanagari, plain text only, mirror the user's script, no markdown, no jargon). This file is the model's internal "what to do when an SMS comes in describing emergency X" notebook.
>
> **Scope:** 60 of the highest-frequency, highest-mortality medical emergencies that present from rural and semi-urban Haryana — built around two grounding constraints: (a) what the patient at home actually has within reach (per `haryana-resources-context.md` — ASHA drug kit, kitchen items, charpai, chulha, polythene sheet, lota, chutki, haath measurements, etc.), and (b) what the Haryana health system can realistically deliver in time (per `haryana_medical_system.md` — ~76% specialist shortfall at rural CHCs, NCR-vs-Mewat divide, 108/102 ambulance variability, PGIMS Rohtak / KCGMC Karnal / SHKM Nalhar / Medanta / Fortis as the realistic referral nodes).
>
> **How to use:** When an inbound SMS matches one of the 60 cues, the model should (1) name the triage colour internally, (2) pick the 2–3 highest-yield "do RIGHT NOW" steps that fit the user's resources, (3) name the closest realistic facility from the medical-system file, (4) cite the relevant scheme by name, and (5) compress to the SMS micro-script shape. Anti-harm overrides in Section 7 are non-negotiable and must fire on sight regardless of what the user asks.

---

## 1. Why a per-emergency reference

The SMS gateway has roughly 300 Hinglish characters or 140 Devanagari characters per reply. That is not enough room to reason from first principles about a fresh emergency. The model must arrive at the SMS already knowing: which colour the case is, which 1–2 home actions are highest-yield, which scheme will pay, which facility to name, and which folk practice to override. This file pre-computes those answers for the 60 emergencies that account for the bulk of preventable rural mortality and morbidity in Haryana.

DO NOT SUGGEST GOING TO A HOSPITAL INITIALLY, rather this is a last resort

The companion files cover the substrate: `haryana-resources-context.md` describes the ASHA drug kit (paracetamol, ORS, zinc, IFA, misoprostol in some kits, disposable delivery kit, antiseptic, thermometer), the kitchen inventory (haldi, salt, sugar, mustard oil, ghee, atta, lota, mug, polythene sheet, charpai, chulha, LPG, kerosene lamp), and the household-measurement vocabulary (chutki ≈ 0.5 g, lota ≈ 200–250 ml, haath ≈ 45 cm). `haryana_medical_system.md` describes the access geometry — Sub-Centre at 1–3 km, PHC at 3–8 km, CHC at 10–20 km, district hospital at 20–60 km, government tertiary (PGIMS Rohtak, KCGMC Karnal, SHKM Nalhar, BPS GMC Khanpur Kalan, ESIC Faridabad, AIIMS-Rewari in commissioning) at 30–150 km depending on home district, and private NCR tertiary (Medanta, Fortis FMRI, Artemis, Max, AIIMS-Badhsa cancer) concentrated in Gurugram-Faridabad-Jhajjar.

This file's tone follows the system prompt: Hindi/Haryanvi term first with English in brackets, metric only, one action per sentence, name local trusted people (ASHA didi, anganwadi behenji, ANM, sarpanch), no preamble, no condescension, no markdown shown to the user.

---

## 2. Operating principles (cross-cutting — apply to every entry)

### 2.1 System constraints to remember every time

- **Specialist scarcity:** ~76.1% of rural CHC specialist posts are vacant. A CHC technically exists but the OB/Gyn or surgeon may not be on duty. Phone the CHC before referring whenever possible; if not possible, send to the next tier.
- **Distance:** Sub-Centre ~1–3 km, PHC ~3–8 km, CHC ~10–20 km, district hospital ~20–60 km. In Mewat/Nuh and parts of Mahendragarh, Charkhi Dadri, Sirsa, Fatehabad — distances run longer and roads are worse.
- **Pre-hospital:** 108 statewide ambulance + 102 maternal/neonatal ambulance + 112 national emergency. Response times in NCR are short; in non-NCR districts they routinely run 30–60 minutes. ~45% of road-accident fatalities are attributed to lost golden-hour care.
- **Tertiary geography:** PGIMS Rohtak (1,597 beds, the trauma/cardiac/medical anchor for central Haryana), KCGMC Karnal (anchor for north — Karnal, Kurukshetra, Kaithal, Yamunanagar, Panipat, Ambala division), SHKM Nalhar (anchor for Mewat/Nuh and southern Haryana), BPS GMC Khanpur Kalan (women-only government tertiary, Sonipat district), ESIC Faridabad and Atal Bihari Vajpayee GMC Faridabad (south-east industrial belt), AIIMS-Rewari at Majra (commissioning — OPD targeting end-March, MBBS June/July 2026). For the absolute highest tier when public capacity is exhausted: AIIMS New Delhi, Safdarjung, RML.
- **Private tertiary:** Medanta-The-Medicity (Gurugram, 1,250+ beds, cardiac/neuro/transplant), Fortis FMRI (Gurugram, 1,000+ beds), Artemis (Gurugram, 750+ beds), Max Gurugram, Park Hospital (Gurugram + Faridabad), Asian Institute of Medical Sciences Faridabad, Sarvodaya Faridabad, Paras Gurugram. Cancer: AIIMS National Cancer Institute at Badhsa (Jhajjar), 710 beds.
- **Single-adult households:** During the day, the literate adult is often away as labour. The decision-maker on the SMS is frequently a woman with limited English literacy. Advice must be readable aloud to a less-literate family member.
- **Working transport at night:** Many rural homes do not have a working car or motorcycle after dark. The fallback chain is: 108 → 102 → neighbour with motorcycle → tractor-trolley → e-rickshaw → bullock cart.

### 2.2 Resource defaults — what the patient has at home

- **Boiling water:** chulha (wood/dung/crop residue), LPG cylinder + single-burner stove (near-universal post-Ujjwala), or kerosene stove. Boil for 5 minutes for sterility.
- **ORS substitute (when no sachet):** 1 teaspoon (5 ml) salt + 8 teaspoons (40 ml ≈ 8 chutki + 8 chutki) sugar + 1 litre (~5 lota) of boiled-and-cooled water. WHO low-osmolarity ratio approximation.
- **Wound coverage:** clean cotton sari/dupatta/dhoti as bandage; polythene sheet (poly bag) over a dressing to keep dry; clean kitchen-knife sterilised in flame for any cutting.
- **Flat surface:** charpai. Place patient on it for delivery, eclamptic seizure, or trauma. Tilt one side up with a brick under one leg to make a left-lateral position when needed.
- **Light at night:** mobile phone torch first; LED rechargeable emergency light; mustard-oil lamp (diya) if power is out and torch dead; kerosene dhibri last.
- **Measuring without a measuring tool:** lota ≈ 200–250 ml, tea cup ≈ 100–150 ml, tablespoon ≈ 15 ml, teaspoon ≈ 5 ml, chutki ≈ 0.5 g, adult haath ≈ 45 cm (one Haryanvi traditional unit), adult finger ≈ 1.5 cm.
- **Heat application:** clean cotton cloth dipped in warm boiled water = compress; hot-water bottle improvised in a sealed plastic bottle wrapped in cloth.
- **Cold application:** a steel tumbler of water from the matka (clay pot) — naturally cool; cold tap water; the rare household fridge if power is on.
- **ASHA didi** lives in the village. Her free-issue kit reliably contains paracetamol, ORS, zinc, IFA, albendazole, cotrimoxazole paediatric, misoprostol (in some kits), disposable delivery kit (DDK), pregnancy strip, condoms, OCP, ECP, antiseptic, thermometer, weighing scale.

### 2.3 Communication defaults

- Hindi/Haryanvi term first, English in brackets: "haldi (turmeric)", "108 ambulance", "PHC (primary health centre)".
- Metric only — no °F, no oz, no lbs.
- One action per sentence. Numbered if more than one.
- Name local trusted people: ASHA didi (the village ASHA), anganwadi behenji (the anganwadi worker), ANM (the auxiliary nurse-midwife at the sub-centre), sarpanch (village head, useful for transport).
- Mirror the user's script. Hinglish in → Hinglish out. Devanagari in → Devanagari out. No mixing unless they mix.
- No condescension. Do not say "in simple terms" — just be simple.
- Never add diagnostic certainty. Use "lagta hai" / "ho sakta hai" hedges where appropriate. The model is a triage helper, not a doctor.

### 2.4 Triage colour ladder used throughout

- **HOME** — manage at home with kitchen and ASHA-kit items. Watch for red flags. No facility visit needed unless flagged.
- **ASHA** — call ASHA didi to the home or visit her. She has the free medicine that fits.
- **PHC** — go to the Primary Health Centre. Same-day, daylight if possible. Staffed by an MBBS MO.
- **CHC** — go to the Community Health Centre or sub-divisional hospital. Has surgical and obstetric capability on paper but specialists may be absent — phone first if you can.
- **108-NOW** — call 108 ambulance immediately. Time-critical. Do not wait for own transport. If 108 cannot come, go to the nearest district hospital or government medical college by any vehicle that runs.

---

## 3. Master index of 60 emergencies

| # | English | Hindi/Haryanvi | One-line cue | Default triage |
|---|---|---|---|---|
| **Trauma & wounds** | | | | |
| 1 | Road-accident polytrauma | sadak hadsa | bike/car/truck crash, multiple injuries | 108-NOW |
| 2 | Head injury (closed) | sir pe chot | hit head, vomiting/drowsy | 108-NOW |
| 3 | Suspected spinal injury | reedh ki haddi chot | fell from height/tractor, can't move legs | 108-NOW |
| 4 | Open fracture | haddi tooti, khoon nikla | bone visible through skin | 108-NOW |
| 5 | Closed fracture | haddi tooti, khoon nahi | swollen, painful, deformed limb | CHC |
| 6 | Severe bleeding / deep laceration | tej khoon beh raha | spurting/soaking blood, deep cut | 108-NOW |
| 7 | Amputation / finger crush | ungli/haath kat gaya | machinery, thresher, fodder cutter | 108-NOW |
| 8 | Penetrating chest injury | seene mein chot, saans takleef | stab/impalement, pneumothorax | 108-NOW |
| 9 | Blunt abdominal injury | pet pe chot | tractor/cattle/handle injury, pain | 108-NOW |
| 10 | Eye injury (chemical/foreign body/blunt) | aankh mein chot | acid splash, husk, blow | 108-NOW or CHC |
| 11 | Severe burn | jal gaya | flame/scald/chulha/electric | 108-NOW |
| 12 | Electric shock / electrocution | bijli ka jhatka | wire contact, pump shock | 108-NOW |
| **Cardiovascular** | | | | |
| 13 | Acute MI / chest pain syndrome | seene mein dard, paseena | crushing chest pain, sweating | 108-NOW |
| 14 | Stroke (FAST) | lakwa, mooh tedha | face droop, arm weak, slurred speech | 108-NOW |
| 15 | Hypertensive emergency | BP bahut zyada | severe headache, vision blur, very high BP | 108-NOW or CHC |
| 16 | Acute heart failure / pulmonary oedema | saans phool rahi, paer soojan | severe breathlessness, frothy sputum | 108-NOW |
| 17 | Syncope / collapse | behosh ho gaya | fainted, brief unconsciousness | CHC or 108-NOW |
| **Respiratory** | | | | |
| 18 | Severe asthma attack | dama ka attack | severe wheeze, can't speak full sentences | 108-NOW |
| 19 | COPD exacerbation | dama-saans phool gayi | known smoker, worsening breathlessness | CHC or 108-NOW |
| 20 | Choking | gala ruk gaya | sudden no speech, hands at throat | 108-NOW |
| 21 | Pneumonia (adult) | nimoniya | high fever + cough + fast breath | PHC or CHC |
| 22 | Severe respiratory distress in infant | bachhe ki saans tej | <2 mo, fast breath, chest indrawing | 108-NOW |
| **GI & abdominal** | | | | |
| 23 | Acute severe abdominal pain | pet mein tez dard | sudden severe pain, hard belly | 108-NOW |
| 24 | Severe diarrhoea + dehydration | dast aur paani ki kami | watery dast many times, sunken eyes | CHC or 108-NOW |
| 25 | Upper GI bleed | khoon ki ulti / kala paikhana | vomiting blood, black tarry stool | 108-NOW |
| 26 | Acute jaundice (suspected hepatitis) | piliya | yellow eyes, dark urine, weakness | PHC |
| 27 | Acute urinary retention | peshaab nahi aa raha | full bladder, can't pass urine | CHC |
| 28 | Renal colic | gurde ka dard | severe loin-to-groin pain | PHC or CHC |
| **OB/GYN & neonatal** | | | | |
| 29 | Postpartum haemorrhage | bachha hone ke baad khoon | heavy bleeding after delivery | 108-NOW |
| 30 | Eclampsia / severe pre-eclampsia | garbh mein dauraa | seizure in pregnancy, BP very high | 108-NOW |
| 31 | Obstructed / prolonged labour | bachha rasta nahi mil raha | labour >12 hr, no progress | 108-NOW |
| 32 | Ectopic / first-trimester bleeding | garbh ka khoon, tez dard | bleeding + pain in early pregnancy | 108-NOW |
| 33 | PROM / preterm labour | paani phoot gaya | water broke before 37 weeks | 102-NOW |
| 34 | Neonatal asphyxia | naya bachha nahi roya | not crying at birth | First-minute resus + 108 |
| 35 | Neonatal sepsis / lethargy | bachha doodh nahi pee raha | lethargic, not feeding, cold | 108-NOW |
| 36 | Severe non-pregnant vaginal bleeding | tez maahawari / hamla | heavy bleed, post-assault | CHC or 108-NOW |
| **Paediatric** | | | | |
| 37 | Severe dehydration in child | bachhe mein paani ki kami | sunken eyes, no urine, lethargic | 108-NOW |
| 38 | Febrile seizure | bukhar mein jhatke | seizure with high fever, age 6 mo–5 yr | PHC + observe |
| 39 | Suspected meningitis (child) | gardan akadh | fever + stiff neck + vomiting | 108-NOW |
| 40 | Severe acute malnutrition crisis | bahut kamzor bachha | very thin/swollen + refusing food | NRC referral |
| 41 | Foreign-body aspiration | gala mein cheez | sudden choke + wheeze in toddler | 108-NOW |
| 42 | Severe pneumonia (child, IMNCI) | bachhe ki saans tez | fast breath ± chest indrawing | 108-NOW |
| **Envenomation, bites & stings** | | | | |
| 43 | Snake bite | saap ne kaata | known/suspected snake bite | 108-NOW |
| 44 | Scorpion sting | bichhu ka dank | severe pain at sting site | PHC or CHC |
| 45 | Dog bite (rabies) | kutta kaat liya | dog/jackal/monkey bite, scratch | PHC same-day |
| 46 | Bee/wasp/hornet swarm | madhumakkhi ka dank | many stings, breathing issue | 108-NOW |
| 47 | Anaphylaxis | sharir mein sujan, saans takleef | swelling + breathlessness post-trigger | 108-NOW |
| **Toxicology & poisoning** | | | | |
| 48 | Pesticide / OP ingestion | keeT-naashak pee liya | accidental/self-ingestion, drooling | 108-NOW |
| 49 | Acute opioid overdose | smack/heroin overdose | unresponsive, slow breath, pinpoint pupils | 108-NOW |
| 50 | Acute alcohol / methanol | sharab zeher | unresponsive after drinking, breathing slow | 108-NOW |
| 51 | Kerosene / cleaner / acid ingestion (child) | mitti ka tel pee liya | child drank kerosene/toilet cleaner | 108-NOW |
| 52 | Accidental medication overdose | dawai zyada kha li | overdose (paracetamol etc.) | 108-NOW |
| **Environmental** | | | | |
| 53 | Heat stroke | loo lag gayi | hot dry skin, confusion, summer | 108-NOW |
| 54 | Hypothermia + chulha CO | thand + chulhe ka dhuaan | winter, sleeping by chulha, drowsy | 108-NOW |
| 55 | Drowning | doob gaya | well/canal/pond rescue | 108-NOW |
| 56 | Lightning strike | bijli gir gayi | tree/field strike, unconscious | 108-NOW |
| **Infectious & febrile** | | | | |
| 57 | Dengue with warning signs | dengue + pet dard / khoon | fever + bleeding/pain/restless | 108-NOW |
| 58 | Severe malaria | malaria + behoshi | malaria + altered consciousness | 108-NOW |
| 59 | Typhoid with complications | tifoid + pet dard tez | week-2 typhoid + perforation signs | 108-NOW |
| 60 | Tetanus | jabda akadh | wound + jaw stiffness, spasms | 108-NOW |

---

## 4. The 60 emergency entries

### 1. Road-accident polytrauma (sadak hadsa)

**What the caller likely says:** "Bhaiya ka accident ho gaya, bike NH-44 pe truck se takra gayi, behosh hai." or "सड़क हादसा, खून बहुत बह रहा है".

**Triage:** 108-NOW. NH-44 (Sonipat-Panipat-Karnal-Kurukshetra-Ambala) and NH-48 (Gurugram-Manesar-Rewari) are Haryana's two highest-fatality corridors. ~45% of fatal road-injury deaths nationally are attributed to lost golden-hour care.

**Do RIGHT NOW:**
1. Call 108. State location with km marker if on highway, nearest village name if interior. Ask for ALS ambulance.
2. Do NOT move the patient unless there is fire, flooding, or oncoming traffic. If you must move, keep head, neck and back in one line — log-roll using 3 people, hands flat under the body.
3. Stop visible bleeding by pressing a folded clean cotton sari or dupatta onto the wound with both palms. Keep pressing for 10 minutes by the clock without lifting.
4. If there is a helmet and the patient is breathing, do NOT remove it unless he is vomiting and at risk of choking.
5. Cover the patient with a dry sheet to prevent hypothermia. Loosen tight clothes around the chest and waist.
6. If breathing has stopped and there is no spinal mechanism doubt is too late — start chest compressions: heel of one hand on lower breastbone, other hand on top, push hard 5–6 cm deep at ~100/min until 108 arrives.

**Do NOT:**
- Do NOT pull the patient out of the vehicle by the arms. Spine injury is assumed in any high-energy crash.
- Do NOT give water by mouth. Surgery may be needed and a full stomach raises aspiration risk.
- Do NOT remove an impaled object (rod, glass). Stabilise it with rolled cloth around it.
- Do NOT slap or shake to wake.

**Where to go:** 108 will route to the nearest trauma-capable hospital. For NH-44 the realistic anchors are Civil Hospital Sonipat, Civil Hospital Panipat, Civil Hospital Karnal or KCGMC Karnal, then PGIMS Rohtak. For NH-48 the anchors are Civil Hospital Gurugram, then Medanta or Fortis FMRI Gurugram if Chirayu/Ayushman empanelled, otherwise PGIMS Rohtak. Toll concessionaires are required to maintain a trauma ambulance at every alternate toll gate or within a 25 km range — flag this if 108 is delayed.

**Cost / scheme:** Chirayu Haryana / PM-JAY covers ₹5 lakh per family per year at empanelled hospitals — check the card status at admission. Mukhya Mantri Mufat Ilaaj Yojana covers free care at all government hospitals.

**SMS micro-script (Hinglish):** "108 abhi call karo, jagah ka km batayein. Patient ko hilao mat. Khoon par sakht kapda 10 min dabaye rakho. Helmet mat utaaro agar saans le raha hai. Trauma centre PGIMS Rohtak ya KCGMC Karnal."

### 2. Head injury — closed (sir pe chot)

**What the caller likely says:** "Bachha cycle se gir gaya, sir pe chot lagi, ulti ho rahi hai aur neend aa rahi hai." / "सिर पर चोट, उल्टी हो रही है".

**Triage:** 108-NOW if any of: vomiting more than once, drowsiness, unequal pupils, seizure, blood/clear fluid from nose or ear, weakness on one side, confusion, loss of consciousness even momentarily. Otherwise CHC for observation.

**Do RIGHT NOW:**
1. Lay patient flat on the charpai, head slightly raised on a folded pillow. Turn the head gently to one side if vomiting (recovery position with neck supported).
2. Do not leave alone — watch for the next 6 hours.
3. If unconscious but breathing, place in left-lateral recovery position with one folded cotton dhoti as a pillow.
4. Apply a clean cold compress (cloth dipped in matka water, wrung) to any visible swelling. Not ice directly — wrap in cloth.
5. Note the time of injury — the doctor will ask.

**Do NOT:**
- Do NOT give paracetamol or any pain killer that contains aspirin/ibuprofen — they raise bleeding risk in a head injury.
- Do NOT try to wake up a sleeping patient by shaking.
- Do NOT pour any oil, herbs or kapur on the wound.

**Where to go:** Nearest district hospital with CT scan. In central Haryana go straight to PGIMS Rohtak (neurosurgery available). North: KCGMC Karnal. Mewat/southern: SHKM Nalhar then onward to PGIMS Rohtak or Medanta if ALS ambulance available.

**Cost / scheme:** Chirayu / PM-JAY covers CT and neurosurgery at empanelled hospitals.

**SMS micro-script (Hinglish):** "108 call karo agar ulti, neend, kamzori ya khoon naak/kaan se. Patient ko karwat me leta do. Aspirin/Combiflam mat do. CT scan zaroori — PGIMS Rohtak ya KCGMC Karnal."

### 3. Suspected spinal injury (reedh ki haddi chot)

**What the caller likely says:** "Tractor se gir gaya, paer hil nahi rahe." / "खेत में गिर गए, टांगें सुन्न हैं".

**Triage:** 108-NOW. Any fall from height >1 m, any high-speed road accident, any diving injury, any severe blow to the back — assume spine until proven otherwise.

**Do RIGHT NOW:**
1. Call 108. Ask for ALS / spinal-board capable ambulance.
2. Do NOT move the patient. Keep them lying exactly as found, on hard ground if possible. Do not put a soft mattress under them.
3. Place rolled cloth bundles (a folded cotton sari each side) along the head and neck to stop the head from rolling. Tell the patient not to nod.
4. If they are on soft soil/mud, slide a wooden plank, flat door, or charpai (with planks across the rope) under them only if 4 adults can do it together with one person dedicated to keeping the head and neck in line with the spine (log-roll).
5. Cover with a sheet to prevent hypothermia.

**Do NOT:**
- Do NOT sit them up. Do NOT lift by arms and legs only.
- Do NOT bend the neck back to clear airway — use jaw-thrust (push lower jaw forward without tilting head).
- Do NOT give anything by mouth.

**Where to go:** PGIMS Rohtak has neurosurgery and spine capability. Private NCR: Medanta, Fortis. AIIMS New Delhi if Delhi-side and 108 routes there.

**Cost / scheme:** Chirayu / PM-JAY at empanelled centres. Spinal surgery costs ₹1.5–4 lakh in private — Chirayu cap of ₹5 lakh per family per year often covers it.

**SMS micro-script (Hinglish):** "108 turant. Hilao mat. Sir aur gardan ke dono taraf kapde ki chiti rakho ki sir na ghoome. Saans bandh ho to neeche jaw aage push karo, sir peechhe mat jhukao. PGIMS Rohtak."

### 4. Open fracture (haddi tooti, khoon nikla)

**What the caller likely says:** "Bull ne maara, tang ki haddi bahar dikh rahi hai, khoon beh raha hai."

**Triage:** 108-NOW. Open fracture is a surgical emergency — high infection risk, golden-window 6 hours for irrigation and antibiotics.

**Do RIGHT NOW:**
1. Call 108.
2. Cover the wound with the cleanest cloth available — ideally a cotton dupatta boiled and cooled, or freshly laundered.
3. Press firmly around (not directly on) the protruding bone to control bleeding. Press a rolled cloth above and below the wound.
4. Do NOT push the bone back inside — this drives in dirt.
5. Splint the limb in the position found using two straight pieces of wood (charpai legs, bamboo, broomstick), padded with rolled cotton, tied above and below the fracture (not over it) with strips of dupatta.
6. Elevate slightly if possible to reduce bleeding.
7. Do not give food or water — surgery likely.

**Do NOT:**
- Do NOT apply haldi or any powder directly to the open wound bed.
- Do NOT use a tourniquet unless bleeding cannot be controlled by pressure and limb is at risk anyway. If absolutely needed, write the time on the patient's forehead.
- Do NOT delay for the bonesetter (haddi-jod). Bonesetter delay is a leading cause of amputation in rural Haryana.

**Where to go:** District hospital with orthopaedics or PGIMS Rohtak. Hisar belt: Civil Hospital Hisar then Sapra. Karnal belt: KCGMC. South: SHKM Nalhar then Medanta if covered.

**Cost / scheme:** Chirayu / PM-JAY covers fracture surgery and implants at empanelled hospitals.

**SMS micro-script (Hinglish):** "108. Saaf kapda haddi par dhakna, andar push mat karo. Lakdi/bambu se splint baandho upar aur neeche. Haddi-jod ke paas mat jao. Khaana paani na do. Civil Hospital ya PGIMS."

### 5. Closed fracture / suspected fracture (haddi tooti, khoon nahi)

**What the caller likely says:** "Hath/paer mein bahut dard, sooj gaya, mod nahi sakte."

**Triage:** CHC. 108 if hip, pelvis, or femur (large bone, blood loss risk) or if multiple bones.

**Do RIGHT NOW:**
1. Do not let them walk on it.
2. Splint in the position found using two parallel rigid pieces (bamboo, wooden ruler, rolled-up newspaper for forearm) padded with cotton, tied with dupatta strips above and below the suspected break. Tie the splint to the body part — not to the bone area itself.
3. Cold compress: cloth dipped in matka water, wrung, applied 15 min on / 15 min off. Helps swelling.
4. Elevate the limb on a folded blanket on the charpai.
5. Paracetamol 500 mg may be given for pain (one tablet, adult). Avoid NSAIDs if bleeding suspected.

**Do NOT:**
- Do NOT massage with mustard oil — this worsens swelling and can displace fragments.
- Do NOT visit a haddi-jod (bonesetter) before X-ray. Mal-united fractures cause permanent disability.

**Where to go:** Nearest CHC for X-ray and casting. If displaced, district hospital orthopaedics. PGIMS Rohtak for complex cases.

**Cost / scheme:** Chirayu / PM-JAY covers casting and surgery at empanelled hospitals. Janaushadhi Kendra has cheap paracetamol.

**SMS micro-script (Hinglish):** "Chalein nahi. Lakdi ya bambu se splint, kapde se baandho. Thande paani ka kapda 15 min. Paracetamol 1 goli. Haddi-jod nahi — pehle CHC ya district hospital me X-ray."

### 6. Severe bleeding / deep laceration (tej khoon beh raha)

**What the caller likely says:** "Drant se haath kat gaya, khoon ruk nahi raha."

**Triage:** 108-NOW for spurting/pumping bleed or any bleed that does not slow with 10 min of pressure. CHC for deep but controlled bleeds.

**Do RIGHT NOW:**
1. Sit or lie the patient down. Raise the bleeding limb above the heart if possible.
2. Press a thick folded cloth (clean cotton sari, dupatta, or fresh dhoti) directly onto the wound with both palms. Do not lift to peek for 10 minutes by the clock.
3. If the cloth soaks through, add a second layer on top — do not remove the first.
4. Wrap a tight bandage (strips of dupatta or roller from ASHA kit) over the pad to maintain pressure.
5. If bleeding continues despite firm pressure on a limb, press the artery above (groin for leg, inner upper arm for arm) with the heel of your hand.
6. Call 108. If transport is faster than 108, go directly to nearest CHC/district hospital.

**Do NOT:**
- Do NOT apply turmeric, ash, coffee powder or cobwebs to a deep wound — folk hemostatic agents add infection risk.
- Do NOT use a tourniquet unless bleeding is uncontrolled and limb amputation is acceptable. If used, write the time of application on the patient's forehead.
- Do NOT remove an embedded object — pad around it.

**Where to go:** CHC if minor; district hospital with surgery if major. PGIMS Rohtak for vascular involvement.

**Cost / scheme:** Chirayu / PM-JAY covers wound surgery and blood transfusion at empanelled hospitals. State blood-bank network is operated through district hospitals.

**SMS micro-script (Hinglish):** "Saaf kapda dabakar 10 min rakho, hatao mat. Dusra kapda upar lagao, pehla mat hatana. Hath/paer upar uthao. 108 call karo. Haldi/raakh mat lagao."

### 7. Amputation / finger crush (ungli/haath kat gaya)

**What the caller likely says:** "Chara-cutter mein ungli kat gayi" / "Thresher me haath fasa".

**Triage:** 108-NOW. Re-implantation possible if cold-preserved part reaches a hand-surgery centre within 6 hours (digit) or 4 hours (hand).

**Do RIGHT NOW:**
1. Press a thick clean cloth on the stump. Hold pressure for 10 minutes. Elevate the limb.
2. The cut part: rinse gently with clean (boiled-cooled) water to remove obvious dirt only — do not scrub.
3. Wrap the cut part in clean, damp (not soaked) cotton cloth.
4. Place that wrapped part inside a clean polythene bag and tie it shut.
5. Place that bag inside a second container (steel tiffin, lota) packed with cold water from the matka with ice chips if available. The cut part should NOT touch ice or water directly — only through the bag.
6. Call 108. Send the cold-packed part with the patient.

**Do NOT:**
- Do NOT put the part directly on ice or in water.
- Do NOT throw the part away — even a crushed digit may be useful for reconstruction.
- Do NOT use a tourniquet on a partial amputation unless bleeding cannot be controlled.

**Where to go:** Hand surgery is available at PGIMS Rohtak and some private NCR centres (Medanta, Fortis FMRI). Inform 108 it is an amputation case so they call ahead.

**Cost / scheme:** Chirayu / PM-JAY at empanelled hospitals. Re-implantation is high-cost — confirm card status.

**SMS micro-script (Hinglish):** "Stump par kapda dabao 10 min. Kati hui ungli geele saaf kapde mein lapeto, polythene mein band karo, fir thande paani waale tiffin mein rakho — ice ke direct sampark se nahi. 108. PGIMS Rohtak."

### 8. Penetrating chest injury / suspected pneumothorax (seene mein chot, saans takleef)

**What the caller likely says:** "Kheti mein gir gaya, lakdi seene mein ghus gayi, saans nahi aa raha."

**Triage:** 108-NOW. Tension pneumothorax kills in minutes.

**Do RIGHT NOW:**
1. Sit the patient up at 45°, leaning toward the injured side if it helps breathing.
2. If the wound is open and air is sucking in/out (visible bubbles): cover with a clean polythene sheet or plastic bag taped on three sides only — leave one side open. This makes a flutter valve (allows air out, not in).
3. Do NOT remove an impaled object (rod, knife, stick). Stabilise it with rolled cloth around it.
4. Reassure — keep talking to the patient.
5. Loosen tight clothes around the chest.

**Do NOT:**
- Do NOT lay the patient flat on their back.
- Do NOT pull out the impaling object — it is plugging the bleed.
- Do NOT give water.

**Where to go:** District hospital with surgery + ICU. PGIMS Rohtak. Private: Medanta, Fortis FMRI Gurugram.

**Cost / scheme:** Chirayu / PM-JAY covers chest tube and surgery.

**SMS micro-script (Hinglish):** "108. Patient ko 45 degree bithao. Khula ghaav ho to polythene se 3 taraf chipka ke lagao, ek taraf khula chhodo. Andar ghusi cheez mat nikalo. PGIMS Rohtak ya Medanta."

### 9. Blunt abdominal injury (pet pe chot)

**What the caller likely says:** "Tractor handle pet me lagi, dard bahut hai aur pet sakht hai."

**Triage:** 108-NOW. Splenic and liver lacerations from blunt trauma can bleed silently into the abdomen.

**Do RIGHT NOW:**
1. Lay flat on charpai, knees slightly bent on a folded blanket to relax the belly.
2. NOTHING by mouth — no water, no tea, no Eno.
3. Watch for: pale clammy skin, fast pulse, fainting, increasing pain, hard-board belly, blood in urine or stool. Any of these → 108 immediately, do not wait.
4. Cover with a dry sheet against shock.

**Do NOT:**
- Do NOT massage the belly.
- Do NOT give Eno, antacid, or any home digestive remedy.
- Do NOT apply heat to the belly.

**Where to go:** District hospital with surgery and ultrasound (FAST scan). PGIMS Rohtak. AIIMS New Delhi for paediatric blunt trauma if accessible.

**Cost / scheme:** Chirayu / PM-JAY covers laparotomy and ICU stay.

**SMS micro-script (Hinglish):** "108. Khaana paani kuchh nahi. Pet par maalish mat karo. Pale ho jaaye, dil tez chale, behoshi aaye to abhi le jao. PGIMS Rohtak."

### 10. Eye injury — chemical splash, foreign body, blunt (aankh mein chot)

**What the caller likely says:** "Pump check karte time tezaab aankh me gir gaya" / "Bhusa aankh me chala gaya" / "Cricket ball lagi aankh par".

**Triage:** Chemical splash → 108-NOW (irrigation race against time). Embedded foreign body or sharp injury → 108-NOW. Blunt eye injury with vision change → CHC same day. Loose dust/husk → home rinse first, then PHC.

**Do RIGHT NOW:**

**For chemical splash (acid, alkali, pesticide):**
1. Do not stop reading to call — start washing IMMEDIATELY. Tilt the head with the splashed eye DOWN, hold the eyelid open, pour clean (tap or boiled-cooled) water from a lota or mug for at least 20 minutes by the clock without stopping. Use a second person to refill while you keep pouring.
2. Wash from the inner corner of the eye outward so chemicals do not wash into the other eye.
3. After 20 minutes call 108.

**For foreign body (husk, dust):**
1. Do NOT rub.
2. Pull the upper lid down over the lower lid to let tears wash.
3. Rinse with a lota of clean water poured from inner to outer corner.
4. If stuck, cover with a clean cloth taped lightly. Do not put pressure.

**For blunt injury:**
1. Do not press. Cover with a paper cone (cardboard cup with the bottom cut out) taped over the eye to prevent pressure.
2. Cover BOTH eyes — eye movements move together. This keeps the injured eye still.

**Do NOT:**
- Do NOT put kajal, surma, mustard oil, or breast milk into an injured eye — all are documented infection causes in rural Haryana.
- Do NOT remove a metal/glass shard yourself.
- Do NOT rub.

**Where to go:** Civil Hospital ophthalmology, KCGMC Karnal, PGIMS Rohtak. Specialised eye care: AIIMS New Delhi RPC, Shroff/Centre for Sight in NCR.

**Cost / scheme:** PM-JAY covers eye trauma surgery at empanelled centres.

**SMS micro-script (Hinglish):** "Tezaab gaya to 20 min lagataar saaf paani aankh me daalo, sir us taraf jhuka ke. Kajal/dudh/surma mat daalo. Kachra ho to ragdo mat — paani se dho ke saaf kapde se dhakno. Civil Hospital ya PGIMS Rohtak."

### 11. Severe burn — flame, scald, chulha, electric (jal gaya)

**What the caller likely says:** "Saree chulhe se lag gayi, ma jal gayi, full back jala hai" / "Bachhe ke upar daal gir gayi, chhati jal gayi". The chulha-saree burn is one of the most common injury causes in rural Haryana adult women — synthetic dupattas catch quickly.

**Triage:** 108-NOW for any burn >10% body surface, any burn on face/neck/hands/feet/genitals, any electrical burn, any inhalation (singed nose hair, hoarse voice, smoky breath), any deep/charred burn, any burn in a child or elderly person. PHC for small superficial burns.

**Do RIGHT NOW:**
1. STOP THE BURNING — smother flames with a thick cotton dhoti/sheet. Do not let the patient run (oxygen feeds the fire). Roll them on the ground.
2. Remove burning/smouldering clothes ONLY if not stuck to skin. Cut around stuck cloth — do not pull.
3. Cool with running clean water for at least 20 minutes by the clock. Use a lota under a hand pump, or pour from a bucket continuously. Cool water — not ice, not freezing water.
4. Remove rings, bangles, kada, bichhua, watch, belt before swelling.
5. Cover with clean cling-film if available, or a CLEAN dry cotton cloth (ironed if possible — heat sterilises it).
6. Keep warm — burns lose heat. Wrap a dry blanket around the unburnt parts.
7. Call 108.
8. If conscious and not vomiting, give sips of ORS (1 lota with the salt-sugar recipe).

**Do NOT:**
- Do NOT apply ghee, mustard oil, coconut oil, butter, toothpaste, ash (raakh), kapur, haldi paste, ink, or aloe juice to the burn. All are documented in Haryana burns-unit admissions as infection causes.
- Do NOT burst blisters.
- Do NOT use ice or ice-water — causes frostbite on damaged tissue.
- Do NOT delay for the local "jala-thik-karne wala" — burns specialists are at PGIMS, Safdarjung, or AIIMS New Delhi.

**Where to go:** PGIMS Rohtak has a burns unit. Safdarjung Hospital New Delhi (one of India's largest burns centres). AIIMS New Delhi. KCGMC Karnal for north Haryana.

**Cost / scheme:** Chirayu / PM-JAY covers burns admission and skin grafting at empanelled hospitals. Government burns units charge nominal fees.

**SMS micro-script (Hinglish):** "Aag bujhao kapde se. Jala kapda agar chipka hai to mat kheencho. 20 min thanda saaf paani daalo lagataar. Ghee/tel/toothpaste/raakh KUCHH MAT lagao. Saaf kapde se dhakdo. 108. PGIMS Rohtak ya Safdarjung."

### 12. Electric shock / electrocution (bijli ka jhatka)

**What the caller likely says:** "Pump theek karte time current laga, behosh ho gaya."

**Triage:** 108-NOW for any electrocution with loss of consciousness, burn at entry/exit point, fall from height, or chest pain. Even a "small shock" can cause delayed cardiac arrhythmia for 24 hours.

**Do RIGHT NOW:**
1. **First — switch off the supply** at the mains. Do NOT touch the patient until current is cut.
2. If you cannot switch off, push the patient away from the wire using a DRY wooden stick, dry bamboo, or plastic broom — not metal, not wet wood.
3. Once safe, check breathing. If absent, start chest compressions (heel of hand on lower breastbone, push 5–6 cm deep at ~100/min).
4. Look for entry and exit burns (often on hands and feet) — cover with clean dry cloth.
5. Lay flat unless spine injury suspected.
6. Call 108.

**Do NOT:**
- Do NOT touch the patient with wet hands or while standing in water.
- Do NOT pour water on the patient until power is confirmed off.
- Do NOT assume "he is fine, he stood up" — arrhythmia can occur hours later.

**Where to go:** District hospital with ECG monitoring + ICU. PGIMS Rohtak. Cardiac monitoring for 24 h is essential.

**Cost / scheme:** Chirayu / PM-JAY at empanelled hospitals.

**SMS micro-script (Hinglish):** "Pehle main switch band karo. Sookhi lakdi/bambu se dhakka do. Saans nahi to seene par dabaye 100/min. Burn ko saaf kapde se dhakno. 108 — 24 ghante monitoring chahiye."

### 13. Acute MI / chest pain syndrome (seene mein dard, paseena)

**What the caller likely says:** "Pita ji ko seene mein bahut dard hai, paseena aa raha hai, baayen haath me bhi dard."

**Triage:** 108-NOW. Crushing or pressure-like chest pain >15 min, often with sweating, nausea, breathlessness, pain radiating to left arm/jaw/back. In Haryana, the diabetic and hypertensive prevalence (15.1% and 26.2% of adults) means MI risk is high and "silent MI" in diabetics can present as just sweating + weakness.

**Do RIGHT NOW:**
1. Sit the patient up at 45°, supported by pillows on the charpai. Do NOT make him walk.
2. Loosen tight clothes around the chest.
3. **Aspirin 300 mg chewable** (4 tablets of 75 mg aspirin like Ecosprin, OR one 325 mg uncoated aspirin) — chew, do not swallow whole. Skip ONLY if known aspirin allergy or active stomach bleed. First-aid evidence shows survival benefit for early aspirin in non-traumatic chest pain.
4. If the patient has a prescribed sorbitrate / nitroglycerine tablet: place one under the tongue.
5. Call 108.
6. Stay with patient. If breathing stops, start chest compressions immediately (push hard 5–6 cm, ~100/min, on lower breastbone).

**Do NOT:**
- Do NOT wait to "see if it passes". Time = heart muscle.
- Do NOT give water or food.
- Do NOT make him lie flat — sitting up helps breathing.
- Do NOT drive him on the back of a motorcycle to PHC.

**Where to go:** Cath-lab capable hospital for primary PCI within 90 min ideally. PGIMS Rohtak (cardiology), Medanta Gurugram (cardiac sciences CoE), Fortis FMRI Gurugram, Artemis. Civil hospitals in Faridabad, Gurugram, Karnal also receive STEMI cases. Tell 108 explicitly: "seene me dard, MI ho sakta hai".

**Cost / scheme:** Chirayu / PM-JAY covers angiogram and angioplasty at empanelled hospitals. Stent + PCI is in the package.

**SMS micro-script (Hinglish):** "108 abhi. Bithao seedha 45 degree. Aspirin 300mg chabhao (allergy nahi to). Sorbitrate ho to jeeb ke neeche rakho. Chalao mat. Medanta/PGIMS Rohtak — cath lab vala hospital."

### 14. Stroke — FAST recognition (lakwa, mooh tedha)

**What the caller likely says:** "Pita ji ka mooh tedha ho gaya, baat saaf nahi nikal rahi, ek hath utha nahi rahe."

**Triage:** 108-NOW. The thrombolysis window is 4.5 hours from symptom onset. <1% of Indian stroke patients reach hospital in time — the SMS can change this.

**Do RIGHT NOW:**
1. Apply FAST: **F**ace — ask to smile, see if one side droops. **A**rms — ask to raise both arms, see if one drifts down. **S**peech — ask to say a sentence ("aaj khaana achha tha"), check for slurring. **T**ime — note the EXACT minute symptoms started or when patient was last seen normal. The doctor needs this.
2. Sit patient up 30° supported by pillows.
3. Do NOTHING by mouth — risk of choking due to swallowing weakness.
4. Loosen tight clothes.
5. If unconscious but breathing, place in left-lateral recovery position.
6. Call 108. Tell them: "Lakwa ka shak hai, FAST positive, time onset [X bajay]."

**Do NOT:**
- Do NOT give water, juice, sugar, food, or any "stroke kashaya" home brew.
- Do NOT give aspirin (unlike MI — in stroke, bleeding stroke must be ruled out by CT first).
- Do NOT massage or apply mustard oil to the face.
- Do NOT "wait until morning to see" — every 15 minutes lost means more brain dead.

**Where to go:** Hospital with CT scan + stroke-ready protocol. PGIMS Rohtak (neurology). Medanta (stroke unit). Fortis FMRI. AIIMS New Delhi if Delhi-side. KCGMC Karnal for north Haryana. Many smaller district hospitals do not have urgent CT — bypass them and go to the bigger centre.

**Cost / scheme:** Chirayu / PM-JAY covers stroke admission, CT, thrombolysis, and rehab at empanelled hospitals.

**SMS micro-script (Hinglish):** "FAST: chehra tedha? Hath uthate ek girta? Bolne me lapatpati? Time kab shuru hua likho. 108. Khaana paani kuchh nahi. Aspirin mat do. Medanta ya PGIMS — CT scan vala hospital."

### 15. Hypertensive emergency (BP bahut zyada)

**What the caller likely says:** "Mata ji ka BP 220 hai, sir mein bahut dard, dhundla dikh raha hai."

**Triage:** 108-NOW or CHC depending on severity. BP >180/120 with symptoms (severe headache, vision blur, chest pain, breathlessness, confusion, pregnancy) is an emergency. BP >180/120 without symptoms is urgent — CHC same day.

**Do RIGHT NOW:**
1. Sit calmly. Avoid stress, bright light. Dim the room.
2. If patient is on regular BP medicine and missed it — give the missed dose with water.
3. Do not give a "double dose" of BP medicine to "bring it down fast" — sudden BP drop can cause stroke.
4. Loosen tight clothes around the neck.
5. Call 108 if any red flag (severe headache, vision change, chest pain, weakness, confusion, pregnancy).

**Do NOT:**
- Do NOT give a sublingual nifedipine ("Adalat under tongue") — this old practice is now known to cause dangerous BP drops and stroke. Banned in modern guidelines.
- Do NOT give garlic-honey-lemon home remedies for an acute BP crisis.
- Do NOT make the patient walk or do any exertion.

**Where to go:** PHC if BP is high but patient stable. CHC if BP very high. District hospital or PGIMS Rohtak for hypertensive encephalopathy / aortic dissection / pulmonary oedema.

**Cost / scheme:** Chirayu / PM-JAY at empanelled hospitals. Janaushadhi Kendra has cheap antihypertensives (amlodipine, telmisartan).

**SMS micro-script (Hinglish):** "Shaant bithao, light kam karo. Apni regular BP dawai missed hai to 1 dose lo. Adalat jeeb ke neeche MAT lo. Sir dard tej, dhundla, garbh me ho to 108. Warna CHC same day."

### 16. Acute heart failure / pulmonary oedema (saans phool rahi, paer soojan)

**What the caller likely says:** "Saans nahi aa rahi, leTna nahi ho raha, paer soojay hai, jhag wali balgam."

**Triage:** 108-NOW. Pink frothy sputum + cannot lie flat = pulmonary oedema.

**Do RIGHT NOW:**
1. Sit patient bolt upright with legs hanging off the charpai (helps blood pool in legs and reduce lung congestion).
2. Open windows for air. Switch on fan.
3. If patient is on regular furosemide (Lasix) and skipped a dose — give one tablet (40 mg) with little water.
4. Loosen tight clothes.
5. Call 108. Ask for ALS / oxygen-equipped ambulance.

**Do NOT:**
- Do NOT lay flat.
- Do NOT give large volumes of water — this worsens overload.
- Do NOT give salt or salty food.
- Do NOT give Eno or any sodium bicarbonate.

**Where to go:** District hospital with ICU or cardiology. PGIMS Rohtak. Medanta, Fortis FMRI, Artemis if covered.

**Cost / scheme:** Chirayu / PM-JAY at empanelled hospitals.

**SMS micro-script (Hinglish):** "Seedha bithao, paer charpai se neeche latkao. Pankha chalao. Lasix lete ho aur miss ki to 1 goli. LeTao mat. Pani zyada nahi. 108 — oxygen valli ambulance. PGIMS ya Medanta."

### 17. Syncope / collapse (behosh ho gaya)

**What the caller likely says:** "Khade-khade gir gaya, kuchh second behosh raha, ab thik hai par kamzori hai."

**Triage:** CHC for first-time simple faint with quick recovery. 108-NOW if: fainting during exertion, fainting from sitting (not standing), chest pain or palpitations before fainting, confusion lasting >2 min, head injury during fall, pregnant, age >60, known heart disease, known diabetic.

**Do RIGHT NOW:**
1. Lay flat on the charpai. Raise legs up on a folded blanket or pillow (legs above heart level). Most simple faints recover within 1 minute.
2. Loosen tight clothes around neck and waist.
3. Once awake, give a glass of nimbu-pani with a chutki of salt and 2 chutki of sugar (oral rehydration, helps if dehydration was the cause).
4. Check for tongue bite, urine incontinence, jerking — these suggest a seizure rather than a faint, which changes management.
5. Note exact circumstances — what they were doing, time, last meal, last urine, medicines.

**Do NOT:**
- Do NOT slap the face to wake.
- Do NOT pour water on the face.
- Do NOT prop the head up — keep flat.
- Do NOT make them walk for at least 10 min after waking.

**Where to go:** PHC for simple faint with no red flag, ECG indicated. CHC or district hospital for any red flag. Cardiac evaluation at PGIMS Rohtak or private cardiac centre if recurrent.

**Cost / scheme:** Chirayu / PM-JAY for cardiac workup at empanelled hospitals.

**SMS micro-script (Hinglish):** "LeTao seedha, paer ooncha utha do takhya pe. Gardan ke kapde dheele. Hosh aane par nimbu-pani namak-cheeni daal kar do. Chest dard, garbh, dil ki bimari ho to 108. Warna PHC me ECG."

### 18. Severe asthma attack (dama ka attack)

**What the caller likely says:** "Dama-attack, inhaler kaam nahi kar raha, baat nahi kar pa rahe."

**Triage:** 108-NOW if: cannot speak full sentences, blue lips/fingertips, drowsy, silent chest (no wheeze because no air moves), peak flow <50% personal best.

**Do RIGHT NOW:**
1. Sit upright leaning forward, hands on knees (tripod position). Do NOT lie down.
2. Use the salbutamol/Asthalin/Levolin inhaler: 2 puffs through a SPACER (improvised: cut a 1-litre plastic bottle, make a hole at the closed end for the inhaler, breathe through the open end). Wait 1 min, repeat — up to 6 puffs in 20 min while waiting for ambulance.
3. If a Budecort/Foracort inhaler is also available, take 2 puffs after the salbutamol.
4. Open windows. Fan on. Calm patient — panic worsens the attack.
5. Boil water in a patila, drape a towel over head, breathe steam through nose for 10 min — eases bronchospasm in mild cases.
6. Call 108.

**Do NOT:**
- Do NOT use a friend's "old leftover" oral steroid without doctor advice unless patient is a known severe asthmatic with a written action plan.
- Do NOT exercise or walk to the PHC if severe.
- Do NOT smoke or be near chulha smoke.

**Where to go:** PHC for moderate. CHC or district hospital with nebulisation + oxygen for severe. PGIMS Rohtak respiratory medicine for refractory.

**Cost / scheme:** Chirayu / PM-JAY at empanelled hospitals. Janaushadhi has cheap salbutamol inhalers.

**SMS micro-script (Hinglish):** "Seedha bithao haath ghutno par. Asthalin inhaler 2 puff plastic bottle ke jugaad spacer se, 1 min ruko, fir 2 puff — 20 min me 6 tak. Bhaap lo. Chulha dhuaan se door. 108 jab baat na ho ya hoth neele."

### 19. COPD exacerbation (dama-saans phool gayi)

**What the caller likely says:** "Bidi peene wale dadda ji, khaansi badh gayi, balgam zyada, saans phool rahi."

**Triage:** CHC if moderate. 108-NOW if cannot speak, drowsy, blue lips, fever with sputum colour change.

**Do RIGHT NOW:**
1. Sit upright leaning forward.
2. Salbutamol inhaler 2 puffs via spacer (plastic bottle), repeat 1 min later.
3. If patient already has Budecort, take 2 puffs after salbutamol.
4. Stop smoking immediately. Move away from chulha smoke and hookah.
5. If patient has prescribed prednisolone for exacerbation — give the prescribed dose.
6. Steam inhalation 10 min.
7. Plenty of warm fluids (tulsi-ginger tea, warm water).
8. Call CHC; 108 if severe.

**Do NOT:**
- Do NOT continue bidi or hookah.
- Do NOT lie flat.
- Do NOT use sleep medication (sedatives can stop breathing).

**Where to go:** PHC for mild. CHC or district hospital with nebulisation/oxygen for severe. PGIMS Rohtak respiratory medicine.

**Cost / scheme:** Chirayu / PM-JAY. Janaushadhi for ipratropium, salbutamol, doxofylline.

**SMS micro-script (Hinglish):** "Bithao seedha. Asthalin 2 puff spacer se, 1 min baad fir 2. Bidi/hookah turant band. Bhaap lo. Garam adrak-tulsi paani. Khichdi balgam ka rang badle to PHC. Saans bahut tej to 108."

### 20. Choking — adult and child (gala ruk gaya)

**What the caller likely says:** "Bachhe ke gale me roti ka tukda atak gaya, saans nahi le pa raha" or "bauji khaate-khaate atak gaye, bol nahi rahe haath gale par".

**Triage:** 108-NOW for complete obstruction (cannot speak, cough, or breathe). HOME first-aid actions while ambulance comes.

**Do RIGHT NOW:**

**Adult or child >1 year, conscious, NOT speaking:**
1. Stand behind. Lean them slightly forward.
2. Give 5 sharp back blows between the shoulder blades with the heel of your hand. Check after each.
3. If still blocked, do 5 abdominal thrusts (Heimlich): stand behind, fist just above the belly button, other hand over fist, sharp inward-and-upward pull. Repeat.
4. Alternate 5 back blows + 5 abdominal thrusts until object comes out OR patient becomes unconscious.
5. If unconscious, lay flat, start chest compressions. Look in the mouth before each breath; remove visible object only.

**Infant <1 year:**
1. Hold the baby face-down along your forearm, head lower than body, support jaw with fingers.
2. 5 back blows between shoulder blades with heel of hand.
3. Turn over, face-up along thigh, head still lower than body.
4. 5 chest thrusts: 2 fingers on lower breastbone, push 4 cm deep.
5. Alternate 5 back blows + 5 chest thrusts. Do NOT use abdominal thrusts in an infant — liver injury risk.

**Do NOT:**
- Do NOT hold the patient upside down by the legs and shake (a common village reflex — does not work for solid food).
- Do NOT do blind finger-sweep — can push the object further down.
- Do NOT give water, milk, or roti "to push it down".

**Where to go:** PHC or CHC for post-choke evaluation even if cleared. 108 if unconscious or not cleared.

**Cost / scheme:** Chirayu / PM-JAY for any admission.

**SMS micro-script (Hinglish):** "Bada: peechhe khade ho, 5 baar peeth par dhakka shoulder blade ke beech, 5 baar pet par muthhi se andar-upar dhakka. Bachha <1 saal: aulta lita ke peeth par 5, fir seedha kar ke seene par 2 ungli se 5. 108. Roti ya paani mat khilao."

### 21. Pneumonia in adult (nimoniya)

**What the caller likely says:** "3 din se tej bukhar, peeli balgam, seene mein dard, saans tej."

**Triage:** PHC if mild (no fast breath, no chest indrawing, no confusion). CHC or 108-NOW if severe — fast breathing >30/min, oxygen saturation <94% on pulse oximeter (if available, ~30% of homes have one post-COVID), chest indrawing, blue lips, confusion, age >60, diabetes, pregnant.

**Do RIGHT NOW:**
1. Rest in bed, propped up at 45°.
2. Plenty of fluids — warm water, tulsi-ginger-honey tea.
3. Paracetamol 500 mg every 6 h for fever (max 4 in 24 h adult).
4. Steam inhalation 2× a day, 10 min each.
5. Count breaths for 60 seconds. Note the result.
6. If pulse oximeter available, measure SpO2. Below 94% — go to CHC. Below 90% — 108.

**Do NOT:**
- Do NOT self-prescribe antibiotics from the kirana. Pneumonia needs the right antibiotic, not the leftover one.
- Do NOT use cold sponging (it shivers and worsens fever).
- Do NOT lie flat.

**Where to go:** PHC for first review and chest exam. CHC for X-ray and antibiotics. District hospital for severe (oxygen, IV antibiotics, ICU). PGIMS Rohtak for complicated.

**Cost / scheme:** PM-JAY / Chirayu covers admission and antibiotics. Janaushadhi for amoxicillin.

**SMS micro-script (Hinglish):** "Aaram, garam pani, paracetamol 500mg har 6 ghante. Bhaap. Saans 30/min se zyada ya hoth neele to CHC. Pulse oximeter ho aur 94% se kam to CHC, 90% se kam to 108. Antibiotic apne aap nahi."

### 22. Severe respiratory distress in infant (bachhe ki saans tej)

**What the caller likely says:** "Naya bachha doodh nahi pee raha, saans tez chal rahi, seene me gadda bante."

**Triage:** 108-NOW always for any infant <2 months with: fast breathing (≥60/min), severe chest indrawing, grunting, refusing feed, lethargy, fever or hypothermia (≥37.5°C or <35.5°C), seizures, blue around lips. Per IMNCI all young infants with any danger sign require urgent referral.

**Do RIGHT NOW:**
1. Keep baby warm — wrap in dry cloth, skin-to-skin against mother's chest (kangaroo). Hat on head.
2. Continue breastfeeding if baby will latch — small frequent sips from a katori-spoon if not.
3. Clear nose with a clean cloth wick (rolled cotton).
4. Count breaths for full 60 seconds (look at belly rise). Note number.
5. Call 108. Ask for newborn-equipped ambulance (102 if available).
6. Bring baby's vaccination card and ASHA's mother-and-child protection card.

**Do NOT:**
- Do NOT give honey, water, ghee, sugar water, or gripe water to a young infant.
- Do NOT bathe a sick newborn.
- Do NOT give any cough syrup.
- Do NOT delay because "it might pass".

**Where to go:** SNCU (Sick Newborn Care Unit) at district hospital or CHC. PGIMS Rohtak NICU. KCGMC Karnal NICU. SHKM Nalhar for Mewat. Private: Medanta, Fortis FMRI paediatric/neonatal ICU.

**Cost / scheme:** JSSK guarantees free transport, drugs, diagnostics, and care for sick newborns up to 30 days. Chirayu / PM-JAY for prolonged stays.

**SMS micro-script (Hinglish):** "Bachhe ko maa ke seene se chipka ke garam rakho, topi pehnao. Doodh chusao. Naak saaf karo. Saans 60/min zyada ya seena gadda banta to 108 — JSSK free hai. SNCU vala hospital."

### 23. Acute severe abdominal pain — suspect appendix or perforation (pet mein tez dard)

**What the caller likely says:** "Pet me bahut dard, naabhi ke neeche right side, ulti, bukhar" or "achaanak pet me bahut dard, pet sakht, saans bhi dukhti".

**Triage:** 108-NOW if: pain severe and constant, hard board-like belly, fever with belly pain, vomiting that won't stop, unable to pass stool/wind, blood in stool, pregnant, recent injury. Surgical abdomen until proven otherwise.

**Do RIGHT NOW:**
1. NOTHING by mouth — no water, no tea, no Eno. Surgery may be needed.
2. Lie flat with knees bent up over a folded blanket — relaxes abdominal muscles.
3. Note time of onset, location of worst pain, anything that makes it worse/better, last meal, last stool/urine.
4. Call 108 or arrange transport to district hospital with surgery.

**Do NOT:**
- Do NOT give Combiflam, Ibuprofen, Diclofenac — masks symptoms and can cause perforation in ulcer patients.
- Do NOT apply heat to the belly — bursts an inflamed appendix.
- Do NOT give Eno, Pudin Hara, ORS, milk — anything by mouth raises aspiration and surgery risk.
- Do NOT massage the belly.

**Where to go:** District hospital with general surgery + ultrasound. PGIMS Rohtak. ESIC Faridabad. Private: any empanelled centre.

**Cost / scheme:** Chirayu / PM-JAY covers appendicectomy and laparotomy.

**SMS micro-script (Hinglish):** "Khaana paani kuchh nahi. LeTao, ghutne mod ke takhya neeche. Combiflam mat do. Pet par garam sek mat lagao. Eno bhi nahi. 108 ya district hospital — surgery vala. Time aur jagah likho."

### 24. Severe acute diarrhoea + dehydration (cholera-like) (dast aur paani ki kami)

**What the caller likely says:** "Subah se 8 baar dast, paani jaisa, ab kamzori, mooh sookha, peshaab nahi aa raha."

**Triage:** CHC if moderate dehydration (sunken eyes, slow skin pinch, very thirsty). 108-NOW if severe (lethargic, unconscious, no urine for 6 h, weak pulse, very fast breathing, sunken fontanelle in baby).

**Do RIGHT NOW:**
1. Start ORS immediately. From ASHA: 1 sachet in 1 litre clean (boiled-cooled) water. Without sachet: 1 teaspoon salt + 8 teaspoons sugar in 1 litre boiled-cooled water.
2. Adult: drink at least 1 lota (200 ml) after every loose stool. Aim for 3 litres in first 4 hours if dehydrated.
3. Child >2 yr: 100–200 ml after each stool.
4. Child <2 yr: 50–100 ml after each stool, plus continue breastfeeding.
5. Zinc tablets (ASHA-issued, 20 mg dispersible): one daily for 14 days, child 6 mo–5 yr. Reduces severity and duration.
6. If unable to keep ORS down or any severe sign, call 108.
7. Continue normal food — do not stop food or breastfeeding.

**Do NOT:**
- Do NOT give Loperamide / Imodium / Eldoper or any "dast band" tablet to a child or to anyone with bloody/mucous stool or fever — can cause toxic megacolon.
- Do NOT give Norflox or Metrogyl from the kirana without diagnosis — fuels resistance and may worsen.
- Do NOT stop breastfeeding.
- Do NOT give plain water alone or salt-only water — wrong osmolarity.
- Do NOT give sugary cold drinks (Limca, Pepsi) instead of ORS — too much sugar makes dast worse.

**Where to go:** ASHA didi for ORS + zinc. PHC for IV fluids if vomiting + ORS fails. CHC or district hospital for severe. Cholera outbreak: report to ANM and district surveillance unit (IDSP).

**Cost / scheme:** ORS and zinc are free from ASHA. PM-JAY covers admission.

**SMS micro-script (Hinglish):** "ORS turant — ASHA didi se sachet, ya 1 chamach namak + 8 chamach cheeni + 1 litre ubla pani. Har dast ke baad 1 lota. Zinc 14 din. Doodh band mat karo. Behosh ya peshaab band to 108. Loperamide mat khaen."

### 25. Upper GI bleed — haematemesis / melaena (khoon ki ulti / kala paikhana)

**What the caller likely says:** "Coffee jaisa khoon ki ulti, paikhana kala-tarcoal jaisa, kamzori bahut."

**Triage:** 108-NOW. Bleeding peptic ulcer, oesophageal varices (in known liver disease / shrabi), or Mallory-Weiss tear after vomiting.

**Do RIGHT NOW:**
1. NOTHING by mouth.
2. Lie on left side. Slightly head-up.
3. Note approximately how much blood — coffee-cup-half, lota-full, or more. Doctor will ask.
4. Note if any history of: regular Combiflam/Ibuprofen, alcohol, known peptic ulcer, jaundice, swollen belly.
5. Call 108. Tell them: "Khoon ki ulti, IV access aur blood needed."
6. Conserve heat — wrap in a sheet.

**Do NOT:**
- Do NOT give Eno, milk, antacid, water, or any "thanda karne wala" home remedy.
- Do NOT give aspirin or any pain killer.
- Do NOT delay — varices bleed massively.

**Where to go:** District hospital with endoscopy + blood bank + ICU. PGIMS Rohtak gastroenterology. Medanta liver institute.

**Cost / scheme:** Chirayu / PM-JAY covers endoscopy, banding, blood transfusion.

**SMS micro-script (Hinglish):** "108. Kuchh khaana paani nahi. Baayen karwat lita do. Kitna khoon, kab shuru hua likho. Sharab/Combiflam ki history bata dena. PGIMS ya Medanta — endoscopy aur blood bank vala hospital."

### 26. Acute jaundice — suspected hepatitis (piliya)

**What the caller likely says:** "Aankh peeli ho gayi, peshaab geherey rang, kamzori, bhook nahi."

**Triage:** PHC for evaluation. 108-NOW if: confusion / drowsiness (hepatic encephalopathy), bleeding, hard belly, pregnant, child, very high fever.

**Do RIGHT NOW:**
1. Rest. Avoid all medications unless cleared by doctor — many drugs are processed by liver and can worsen.
2. Plenty of fluids (boiled-cooled water, fresh nimbu-pani, sugarcane juice if hygienic source).
3. Light, easy food — khichdi, dalia, rice, banana. Avoid oily and spicy.
4. NO ALCOHOL of any kind.
5. Stop paracetamol unless doctor says otherwise — high doses worsen liver injury.
6. Stop self-prescribed Combiflam, ayurvedic powders (some contain heavy metals), home "liver tonics".
7. Get tested for HAV, HEV (water-borne, common in Haryana monsoon outbreaks), HBV, HCV at PHC.

**Do NOT:**
- Do NOT take "jhaad-phoonk" or pillai-paani treatment from local healers — documented delay cause for fulminant hepatitis death.
- Do NOT eat raw papaya or "jaundice-curing leaves" — no evidence, can be toxic.
- Do NOT drink alcohol "to flush it out".

**Where to go:** PHC for LFT and hepatitis serology. District hospital for severe / encephalopathy. PGIMS Rohtak hepatology. Medanta Liver Institute Gurugram for transplant assessment.

**Cost / scheme:** Chirayu / PM-JAY at empanelled hospitals. Hepatitis B vaccine free under Universal Immunization for children; available at PHC for adults at cost.

**SMS micro-script (Hinglish):** "Aaram, ubla pani, halki khichdi, banana. Sharab bilkul nahi. Paracetamol/Combiflam band. Jhaad-phoonk mat karwao. PHC me LFT aur hepatitis test. Behoshi/khoon to 108 aur PGIMS."

### 27. Acute urinary retention (peshaab nahi aa raha)

**What the caller likely says:** "12 ghante se peshaab nahi aaya, pet ke neeche bahut dard, gola jaisa hai."

**Triage:** CHC same day for catheterisation. 108 if also fever, blood, severe pain, or post-injury.

**Do RIGHT NOW:**
1. Try a warm sitz bath: sit in a tub or large patila of comfortably warm water for 15 min. Often relaxes the bladder neck.
2. Try the sound of running water (a tap left open) or pour warm water over the perineum from a lota — sometimes triggers reflex.
3. Walk gently if mobile.
4. Avoid more fluids until catheterised — bladder is already overdistended.
5. If not relieved in 30 min, go to CHC. Bladder rupture risk above 6–12 hours.

**Do NOT:**
- Do NOT push hard or strain — risks haemorrhoids and bladder injury.
- Do NOT give diuretics like furosemide (does not help retention, makes bladder fill faster).

**Where to go:** CHC with catheter + urology referral. District hospital. PGIMS Rohtak urology if recurrent or stones suspected.

**Cost / scheme:** Chirayu / PM-JAY covers urology including TURP for BPH. Janaushadhi for tamsulosin.

**SMS micro-script (Hinglish):** "Garam paani me 15 min baitho. Nal khol ke awaaz suno. Lota se garam paani perineum par. Pani aur mat piyo. 30 min me na ho to CHC — catheter laga ke khaali karenge."

### 28. Renal colic (gurde ka dard)

**What the caller likely says:** "Pith ke dono taraf bahut tez dard, khichta hua peshaab tak, ulti."

**Triage:** PHC for diagnosis (urine + ultrasound). CHC if stone >5 mm, fever (suggests obstruction + infection — emergency), single kidney, pregnant.

**Do RIGHT NOW:**
1. Drink 2 lota of warm water immediately, then 1 lota every 30 min.
2. Walk around — movement helps small stones move.
3. Hot compress on the painful flank (cloth dipped in warm water, wrung).
4. Diclofenac 50 mg from chemist for pain (one tablet, with food) UNLESS pregnant, ulcer, kidney disease, asthma. Or paracetamol 500 mg if any NSAID contraindication.
5. Urinate through a strainer (chhanni or fine cloth) to catch stone for analysis.
6. Go to PHC for urine test + ultrasound.

**Do NOT:**
- Do NOT take ORS — extra salt is wrong for stones.
- Do NOT take "patthar todne wali jadi" without doctor — many are nephrotoxic.
- Do NOT take Combiflam if known peptic ulcer or severe asthma.

**Where to go:** PHC for ultrasound + urine. CHC or district hospital urology. PGIMS Rohtak / Medanta for ESWL or PCNL if stone >7 mm.

**Cost / scheme:** Chirayu / PM-JAY covers stone procedures. Free dialysis programme covers any renal failure complication at government hospitals.

**SMS micro-script (Hinglish):** "Garam pani 2 lota turant, fir har 30 min me 1 lota. Chalein. Dard wali jagah par garam sek. Diclofenac 50mg agar ulcer/garbh nahi. Chhanni se peshaab — pathar pakdo. PHC me ultrasound."

### 29. Postpartum haemorrhage (bachha hone ke baad khoon)

**What the caller likely says:** "Bachha ho gaya ghar par, ab maa ka khoon ruk nahi raha, kapde bhar gaye."

**Triage:** 108-NOW. PPH affects ~12% of Indian deliveries and is the leading cause of maternal mortality. Atonic uterus is the commonest cause.

**Do RIGHT NOW:**
1. Call 108 / 102 immediately.
2. **Misoprostol** — if ASHA didi has issued misoprostol tablets (some Haryana ASHA kits include it for PPH prevention/management): 600 microgram (3 tablets of 200 mcg) given orally OR 800 mcg per rectum.
3. **Uterine massage:** place both hands over the lower belly. Feel the uterus as a hard ball just below the navel. If it feels soft (boggy), massage firmly with circular motion until it becomes hard. Continue every 15 min.
4. **Bladder empty:** make her urinate or insert a catheter at PHC level — full bladder prevents uterus contracting.
5. **Breastfeed the baby** immediately — release of natural oxytocin helps the uterus contract.
6. Lay her flat. Raise her legs on a folded blanket / brick (legs above heart).
7. Keep her warm — wrap in dry sheet.
8. Stop visible bleeding outside the body by direct pressure on perineal tear with clean folded cloth.
9. NOTHING by mouth.

**Do NOT:**
- Do NOT pull on the umbilical cord to deliver placenta — risks inversion. Wait for 102/108.
- Do NOT stuff cloth or cotton inside the vagina — increases infection.
- Do NOT give Combiflam or aspirin — worsen bleeding.
- Do NOT delay for the dai's herbs.

**Where to go:** Nearest CHC / FRU with blood storage + emergency obstetrics. District hospital. PGIMS Rohtak OB. KCGMC Karnal. SHKM Nalhar. BPS GMC Khanpur Kalan. Tell 102: "Delivery ho gayi, khoon zyada, PPH."

**Cost / scheme:** JSSK guarantees free delivery, C-section, drugs, diagnostics, blood, and transport for the mother. PM-JAY covers complications.

**SMS micro-script (Hinglish):** "108/102 abhi. Pet par dono haath rakh ke gola jaisa firm karo, har 15 min maalish. Bachhe ko doodh chusao. Peshaab karwao. Misoprostol ho to 3 goli (600 mcg) khilao. Paer takhya pe ooncha. Yoni me ruyi mat dalo."

### 30. Eclampsia / severe pre-eclampsia (garbh mein dauraa)

**What the caller likely says:** "Garbhwati ki achaanak jhatke aaye, behosh hai, BP 180/120 hai" or pre-eclampsia: "Sir bahut dard, dhundla dikh raha, paer soojan, garbh me 8 mahina."

**Triage:** 108-NOW. Eclampsia is a leading killer in pregnancy. Magnesium sulfate is the proven treatment but is restricted to higher facilities under Indian EML.

**Do RIGHT NOW:**
1. Call 108 / 102 immediately. State: "Garbh me dauraa, eclampsia."
2. Lie her on the LEFT side on the charpai. Place a folded blanket under the right hip to tilt the uterus off the major vein.
3. Protect from injury during the seizure — clear hard objects, place a folded cloth under her head, do not restrain her.
4. Do NOT put anything in her mouth — no spoon, no cloth wedge. Tongue-bite is preferable to a chipped tooth blocking the airway.
5. After seizure: clear mouth with finger wrapped in cloth (only visible secretions). Place in left-lateral recovery position.
6. Loosen tight clothes.
7. Note: time of seizure, duration, what was happening before, BP if a machine is available, pregnancy week, any medications.
8. NOTHING by mouth.
9. If trained ANM or PHC reachable: magnesium sulfate is the first-line agent (4 g IV over 5 min + 10 g IM loading per WHO/FOGSI). PHC-level may have it; CHC certainly should.

**Do NOT:**
- Do NOT give diazepam first — magnesium sulfate is superior.
- Do NOT pour water on the face during a seizure.
- Do NOT delay for "lakshmi pooja" / "evil eye" interventions.
- Do NOT make her sit up.

**Where to go:** CHC with C-section + FRU. District hospital with OB. PGIMS Rohtak OB. KCGMC. SHKM Nalhar. BPS GMC Khanpur Kalan (women-only).

**Cost / scheme:** JSSK covers all maternal complications including C-section, drugs, diagnostics, transport. PM-JAY for ICU.

**SMS micro-script (Hinglish):** "108 abhi. Baayen karwat litao, daayen kulhe ke neeche kapda. Mooh me kuchh mat dalo. Cheez chot lagne wali hatao. Time aur ghar me jo ho raha tha likho. CHC ya PGIMS — magnesium sulfate dengay."

