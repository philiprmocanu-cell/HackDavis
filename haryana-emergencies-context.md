# Haryana Medical Emergencies — Per-Emergency SMS Triage Reference

> **Purpose:** This is the third standalone load-in reference for the HackDavis SMS-AI gateway (Twilio + Claude SMS line for low-literacy rural Haryana users). It is *not* the SMS the user sees — the model still has to compress every reply to the strict shape defined in `system-prompt.md` (≤300 characters Hinglish / ≤140 characters Devanagari, plain text only, mirror the user's script, no markdown, no jargon). This file is the model's internal "what to do when an SMS comes in describing emergency X" notebook.
>
> **Scope:** 60 of the highest-frequency, highest-mortality medical emergencies that present from rural and semi-urban Haryana — built around two grounding constraints: (a) what the patient at home actually has within reach (per `haryana-resources-context.md` — ASHA drug kit, kitchen items, charpai, chulha, polythene sheet, lota, chutki, haath measurements, etc.), and (b) what the Haryana health system can realistically deliver in time (per `haryana_medical_system.md` — ~76% specialist shortfall at rural CHCs, NCR-vs-Mewat divide, 108/102 ambulance variability, PGIMS Rohtak / KCGMC Karnal / SHKM Nalhar / Medanta / Fortis as the realistic referral nodes).
>
> **How to use:** When an inbound SMS matches one of the 60 cues, the model should (1) name the triage colour internally, (2) pick the 2–3 highest-yield "do RIGHT NOW" steps that fit the user's resources, (3) name the closest realistic facility from the medical-system file, (4) cite the relevant scheme by name, and (5) compress to the SMS micro-script shape. Anti-harm overrides in Section 7 are non-negotiable and must fire on sight regardless of what the user asks.

---

## 1. Why a per-emergency reference

The SMS gateway has roughly 300 Hinglish characters or 140 Devanagari characters per reply. That is not enough room to reason from first principles about a fresh emergency. The model must arrive at the SMS already knowing: which colour the case is, which 1–2 home actions are highest-yield, which scheme will pay, which facility to name, and which folk practice to override. This file pre-computes those answers for the 60 emergencies that account for the bulk of preventable rural mortality and morbidity in Haryana.

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
