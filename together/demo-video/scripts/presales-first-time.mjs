// A first-time-customer presales story assembled from the verified full walkthrough.
// Existing exports are not inputs and are never overwritten.
export const FIRST_TIME_OUTPUT = 'together-presales-first-time'
export const FIRST_TIME_TARGET_SECONDS = 270

export const FIRST_TIME_SECTIONS = [
  {
    id: 'product',
    title: 'Bring your community together',
    targetSeconds: 20,
    clips: [
      { scene: 'op-home', start: 0, end: 10 },
      { scene: 'sp-home', start: 5, end: 10 },
      { scene: 'sp-trust', start: 0, end: 5 },
    ],
  },
  {
    id: 'website',
    title: 'Your organization, your website',
    targetSeconds: 30,
    clips: [
      { scene: 'oa-details', start: 0, end: 6 },
      { scene: 'oa-features', start: 20, end: 26 },
      { scene: 'oa-look', start: 0, end: 7 },
      { scene: 'oa-review', start: 5, end: 10 },
      { scene: 'oa-publish', start: 24, end: 30 },
    ],
  },
  {
    id: 'campaign',
    title: 'Create and publish a campaign',
    targetSeconds: 40,
    clips: [
      { scene: 'og-assistant', start: 0, end: 8 },
      { scene: 'og-assistant', start: 25, end: 31 },
      { scene: 'og-assistant', start: 55, end: 61 },
      { scene: 'og-form', start: 15, end: 21 },
      { scene: 'og-submit', start: 0, end: 4 },
      { scene: 'og-approve', start: 15, end: 20 },
      { scene: 'og-approve', start: 29, end: 34 },
    ],
  },
  {
    id: 'share',
    title: 'Share it with the community',
    targetSeconds: 25,
    clips: [
      { scene: 'og-copy-link', start: 5, end: 9 },
      { scene: 'og-share-qr', start: 0, end: 6 },
      { scene: 'og-share-poster', start: 0, end: 5 },
      { scene: 'og-share-messages', start: 0, end: 5 },
      { scene: 'og-share-social', start: 10, end: 15 },
    ],
  },
  {
    id: 'supporter',
    title: 'The supporter experience',
    targetSeconds: 40,
    clips: [
      { scene: 'sp-home', start: 5, end: 10 },
      { scene: 'sp-trust', start: 0, end: 5 },
      { scene: 'op-game', start: 0, end: 5 },
      { scene: 'sp-game', start: 5, end: 15 },
      { scene: 'sp-game-confirm', start: 0, end: 8 },
      { scene: 'sp-game-confirm', start: 8, end: 15 },
    ],
  },
  {
    id: 'sponsor',
    title: 'Sponsor-funded participation',
    targetSeconds: 25,
    clips: [
      { scene: 'oa-sponsor', start: 15, end: 20 },
      { scene: 'sp-sponsor', start: 0, end: 15 },
      { scene: 'oa-sponsor-confirm', start: 4, end: 9 },
    ],
  },
  {
    id: 'partner',
    title: 'Local partner rewards',
    targetSeconds: 25,
    clips: [
      { scene: 'op-offer', start: 0, end: 5 },
      { scene: 'sp-reward', start: 0, end: 5 },
      { scene: 'sp-vouchers', start: 0, end: 8 },
      { scene: 'mc-redeem', start: 5, end: 12 },
    ],
  },
  {
    id: 'personal-share',
    title: 'Personal sharing',
    targetSeconds: 15,
    clips: [
      { scene: 'sp-share', start: 20, end: 30 },
      { scene: 'sp-referral-gift', start: 5, end: 10 },
    ],
  },
  {
    id: 'transparency',
    title: 'Later in the campaign',
    targetSeconds: 35,
    clips: [
      { card: 'later', duration: 3 },
      { scene: 'op-update', start: 0, end: 8 },
      { scene: 'fn-public', start: 0, end: 8 },
      { scene: 'fn-public', start: 20, end: 28 },
      { scene: 'fn-public', start: 35, end: 43 },
    ],
  },
  {
    id: 'close',
    title: 'Explore a pilot',
    targetSeconds: 15,
    clips: [
      { scene: 'op-home', start: 0, end: 5 },
      { card: 'closing', duration: 10 },
    ],
  },
]

export const FIRST_TIME_CLIPS = FIRST_TIME_SECTIONS.flatMap((section) =>
  section.clips.map((clip) => ({ ...clip, section: section.id })),
)
