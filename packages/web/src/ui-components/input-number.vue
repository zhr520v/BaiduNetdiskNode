<template>
  <input
    type="number"
    :value="props.value"
    :tabIndex="-1"
    class="rounded-3 bg-gray-200 px-12 py-6 outline-none focus:outline-none"
    @input="onChangeThis"
  />
</template>

<script setup lang="ts">
interface IProps {
  value?: number
  onChange?: (value: number) => void
}

const props = defineProps<IProps>()
const updateValue = defineEmits(['update:value'])

function onChangeThis(e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value || '0', 10)

  updateValue('update:value', value)
  props.onChange?.(value)
}
</script>
