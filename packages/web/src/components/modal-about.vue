<template>
  <Modal
    title="关于"
    :size="config.isMobile ? 'tiny' : 'small'"
    :use-no-cancel-button="true"
    ok-button-text="关闭"
    @ok="props.onOk?.()"
  >
    <div>
      <a
        href="https://github.com/keenghost/BaiduNetdiskNode"
        target="_blank"
        className="text-sky-600 break-words"
      >
        https://github.com/keenghost/BaiduNetdiskNode
      </a>
    </div>
    <div class="flex items-center gap-8">
      <a
        href="https://github.com/keenghost"
        target="_blank"
        className="text-sky-600"
      >
        @keenghost
      </a>
      <span>MIT</span>
      <span>v0.1.2</span>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { config } from '@src/common/config'
import Modal from '@src/ui-components/modal.vue'

interface IProps {
  onOk?: () => void
}

const props = defineProps<IProps>()
</script>
