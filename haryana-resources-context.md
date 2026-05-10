# Haryana Resources — Comprehensive Context Reference

> **Purpose:** Standalone reference document describing the physical resources, tools, supplies, medicines, and household objects realistically available to an *average person* (rural / semi-urban, low-to-middle income) in Haryana, India. The document is intended as load-in context for an AI assistant (SMS gateway) so that any advice given — medical, educational, construction, or improvisational — is grounded in items the user actually has within reach.
>
> **Assumed baseline user profile:** A villager or small-town resident in Haryana, household income ≤ ₹2 lakh/year, may own a basic feature phone or shared smartphone, primary occupation likely agriculture / small trade / daily wage / homemaking, Hindi or Haryanvi as first language, mixed literacy levels. The closest formal infrastructure is typically a Sub-Centre or Primary Health Centre within ~3–5 km, a government school within 1–3 km, and a small village market (haat) or kirana shop nearby.
>
> **How to use this document:** When the assistant needs to suggest a remedy, instrument, learning aid, building method, or improvisation, it should preferentially reference items in this list. If something is **not** in this list, the assistant should assume the user does not have it and suggest a substitute that **is** in the list. Items are flagged for **cross-context utility** (e.g., a salt pouch is medical *and* educational *and* construction-adjacent).

---

## 0. Quick Map — How an Average Haryana Household is Organized

A typical pucca-or-semi-pucca Haryana village household contains:

- **Aangan (courtyard):** Open-air central space, used for cooking in summer, drying grain, social gatherings, and children's play/study.
- **Baithak (sitting room):** Front room with charpais, used for guests and male socializing.
- **Rasoi (kitchen):** Often a small alcove with chulha (clay/mud stove) or LPG cylinder + single-burner stove.
- **Kotha / store room:** Grain storage in metal drums (peepa) or clay bins (bharola); also stores agricultural tools.
- **Cattle shed (gher / khurli):** Buffalo/cow housing with feeding trough; supplies dung (eendhan) for fuel and plaster.
- **Hand pump / shared tap:** Most rural households still rely on a hand pump (nalka) or shared standpost; some have a submersible pump.
- **Roof (chhat):** Often used for sleeping in summer; also for drying chillies, papads, dung cakes, and grain.

This physical layout matters: a recommendation to "boil water" assumes a chulha or LPG stove; "lay flat" assumes a charpai; "find shade" assumes the aangan or a tree.

---

## 1. Medical Resources

### 1.1 What Exists in the Public Health System (within reach of the average person)

Haryana's rural health architecture has three tiers, and the average villager can usually access at least one:

| Facility | Population served | Distance | Staffing | What they actually stock |
|---|---|---|---|---|
| **Sub-Centre (SC) / Health & Wellness Centre (HWC)** | ~5,000 | 1–3 km | 1 ANM + 1 MPW + Community Health Officer | Basic OTC drugs, ORS, IFA tabs, vaccines, BP cuff, weighing scale, contraceptives |
| **Primary Health Centre (PHC)** | ~30,000 | 3–8 km | 1–2 MBBS doctors, nurses, pharmacist | Essential Medicines List drugs, IV fluids, basic lab, normal delivery, minor surgery |
| **Community Health Centre (CHC)** | ~120,000 | 10–20 km | 4 specialists (Med, Surg, OBG, Paeds) | 30 beds, X-ray, surgical kit, blood storage, C-section capability |

> **Key calibration:** A 2015 study of Haryana public facilities found overall medicine availability around **51%**. Anti-hypertensives ~60% available, anti-diabetics ~47%. BUT *at least one drug* in each of these categories was nearly universally stocked: analgesics, antipyretics, anti-helminthics, anti-spasmodics, anti-emetics, anti-hypertensives, uterotonics. The assistant should assume "something for this category exists at the PHC" but not "the specific brand the user wants exists."

### 1.2 The ASHA Worker — The Average Person's First Medical Touchpoint

Every Haryana village of ~1,000 people has an **ASHA (Accredited Social Health Activist)**. She lives in the village, is trained in basic primary care, and carries a **standard drug kit** issued under the National Health Mission. Her kit reliably contains:

| Item | Use |
|---|---|
| **Paracetamol tablets (500 mg)** | Fever, body ache, headache |
| **Paracetamol syrup (paediatric)** | Fever in children |
| **ORS sachets (WHO low-osmolarity)** | Diarrhoea, dehydration, heat stroke |
| **Zinc tablets (20 mg dispersible)** | Adjunct to ORS in childhood diarrhoea (14-day course) |
| **Iron + Folic Acid (IFA) tablets** | Anaemia (very common in women); pregnancy supplementation |
| **Albendazole (400 mg) / Mebendazole** | Deworming, given annually to all children |
| **Chloroquine** | Malaria (where applicable) |
| **Cotrimoxazole (paediatric)** | Childhood pneumonia |
| **Misoprostol tablets** | Postpartum haemorrhage prevention (in some kits) |
| **Disposable Delivery Kit (DDK)** | Clean home delivery: blade, cord tie, soap, plastic sheet |
| **Pregnancy test strips (Nischay)** | Free urine pregnancy test |
| **Condoms / oral contraceptive pills (Mala-N)** | Family planning, distributed free |
| **Emergency contraceptive pill (Ezy-pill)** | Within 72 hours |
| **Sanitary pads** | Distributed free under the scheme for adolescent girls |
| **Bandages, cotton, antiseptic (Dettol/Savlon)** | Wound dressing |
| **Thermometer (digital or mercury)** | Fever measurement |
| **Weighing scale (Salter spring scale)** | Infant weight tracking |

**Assistant rule:** If a user describes a symptom that maps to an ASHA-kit item, recommend they ask their ASHA didi *by name of the medicine*. The ASHA distributes most of these **free**.

### 1.3 What's Typically in the Home Medicine Drawer (Self-Stocked)

These are over-the-counter staples bought at the village kirana / nearby chemist, present in most households:

- **Paracetamol** (Crocin, Calpol) — fever, pain
- **Disprin / aspirin** — headache (older generation default)
- **Combiflam** (paracetamol + ibuprofen) — body ache, period pain
- **ORS packets / nimbu-pani** — dehydration
- **Eno / Pudin Hara** — indigestion, gas, acidity
- **Digene / Gelusil** — antacid
- **Vicks VapoRub / Amrutanjan / Zandu Balm** — cold, congestion, body ache (extremely common, used for almost anything)
- **Boroline / Boroplus** — cracked skin, minor cuts, lip balm, multi-purpose
- **Iodex / Moov / Volini spray** — muscle pain, sprains
- **Dettol / Savlon** — antiseptic for cuts, also added to bath water
- **Burnol** — burn cream
- **Band-aid / cotton / gauze**
- **Saridon / Anacin** — headache
- **Avil / Cetirizine** — allergies, itching, sometimes used as sleep aid
- **Norflox-TZ / Metrogyl** — diarrhoea (often self-prescribed; problematic but ubiquitous)
- **Becosules / Revital** — multivitamin
- **Glucon-D / Electral** — energy, dehydration
- **Honitus / Benadryl cough syrup**
- **Eye drops** (Refresh Tears, Genteal — less common)
- **Glycerin** — chapped lips, ear cleaning, also used in school art

### 1.4 Traditional / Home / Ayurvedic Remedies (Universally Available)

Crucially, the average household relies heavily on these *before* reaching for OTC drugs. Every kitchen contains them, and the assistant should treat them as legitimate first-line options for minor complaints:

| Item | Common medicinal use |
|---|---|
| **Turmeric (haldi)** | Wound antiseptic (haldi paste), golden milk for cough/cold, anti-inflammatory |
| **Ginger (adrak)** | Tea for cough/cold/nausea; chewed for sore throat |
| **Garlic (lehsun)** | Hypertension, cold, ear infection (warmed in mustard oil → ear drops) |
| **Ajwain (carom seeds)** | Indigestion, gas, colic in babies (ajwain potli on belly) |
| **Jeera (cumin)** | Digestion; jeera-water for bloating |
| **Saunf (fennel)** | Digestion, breath freshener, lactation |
| **Methi (fenugreek seeds)** | Diabetes, lactation, joint pain |
| **Tulsi leaves** | Cough, cold, fever; tulsi-ginger-honey decoction |
| **Honey (shahad)** | Cough, sore throat, wound dressing |
| **Mustard oil (sarson ka tel)** | Massage for joint pain, ear drops (warmed), cooking, lamp fuel |
| **Coconut oil (nariyal tel)** | Hair, skin, minor burns |
| **Ghee (clarified butter)** | Burns (cool ghee), nasal lubrication (nasya), eye lubrication, cooking |
| **Salt (namak)** | Saline gargle for sore throat; salt-water rinse; ORS substitute (1 tsp salt + 8 tsp sugar + 1 L water) |
| **Sugar / Jaggery (gud)** | Energy, hiccups; gud is iron-rich, post-partum tonic |
| **Lemon (nimbu)** | Vitamin C, nausea, hand-cleaning; nimbu-pani for heat exhaustion |
| **Onion (pyaaz)** | Heat-stroke prevention (raw onion in pocket — folk practice but believed widely); cough poultice |
| **Aloe vera (gwarpatha)** | Burns, skin, hair; commonly grown in courtyard pots |
| **Neem leaves / twigs** | Datun (toothbrush); skin infections; chickenpox bath; insect repellent |
| **Tulsi-Giloy-Ashwagandha kadha** | Immunity (became universal post-COVID) |
| **Cow's urine (gomutra) / cow dung** | Folk antiseptic, religious-medical; cow dung paste for cooling fever (rare now but documented) |
| **Hing (asafoetida)** | Colic; rubbed on baby's belly with warm oil |

### 1.5 Government Schemes the Average Person Can Access

- **Ayushman Bharat — PM-JAY:** ₹5 lakh/year free hospitalization at empanelled hospitals (Antyodaya cardholders + low-income families). Most Haryana districts have empanelled private and government hospitals.
- **Chirayu Haryana:** State extension of Ayushman Bharat; covers families with annual income up to ₹1.80 lakh; ₹5 lakh cashless cover. Card is generated free.
- **Janani Suraksha Yojana (JSY):** Cash incentive (~₹700 rural) for institutional delivery.
- **Janani Shishu Suraksha Karyakaram (JSSK):** Free delivery, C-section, drugs, diagnostics, transport for pregnant women and sick newborns.
- **Pradhan Mantri Surakshit Matritva Abhiyan (PMSMA):** Free antenatal check-up on the 9th of every month at PHCs.
- **Mission Indradhanush:** Free childhood immunization (BCG, OPV, Pentavalent, MR, JE, etc.).
- **Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP):** Generic medicines at ~50–80% lower MRP at Janaushadhi Kendras (present in all Haryana districts).

The assistant should know these schemes by name and direct users to them when relevant.

---

## 2. Physical Instruments (Tools, Implements, Hardware)

### 2.1 Agricultural Tools — Owned by Most Rural Households

Haryana's economy is wheat-rice-dairy. Even non-farming families often have these because of casual labour or small kitchen gardens:

| Tool (Hindi/Haryanvi name) | Function | Why it matters cross-context |
|---|---|---|
| **Kasola / khurpi** | Small hoe, weeding | Improvised digging, gardening, mixing mortar |
| **Pharsa / kulhari** | Axe | Wood cutting, demolition, splitting bamboo for construction |
| **Drant / drati** | Sickle | Harvesting; can cut fabric, rope, vegetation |
| **Phawra / belcha** | Spade / shovel | Digging, mixing concrete/mortar, moving dung |
| **Khanti / sabbal** | Crowbar / iron pry bar | Digging hard soil, prying, breaking masonry |
| **Hal (plough)** | Wooden/iron plough (often tractor-drawn now) | Field prep |
| **Pors** | Seed drill (traditional) | Sowing |
| **Trangli / panja** | Pitchfork / rake | Hay, dung, leveling |
| **Sua / khurpi-cum-trowel** | Pointed weeder | Detail digging, planting saplings |
| **Tokri / kilta** | Wicker basket | Carrying grain, vegetables, building materials |
| **Bori / pallaa** | Jute / HDPE sack | Grain storage, sandbag, makeshift cushion, school bag |
| **Charkha / takli** | Spinning wheel / spindle (less common now) | Yarn making |
| **Gandasa / charas** | Fodder cutter | Chopping animal feed; sometimes self-defense tool |
| **Tractor + thresher** | Mechanized | Many small farmers do not own; they hire or share |

### 2.2 Carpentry & General Hand Tools — Found in Most Sheds

- **Hammer (hathora)** — claw hammer most common
- **Nails (keel)** — assorted iron nails, kept loose in a tin
- **Screwdriver (pench-kas)** — flat + Phillips
- **Pliers (plaas / sandasi)**
- **Adjustable wrench (pana)**
- **Hacksaw (aari)** — for wood and metal
- **Wood saw (lakdi ki aari)**
- **Chisel (chheni)** — for wood and brick
- **Measuring tape (fita)** — usually 3 m or 5 m
- **File (ratti)**
- **Drill (electric, hand)** — only ~30–40% of households; often borrowed
- **Sandpaper (regmaal)**
- **Spirit level (level pana)** — common in mason households
- **Plumb bob (saahool)** — string with weight, often improvised
- **String / twine (sutli, jeverdi from moonj grass)** — universal

### 2.3 Construction Tools (Mason / Mistri Households or Borrowed)

Most villages have a few mistri households who own these and lend or hire them out:

| Tool (Hindi) | English |
|---|---|
| **Karni / gurmala** | Trowel (brick-laying / plastering) |
| **Saahool** | Plumb bob |
| **Dori** | Mason's line / string |
| **Pana / level** | Spirit level |
| **Patti / bhata** | Float / rendering board |
| **Tagari / phatta** | Mortar pan / shovel |
| **Sabbal** | Crowbar |
| **Phawra** | Spade |
| **Ghan** | Sledgehammer |
| **Hathori** | Mason's hammer |
| **Saanchi** | Brick mould |
| **Karsola** | Mortar trough |
| **Tasla** | Round metal pan for carrying mortar/concrete |
| **Bansi / bamboo poles** | Scaffolding |

### 2.4 Lighting / Electrical / Power

- **LED bulb (5–9 W)** — replaced incandescents almost everywhere
- **Tube light**
- **Ceiling fan (pankha)** — near-universal in pucca homes
- **Table fan / pedestal fan**
- **Cooler (desert cooler)** — common; uses water + khus pads
- **Air conditioner** — minority of households, mostly urban
- **Inverter + lead-acid battery** — extremely common because of long power cuts (3–8 hrs/day in summers historically; better now)
- **Solar panel (small)** — rooftop, increasingly common under PM-Surya Ghar scheme
- **Solar lantern / torch** — distributed under various schemes
- **Mobile charger, multi-plug board, extension cord**
- **Emergency LED light (rechargeable)**
- **Torch (battery)** — D-cell or rechargeable
- **Diya (clay lamp), candles, kerosene lamp (dhibri)** — backup when power fails
- **Matchbox, lighter, bidi-cigarette lighter**

### 2.5 Cooking & Kitchen Instruments

| Item | Description |
|---|---|
| **Chulha** | Mud/clay or metal wood-burning stove; uses wood, dung cake, crop residue |
| **LPG cylinder + single/double burner stove** | Near-universal post-Ujjwala scheme |
| **Pressure cooker (Hawkins / Prestige)** | Daily use for dal, rice |
| **Tawa** | Flat iron griddle for roti |
| **Kadhai** | Wok for frying, sabzi |
| **Patila / bhagona** | Stainless steel pot |
| **Lota / glass** | Brass/steel water tumbler |
| **Thali, katori** | Plate, small bowl |
| **Chimta** | Tongs (for rotis on flame) |
| **Belan + chakla** | Rolling pin + board |
| **Sil-batta** | Stone grinder for chutneys (older households) |
| **Mixer-grinder (electric)** | Most households have one |
| **Mathani** | Wooden churn for buttermilk |
| **Matka / surahi** | Clay water pot — natural cooling |
| **Sieve (chalni), strainer (chhanni)** |
| **Steel storage canisters (dabba)** | For atta, dal, sugar, tea |
| **Bharola** | Large clay grain bin |
| **Peepa** | Tin/metal drum |
| **Kitchen knife (chaku)** |

### 2.6 Mobility / Transport

- **Bicycle (cycle)** — most ubiquitous; many children cycle to school
- **Motorcycle / scooter (Hero Splendor, Honda Activa)** — most common motorized transport
- **Tractor** — owned by ~10–15% of farming households; otherwise hired
- **Bullock cart (bel-gaadi)** — declining but still seen
- **Auto-rickshaw / e-rickshaw** — for last-mile to PHC, school, market
- **Shared jeep / Maruti van (sawari)** — village-to-town transport
- **Public bus (Haryana Roadways)** — backbone of intercity travel; women travel free under the Happy Card / state scheme

---

## 3. Educational Resources

### 3.1 What an Average Student Has at Home

| Item | Notes |
|---|---|
| **NCERT / SCERT textbooks** | Free for Class 1–8 in government schools under Samagra Shiksha; printed by SCERT Haryana |
| **HBSE textbooks (Class 9–12)** | Subsidized; available in district book depots |
| **Notebooks (copy / register)** | Branded (Classmate, Navneet, Sundaram, local) — bought from village stationery |
| **Slate (patti) + chalk (khadi)** | Still used in Class 1–2 in many schools |
| **Pencils (Apsara, Natraj, Doms)** |
| **Pens (Reynolds 045, Cello Linc, Parker — rare)** |
| **Eraser, sharpener (cutter), scale (foot ruler)** |
| **Geometry box (Camlin / Natraj)** | From Class 6 onwards: compass, divider, protractor, set squares |
| **Crayons / sketch pens (Camlin, Faber-Castell)** |
| **Paint box (water colours)** | Drawing in Class 4–8 |
| **School bag** | Usually a backpack; often a hand-me-down |
| **Tiffin box, water bottle** | Steel or plastic |
| **School uniform** | Free uniform under Samagra Shiksha for Classes 1–8 from low-income families |
| **Shoes (black canvas / leather)** |

### 3.2 What Every Government School Has (and the Student Can Access There)

Under Samagra Shiksha + RTE infrastructure norms, most Haryana government schools have:

- Classrooms with blackboard / sometimes whiteboard
- Chalk, dusters
- Teacher's table + bench/desk seating (or floor mats in primary)
- **Library** with story books, reference books, dictionaries (RTE mandate)
- **Science lab** in upper primary and secondary (basic glassware, magnets, models, microscope in some)
- **Mathematics kit** (Ganit Kit) — distributed under Samagra Shiksha; contains geometric solids, abacus, fraction kit, measuring tools
- **Maps and globes** — geography/social science
- **Sports equipment** — balls, ropes, kabaddi materials
- **Drinking water** — hand pump or RO (under JJM)
- **Toilets** — separate boys/girls (under Swachh Vidyalaya)
- **Mid-day meal kitchen** — ("Tithi Bhojan" in Haryana) — wheat, rice, dal, vegetables, eggs/fruit on certain days
- **ICT lab / Smart class** — ~40–50% of secondary schools have at least 1–2 computers and projector under PMeVidya / Samagra Shiksha
- **Smart Textbooks (BSEH initiative)** — from 2026–27, Maths/Science/English with QR codes linking to videos

### 3.3 Digital Educational Resources Reachable from a Basic Phone

These work even with low bandwidth and are *free*:

- **DIKSHA app** (national platform) — has SCERT Haryana content, video lessons in Hindi
- **e-Pathshala app** — NCERT textbooks + audio
- **SCERT Haryana "Meri e-Pustak"** — e-textbooks, audio, video
- **PM eVidya / SWAYAM Prabha TV channels** — Doordarshan free-to-air
- **YouTube channels** (Khan Academy Hindi, Physics Wallah, Unacademy free, Vedantu free, Magnet Brains, Study IQ)
- **WhatsApp** — primary medium for teacher-student-parent communication; homework, attendance, doubts
- **Saksham Haryana portal** — state's adaptive learning + assessment platform
- **AIR / community radio** — educational broadcasts in rural Haryana

### 3.4 Scholarships & Financial Aid (Materially Affects What a Family Can Afford)

- **Free textbooks + uniforms** for SC/ST/BPL/girls Class 1–8
- **₹2,000/year book allowance** for deserving SC students
- **Pre-Matric Scholarship (Class 1–10)** for SC/OBC/Minority — ₹140–₹510/month
- **Post-Matric Scholarship** — higher amounts, includes tuition fee, exam fee, maintenance
- **Mukhya Mantri Vidyarthi Parivahan Suraksha Yojana** — free bus pass for girl students
- **Saksham Yuva Yojana** — unemployment allowance + skill training for educated unemployed (12th pass to PG)
- **Free coaching for SC/OBC students** — for IIT-JEE, NEET, UPSC at state coaching centres

### 3.5 Higher / Vocational Education Access

- **Government ITIs** — 1–2 per district; trades: electrician, fitter, welder, COPA, tailoring, plumber
- **Polytechnics**
- **Government colleges** — at least one in every block for general degree
- **HSDM (Haryana Skill Development Mission)** — short-term skilling under PMKVY/DDU-GKY
- **Haryana Kaushal Rojgar Nigam** — gig/contract employment portal

---

## 4. Cross-Context Household Objects (Useful for Medical / Educational / Construction)

This is the most practically valuable section. These items exist in nearly every Haryana household and can be **repurposed** when the "proper" tool is unavailable. The assistant should reach for these when improvising.

### 4.1 Liquids & Powders Already in the Kitchen

| Item | Medical use | Educational use | Construction use |
|---|---|---|---|
| **Salt (namak)** | ORS, gargle, wound cleaning | Ice freezing demos, crystallization experiments, density jar | De-icing (rare), preserving wood |
| **Sugar / jaggery (cheeni / gud)** | ORS, energy in hypoglycaemia, cough syrup base | Crystallization, density layers, baking projects | – |
| **Turmeric (haldi)** | Antiseptic paste, anti-inflammatory | Natural dye, indicator (turns red in alkali!) — pH lessons | Wood staining |
| **Lime / chuna** | Calcium supplement (small qty), anti-acid (paan use) | Whitewash for blackboard improv, chemistry — neutralization | **Whitewashing walls, mortar plasticizer, cement additive** |
| **Baking soda (meetha soda)** | Antacid, mouth ulcer rinse, ant bite | Volcano experiment, fire extinguisher demo, cleaning | Cement set retarder, mild abrasive |
| **Vinegar (sirka)** | Lice, mild antiseptic | Acid-base experiment, indicator | Cleaning rust, descaling |
| **Mustard oil** | Massage, ear drops, lamp fuel | Floating-density demos | Wood preservative, lubricant for hinges |
| **Ghee / coconut oil** | Burn, dry skin, nasya | – | Greasing tools, lubricating squeaky hinges |
| **Flour (atta) + water** | – | Modeling clay (atta-dough), papier-mâché | Glue substitute, gap filler |
| **Cow dung (gobar)** | (folk antiseptic) | Fuel for outdoor cooking demos | **Plaster (gobar-mitti lipai), mosquito-repellent floor coating, bio-gas feed** |
| **Ash (rakh)** | Tooth powder, dish scrub | – | Soil amendment, traditional water filter layer |
| **Charcoal (koyla)** | Tooth powder, water filter, poison adsorbent (folk) | Drawing/sketching, fuel | Forge fuel |
| **Glycerin** | Chapped lips, ear softener, cough syrup base | Slime making, soap science | – |

### 4.2 Cloth, Paper, Container

| Item | Medical | Educational | Construction |
|---|---|---|---|
| **Old cotton sari / dupatta / dhoti** | **Bandage, sling, tourniquet, gauze, baby wrap, fever compress** | Puppet, school project drape | **Curing concrete (wet cloth), straining lime wash, scaffold padding** |
| **Newspaper (akhbar)** | Splint padding, cleaning surface | **Reading practice, wrapping books, papier-mâché, kite, paper boats** | Window stuffing for insulation, painter's drop cloth |
| **Cardboard (gatta) / shoe box** | Splint for fracture | **Geometry shapes, models, chart stand** | Temporary partition, knee-pad, template |
| **Plastic bottle (1–2 L)** | **Improvised IV-drip bottle in emergencies, hot-water bottle, ORS measure** | **Funnel, water-rocket, plant pot, density jar, lung model** | **Drip irrigation, level-tube (water level over distance), paint scoop** |
| **Steel tumbler (lota)** | Water boiling, vapor inhalation | Measuring volume (~250 ml) | Mortar mixing scoop |
| **Steel plate (thali)** | – | Solar cooker reflector, mirror, geometry circle template | Mortar mixing surface |
| **Polythene sheet (poly bag)** | **Wound coverage to keep dry, rain protection, gloves in pinch** | – | **Vapor barrier, concrete curing cover, waterproofing under floor** |
| **Jute sack (bori)** | Heat retention | School bag improv, sitting mat | **Sandbag, scaffold padding, concrete curing wrap** |
| **Mosquito net** | **Malaria/dengue prevention, wound covering from flies** | – | Sieve for sand grading |
| **Rope (rassi, jeverdi)** | Tourniquet (last resort), pulley for lifting injured | Skipping rope, art project | **Plumb-line (with weight), measuring distance, scaffold tying, lifting tool** |
| **Bamboo pole (bans)** | Walking stick, splint | Teaching aid (pointer, flagpole) | **Scaffolding, ladder, formwork, fence post** |
| **Brick (eent)** | – | Counting, weight standard | Construction; also a step, doorstop, weight |
| **Bucket (balti)** | Sponge bath for fever, ORS prep | Volume measurement | **Mortar mixing, water hauling for curing** |
| **Mug (mug)** | Pouring water for delivery cleanup | Volume measure | Pouring water on cement |

### 4.3 Heating & Boiling — Critical for Medical Hygiene

The single most important medical capability of any household is **the ability to boil water**, which makes water safe and equipment sterile. Every Haryana household has at least one:

- Chulha (wood / dung / crop residue)
- LPG stove
- Kerosene stove (some)
- Electric induction (urban / pucca homes)
- Solar cooker (rare but distributed under various schemes)

Therefore the assistant can always recommend: "boil water for 5 minutes," "rinse the cloth in boiled-and-cooled water," "sterilize the blade by holding it in flame."

### 4.4 Measurement (when the user does not own a measuring tool)

Average household reference standards the assistant can use:

- **Adult finger width** ≈ 1.5 cm
- **Adult palm width** ≈ 8–9 cm
- **Adult forearm (haath)** ≈ 45 cm (one "haath" is the traditional Haryanvi unit)
- **Foot length** ≈ 25 cm
- **Steel glass (lota)** ≈ 200–250 ml
- **Tea cup** ≈ 100–150 ml
- **Tablespoon** ≈ 15 ml (medical dosing)
- **Teaspoon** ≈ 5 ml
- **Pinch (chutki)** ≈ ⅛ tsp ≈ 0.5 g
- **Brick (standard)** = 230 × 110 × 70 mm; weight ~3 kg — useful as standard weight
- **A4 paper** ≈ 21 × 29.7 cm — universal ruler if folded

### 4.5 Communication / Information Devices

- **Feature phone (Nokia-style)** — SMS, calls, FM radio, basic torch
- **Smartphone (entry Android)** — shared in family, often the parent's
- **Television** — DTH (Tata Sky, Dish TV, DD Free Dish) — universal; carries DD Kisan, DD National, regional educational channels
- **Radio (AIR Rohtak / Kurukshetra / FM stations)**
- **Newspaper** (Dainik Jagran, Dainik Bhaskar, Haryana editions)
- **Loudspeaker on temple/gurudwara** — village announcements, often used for health drives
- **Anganwadi notice board** — VHND dates, immunization schedule

---

## 5. What the Average Person Likely DOES NOT Have (Important Negative Space)

The assistant must not assume access to:

- **A working car** — unless explicitly stated
- **A refrigerator that works during power cuts** — many have one but it's offline 4–8 hrs/day
- **Continuous internet** — data is rationed; "WhatsApp works" but "uploading a video might fail"
- **A printer / scanner** at home
- **Disposable gloves, surgical masks (in non-pandemic times)**
- **Glucometer, BP machine** — present in diabetic/hypertensive households only (~15–20%)
- **Pulse oximeter** — became more common post-COVID (~30%)
- **Specific brand-name OTC medicines** — generic substitutes are dominant
- **Hot water on tap** — geyser is uncommon outside pucca urban homes
- **A car / two-wheeler in working condition at night** — many are kept off-road after dark
- **Western toilet** — Indian-style squat toilet is more common
- **Western measuring tools (oz, lbs, °F)** — always use metric (g, kg, ml, L, °C, cm, m)
- **English literacy** — assume Hindi/Haryanvi default; medication names are read in English script but pronounced in Hindi
- **A second adult at home during the day** — many men are away as labour; many decisions must be made by the woman alone

---

## 6. Operational Rules for the AI Assistant

When using this document, the assistant should:

1. **Always prefer items in this list** over fancy or imported alternatives. Suggest "haldi paste on the cut" before "betadine."
2. **Layer recommendations:** First, what they can do RIGHT NOW with what's in the kitchen / charpai-side; second, what to ask the ASHA for (free); third, what to buy at the kirana / chemist (≤ ₹50); fourth, when to go to the PHC; fifth, when to go urgently to the CHC / district hospital.
3. **Use Hindi/Haryanvi names** alongside English: "drant (sickle)," "haldi (turmeric)," "saahool (plumb bob)." This builds trust and is unambiguous over SMS.
4. **Default to metric and to local measurement (haath, lota, chutki)** when no tool is owned.
5. **Assume low bandwidth** — give concise, action-first instructions. SMS character economy matters.
6. **Assume the message is read aloud to a less-literate listener** in many households — keep numbers and steps clean.
7. **Name the ASHA, the Anganwadi worker, and the PHC** as concrete trusted resources whenever a question crosses a basic-care threshold.
8. **Never recommend self-prescribing antibiotics** even though the village kirana sells them; redirect to the PHC.
9. **For construction/DIY questions**, default to mud-brick, lime, bamboo, and salvaged materials before suggesting cement, steel, or imported tools — both are valid in Haryana, but the cheaper option is often the right starting suggestion.
10. **For educational questions**, point to DIKSHA, SCERT Meri e-Pustak, and DD Free Dish channels — all free, all reachable from a basic Android phone.

---

## 7. Sources

- Health Department, Government of Haryana — https://haryanahealth.gov.in/
- National Health Mission, Govt. of India — ASHA Drug Kit guidelines — https://nhm.gov.in/index1.php?lang=1&level=2&sublinkid=177&lid=250
- "Availability of medicines in public sector health facilities of two North Indian States," BMC Pharmacology and Toxicology, 2015 — https://pmc.ncbi.nlm.nih.gov/articles/PMC4690305/
- National Health Systems Resource Centre — Essential Medicines List (HWC, SHC, PHC) — https://nhsrcindia.org/essential-medicines-list-hwc-shc-phc
- "Traditional Agricultural Tools of Haryana, India" — academia.edu archival paper
- Vernacular Furniture of India — Haryana — https://vernacularfurnitureofindia.com/states/haryana/
- Dastkari Haat Samiti / Google Arts & Culture — Charpai-making in Haryana
- SCERT Haryana — Textbooks and Saksham resources — https://scertharyana.gov.in/
- Board of School Education Haryana — https://bseh.org.in/ebooks
- Department of Elementary Education, Haryana — https://harprathmik.gov.in/
- Samagra Shiksha Haryana — official portal
- PM POSHAN (Mid-Day Meal) — https://pmposhan.education.gov.in/
- Tata Steel Aashiyana — Local Construction Materials of India — https://aashiyana.tatasteel.com/in/en/blogs/articles/guide-local-construction-materials-india.html
- Homegrown — Haryana mud-and-bamboo home documentation
- Gharpedia — Masonry tools reference — https://gharpedia.com/blog/40-masonry-tools-used-in-masonry-work-of-your-home/
- Ayushman Bharat / Chirayu Haryana — official scheme guidelines

---

## 8. File Metadata

- **Path:** `/Users/philipmocanu/HackDavis/haryana-resources-context.md`
- **Created:** 2026-05-09
- **Companion file:** `haryana-education-context.md` (in the same directory) — covers the schooling system in deeper detail.
- **Suitable for:** loading into the SMS gateway's system prompt, or chunked retrieval against user queries.
