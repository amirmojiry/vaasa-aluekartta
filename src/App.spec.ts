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
    expect(wrapper.text()).toContain('Gerby')
    expect(wrapper.find('[aria-label="Map preview"]').exists()).toBe(true)
  })
})
