import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TechnicalInfo from '@/components/areas/TechnicalInfo.vue'

describe('TechnicalInfo', () => {
  it('shows linked Wikipedia articles inside the technical information panel', () => {
    const wrapper = mount(TechnicalInfo, {
      props: {
        relationId: 11930886,
        reference: '01',
        adminLevel: 9,
        levelLabel: 'Major area',
        outerWayCount: 1,
        source: 'OpenStreetMap relation 11930886',
        wikidataId: 'Q56399589',
        wikidataDescription: {},
        wikipedia: {
          fi: 'https://fi.wikipedia.org/wiki/Keskustan_suuralue_(Vaasa)',
          fa: 'https://fa.wikipedia.org/wiki/مرکز_شهر_واسا',
        },
        externalIdentifiers: [],
      },
    })

    const technicalPanel = wrapper.get('.technical-panel')
    const hrefs = technicalPanel.findAll('a').map((link) => link.attributes('href'))

    expect(hrefs).toContain('https://fi.wikipedia.org/wiki/Keskustan_suuralue_(Vaasa)')
    expect(hrefs).toContain('https://fa.wikipedia.org/wiki/مرکز_شهر_واسا')
  })
})
