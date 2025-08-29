<template>
  <div class="flex items-center justify-start gap-16">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, provide } from 'vue'

export interface IProps<T = any> {
  value: T
  onChange: (value: T) => void
}

const props = defineProps<IProps>()

provide('radioGroupContext', {
  current: computed(() => props.value),
  onChange: props.onChange,
})
</script>
