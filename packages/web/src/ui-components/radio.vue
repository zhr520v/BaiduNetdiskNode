<template>
  <div
    class="flex cursor-pointer items-center gap-8"
    @click="context?.onChange?.(props.value)"
  >
    <div
      class="flex h-16 w-16 items-center justify-center rounded-full"
      :class="{ 'bg-blue-500': checked, 'bg-gray-200': !checked }"
    >
      <div
        v-if="checked"
        class="h-full w-full rounded-full bg-[var(--primary-color)]"
      ></div>
    </div>

    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'

interface RadioProps {
  value: any
}

interface RadioGroupContext {
  current?: any
  onChange?: (value: any) => void
}

const props = defineProps<RadioProps>()
const context = inject<RadioGroupContext>('radioGroupContext')

const checked = computed(() => {
  if (context?.current.value !== void 0) {
    return context.current.value === props.value
  }

  return false
})
</script>
