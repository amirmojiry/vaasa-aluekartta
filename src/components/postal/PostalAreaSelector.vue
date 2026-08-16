<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { PostalCodeArea } from '@/domain/postal'
import { useI18n } from '@/i18n'
import { fetchPostalCodeCollection } from '@/services/postalData'

const { buildUrl, language } = useI18n()
const postalAreas = ref<PostalCodeArea[]>([])
const selectedCode = ref('')
const loading = ref(true)
const failed = ref(false)

const messages = computed(() => {
  if (language.value === 'fa') {
    return {
      label: 'انتخاب کد پستی',
      placeholder: 'یک کد پستی را انتخاب کنید',
      open: 'مشاهده',
      unavailable: 'فهرست کدهای پستی در دسترس نیست.',
    }
  }
  if (language.value === 'fi') {
    return {
      label: 'Valitse postinumeroalue',
      placeholder: 'Valitse postinumeroalue',
      open: 'Avaa',
      unavailable: 'Postinumeroalueiden luettelo ei ole saatavilla.',
    }
  }
  return {
    label: 'Select postal code area',
    placeholder: 'Choose a postal code area',
    open: 'Open',
    unavailable: 'Postal code area list is unavailable.',
  }
})

function optionLabel(area: PostalCodeArea): string {
  const name = language.value === 'fi' ? area.nameFi : area.nameSv || area.nameFi
  return `${area.code} · ${name}`
}

function openSelected(): void {
  if (!selectedCode.value) return
  window.location.href = buildUrl({ postal: selectedCode.value })
}

onMounted(async () => {
  try {
    const collection = await fetchPostalCodeCollection()
    postalAreas.value = [...collection.areas].sort((left, right) => left.code.localeCompare(right.code))
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <form class="postal-area-selector" :aria-label="messages.label" @submit.prevent="openSelected">
    <label for="postal-area-selector">{{ messages.label }}</label>
    <div class="postal-area-selector__controls">
      <select
        id="postal-area-selector"
        v-model="selectedCode"
        :disabled="loading || failed"
        :aria-describedby="failed ? 'postal-area-selector-status' : undefined"
      >
        <option value="" disabled>{{ messages.placeholder }}</option>
        <option v-for="area in postalAreas" :key="area.code" :value="area.code">
          {{ optionLabel(area) }}
        </option>
      </select>
      <button type="submit" :disabled="!selectedCode || loading || failed">{{ messages.open }}</button>
    </div>
    <span v-if="failed" id="postal-area-selector-status" role="status">{{ messages.unavailable }}</span>
  </form>
</template>

<style scoped>
.postal-area-selector {
  display: grid;
  gap: 0.4rem;
  margin: 0.75rem 0 1rem;
  padding: 0.75rem;
  border: 1px solid rgba(111, 74, 142, 0.22);
  border-radius: 0.65rem;
  background: rgba(255, 253, 248, 0.82);
}

.postal-area-selector label {
  color: #334a46;
  font-size: 0.82rem;
  font-weight: 800;
}

.postal-area-selector__controls {
  display: flex;
  gap: 0.5rem;
}

.postal-area-selector select {
  min-width: 0;
  flex: 1;
  border: 1px solid rgba(111, 74, 142, 0.32);
  border-radius: 0.55rem;
  background: #fff;
  padding: 0.65rem 0.75rem;
  color: inherit;
  font: inherit;
}

.postal-area-selector button {
  border: 1px solid #6f4a8e;
  border-radius: 0.55rem;
  background: #6f4a8e;
  padding: 0.65rem 1rem;
  color: #fff;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.postal-area-selector button:disabled,
.postal-area-selector select:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.postal-area-selector span {
  font-size: 0.8rem;
}

@media (max-width: 640px) {
  .postal-area-selector__controls {
    display: grid;
  }

  .postal-area-selector button {
    width: 100%;
  }
}
</style>
