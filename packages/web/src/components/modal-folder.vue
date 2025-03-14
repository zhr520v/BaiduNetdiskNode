<template>
  <Modal
    :title="props.id ? '修改同步目录' : '添加同步目录'"
    :size="config.isMobile ? 'tiny' : 'small'"
    :overflow-hidden="true"
    @ok="onOkThis"
    @cancel="onCancelThis"
  >
    <div class="flex-1 overflow-y-auto">
      <div class="mb-8 flex items-center">
        <div class="mr-8 w-72 text-right">本地</div>

        <div class="flex-1">
          <Input
            v-model:value="local"
            placeholder=""
            class="w-full"
          />
        </div>

        <IconButton
          size="large"
          icon-class="icon-folder"
          class="text-yellow-400"
          @click="chooseLocalFolderDialogVisible = true"
        ></IconButton>
      </div>

      <div class="mb-8 flex items-center">
        <div class="mr-8 w-72 text-right">网盘</div>
        <div class="flex-1">
          <Input
            v-model:value="remote"
            placeholder=""
            class="w-full"
          />
        </div>
      </div>

      <div class="mb-8 flex items-center">
        <div class="mr-8 w-72 text-right">加密</div>
        <div class="flex-1">
          <Input
            v-model:value="encrypt"
            placeholder=""
            class="w-full"
          />
        </div>
      </div>
      <div class="mb-8 flex items-center">
        <div class="mr-8 w-72 text-right">同步方向</div>
        <Select
          v-model:value="direction"
          :options="directionOptions"
          class="w-[200px]"
          direction="L"
        ></Select>
      </div>
      <div
        v-if="direction === 1 || direction === 2"
        class="mb-8 flex items-center"
      >
        <div class="mr-8 w-72 text-right">同步操作</div>
        <Select
          v-model:value="operation"
          :options="operationOptions"
          class="w-[200px]"
          direction="L"
        ></Select>
      </div>
      <div
        v-if="direction === 3"
        class="mb-8 flex items-center"
      >
        <div class="mr-8 w-72 text-right">冲突时</div>
        <Select
          v-model:value="conflict"
          :options="conflictOptions"
          class="w-[200px]"
          direction="L"
        ></Select>
      </div>
      <div class="mb-8 flex items-center">
        <div class="mr-8 w-72 text-right">触发方式</div>
        <Select
          v-model:value="trigger.way"
          :options="triggerWayOptions"
          class="w-[200px]"
          direction="L"
        ></Select>
      </div>
      <div class="mb-8 flex items-baseline">
        <div class="mr-8 w-72 text-right">启动时间</div>
        <div class="flex-1">
          <div
            v-if="trigger.starts.length > 0"
            class="mb-8 flex flex-wrap gap-8"
          >
            <Tag
              v-for="start in trigger.starts"
              :key="start"
              :closable="true"
              @close="onStartTagClose(start)"
            >
              {{ start }}
            </Tag>
          </div>
          <div
            v-else
            class="mb-8 flex flex-wrap gap-8"
          >
            <Tag type="warning">无</Tag>
          </div>

          <div class="flex items-center">
            <Select
              v-model:value="startHour"
              :options="hourOptions"
            ></Select>
            <div class="ml-2 mr-2">:</div>
            <Select
              v-model:value="startMinute"
              :options="minuteOptions"
            ></Select>

            <IconButton
              icon-class="icon-add"
              class="ml-4 text-gray-600"
              @click="onStartPlusClick"
            ></IconButton>
          </div>
        </div>
      </div>
      <div class="mb-8 flex items-baseline">
        <div class="mr-8 w-72 text-right">停止时间</div>
        <div class="flex-1">
          <div
            v-if="trigger.stops.length > 0"
            class="mb-8 flex flex-wrap gap-8"
          >
            <Tag
              v-for="stop in trigger.stops"
              :key="stop"
              :closable="true"
              type="error"
              @close="onStopTagClose(stop)"
            >
              {{ stop }}
            </Tag>
          </div>
          <div
            v-else
            class="mb-8 flex flex-wrap gap-8"
          >
            <Tag type="warning">无</Tag>
          </div>

          <div class="flex items-center">
            <Select
              v-model:value="stopHour"
              :options="hourOptions"
            ></Select>
            <div class="ml-2 mr-2">:</div>
            <Select
              v-model:value="stopMinute"
              :options="minuteOptions"
            ></Select>

            <IconButton
              icon-class="icon-add"
              class="ml-4 text-gray-600"
              @click="onStopPlusClick"
            ></IconButton>
          </div>
        </div>
      </div>
      <div class="flex items-baseline">
        <div class="mr-8 flex w-72 items-center justify-end">
          排除
          <Tooltip type="question">
            <div>
              <div class="rounded-3 mb-8 bg-orange-100 px-6">
                <div>F/** : 排除根目录 F</div>
                <div>f.txt : 排除根目录 f.txt</div>
                <div>**/F/** : 排除所有 F</div>
                <div>**/f.txt : 排除所有 f.txt</div>
              </div>
              <div>· Glob格式 一行一条规则</div>
              <div>· '根目录' 指同步文件夹</div>
              <div class="mb-8">· 排除项不要以 '/' 开头</div>
              <div>填写示例:</div>
              <div class="rounded-3 bg-blue-100 px-6">
                <div>ABCD/**</div>
                <div>E.txt</div>
                <div>**/FGHI/**</div>
                <div>**/J.txt</div>
              </div>
            </div>
          </Tooltip>
        </div>
        <div
          ref="excludesDiv"
          contenteditable="plaintext-only"
          class="rounded-3 flex-1 whitespace-pre bg-gray-200 p-8 outline-none"
          @input="onExcludesChange"
        ></div>
      </div>

      <ModalLocalFolder
        v-if="chooseLocalFolderDialogVisible"
        @ok="onChooseLocalFolderDialogOk"
        @cancel="chooseLocalFolderDialogVisible = false"
      />
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { httpAddFolder, httpFolder, httpModFolder } from '@src/common/api'
import { config } from '@src/common/config'
import ModalLocalFolder from '@src/components/modal-local-folder.vue'
import IconButton from '@src/ui-components/icon-button.vue'
import Input from '@src/ui-components/input.vue'
import Message from '@src/ui-components/message'
import Modal from '@src/ui-components/modal.vue'
import Select from '@src/ui-components/select.vue'
import Tag from '@src/ui-components/tag.vue'
import Tooltip from '@src/ui-components/tooltip.vue'
import { type IHttpFolderRes } from 'baidu-netdisk-srv/types'
import { onMounted, ref } from 'vue'

interface IProps {
  id?: string
  appName: string
  onOk?: () => void
  onCancel?: () => void
}

const props = defineProps<IProps>()

const local = ref('')
const remote = ref(`/apps/${props.appName}/`)
const encrypt = ref('')
const direction = ref(1)
const operation = ref(1)
const conflict = ref(1)
const trigger = ref<IHttpFolderRes['trigger']>({ way: 1, starts: [], stops: [] })
const excludes = ref<string[]>([])
const excludesDiv = ref<HTMLDivElement | null>(null)
const chooseLocalFolderDialogVisible = ref(false)
const startHour = ref('00')
const startMinute = ref('00')
const stopHour = ref('00')
const stopMinute = ref('00')

function onExcludesChange(e: Event) {
  excludes.value = (e.target as HTMLDivElement).innerText
    .split('\n')
    .filter(_ => _.trim())
    .map(_ => _.trim())
}

onMounted(async () => {
  if (props.id) {
    try {
      const data = await httpFolder({ id: props.id })

      local.value = data.local
      remote.value = data.remote
      encrypt.value = data.encrypt
      direction.value = data.direction
      operation.value = data.operation
      conflict.value = data.conflict
      trigger.value = data.trigger
      excludes.value = data.excludes
    } catch (inErr) {
      Message.error(`获取信息失败: ${(inErr as Error).message}`)
    }
  }

  if (excludesDiv.value) {
    excludesDiv.value.innerText = excludes.value.join('\n')
  }
})

async function onCancelThis() {
  props.onCancel?.()
}

async function onOkThis() {
  try {
    if (props.id) {
      await httpModFolder({
        id: props.id,
        folder: {
          local: local.value,
          remote: remote.value,
          encrypt: encrypt.value,
          direction: direction.value,
          operation: operation.value,
          conflict: conflict.value,
          trigger: trigger.value,
          excludes: excludes.value,
        },
      })
    } else {
      await httpAddFolder({
        local: local.value,
        remote: remote.value,
        encrypt: encrypt.value,
        direction: direction.value,
        operation: operation.value,
        conflict: conflict.value,
        trigger: trigger.value,
        excludes: excludes.value,
      })
    }

    Message.success(`${props.id ? '修改' : '添加'}文件夹成功`)
    props.onOk?.()
  } catch (inErr) {
    Message.error(`${props.id ? '修改' : '添加'}文件夹失败: ${(inErr as Error).message}`)
  }
}

function onChooseLocalFolderDialogOk(inPath: string) {
  chooseLocalFolderDialogVisible.value = false
  local.value = inPath
}

function onStartTagClose(inStart: string) {
  trigger.value.starts = trigger.value.starts.filter(item => item !== inStart)
}

function onStartPlusClick() {
  const val = `${startHour.value.toString().padStart(2, '0')}:${startMinute.value.toString().padStart(2, '0')}`

  if (trigger.value.starts.find(item => item === val)) {
    return
  }

  trigger.value.starts.push(val)
  startHour.value = '00'
  startMinute.value = '00'
}

function onStopTagClose(inStop: string) {
  trigger.value.stops = trigger.value.stops.filter(item => item !== inStop)
}

function onStopPlusClick() {
  const val = `${stopHour.value.toString().padStart(2, '0')}:${stopMinute.value.toString().padStart(2, '0')}`

  if (trigger.value.stops.find(item => item === val)) {
    // !!! $Message
    return
  }

  trigger.value.stops.push(val)
  stopHour.value = '00'
  stopMinute.value = '00'
}

const directionOptions = [
  {
    label: '仅上传',
    value: 1,
  },
  {
    label: '仅下载',
    value: 2,
  },
  {
    label: '双向混合',
    value: 3,
  },
]
const operationOptions = [
  {
    label: '新增 | 修改',
    value: 1,
  },
  {
    label: '新增 | 修改 | 删除',
    value: 2,
  },
]
const conflictOptions = [
  {
    label: '以本地为准',
    value: 1,
  },
  {
    label: '以网盘为准',
    value: 2,
  },
]
const triggerWayOptions = [
  {
    label: '定时启停',
    value: 1,
  },
  {
    label: '定时检查',
    value: 2,
  },
]
const hourOptions = Array(24)
  .fill(0)
  .map((item, index) => {
    const val = index.toString().padStart(2, '0')

    return { label: val, value: val }
  })
const minuteOptions = Array(60)
  .fill(0)
  .map((item, index) => {
    const val = index.toString().padStart(2, '0')

    return { label: val, value: val }
  })
</script>
