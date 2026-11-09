# Portfolio Gallery: Project Handoff

Read this before doing anything. It captures every decision, constraint, and piece of content gathered so far, so you don't need to redo the research.

**Owner:** Casey Robinson, UX designer (~10 years). Focus areas: interaction models, edge cases, state transitions, microcopy, scalable system behavior.
**Working style:** Casey wants a real collaborator. Propose options and **get a yes before making design decisions or generating new files**. Keep communication casual and direct, with no fluff and no em dashes.

---

## 1. Vision

A portfolio site that flexes three things at once: **coding ability, creative use of AI, and design thinking**.

The concept is a **walkable 3D art gallery in the browser**. Visitors explore a beautiful, AI-generated gallery space. Each project is an exhibit room. Walk through a doorway and you're inside the project, where it plays out as a **choose-your-own-adventure**: the visitor makes the same design calls Casey made, and each branch shows what happened and why.

Why this works:
- 2026 hiring discourse says AI skills are table stakes, but **judgment** (knowing when *not* to use AI) is what stands out. Here, AI generates the space, and Casey hand-builds the interactions and writes the stories.
- 3D gallery portfolios are a crowded genre (Three.js tutorials, templates, even "turn your portfolio into a 3D gallery" products). What differentiates this one: AI-generated photoreal architecture, **rooms shaped like the work itself**, and the decision-driven adventure inside each room.
- The adventure format proves design reasoning, which polished AI-generated case studies can't fake.

---

## 2. Decisions made (and why)

| Decision | Choice | Rationale |
|---|---|---|
| Engine | **PlayCanvas** (open source, MIT) | The leader in web Gaussian splatting. Its compute-based WebGPU renderer (Engine 2.19+) streams huge splat scenes with near-instant load at 60fps. WebGPU reaches ~85% of users, and the rest fall back to WebGL 2 automatically. |
| Rejected: Unreal Engine 5 | No | No official browser target since UE 4.24. Pixel Streaming costs a GPU server per concurrent visitor and adds latency. Third-party WebGPU ports only serve high-end hardware and stream to everyone else. |
| Rejected: Unity 6.6 | No | WebGPU is now supported, but builds are heavy and WebGL 2 is still the default. Too slow for recruiters skimming on phones. |
| Considered: Babylon.js 9 | Backup option | Great lighting (clustered, volumetric) and rebuilt splat support. Revisit if we need dramatic lighting effects PlayCanvas can't do. |
| Environment rendering | **Gaussian splats** for architecture, **light meshes** for interactive exhibits | Splats give photoreal visuals at small file sizes. Meshes keep exhibits crisp, clickable, and animatable. |
| Splat generation | **World Labs Marble** | Generates navigable 3D worlds from prompts or images. Exports SPZ/PLY splats plus a collider mesh. Renders in Three.js via Spark, and SPZ loads fine in PlayCanvas. |
| World structure | **One small splat per room, connected by portals** | Marble splats break down at anything larger than a small room. Portals also mean visitors only download the rooms they enter. |
| Spike hall | **Code-built geometry placeholder** | Don't block on Marble. Swap in generated splats later. |
| Scannability | **Scan mode toggle** on every room and at the top level | Hiring managers often spend only minutes on a portfolio, frequently on phones between meetings. Scan mode gives them a clean 2D case study of the same content. It doubles as the accessibility path. |
| Mobile | **Touch controls**, plus scan mode | Visitors can explore in 3D or flip to scan mode. |
| Hosting | Vercel (Casey has it connected) | Preview deploys for review. |

---

## 3. Experience architecture

```
[Landing / Entry Hall]  ─── persistent "Scan mode" toggle (top right)
   │
   ├── Doorway A → [Places Room]           (fully playable adventure)
   │
   └── Doorway B → [Records Search Room]   (teaser: scan mode only for the spike)
```

### Global UI
- **Scan mode toggle**, always visible, with clear labeling (e.g. "Quick read" / "Explore"). It preserves context: toggling inside the Places room opens the Places case study, not the homepage.
- **Teleport / room menu** so nobody is forced to walk.
- **Loading states:** show progress per room, and show the scan-mode version instantly while the splat streams.
- **First-run hint** for controls, keyboard and touch, dismissible.
- Respect `prefers-reduced-motion`: swap camera fly-throughs for fades.

### Portal transitions
- Walking into a doorway triggers a transition (fade or a portal effect), unloads the current splat, and loads the next.
- Preload the next likely room once the visitor is idle in the hall.
- Each room has a spawn point and a "back to hall" exit.

### Quality tiers
- Marble exports ~2M-splat (max quality) and ~500K-splat (lightweight/mobile) SPZ variants.
- Detect the device and serve the light tier on mobile or low-end GPUs. Use PlayCanvas splat budgets and LOD (global splat budget since v2.17, target/limit budgets in v2.23).
- PlayCanvas **SplatTransform** (open-source CLI) can convert formats and generate collision data if needed.

### Controls
- Desktop: WASD plus mouse look (pointer lock), or click-to-move. Shift to run.
- Mobile: virtual joystick on the left and drag-to-look on the right, or tap-to-move.
- Collision: use Marble's collider mesh (GLB) once splats arrive. For the placeholder hall, use simple box colliders.

---

## 4. Spike scope (build this first)

1. Entry hall (code geometry placeholder) with two labeled doorways.
2. **Places room**: fully playable adventure (script in Section 6).
3. **Records Search room**: teaser doorway that opens scan mode only (copy in Section 7).
4. Scan mode for both projects.
5. Mobile touch controls.
6. Deploy a preview to Vercel.

**Done when:** it loads fast on a mid-range laptop and a phone, you can walk the hall, enter Places, play all branches, and toggle to scan mode anywhere.

**Order of work:** (1) Casey approves the Places script and room layout. (2) Scaffold the PlayCanvas project and hall. (3) Places room interactions. (4) Scan mode. (5) Mobile. (6) Deploy.

---

## 5. Room design concepts

Rooms are shaped like the project, so the space explains the work before anyone reads a word.

| Room | Spatial concept |
|---|---|
| **Entry hall** | Calm contemporary museum. Pale polished concrete, tall white walls, linear skylight, warm daylight. Empty walls, because exhibits are mounted as meshes. |
| **Places** | The floor is a giant world map. One corner is dense and rich ("Rome"), another is nearly empty ("a remote village"). That makes the core design problem physical: one interface has to work for both. |
| **Historical Records Search** | Starts as an overwhelming cockpit: switches, gauges, dozens of controls. It simplifies down to three calm inputs: Name, Place, Year. |
| Future rooms | Zion (a component library as a "parts warehouse"), Registration (a branching-paths maze of edge cases), Lucid work (to be defined; currently missing from the portfolio entirely). |

---

## 6. Places adventure script (DRAFT, needs Casey's approval)

Rewritten from Casey's old case study. Numbers date from the 2018 to 2020 beta period. **Casey should verify all figures and the framing before publishing.**

### Intro panel
> **FamilySearch Places**
> A living map of every place on Earth, and how each one changed over time. Names shift, borders move, languages and scripts multiply.
> You're the only designer on it. From first concept to shipped product, every call is yours.
> Let's see what you'd do.

### Decision 1: One interface, wildly different data
> A place page might hold a dozen kinds of data: names in other languages and scripts, historical periods, place type, research links, a timeline, a summary, related places, sources, map location, a confidence rating. Some places also have population, elevation, and cultural data.
> Rome has all of it. A remote village in Zambia has almost none. **One layout has to work for both.**
> How do you organize it?

**A. Accordions.** Collapse each category and let people expand what they need.
> *What happened:* Too rigid for this much variety. Dense places became a wall of closed boxes, and sparse places looked broken and empty.
> → [Try another approach] [See what shipped]

**B. Horizontal tabs.** One tab per data category.
> *What happened:* Fine on desktop, nearly unusable on mobile. Casey's own takeaway: not designing mobile-first was the mistake.
> → [Try another approach] [See what shipped]

**C. A scrollable feed of cards.** ✅ *Shipped*
> Six cards: Basic Information, Historical Information, Research Links, Related Places, Alternate Names, Sources. Big data sets get "show more / show less." Sparse places show everything at once, and **cards with nothing useful simply don't appear.**
> *What testing showed:* People were happy to scroll a longer page, as long as information was where they expected it.
> [Show: sparse place vs. dense place, side by side]
> → [Next decision]

### Decision 2: The search box that does everything
> The backend can search by name, region, place type, date range, and a latitude/longitude radius. Engineering's instinct: put every option in the UI.
> What do you do?

**A. Expose it all in an Advanced Search panel.**
> *What happened:* People typed "Orange County" into the main search field instead of finding the "Places within" filter. Worse, some combinations made no sense together. Text search targets one place, while "places within" returns many. Boundary search and radius search overlap. The advanced panel had become **a junk drawer for features nobody had thought through.**
> → [Try another approach] [See what shipped]

**B. Map every search method against real use cases, and against each other, before designing anything.** ✅ *Shipped*
> A matrix of every criterion vs. every user goal showed which combinations were useless. Cutting those shrank Advanced Search dramatically, and each remaining feature got a natural home. **The lat/long radius became a click on the map.** Type, year, and "places within" each got their own spot.
> [Show: the hand-drawn matrix photo]
> → [Next decision]

### Decision 3: The data problem
> A map of the world's places needs an enormous amount of data. FamilySearch has 5 full-time employees collecting it. At that pace, it would take decades.
> How do you get the data?

**A. Grow the data team.**
> *What happened:* Far too expensive for the project's constraints.
> → [Try another approach]

**B. Buy large datasets.**
> *What happened:* Also expensive, and didn't fit the constraints either.
> → [Try another approach]

**C. Turn the product into the data-collection tool. Let passionate volunteers add and edit places.** ✅ *Shipped*
> The same app that serves discovery doubles as a data-management console for volunteers, with one consistent experience for readers and editors.
> → [See the impact]

### Ending: Impact
> Volunteers produced roughly the output of **25 full-time data-entry employees.**
> Projected first-year savings: **about $2.5 million**, and expected to grow after launch.
> *(Casey's role: sole designer. Concept, market analysis, product strategy, research and testing, UI design, and shipping across disciplines.)*
> → [Back to the hall] [Read the full case study]

### Branch mechanics
- Wrong answers aren't punished. They show the real consequence (often an approach Casey actually tried) and offer "try another" or "see what shipped."
- Track which branches the visitor explored, so the end can say: "You explored 5 of 7 paths."
- Keep the full run to 2 to 3 minutes.
- **All copy is authored. Never have AI improvise facts about Casey's work.**

### Places scan mode (2D case study)
- **Title:** FamilySearch Places
- **One-liner:** A data-rich web app mapping the world's places and how they changed, built to work for both Rome and a village with almost no data.
- **Role:** Sole designer, from concept through ship
- **Three problems:** interface flexibility, search complexity, robust data collection
- **Three decisions:** card feed over accordions and tabs; matrix-driven search simplification; volunteer crowdsourcing
- **Impact:** ~25 FTE-equivalent output; ~$2.5M projected first-year savings (beta)
- **Visuals:** hero, sparse vs. dense place, search matrix, simplified search

---

## 7. Historical Records Search teaser (scan mode only)

- **Title:** Historical Records Search
- **Hook:** New users said the old search felt like being dropped into a spacecraft pilot's seat with no training.
- **Context:** FamilySearch's flagship and most-used product, with hundreds of thousands of daily users. No significant redesign in nearly a decade.
- **Role:** The only designer on the search team, owning the work from research through completion. Also architected **Polaris**, a strategy to unify FamilySearch's many search products into one ecosystem. This redesign was its first concrete step.
- **The tension:** Power users are few but contribute most of the content, so keeping them productive is a business priority. New and casual visitors get overwhelmed and leave.
- **The decision:** Cut the search form to **three optional fields: Name, Place, Year**, the ones that produce good results and that people can actually recall. Dozens of advanced options moved behind one "more options" control that opens a **side sheet**, so experts keep full control without cluttering results.
- **Visuals:** before/after for landing page, search results, and record preview, plus the advanced-options side sheet.
- **Note:** The old page has no quantified results. Ask Casey whether any metrics exist.

---

## 8. Marble / World Labs generation

### Constraints learned
- Splats degrade beyond roughly one room's worth of space, so generate **one room per world**.
- **Chisel** (the 3D layout blocking tool) is **desktop only**. Mobile Marble doesn't support creating from 3D structures.
- **Export requires a paid plan.** Standard covers SPZ/PLY splats, panoramas, and collider meshes, which is all we need. Pro is only for HQ GLB meshes and commercial rights.
- Draft generations cost roughly $0.12 to $0.20 each, and full Marble 1.x worlds about $1.20 to $1.28. Iterate on drafts first.
- Studio can compose multiple worlds, and Expand fixes low-fidelity regions. Both are worth trying, but expect seams.

### API route (preferred, avoids the UI)
- Casey creates an API key on the World Labs Platform (signs in with his Marble account). Store it in `.env` as `WORLDLABS_API_KEY`. **Never commit it.**
- Docs: https://docs.worldlabs.ai/api (endpoint reference: `worlds:generate`; models seen in the docs include `marble-1.1` and `marble-1.0-draft`). **Verify the current endpoint, models, and request schema against the docs before calling.**
- Inputs: text, a single image, multiple images (direction control), panorama, or video. **Image prompts give the most control** without Chisel.
- Export per room: SPZ high-res, SPZ low-res, collider mesh.

### Room prompts (starting points, need Casey's approval)
Keep walls empty: no artwork, no people, no text. AI-generated art and lettering look mushy up close, and exhibits get mounted as meshes.

- **Entry hall:** *Vast contemporary art museum hall, polished pale concrete floor, tall white plaster walls, long linear skylight with soft warm daylight, two tall open doorways, minimalist architecture, empty walls, no artwork, no people, no signage*
- **Places room:** *Square gallery room with a large inlaid world map covering the entire floor in muted brass and stone tones, high white walls, soft overhead daylight, quiet and expansive, empty walls, no people, no text*
- **Records room:** *Retro-futuristic spacecraft cockpit interior, dense banks of switches, gauges and glowing panels, dramatic low light, cinematic, no people, no readable text* (pair it with a calm "after" state, built as meshes or a second splat)

Keep the art direction consistent across rooms: palette, light temperature, material language.

---

## 9. Full content inventory (old portfolio)

Source: https://robinsoncreative.wixsite.com/portfolio (Wix, ~2020 to 2021). The GitHub repo `caseymrobinson/portfolio-old` only has empty Velo code stubs, so **all content lives on the live site.**

**Images:** Strip Wix transform params. `https://static.wixstatic.com/media/<ID>` returns the full-resolution original (verified, downloads work).

**Gap:** Nothing from Casey's current Lucid work is on the old site. It's the biggest content gap for the real portfolio.

**Bio (old):** UX and product designer. Human-centered products come from research, design, and empathy. Good design should leave users feeling their lives improved in a concrete way.

### Historical Records Search (strong) · /historical-records-search
Facts are in Section 7. Images (`0578d1_` prefix):
- Hero: `0578d1_f8e5894efdcc43b6b2bd905c53c0bf7a~mv2.jpg`
- Before, landing: `0578d1_212b4c680aee48f496ad74181c75c0dd~mv2.png`
- Before, results: `0578d1_c01ac950f5674ef9a7317570560aec7d~mv2.png`
- Before, record preview: `0578d1_b4070642d8254ae7950edd235a9922b5~mv2.png`
- After, landing: `0578d1_46243850d3ae47b4a40412149e58630c~mv2.jpg`
- After, results: `0578d1_f83bd378c7db44708e24e5374b45c088~mv2.png`
- After, record preview: `0578d1_57bba1b23af8435cb525b0b74de3b797~mv2.png`
- Unlabeled (after section): `0578d1_33112434ca374332ba7e7e7c66fe346b~mv2.png`
- Advanced options side sheet: `0578d1_1a2f8825b8264098833a7ff921404ed1~mv2.png`

### Places (strongest) · /places
Facts are in Section 6. Images:
- Hero banner: `0578d1_ce1cda58b8ea476e9253ec241301687f~mv2_d_4096_1632_s_2.jpg`
- Overview frame: `0578d1_2860001966944c688cdc1c3ba5dccca9~mv2_d_4941_3296_s_4_2.jpg`
- Simplified search: `0578d1_ba2b76c8518c4a8f9bfad1ce0ef13410~mv2_d_2017_1339_s_2.png`
- Search criteria matrix (whiteboard photo, Aug 2018): `0578d1_d271b4ed02174710931bdf837d8433c2~mv2_d_4048_3036_s_4_2.jpg`
- `83dc549c2c3f41548f8556ffcc9ee8c2.jpg` is likely a Wix stock image (it also appears on Fortify). Skip it.
- **Missing:** the "sparse place" and "dense place" example images. Their captions exist but the URLs didn't come through, probably because they're in a slideshow. Get them from Casey or via the Wix MCP media manager (site ID `11bf028a-d054-431d-af17-5c4ae4b4063d`).

### Zion Design System (medium) · /zion-design-system
- Casey pioneered much of FamilySearch's design system "Zion" and was promoted to design authority over its implementation.
- Designed ~25% of the components early on. Led a team of 4 designers to build a large Figma component library mirroring the React components. Some components had hundreds of variants, and text fields and list items had over 1,000 each.
- Built a tracking process to keep Figma in sync with code. Ran trainings and built a hands-on sandbox tutorial, which is also used for new-hire onboarding.
- Became Zion lead: oversees new components and co-wrote the design review guidelines. Reviews are required before handoff and before shipping. Attendees: the designer, their lead, a Zion lead, the PM, a developer, and Zion's lead developer.
- Outcome: designers build mocks in minutes instead of days. Accessibility is built in (contrast, screen readers, large hit areas).
- Open questions the team wrestled with: how much flexibility designers need, getting buy-in, when to say yes or no, designing a general component without knowing every use.
- Images: hero `0578d1_d61c098430ee471288a1e7ce92f05b5b~mv2.jpg`. Figma library: `0578d1_b843e5dd2a694be7a4d9cad309473c0d~mv2.png`, `0578d1_33f8ad59ae65457da028b65ffb6bd92d~mv2.png`, `0578d1_261bcf56233a4e4e907cc16de54dfc75~mv2.png`, `0578d1_196b8cf08b8344ebb694772c8d0df9b0~mv2.png`. For developers: `0578d1_3146ce8d77984930ac946edc6317a58a~mv2.png`, `0578d1_56174120b49c421bb1fbae858e505044~mv2.png`

### Registration (strong story, tricky to show) · /registration
- Sole product designer in the re-architecture of FamilySearch's identity service. Redesigned Sign In, Registration, Account Recovery, and Account Settings on a new backend and front end.
- ~50,000 sign-ups per week, millions per year, and many had a poor first experience.
- Edge cases: different flows for church members vs. non-members (joining, leaving, deceased members, workforce security, sensitive membership questions). **Users 12 and under:** child privacy laws limit age verification and parental consent, and the only compliant flow that worked was a confirmation link sent to the parent. The team **removed email/SMS verification for all users**, which cut steps and was backed by data.
- Organizational dependencies: the identity store was synced with a separate church identity store, so changes needed sign-off from legal, security, privacy, and marketing in both orgs.
- Research: funnels for each flow, daily step counts, early and frequent user testing, qualitative feedback, whiteboard synthesis. Flow B was often chosen deliberately over the default Flow A, which revealed A's problems.
- No final UI screenshots. Lots of research artifacts. A great "edge cases" story, but it needs care around the membership topics.
- Images (`0578d1_` prefix): hero `b208ce60f1d54a02ade28d75db9b9a75~mv2_d_2546_1682_s_2.png`; mockups `e7976bbffc4c4815a5657fa9ac7c0ae1~mv2_d_1920_1280_s_2.jpg`, `fb558f6852dd47e9bb4e3d7730de3ebf~mv2_d_1920_1319_s_2.jpg`, `d05d23c8c9f0409eb5ebbfc8a928cdc2~mv2.png`; funnels: non-member `26fc4bfd7c584e9dadbcd27695cb86ba~mv2.png`, member `ac65e02b9ef1431aaef6172e3ee4b3d1~mv2.png`, under-13 `d03840c39fd24a4a96c5ff3d1ee7c753~mv2.png`, daily counts `1bb6634f75324d1ea61e3b28eb3be9c9~mv2.png`; qualitative `7f29f5b4b76343ac80af5a3653a84406~mv2_d_1492_1424_s_2.png`; Flow A vs. B `a9c9183be9804312b67d78c8fb14d201~mv2.png`; whiteboard `05ff6395957f4ff389fe6166355d9e8e~mv2_d_3200_2400_s_4_2.jpg`

### Fortify / Lift / Turn (medium) · /fortify
- Sole designer at a startup (Impact Collective), redesigning three sister recovery apps across iOS, Android, and web. Lift covers anxiety and depression, Turn covers substance use, and Fortify covers compulsive sexual behavior.
- Problems: new users overwhelmed, confusing home messaging (read as random feature promos instead of daily tasks), dated brand.
- Solutions: an ordered daily task list of science-based activities with check-offs for progress; out-of-app activities (like real connection) that users check off to build habits; a rebrand from a hard-edged "beat this addiction" tone to peace, freedom, and fulfillment, with overlapping translucent curves suggesting breath.
- No metrics.
- Images (`0578d1_` prefix): hero `1d5c324e24814b2da4b18f59d5850d9d~mv2.png`; mockups `0b4a0006adab4116a5419078a6c603de~mv2_d_1920_1440_s_2.jpg`, `e308059cb21343efb458af78a11e2625~mv2_d_1920_1285_s_2.jpg`, `26b745a929d34b0d9ab5f49d95fa31d3~mv2.png`; old home `31a2127ccce84229afff6fbc282cd0c3~mv2.png`; new home `ace03fd6216a426385edf4170ef41309~mv2.png`

### Record Details (thin) · /basic-01
- A high-traffic, data-dense FamilySearch page (record info plus actions). The old design lacked information architecture and typographic hierarchy. The redesign fixed hierarchy, improved workflows, and clarified actions.
- Images: `0578d1_340b29b1a9524dd6bf734272931cc043~mv2.png`, `0578d1_150906a727274a5fa6619825539b2e08~mv2.png`

### Polaris Search (stub) · /projects-3
- Named after the North Star. FamilySearch had dozens of products and databases, and users had to know which one to search. Polaris proposed one search that returns results across all products. The page is a "stay tuned" placeholder.
- Image: `a3c153_6f27754e06844d62a1708b316797fc08~mv2.jpg` (different account prefix, possibly stock)

### Other Projects (grab bag) · /other-projects
1. **FamilySearch Sign In:** redesign that rotates 1 of 10 value-proposition images and messages based on the referring page. Images: before `0578d1_ecd6dcf7672948a68e35c0d37cd901cb~mv2_d_3888_2216_s_2.png`, after `0578d1_fe1a2b41c38e46e68577ec96264d1daa~mv2_d_2880_1892_s_2.png`, desktop `0578d1_a191f20a256a47d3b83e501b77e22bc5~mv2_d_2880_1892_s_2.png`, `0578d1_9ac44d6052da4f56a247ba5c23b4dda8~mv2_d_2880_1892_s_2.png`, tablet `0578d1_c9e3e318b9fe41a5b8bfb30d7826a60d~mv2_d_1538_2048_s_2.png`, mobile `0578d1_f8ddb79e83984ac68ca41f34e289131e~mv2.png`
2. **FamilySearch Settings:** consolidated overlapping Account, Preferences, and Contact tabs into a left nav. Images: old `0578d1_a56d4a09e8014fd79a88b558a7e4ea7f~mv2_d_2472_1754_s_2.png` (+4 more), sticky-note board `0578d1_fe065d44690f4c32b7f9faabaf779a7f~mv2_d_4048_3036_s_4_2.jpg`, new `0578d1_cb75d64ee69843c292edd8bcc380b3e9~mv2.png`, `0578d1_6fb0e84f52b5465ea5399043060240cb~mv2.png`, `0578d1_45123a616f05473385c4a5ed7f814c56~mv2.png`
3. **Recovery Suite Reports:** clinician tool for custom client progress reports across Fortify, Lift, and Turn. Images `0578d1_e9c23ac03e1d434890c683bbc0b3779b~mv2.png`, `0578d1_2c78d81f41b64976a35d0b39160fae96~mv2.png`, `0578d1_0d149afa430f48ea9a412d8bdb9adc39~mv2.png`, `0578d1_d1301a142edf47d9a1142829e80042b3~mv2.png`
4. **FS Account Manager ("Baymax"):** support-staff account lookup tool with Daybreak (light) and Nightfall (dark) themes. Images: `0578d1_d7876a7f37eb479397e6661d63b3d2cc~mv2_d_1366_1930_s_2.png`, `0578d1_0755cc1254a84974a1e9d0396f41f4e5~mv2_d_1366_1505_s_2.png`, `0578d1_337520c518c54de2ae1edcad38f758d5~mv2_d_1366_1505_s_2.png`
5. **Life-Guard Medical:** Casey's software engineering senior project, designed and built himself. An NFC bracelet gives first responders instant access to critical health info, with a web emergency viewer and an Android app. Images: `0578d1_caad6a05072849c998aef2d7fc3f664b~mv2.png`, plus Android screens 1 to 14 (IDs on the live page)
6. **Controlled Vocabulary:** internal console for Lists, Terms, Concepts, and Attributes (10 state screens on the live page)
7. **FamilySearch Messaging:** moved from an email metaphor to chat. Before `e4479f237e5e4c5381d8aee486415e62~mv2.png`, after `5c4919bce41a4ce982909e7fc04e051a~mv2.png` (`0578d1_` prefix)
8. **Indexing on Android (gamification):** crowdsourced record indexing for South American markets, with stats, goals, and groups (7 screens on the live page)

---

## 10. Open questions for Casey

1. Approve the Places adventure script and three decision points (Section 6)?
2. Approve the room concepts (Section 5) and the Marble prompts (Section 8)?
3. Verify the Places figures (25 FTE, $2.5M) and whether any post-beta numbers exist. Any metrics for Records Search?
4. Any concerns about showing FamilySearch work (all of it is already public on the old site)?
5. Visual direction for the UI layer (typography, color) outside the 3D space. Casey cares a lot about distinctive, polished aesthetics, not generic output, so propose a few directions.
6. Domain and hosting: Vercel is assumed. Is there a custom domain?
7. Which Lucid projects can eventually be shown, and at what fidelity (NDA)?

---

## 11. Guardrails

- **Confirm before deciding.** Propose two or three options with a recommendation and wait for Casey's yes.
- **Performance budget matters as much as visuals.** Scan mode must work instantly even if WebGPU fails or the splat is still loading.
- **Never fabricate project facts.** All narrative content comes from Casey's real work and gets his sign-off.
- **Secrets:** API keys live in `.env`, and `.env` stays in `.gitignore`.
- Recruiters skim. Every room needs a clear 10-second takeaway.
