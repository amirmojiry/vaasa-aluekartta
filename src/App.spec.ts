import { mount } from '@vue/test-utils'

import App from './App.vue'

vi.mock('@/components/map/VaasaMap.vue', () => ({
  default: {
    template: '<section aria-label="Map preview">Map preview</section>',
  },
}))

describe('App', () => {
  it('keeps the home page focused on the header, language switcher, and map', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Vaasa Aluekartta')
    expect(wrapper.get('a[href*="lang=fi"]').text()).toContain('FI')
    expect(wrapper.get('a[href*="lang=fa"]').text()).toContain('فارسی')
    expect(wrapper.find('[aria-label="Map preview"]').exists()).toBe(true)
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.find('.hero__aside').exists()).toBe(false)
    expect(wrapper.find('.info-panel').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Local boundary snapshots')
    expect(wrapper.text()).not.toContain('Static GeoJSON')
  })
})
