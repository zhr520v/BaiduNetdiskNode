<template>
  <div
    ref="wrapperDiv"
    class="rounded-3 relative flex cursor-pointer items-center bg-gray-200 px-8 py-6"
    @click="onClick"
  >
    <div class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ selectLabel }}</div>

    <i class="iconfont icon-dropdown text-16"></i>

    <div
      v-if="show"
      class="shadow-heavy fixed z-[999] max-h-[360px] overflow-y-auto bg-white"
      :style="getDropPos()"
    >
      <div
        v-for="option in props.options"
        :key="option.value"
        :class="
          [
            'has-hover:hover:bg-gray-100 overflow-hidden text-ellipsis whitespace-nowrap px-6 py-4',
            getCheckedClass(option.value),
          ].join(' ')
        "
        @click="() => onChangeThis(option.value)"
      >
        {{ option.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue'

export interface ISelectOptions {
  label: string
  value: any
}

interface IProps {
  options: ISelectOptions[]
  value?: any
  onChange?: (value: any) => void
  direction?: 'L' | 'R'
}

const props = defineProps<IProps>()
const updateValue = defineEmits(['update:value'])
const selectLabel = ref('')
const wrapperDiv = ref<HTMLDivElement>()
const show = ref(false)

watchEffect(() => {
  const option = props.options.find(o => o.value === props.value)

  if (option) {
    selectLabel.value = option.label
  }
})

watch(show, newShow => {
  if (newShow) {
    const callback = () => {
      setTimeout(() => (show.value = false))

      window.removeEventListener('click', callback, { capture: true })
    }

    window.addEventListener('click', callback, { capture: true })
  }
})

function getDropPos() {
  const clientWidth = document.documentElement.clientWidth
  const clientHeight = document.documentElement.clientHeight
  const direction = props.direction || 'R'
  const rect = wrapperDiv.value?.getBoundingClientRect() || {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: 0,
    height: 0,
  }

  const updown = rect.top + rect.height / 2 > clientHeight / 2 ? 'top' : 'bottom'

  switch (direction) {
    case 'L':
      switch (updown) {
        case 'top':
          return {
            bottom: `${clientHeight - rect.top}px`,
            left: `${rect.left}px`,
            minWidth: `${rect.width}px`,
            maxWidth: `${Math.min(540, clientWidth - rect.left - 1)}px`,
            maxHeight: `${Math.min(360, rect.top - 1)}px`,
          }
        case 'bottom':
          return {
            top: `${rect.bottom}px`,
            left: `${rect.left}px`,
            minWidth: `${rect.width}px`,
            maxWidth: `${Math.min(540, clientWidth - rect.left - 1)}px`,
            maxHeight: `${Math.min(360, clientHeight - rect.bottom - 1)}px`,
          }
      }

    case 'R':
      switch (updown) {
        case 'top':
          return {
            right: `${clientWidth - rect.right}px`,
            bottom: `${clientHeight - rect.top}px`,
            minWidth: `${rect.width}px`,
            maxWidth: `${Math.min(540, rect.right - 1)}px`,
            maxHeight: `${Math.min(360, rect.top - 1)}px`,
          }
        case 'bottom':
          return {
            top: `${rect.bottom}px`,
            right: `${clientWidth - rect.right}px`,
            minWidth: `${rect.width}px`,
            maxWidth: `${Math.min(540, rect.right - 1)}px`,
            maxHeight: `${Math.min(360, clientHeight - rect.bottom - 1)}px`,
          }
      }
  }
}

function onClick() {
  if (!show.value) {
    show.value = true
  }
}

function onChangeThis(value: any) {
  props.onChange?.(value)

  updateValue('update:value', value)
}

function getCheckedClass(inVal: any) {
  return props.value === inVal ? 'bg-blue-200' : ''
}
</script>
