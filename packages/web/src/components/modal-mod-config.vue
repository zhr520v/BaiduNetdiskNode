<template>
  <Modal
    title="修改全局设置"
    :size="config.isMobile ? 'tiny' : 'small'"
    :overflow-hidden="true"
    @ok="onOkThis"
    @cancel="props.onCancel?.()"
  >
    <div class="flex-1 overflow-y-auto">
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">尝试次数:</div>
        <div class="flex-1">
          <InputNumber
            v-model:value="globalConfig.tryTimes"
            class="w-full"
          />
        </div>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">尝试间隔:</div>
        <div class="flex-1">
          <InputNumber
            v-model:value="globalConfig.tryDelta"
            class="w-full"
          />
        </div>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">用户最大同时上传任务:</div>
        <Select
          v-model:value="globalConfig.maxUploadTasks"
          :options="one2threeOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">用户最大同时下载任务:</div>
        <Select
          v-model:value="globalConfig.maxDownloadTasks"
          :options="one2threeOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">用户最大失败任务数量:</div>
        <Select
          v-model:value="globalConfig.maxFailedTasks"
          :options="one2threeOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">每个任务上传线程数量:</div>
        <Select
          v-model:value="globalConfig.uploadThreads"
          :options="one2threeOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">每个任务下载线程数量:</div>
        <Select
          v-model:value="globalConfig.downloadThreads"
          :options="one2threeOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">上传不校验:</div>
        <Select
          v-model:value="globalConfig.noVerifyUpload"
          :options="trueOrFalseOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">下载不校验:</div>
        <Select
          v-model:value="globalConfig.noVerifyDownload"
          :options="trueOrFalseOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">仅下载中校验:</div>
        <Select
          v-model:value="globalConfig.noVerifyDownloadOnDisk"
          :options="trueOrFalseOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">用户名:</div>
        <div class="flex-1">
          <Input
            v-model:value="globalConfig.username"
            class="w-full"
          />
        </div>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">密码:</div>
        <div class="flex-1">
          <Input
            v-model:value="globalConfig.password"
            class="w-full"
          />
        </div>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">端口:</div>
        <div class="flex-1">
          <InputNumber
            v-model:value="globalConfig.port"
            min="1"
            max="65535"
            class="w-full"
          />
        </div>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">token密钥:</div>
        <div class="flex-1">
          <Input
            v-model:value="globalConfig.token_secret"
            class="w-full"
          />
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { httpConfig, httpModConfig } from '@src/common/api'
import { config } from '@src/common/config'
import InputNumber from '@src/ui-components/input-number.vue'
import Input from '@src/ui-components/input.vue'
import Modal from '@src/ui-components/modal.vue'
import Select from '@src/ui-components/select.vue'
import { type IHttpConfigRes } from 'baidu-netdisk-srv/types'
import { onMounted, ref } from 'vue'

interface IProps {
  onOk?: () => void
  onCancel?: () => void
}

const props = defineProps<IProps>()

const globalConfig = ref<IHttpConfigRes>({
  tryTimes: 0,
  tryDelta: 0,
  maxUploadTasks: 0,
  maxDownloadTasks: 0,
  maxFailedTasks: 0,
  uploadThreads: 0,
  downloadThreads: 0,
  noVerifyUpload: false,
  noVerifyDownload: false,
  noVerifyDownloadOnDisk: false,
  username: '',
  password: '',
  port: 0,
  token_secret: '',
})

onMounted(async () => {
  try {
    globalConfig.value = await httpConfig()
  } catch {}
})

async function onOkThis() {
  try {
    await httpModConfig(globalConfig.value)

    props.onOk?.()
  } catch {}
}

const one2threeOptions = Array(3)
  .fill(0)
  .map((item, index) => ({ label: `${index + 1}`, value: index + 1 }))

const trueOrFalseOptions = [
  { label: '是', value: true },
  { label: '否', value: false },
]

function getFormItemClass() {
  return config.isMobile ? 'mb-8' : 'mb-8 flex items-center'
}

function getFormItemLabelClass() {
  return config.isMobile ? 'w-[168px]' : 'mr-8 w-[168px] text-right'
}
</script>
