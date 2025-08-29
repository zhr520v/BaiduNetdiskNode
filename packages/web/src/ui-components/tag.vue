<template>
  <div :class="['rounded-3 flex items-center gap-8 py-2', getWrapperClass()].join(' ')">
    <div :class="['text-white', props.deleted ? 'line-through' : ''].join(' ')">
      <slot></slot>
    </div>

    <i
      v-if="props.closable"
      class="iconfont icon-close text-16 cursor-pointer"
      @click="onCloseThis"
    ></i>
  </div>
</template>

<script setup lang="ts">
interface IProps {
  type?: 'primary' | 'warning' | 'error' | 'default'
  deleted?: boolean
  closable?: boolean
  onClose?: () => void
}

const props = defineProps<IProps>()

function onCloseThis() {
  props.onClose?.()
}

function getWrapperClass() {
  const type = props.type || 'default'
  const classes: string[] = []

  if (type === 'primary') {
    classes.push('bg-blue-400')
  } else if (type === 'warning') {
    classes.push('bg-orange-400')
  } else if (type === 'error') {
    classes.push('bg-red-400')
  } else {
    classes.push('bg-gray-400')
  }

  if (props.closable) {
    classes.push('pl-6 pr-4')
  } else {
    classes.push('px-6')
  }

  return classes.join(' ')
}
</script>
