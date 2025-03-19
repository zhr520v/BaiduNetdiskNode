<template>
  <div class="rounded-8 h-8 w-full bg-gray-200">
    <div
      class="rounded-8 h-8 w-full bg-gray-800 transition duration-200 ease-in-out"
      :style="{ width: `${props.percentage}%` }"
    ></div>
  </div>
</template>

<script setup lang="ts">
interface IProps {
  percentage?: number
}

const props = defineProps<IProps>()
</script>
