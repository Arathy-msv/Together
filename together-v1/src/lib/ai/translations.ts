import { result, type AiResult } from './types.ts'

/*
 * Translation preview · Simulated. Malayalam text below was prepared by hand for the seeded sample
 * content only. For any other text, live translation is not connected: the caller must offer a
 * manual translation field. Unchanged text is never returned as a "translation".
 * Names, numbers, currency and dates are kept as written.
 */

export type LanguageCode = 'en' | 'ml'

export const LANGUAGES: Array<{ code: LanguageCode; label: string; native: string }> = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
]

const PREPARED_ML: Record<string, string> = {
  'Winter Blankets for Shelters': 'ഷെൽട്ടറുകൾക്കായി ശൈത്യകാല പുതപ്പുകൾ',
  'Thick blankets and winter jackets for our three night shelters. Wrap someone in warmth in the game, or give directly to keep beds warm all season.':
    'ഞങ്ങളുടെ മൂന്ന് രാത്രി ഷെൽട്ടറുകൾക്കായി കട്ടിയുള്ള പുതപ്പുകളും ശൈത്യകാല ജാക്കറ്റുകളും. ഗെയിമിലൂടെ ആരെയെങ്കിലും ചൂടിൽ പൊതിയൂ, അല്ലെങ്കിൽ ഈ സീസൺ മുഴുവൻ കിടക്കകൾ ചൂടോടെ നിലനിർത്താൻ നേരിട്ട് സംഭാവന ചെയ്യൂ.',
  'Families staying in Open Harbour’s three night shelters, including about 60 children.':
    'Open Harbour-ന്റെ മൂന്ന് രാത്രി ഷെൽട്ടറുകളിൽ താമസിക്കുന്ന കുടുംബങ്ങൾ, ഏകദേശം 60 കുട്ടികൾ ഉൾപ്പെടെ.',
  'Shelter heating is limited overnight. Many families arrive with only light clothing and no bedding of their own.':
    'രാത്രിയിൽ ഷെൽട്ടറുകളിലെ ചൂടാക്കൽ സൗകര്യം പരിമിതമാണ്. പല കുടുംബങ്ങളും നേർത്ത വസ്ത്രങ്ങളുമായി മാത്രമാണ് എത്തുന്നത്; സ്വന്തമായി കിടക്കവിരികളില്ല.',
  'Thick blankets for every bed, winter jackets in children’s sizes, and transport to deliver them to each shelter.':
    'എല്ലാ കിടക്കകൾക്കും കട്ടിയുള്ള പുതപ്പുകൾ, കുട്ടികളുടെ അളവിലുള്ള ശൈത്യകാല ജാക്കറ്റുകൾ, അവ ഓരോ ഷെൽട്ടറിലും എത്തിക്കാനുള്ള ഗതാഗതം.',
  'We buy in two batches, deliver to each shelter, and publish receipts and a final report here.':
    'ഞങ്ങൾ രണ്ട് ഘട്ടങ്ങളായി വാങ്ങി ഓരോ ഷെൽട്ടറിലും എത്തിക്കും; രസീതുകളും അന്തിമ റിപ്പോർട്ടും ഇവിടെ പ്രസിദ്ധീകരിക്കും.',
  'Residents of Open Harbour night shelters. We do not publish residents’ names or photos.':
    'Open Harbour രാത്രി ഷെൽട്ടറുകളിലെ താമസക്കാർ. താമസക്കാരുടെ പേരുകളോ ഫോട്ടോകളോ ഞങ്ങൾ പ്രസിദ്ധീകരിക്കുന്നില്ല.',
  'First 120 blankets bought': 'ആദ്യത്തെ 120 പുതപ്പുകൾ വാങ്ങി',
  'We bought the first batch of 120 blankets and collected them by van. The redacted invoice is attached to the expense below.':
    '120 പുതപ്പുകളുടെ ആദ്യ ബാച്ച് ഞങ്ങൾ വാങ്ങി, വാനിൽ കൊണ്ടുവന്നു. വ്യക്തിഗത വിവരങ്ങൾ മറച്ച ഇൻവോയ്സ് താഴെയുള്ള ചെലവിനൊപ്പം ചേർത്തിട്ടുണ്ട്.',
  'Second batch delayed by about a week': 'രണ്ടാമത്തെ ബാച്ച് ഏകദേശം ഒരാഴ്ച വൈകും',
  'Our supplier is waiting on stock for the second batch. We expect it next week and will update the purchase milestone when it arrives.':
    'രണ്ടാമത്തെ ബാച്ചിനുള്ള സ്റ്റോക്കിനായി ഞങ്ങളുടെ വിതരണക്കാരൻ കാത്തിരിക്കുകയാണ്. അടുത്ത ആഴ്ച ലഭിക്കുമെന്ന് പ്രതീക്ഷിക്കുന്നു; എത്തുമ്പോൾ വാങ്ങൽ ഘട്ടം ഞങ്ങൾ പുതുക്കും.',
  'Winter came early this year': 'ഈ വർഷം ശൈത്യം നേരത്തെ എത്തി',
  'I volunteer at the Harbour Road shelter on Thursdays. Last January I watched parents give their own jackets to their kids. If you can, help make sure nobody has to choose this year.':
    'വ്യാഴാഴ്ചകളിൽ ഞാൻ Harbour Road ഷെൽട്ടറിൽ സന്നദ്ധസേവനം ചെയ്യുന്നു. കഴിഞ്ഞ ജനുവരിയിൽ മാതാപിതാക്കൾ സ്വന്തം ജാക്കറ്റുകൾ മക്കൾക്ക് നൽകുന്നത് ഞാൻ കണ്ടു. കഴിയുമെങ്കിൽ, ഈ വർഷം ആർക്കും അങ്ങനെ ഒരു തിരഞ്ഞെടുപ്പ് നടത്തേണ്ടി വരാതിരിക്കാൻ സഹായിക്കൂ.',
}

/** Interface labels used around translated content. */
const UI_ML: Record<string, string> = {
  Story: 'കഥ',
  Updates: 'അപ്ഡേറ്റുകൾ',
  'Who this helps': 'ഇത് ആരെ സഹായിക്കുന്നു',
  'What they need': 'അവർക്ക് എന്താണ് വേണ്ടത്',
  'What contributions will support': 'സംഭാവനകൾ എന്തിനെ പിന്തുണയ്ക്കും',
  'What happens next': 'അടുത്തതായി എന്ത് സംഭവിക്കും',
  'What is needed?': 'എന്താണ് വേണ്ടത്?',
  'Who will benefit?': 'ആർക്കാണ് പ്രയോജനം?',
  'How will funds be used?': 'ഫണ്ട് എങ്ങനെ ഉപയോഗിക്കും?',
  'What happens next?': 'അടുത്തതായി എന്ത് സംഭവിക്കും?',
  'Why I support this campaign': 'ഈ ക്യാമ്പെയ്‌നിനെ ഞാൻ എന്തുകൊണ്ട് പിന്തുണയ്ക്കുന്നു',
  'Shared by': 'പങ്കിട്ടത്',
  'Not translated yet': 'ഇതുവരെ വിവർത്തനം ചെയ്തിട്ടില്ല',
}

/** Prepared sample translation, or undefined. Used to seed organizer-reviewed demo content. */
export function preparedTranslation(text: string): string | undefined {
  return PREPARED_ML[text.trim()]
}

export function uiLabel(label: string, language: LanguageCode): string {
  return language === 'ml' ? (UI_ML[label] ?? label) : label
}

export type TranslationPreview = { status: 'prepared'; text: string } | { status: 'not_connected' }

export function previewSampleTranslation(text: string, language: LanguageCode): AiResult<TranslationPreview> {
  if (language === 'en') return result({ status: 'not_connected' })
  const prepared = PREPARED_ML[text.trim()]
  if (!prepared || prepared === text) return result({ status: 'not_connected' }, { missing: ['Live translation is not connected. Add a manual translation.'] })
  return result({ status: 'prepared', text: prepared }, { sources: [{ kind: 'sample', id: 'prepared-ml', label: 'Prepared sample translation' }] })
}
