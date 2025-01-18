<template>
  <div
    :class="
      [
        'flex cursor-pointer items-center justify-center bg-transparent',
        getSizeClass(),
        props.disabled ? 'opacity-50' : '',
      ].join(' ')
    "
    @click="e => onClickThis(e)"
  >
    <i :class="['iconfont', props.iconClass].join(' ')"></i>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface IProps {
  iconClass: string
  size?: 'large' | 'medium' | 'small' | 'tiny' | 'extra-tiny'
  onClick?: ((e: MouseEvent) => void) | ((e: MouseEvent) => Promise<void>)
  disabled?: boolean
  useLoading?: boolean
}

const props: IProps = defineProps<IProps>()
const loading = ref(false)

async function onClickThis(e: MouseEvent) {
  if (props.disabled) {
    return
  }

  if (loading.value) {
    return
  }

  try {
    if (props.useLoading) {
      loading.value = true
    }

    await props.onClick?.(e)
  } catch (e) {
    throw e
  } finally {
    if (props.useLoading) {
      loading.value = false
    }
  }
}

function getSizeClass() {
  const size = props.size || 'small'
  const classes: string[] = []

  switch (size) {
    case 'large':
      classes.push('text-32 w-36 h-36')
      break
    case 'medium':
      classes.push('text-28 w-32 h-32')
      break
    case 'small':
      classes.push('text-24 w-28 h-28')
      break
    case 'tiny':
      classes.push('text-20 w-24 h-24')
      break
    case 'extra-tiny':
      classes.push('text-16 w-20 h-20')
      break
  }

  return classes.join(' ')
}
</script>
