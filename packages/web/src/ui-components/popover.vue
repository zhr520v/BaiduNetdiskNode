<template>
  <div
    ref="wrapperDiv"
    class="relative"
    @click="onClick"
  >
    <slot name="trigger"></slot>

    <div
      v-if="show"
      ref="popoverDiv"
      class="common-shadow fixed z-[999]"
      :style="getPopPos()"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface IProps {
  position?: 'BL' | 'BR'
}

const props = defineProps<IProps>()
const wrapperDiv = ref<HTMLDivElement>()
const popoverDiv = ref<HTMLDivElement>()
const show = ref(false)

watch(show, newShow => {
  if (newShow) {
    const callback = (e: MouseEvent) => {
      if (!popoverDiv.value?.contains(e.target as Node)) {
        setTimeout(() => (show.value = false))

        window.removeEventListener('click', callback, { capture: true })
      }
    }

    window.addEventListener('click', callback, { capture: true })
  }
})

function getPopPos() {
  const clientWidth = document.documentElement.clientWidth
  const position = props.position || 'BL'
  const rect = wrapperDiv.value?.getBoundingClientRect() || {
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    width: 0,
    height: 0,
  }

  switch (position) {
    case 'BL':
      return {
        top: `${rect.bottom}px`,
        left: `${rect.left}px`,
        minWidth: `${rect.width}px`,
      }
    case 'BR':
      return {
        top: `${rect.bottom}px`,
        right: `${clientWidth - rect.right}px`,
        minWidth: `${rect.width}px`,
      }
  }
}

function onClick() {
  if (!show.value) {
    show.value = true
  }
}
</script>
