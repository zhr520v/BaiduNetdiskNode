<template>
  <input
    type="text"
    :value="props.value"
    :tabIndex="-1"
    class="rounded-3 bg-gray-200 px-12 py-6 outline-none focus:outline-none"
    @input="onChangeThis"
  />
</template>

<script setup lang="ts">
interface IProps {
  value?: string
  onChange?: (value: string) => void
}

const props = defineProps<IProps>()
const updateValue = defineEmits(['update:value'])

function onChangeThis(e: Event) {
  updateValue('update:value', (e.target as HTMLInputElement).value)
  props.onChange?.((e.target as HTMLInputElement).value)
}
</script>
