<template>
  <div
    :class="
      [
        'flex cursor-pointer items-center justify-center bg-transparent p-2',
        getSizeClasses(),
      ].join(' ')
    "
    @click="e => onClickThis(e)"
  >
    <div
      :class="
        [
          'bg-position-center bg-contain bg-center bg-no-repeat',
          getSizeClasses(),
          props.disabled ? 'cursor-not-allowed opacity-30' : '',
          props.pngClass,
        ].join(' ')
      "
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface IProps {
  pngClass: string
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
  } catch (inErr) {
    throw inErr
  } finally {
    if (props.useLoading) {
      loading.value = false
    }
  }
}

function getSizeClasses() {
  switch (props.size) {
    case 'large':
      return 'w-40 h-40'
    case 'medium':
      return 'w-36 h-36'
    case 'small':
      return 'w-32 h-32'
    case 'tiny':
      return 'w-28 h-28'
    case 'extra-tiny':
      return 'w-24 h-24'
    default:
      return 'w-44 h-44'
  }
}
</script>
