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
        <div :class="getFormItemLabelClass()">
          <div>尝试次数</div>
          <Tooltip type="question">
            <div>上传/下载 请求最多进行的次数</div>
            <div>用于降低网络波动对任务的影响</div>
          </Tooltip>
        </div>
        <div class="flex-1">
          <InputNumber
            v-model:value="globalConfig.tryTimes"
            class="w-full"
          />
        </div>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">
          <div>尝试间隔</div>
          <Tooltip type="question">
            <div>请求失败后隔多久再次请求</div>
          </Tooltip>
        </div>
        <div class="flex-1">
          <InputNumber
            v-model:value="globalConfig.tryDelta"
            class="w-full"
          />
        </div>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">
          <div>最大同时上传数</div>
          <Tooltip type="question">
            <div>范围: 单个百度用户</div>
          </Tooltip>
        </div>
        <Select
          v-model:value="globalConfig.maxUploadTasks"
          :options="one2threeOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">
          <div>最大同时下载数</div>
          <Tooltip type="question">
            <div>范围: 单个百度用户</div>
          </Tooltip>
        </div>
        <Select
          v-model:value="globalConfig.maxDownloadTasks"
          :options="one2threeOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">
          <div>最大失败任务数</div>
          <Tooltip type="question">
            <div>失败任务数量达到该数量后</div>
            <div>任务队列将不会继续进行新的任务</div>
            <div>范围: 单个百度用户</div>
          </Tooltip>
        </div>
        <Select
          v-model:value="globalConfig.maxFailedTasks"
          :options="one2threeOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">
          <div>上传线程数</div>
          <Tooltip type="question">
            <div>控制单个任务的线程数</div>
          </Tooltip>
        </div>
        <Select
          v-model:value="globalConfig.uploadThreads"
          :options="one2threeOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">
          <div>下载线程数</div>
          <Tooltip type="question">
            <div>控制单个任务的线程数</div>
          </Tooltip>
        </div>
        <Select
          v-model:value="globalConfig.downloadThreads"
          :options="one2threeOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">
          <div>上传不校验</div>
          <Tooltip type="question">
            <div>是否在上传文件后再下载校验</div>
            <div>仅在内存中进行, 不会下载到硬盘</div>
          </Tooltip>
        </div>
        <Select
          v-model:value="globalConfig.noVerifyUpload"
          :options="trueOrFalseOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">
          <div>下载不校验</div>
          <Tooltip type="question">
            <div>是否对下载文件进行校验</div>
            <div>仅加密文件支持下载校验</div>
          </Tooltip>
        </div>
        <Select
          v-model:value="globalConfig.noVerifyDownload"
          :options="trueOrFalseOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">
          <div>仅下载中校验</div>
          <Tooltip type="question">
            <div>
              <div>是: 仅在内存中校验数据</div>
              <div>否: 下载完成后校验硬盘文件</div>
            </div>
          </Tooltip>
        </div>
        <Select
          v-model:value="globalConfig.noVerifyDownloadOnDisk"
          :options="trueOrFalseOptions"
          class="flex-1"
        ></Select>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">
          <div>下载保存位置</div>
          <Tooltip type="question">
            <div>下载文件保存路径 (服务器路径)</div>
          </Tooltip>
        </div>
        <div class="flex-1">
          <Input
            v-model:value="globalConfig.downloadLocation"
            class="w-full"
          />
        </div>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">用户名</div>
        <div class="flex-1">
          <Input
            v-model:value="globalConfig.username"
            class="w-full"
          />
        </div>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">密码</div>
        <div class="flex-1">
          <Input
            v-model:value="globalConfig.password"
            class="w-full"
          />
        </div>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()">端口</div>
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
        <div :class="getFormItemLabelClass()">token密钥</div>
        <div class="flex-1">
          <Input
            v-model:value="globalConfig.token_secret"
            class="w-full"
          />
        </div>
      </div>
      <div :class="getFormItemClass()">
        <div :class="getFormItemLabelClass()"></div>
        <div class="text-12px text-gray-400">部分设置需要重启服务后生效</div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { httpConfig, httpModConfig } from '@src/common/api'
import { config } from '@src/common/config'
import InputNumber from '@src/ui-components/input-number.vue'
import Input from '@src/ui-components/input.vue'
import Message from '@src/ui-components/message'
import Modal from '@src/ui-components/modal.vue'
import Select from '@src/ui-components/select.vue'
import Tooltip from '@src/ui-components/tooltip.vue'
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
  downloadLocation: '',
  username: '',
  password: '',
  port: 0,
  token_secret: '',
})

onMounted(async () => {
  try {
    globalConfig.value = await httpConfig()
  } catch (inErr) {
    Message.error(`获取配置失败: ${(inErr as Error).message}`)
  }
})

async function onOkThis() {
  try {
    await httpModConfig(globalConfig.value)
    Message.success('修改配置成功')
    props.onOk?.()
  } catch (inErr) {
    Message.error(`修改配置失败: ${(inErr as Error).message}`)
  }
}

const one2threeOptions = Array(3)
  .fill(0)
  .map((item, index) => ({ label: `${index + 1}`, value: index + 1 }))

const trueOrFalseOptions = [
  { label: '是', value: true },
  { label: '否', value: false },
]

function getFormItemClass() {
  return config.isMobile ? 'mb-16' : 'mb-8 flex items-center'
}

function getFormItemLabelClass() {
  return config.isMobile
    ? 'w-[132px] flex items-center mb-8'
    : 'mr-8 w-[132px] flex items-center justify-end'
}
</script>
