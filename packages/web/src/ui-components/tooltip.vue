<template>
  <div
    ref="wrapperDiv"
    class="relative flex items-center"
    @mouseenter="show = true"
    @mouseleave="show = false"
  >
    <slot name="trigger"></slot>

    <i
      v-if="type === 'question'"
      class="iconfont icon-question text-20 text-gray-600"
    ></i>

    <div
      v-if="show"
      class="common-shadow fixed z-[999] rounded-md bg-white p-8"
      :style="getTooltipPos()"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface IProps {
  type?: 'question'
  position?: 'TL' | 'TR' | 'BL' | 'BR'
}

const props = defineProps<IProps>()

const wrapperDiv = ref<HTMLDivElement>()
const show = ref(false)

function calculateBestPosition(rect: {
  top: number
  right: number
  left: number
  bottom: number
  width: number
  height: number
}): 'TL' | 'TR' | 'BL' | 'BR' {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const spaceAbove = rect.top
  const spaceBelow = viewportHeight - rect.bottom

  const elementCenter = rect.left + rect.width / 2
  const isOnLeftHalf = elementCenter < viewportWidth / 2

  if (spaceAbove > spaceBelow) {
    return isOnLeftHalf ? 'TL' : 'TR'
  } else {
    return isOnLeftHalf ? 'BL' : 'BR'
  }
}

function getTooltipPos() {
  const rect = wrapperDiv.value?.getBoundingClientRect() || {
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    width: 0,
    height: 0,
  }

  const gap = 8

  const position = props.position || calculateBestPosition(rect)

  switch (position) {
    case 'TL':
      return {
        bottom: `${window.innerHeight - rect.top + gap}px`,
        left: `${rect.left}px`,
      }
    case 'TR':
      return {
        bottom: `${window.innerHeight - rect.top + gap}px`,
        right: `${window.innerWidth - rect.right}px`,
      }
    case 'BL':
      return {
        top: `${rect.bottom + gap}px`,
        left: `${rect.left}px`,
      }
    case 'BR':
      return {
        top: `${rect.bottom + gap}px`,
        right: `${window.innerWidth - rect.right}px`,
      }
  }
}
</script>
