<template>
  <Modal
    :title="props.isDir ? '下载文件夹 (至服务器)' : '下载文件 (至服务器)'"
    size="tiny"
    :overflow-hidden="true"
    :use-loading="true"
    ok-button-text="下载"
    @ok="onOkThis"
    @cancel="onCancelThis"
  >
    <div class="flex-1 overflow-y-auto">
      <div class="flex flex-col gap-8">
        <div class="flex gap-8">
          <div
            class="h-32 w-32 bg-contain bg-center bg-no-repeat"
            :class="getFileIconClass(props.remote, props.isDir)"
          ></div>
          <div class="flex-1 break-words leading-[32px]">
            {{ props.remote.split('/').pop() }}
          </div>
        </div>

        <div class="flex items-center gap-8">
          <div class="w-32 text-right">解密</div>
          <div class="flex-1">
            <Input
              v-model:value="encrypt"
              placeholder=""
              class="w-full"
            />
          </div>
        </div>

        <div class="flex items-center gap-8">
          <div class="w-32 text-right"></div>
          <div class="text-gray-400">如果文件(夹)已存在, 则重命名</div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { httpAddManualDownload } from '@src/common/api'
import { __FILEICONS__ } from '@src/common/const'
import Input from '@src/ui-components/input.vue'
import Message from '@src/ui-components/message'
import Modal from '@src/ui-components/modal.vue'
import { ref } from 'vue'

export interface IModalDownloadInfo {
  fsid: number
  remote: string
  isDir: boolean
}

interface IProps extends IModalDownloadInfo {
  onOk?: () => void
  onCancel?: () => void
}

const props = defineProps<IProps>()
const encrypt = ref('')

async function onCancelThis() {
  props.onCancel?.()
}

async function onOkThis() {
  try {
    await httpAddManualDownload({
      fsid: props.isDir ? void 0 : props.fsid,
      remote: props.remote,
      encrypt: encrypt.value,
    })

    Message.success('添加下载成功')
    props.onOk?.()
  } catch (inErr) {
    Message.error(`添加下载失败: ${(inErr as Error).message}`)
  }
}

function getFileIconClass(inName: string, inIsDir: boolean) {
  if (inIsDir) {
    return 'png-folder'
  }

  const suffix = inName.split('.').pop()?.toLowerCase() || ''

  for (const item of __FILEICONS__) {
    if (item.matches.includes(suffix)) {
      return item.className
    }
  }

  return 'png-unknown'
}
</script>
