import { mount } from '@vue/test-utils'

import App from './App.vue'

vi.mock('@/components/map/VaasaMap.vue', () => ({
  default: {
    template: '<section aria-label="Map preview">Map preview</section>',
  },
}))

describe('App', () => {
  it('presents the project purpose and current milestone', () => {
    const wrapper = mount(App)

    expect(wrapper.get('h1').text()).toContain('understand Vaasa')
    expect(wrapper.text()).toContain('Interactive boundaries')
    expect(wrapper.text()).toContain('12 of 12')
    expect(wrapper.text()).toContain('55 child relation IDs')
    expect(wrapper.find('[aria-label="Map preview"]').exists()).toBe(true)
  })
})
