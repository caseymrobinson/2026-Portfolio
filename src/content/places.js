// Authored copy for the Places room and its Quick read case study.
// Every fact here comes from my own case study. Never generate or improvise
// project facts. Figures date from the 2018 to 2020 beta and still need my
// final verification before this goes public.

export const places = {
  id: 'places',
  title: 'FamilySearch Places',
  oneLiner:
    'A data-rich web app mapping the world’s places and how they changed, built to work for both Rome and a village with almost no data.',
  role: 'Sole designer, from concept through ship',
  takeaway: 'One layout had to serve Rome and a village with almost no data. A card feed that hides empty cards did it.',

  intro: {
    kicker: 'Exhibit 01',
    title: 'FamilySearch Places',
    body: [
      'A living map of every place on Earth, and how each one changed over time. Names shift, borders move, languages and scripts multiply.',
      'You’re the only designer on it. From first concept to shipped product, every call is yours.',
    ],
    roomNote: 'You’re standing in Rome, where the data runs deep. Walk south toward a village in Zambia, and watch the data thin out.',
    cta: 'Let’s see what you’d do',
  },

  decisions: [
    {
      id: 'd1',
      kicker: 'Decision 1',
      title: 'One interface, wildly different data',
      prompt: [
        'A place page might hold a dozen kinds of data: names in other languages and scripts, historical periods, place type, research links, a timeline, a summary, related places, sources, map location, a confidence rating. Some places also have population, elevation, and cultural data.',
        'Rome has all of it. A remote village in Zambia has almost none. One layout has to work for both.',
      ],
      question: 'How do you organize it?',
      options: [
        {
          id: 'd1a',
          label: 'Accordions',
          summary: 'Collapse each category and let people expand what they need.',
          outcome:
            'Too rigid for this much variety. Dense places became a wall of closed boxes, and sparse places looked broken and empty.',
        },
        {
          id: 'd1b',
          label: 'Horizontal tabs',
          summary: 'One tab per data category.',
          outcome:
            'Fine on desktop, nearly unusable on mobile. My takeaway: not designing mobile-first was the mistake.',
        },
        {
          id: 'd1c',
          label: 'A scrollable feed of cards',
          summary: 'Stack the categories as cards in one feed.',
          shipped: true,
          outcome:
            'Six cards: Basic Information, Historical Information, Research Links, Related Places, Alternate Names, Sources. Big data sets get “show more / show less.” Sparse places show everything at once, and cards with nothing useful simply don’t appear.',
          evidence: 'What testing showed: people were happy to scroll a longer page, as long as information was where they expected it.',
          visual: 'placeCompare',
        },
      ],
    },
    {
      id: 'd2',
      kicker: 'Decision 2',
      title: 'The search box that does everything',
      prompt: [
        'The backend can search by name, region, place type, date range, and a latitude/longitude radius. Engineering’s instinct: put every option in the UI.',
      ],
      question: 'What do you do?',
      options: [
        {
          id: 'd2a',
          label: 'Expose it all in an Advanced Search panel',
          summary: 'Every backend capability gets a control.',
          outcome:
            'People typed “Orange County” into the main search field instead of finding the “Places within” filter. Worse, some combinations made no sense together. Text search targets one place, while “places within” returns many. Boundary search and radius search overlap. The advanced panel had become a junk drawer for features nobody had thought through.',
        },
        {
          id: 'd2b',
          label: 'Map every search method against real use cases first',
          summary: 'And against each other, before designing anything.',
          shipped: true,
          outcome:
            'A matrix of every criterion vs. every user goal showed which combinations were useless. Cutting those shrank Advanced Search dramatically, and each remaining feature got a natural home. The lat/long radius became a click on the map. Type, year, and “places within” each got their own spot.',
          visual: 'matrix',
        },
      ],
    },
    {
      id: 'd3',
      kicker: 'Decision 3',
      title: 'The data problem',
      prompt: [
        'A map of the world’s places needs an enormous amount of data. FamilySearch has 5 full-time employees collecting it. At that pace, it would take decades.',
      ],
      question: 'How do you get the data?',
      options: [
        {
          id: 'd3a',
          label: 'Grow the data team',
          summary: 'Hire more people to collect it.',
          outcome: 'Far too expensive for the project’s constraints.',
        },
        {
          id: 'd3b',
          label: 'Buy large datasets',
          summary: 'License the data from someone who has it.',
          outcome: 'Also expensive, and didn’t fit the constraints either.',
        },
        {
          id: 'd3c',
          label: 'Turn the product into the data-collection tool',
          summary: 'Let passionate volunteers add and edit places.',
          shipped: true,
          outcome:
            'The same app that serves discovery doubles as a data-management console for volunteers, with one consistent experience for readers and editors.',
        },
      ],
      nextLabel: 'See the impact',
    },
  ],

  impact: {
    kicker: 'Impact',
    stats: [
      { value: '~25', label: 'full-time data-entry employees’ worth of output, from volunteers' },
      { value: '~$2.5M', label: 'projected first-year savings, expected to grow after launch' },
    ],
    note: 'Figures from the 2018 to 2020 beta.',
    role: 'My role: sole designer. Concept, market analysis, product strategy, research and testing, UI design, and shipping across disciplines.',
  },

  scan: {
    problems: ['Interface flexibility', 'Search complexity', 'Robust data collection'],
    decisions: [
      {
        title: 'A card feed over accordions and tabs',
        body: 'Accordions turned dense places into a wall of closed boxes and made sparse places look broken. Tabs fell apart on mobile. A feed of six cards scaled both ways: big data sets get show more / show less, and empty cards simply don’t appear. Testing showed people were happy to scroll, as long as information was where they expected it.',
        visual: 'placeCompare',
      },
      {
        title: 'Matrix-driven search simplification',
        body: 'Engineering wanted every backend search option in the UI. I mapped every criterion against every user goal, and against each other. Cutting the useless combinations shrank Advanced Search dramatically. The lat/long radius became a click on the map, and type, year, and “places within” each got a natural home.',
        visual: 'matrix',
      },
      {
        title: 'Volunteer crowdsourcing',
        body: 'Five full-time employees would have needed decades to collect the data. Growing the team or buying datasets didn’t fit the constraints, so the product became the collection tool: one consistent experience for readers and volunteer editors.',
      },
    ],
  },
};

// Images live on my old Wix portfolio (public). IDs from the content inventory.
export const placesImages = {
  hero: { id: '0578d1_ce1cda58b8ea476e9253ec241301687f~mv2_d_4096_1632_s_2.jpg', alt: 'FamilySearch Places hero banner' },
  overview: { id: '0578d1_2860001966944c688cdc1c3ba5dccca9~mv2_d_4941_3296_s_4_2.jpg', alt: 'Places overview screens' },
  matrix: {
    id: '0578d1_d271b4ed02174710931bdf837d8433c2~mv2_d_4048_3036_s_4_2.jpg',
    alt: 'Hand-drawn whiteboard matrix of search criteria vs. user goals, August 2018',
  },
  simplifiedSearch: { id: '0578d1_ba2b76c8518c4a8f9bfad1ce0ef13410~mv2_d_2017_1339_s_2.png', alt: 'The simplified Places search' },
};

// Illustrative sample data for the sparse vs. dense comparison. This is a
// recreation to show the behavior, not the production UI or real records.
export const placeSamples = {
  dense: {
    name: 'Rome',
    meta: 'City · Lazio, Italy',
    cards: [
      { title: 'Basic Information', rows: [['Type', 'City'], ['Part of', 'Lazio, Italy'], ['Location', '41.89° N, 12.48° E']] },
      {
        title: 'Alternate Names',
        rows: [['Roma', 'Italian'], ['Roma', 'Latin'], ['Rom', 'German'], ['Ρώμη', 'Greek'], ['Рим', 'Russian'], ['روما', 'Arabic'], ['ローマ', 'Japanese'], ['罗马', 'Chinese']],
      },
      {
        title: 'Historical Information',
        rows: [['Papal States', '756–1870'], ['Kingdom of Italy', '1870–1946'], ['Italy', '1946–present']],
      },
      { title: 'Related Places', rows: [['Vatican City', 'Enclave'], ['Lazio', 'Region'], ['Ostia', 'District'], ['Tivoli', 'Nearby']] },
      { title: 'Research Links', rows: [['Civil registration', 'Sample link'], ['Catholic parish records', 'Sample link'], ['Genealogy wiki', 'Sample link'], ['Census records', 'Sample link']] },
      { title: 'Sources', rows: [['National gazetteer', 'Sample source'], ['Historical atlas', 'Sample source'], ['Diocesan records', 'Sample source']] },
    ],
  },
  sparse: {
    name: 'Mwandi',
    meta: 'Village · Western Province, Zambia',
    cards: [
      { title: 'Basic Information', rows: [['Type', 'Village'], ['Part of', 'Western Province, Zambia']] },
      { title: 'Related Places', rows: [['Western Province', 'Province']] },
      { title: 'Sources', rows: [['Regional gazetteer', 'Sample source']] },
    ],
    hidden: ['Alternate Names', 'Historical Information', 'Research Links'],
  },
};
