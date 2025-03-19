<template>
  <Teleport to="body">
    <div
      class="fixed bottom-0 left-0 right-0 top-0 z-[1000] flex items-center justify-center bg-[rgba(0,0,0,0.5)]"
    >
      <div
        class="rounded-3 relative flex max-h-full max-w-full flex-col bg-white p-16"
        :style="{ width: '320px' }"
        @click="e => e.stopPropagation()"
      >
        <div
          v-if="props.title"
          class="text-18 mb-16 font-bold"
        >
          {{ props.title }}
        </div>

        <div class="mb-16">
          {{ props.content }}
        </div>

        <div class="flex items-center justify-end gap-8">
          <Button
            size="small"
            @click="props.onCancel"
          >
            {{ props.cancelText || '取消' }}
          </Button>

          <Button
            size="small"
            :type="props.okType || 'primary'"
            @click="props.onOk"
          >
            {{ props.okText || '确定' }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import Button from '@src/ui-components/button.vue'
import { type IButtonType } from '@src/ui-components/types'

interface IProps {
  title?: string
  content?: string
  okText?: string
  cancelText?: string
  okType?: IButtonType
  onOk?: () => void | Promise<void>
  onCancel?: () => void
}

const props = defineProps<IProps>()
</script>
