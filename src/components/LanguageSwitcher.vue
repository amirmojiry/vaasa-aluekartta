<script setup lang="ts">
import { useI18n } from '@/i18n'

const { language, languageUrl, t } = useI18n()
</script>

<template>
  <nav class="language-switcher" :aria-label="t('language')">
    <a
      :class="['language-switcher__link', { 'is-active': language === 'en' }]"
      :href="languageUrl('en')"
      :aria-current="language === 'en' ? 'page' : undefined"
    >
      EN
    </a>
    <a
      :class="['language-switcher__link', { 'is-active': language === 'fi' }]"
      :href="languageUrl('fi')"
      :aria-current="language === 'fi' ? 'page' : undefined"
    >
      FI
    </a>
    <a
      :class="['language-switcher__link', { 'is-active': language === 'fa' }]"
      :href="languageUrl('fa')"
      :aria-current="language === 'fa' ? 'page' : undefined"
    >
      فارسی
    </a>
  </nav>
</template>
