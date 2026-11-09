// Authored copy for the Historical Records Search teaser (Quick read only for now).

export const records = {
  id: 'records',
  title: 'Historical Records Search',
  hook: 'New users said the old search felt like being dropped into a spacecraft pilot’s seat with no training.',
  takeaway: 'I cut FamilySearch’s most-used search down to three fields, and moved expert controls into a side sheet.',
  context:
    'FamilySearch’s flagship and most-used product, with hundreds of thousands of daily users. No significant redesign in nearly a decade.',
  role: 'The only designer on the search team, owning the work from research through completion. I also architected Polaris, a strategy to unify FamilySearch’s many search products into one ecosystem. This redesign was its first concrete step.',
  tension:
    'Power users are few but contribute most of the content, so keeping them productive is a business priority. New and casual visitors get overwhelmed and leave.',
  decision:
    'I cut the search form to three optional fields: Name, Place, Year. They’re the ones that produce good results and that people can actually recall. Dozens of advanced options moved behind one “more options” control that opens a side sheet, so experts keep full control without cluttering results.',
  fields: ['Name', 'Place', 'Year'],
};

export const recordsImages = {
  hero: { id: '0578d1_f8e5894efdcc43b6b2bd905c53c0bf7a~mv2.jpg', alt: 'Historical Records Search hero' },
  pairs: [
    {
      label: 'Landing page',
      before: { id: '0578d1_212b4c680aee48f496ad74181c75c0dd~mv2.png', alt: 'Old search landing page with many fields' },
      after: { id: '0578d1_46243850d3ae47b4a40412149e58630c~mv2.jpg', alt: 'New search landing page with Name, Place, Year' },
    },
    {
      label: 'Search results',
      before: { id: '0578d1_c01ac950f5674ef9a7317570560aec7d~mv2.png', alt: 'Old search results page' },
      after: { id: '0578d1_f83bd378c7db44708e24e5374b45c088~mv2.png', alt: 'New search results page' },
    },
    {
      label: 'Record preview',
      before: { id: '0578d1_b4070642d8254ae7950edd235a9922b5~mv2.png', alt: 'Old record preview' },
      after: { id: '0578d1_57bba1b23af8435cb525b0b74de3b797~mv2.png', alt: 'New record preview' },
    },
  ],
  sideSheet: { id: '0578d1_1a2f8825b8264098833a7ff921404ed1~mv2.png', alt: 'Advanced options in a side sheet' },
};
