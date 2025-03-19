<template>
  <Teleport to="body">
    <div
      :class="
        [
          'fixed bottom-0 left-0 right-0 top-0 z-[999] flex items-center justify-center bg-[rgba(0,0,0,0.5)]',
          getPaddingClass(),
        ].join(' ')
      "
    >
      <div
        :class="
          [
            'rounded-3 relative flex max-h-full max-w-full flex-col bg-white p-16',
            props.className,
          ].join(' ')
        "
        :style="Object.assign(getSizeStyle(), props.style)"
        @click="e => e.stopPropagation()"
      >
        <div
          v-if="!props.useNoTitle"
          className="text-18 mb-16 font-bold"
        >
          {{ props.title }}
        </div>

        <div
          :class="
            ['flex flex-1 flex-col', props.overflowHidden ? 'overflow-hidden' : ''].join(' ')
          "
        >
          <slot></slot>
        </div>

        <div
          v-if="!props.useNoFooter"
          className="mt-16 flex items-center justify-end gap-8"
        >
          <Button
            v-if="!props.useNoCancelButton"
            size="small"
            @click="props.onCancel"
          >
            {{ props.cancelButtonText || '取消' }}
          </Button>

          <Button
            v-if="!props.useNoOkButton"
            size="small"
            :type="props.okButtonType || 'primary'"
            @click="onOkThis"
          >
            {{ props.okButtonText || '确定' }}
          </Button>
        </div>

        <div
          v-if="props.loading || loadingThis"
          class="rounded-3 absolute bottom-0 left-0 right-0 top-0 z-[1] flex items-center justify-center bg-[rgba(255,255,255,0.5)]"
        >
          <div class="loader h-[96px] w-[96px] text-orange-600"></div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import Button from '@src/ui-components/button.vue'
import { IButtonType } from '@src/ui-components/types'
import { type CSSProperties, ref } from 'vue'

interface IProps {
  title?: string
  className?: string
  style?: CSSProperties
  size?: 'full' | 'extra-large' | 'large' | 'medium' | 'small' | 'tiny' | 'auto'
  onOk?: (() => void) | (() => Promise<void>)
  onCancel?: () => void
  okButtonType?: IButtonType
  useBackAction?: boolean
  useNoTitle?: boolean
  useNoFooter?: boolean
  okButtonText?: string
  cancelButtonText?: string
  useNoOkButton?: boolean
  useNoCancelButton?: boolean
  loading?: boolean
  useLoading?: boolean
  overflowHidden?: boolean
}

const props = defineProps<IProps>()
const loadingThis = ref(false)

async function onOkThis() {
  try {
    if (props.useLoading) {
      loadingThis.value = true
    }

    await props.onOk?.()
  } catch (inErr) {
    throw inErr
  } finally {
    if (props.useLoading) {
      loadingThis.value = false
    }
  }
}

function getSizeStyle() {
  const size = props.size || 'auto'

  switch (size) {
    case 'full':
      return {
        width: '100%',
        height: '100%',
        padding: 0,
        borderRadius: 0,
      }
    case 'extra-large':
      return { width: '1200px' }
    case 'large':
      return { width: '800px' }
    case 'medium':
      return { width: '640px' }
    case 'small':
      return { width: '480px' }
    case 'tiny':
      return { width: '320px' }
    default:
      return {}
  }
}

function getPaddingClass() {
  if (props.size === 'full') {
    return ''
  }

  return 'p-16'
}
</script>
