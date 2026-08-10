import { mount } from '@vue/test-utils'

import App from './App.vue'

vi.mock('@/components/map/VaasaMap.vue', () => ({
  default: {
    template: '<section aria-label="Map preview">Map preview</section>',
  },
}))

describe('App', () => {
  it('presents the project purpose and local boundary delivery model', () => {
    const wrapper = mount(App)

    expect(wrapper.get('h1').text()).toContain('understand Vaasa')
    expect(wrapper.text()).toContain('Local boundary snapshots')
    expect(wrapper.text()).toContain('12 of 12 clickable polygons')
    expect(wrapper.text()).toContain('55 of 60 clickable polygons')
    expect(wrapper.text()).toContain('visitors do not query a boundary API')
    expect(wrapper.find('[aria-label="Map preview"]').exists()).toBe(true)
  })
})
