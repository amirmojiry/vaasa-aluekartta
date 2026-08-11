import { mount } from '@vue/test-utils'

import App from './App.vue'

vi.mock('@/components/map/VaasaMap.vue', () => ({
  default: {
    template: '<section aria-label="Map preview">Map preview</section>',
  },
}))

vi.mock('@/components/areas/CityStatisticsSummary.vue', () => ({
  default: {
    template: '<section aria-label="City statistics summary">City statistics summary</section>',
  },
}))

vi.mock('@/components/areas/CityStatistics.vue', () => ({
  default: {
    template: '<section aria-label="City historical statistics">City historical statistics</section>',
  },
}))

vi.mock('@/components/areas/ElectionHistory.vue', () => ({
  default: {
    template: '<section aria-label="Election history">Election history</section>',
  },
}))

describe('App', () => {
  it('keeps the home page focused on the map and city statistics', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Vaasa Aluekartta')
    expect(wrapper.get('a[href*="lang=fi"]').text()).toContain('FI')
    expect(wrapper.get('a[href*="lang=fa"]').text()).toContain('فا')
    expect(wrapper.find('[aria-label="Map preview"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="City statistics summary"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="City historical statistics"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Election history"]').exists()).toBe(true)
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.find('.hero__aside').exists()).toBe(false)
    expect(wrapper.find('.info-panel').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Local boundary snapshots')
    expect(wrapper.text()).not.toContain('Static GeoJSON')
  })
})
