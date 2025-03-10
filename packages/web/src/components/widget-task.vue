<template>
  <div class="common-shadow z-[1] mb-8 p-8">
    <div class="direction mb-8 flex items-center">
      <i
        v-if="type === 'upload'"
        class="iconfont icon-arrow-up-long text-16 mr-4 text-orange-600"
      ></i>
      <i
        v-if="type === 'download'"
        class="iconfont icon-arrow-up-long text-16 mr-4 rotate-180 text-blue-600"
      ></i>
      <div class="flex flex-1 items-center gap-8">
        <div
          :class="['h-24 w-24 bg-contain bg-center bg-no-repeat', getFileIconClass()].join(' ')"
        ></div>
        <div class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ filename }}</div>
      </div>
      <div class="flex items-center">
        <IconButton
          v-if="props.stepStatus === EStepStatus.STOPPED"
          icon-class="icon-play"
          class="text-green-600"
          @click="onPlayClick"
        ></IconButton>

        <IconButton
          v-if="props.stepStatus === EStepStatus.RUNNING"
          icon-class="icon-pause"
          class="text-orange-600"
          @click="onPauseClick"
        ></IconButton>

        <IconButton
          icon-class="icon-close"
          class="text-red-600"
          @click="onDeleteClick"
        ></IconButton>
      </div>
    </div>

    <Progress
      :percentage="percentage"
      class="mb-8"
    ></Progress>

    <div class="flex items-center gap-8">
      <div
        v-if="props.stepStatus !== EStepStatus.STOPPED"
        class="loader w-16 border-[3px] border-[#66AA66]"
      ></div>
      <div
        :class="getStatusClass()"
        class="mr-8"
      >
        {{ getStatusText() }}
      </div>
      <div class="flex-1">
        <div
          v-if="props.stepStatus === EStepStatus.RUNNING"
          class="flex items-center justify-end"
        >
          <span class="mr-8">{{ percentage.toFixed(2) }}%</span>
        </div>
        <div
          v-if="props.stepStatus === EStepStatus.STOPPED"
          class="font-bold text-red-600"
        >
          {{ props.stepErrMsg }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { httpActTask } from '@src/common/api'
import { __FILEICONS__, getDownloadStepName, getUploadStepName } from '@src/common/const'
import Dialog from '@src/ui-components/dialog'
import IconButton from '@src/ui-components/icon-button.vue'
import Progress from '@src/ui-components/progress.vue'
import { EDownloadSteps, EStepStatus, EUploadSteps } from 'baidu-netdisk-sdk/types'
import { type IHttpFoldersInfoItem } from 'baidu-netdisk-srv/types'
import { computed } from 'vue'

type IProps = IHttpFoldersInfoItem & {
  type: 'upload' | 'download'
}

const props = defineProps<IProps>()

function getStatusClass() {
  if (props.stepStatus === EStepStatus.RUNNING) {
    return 'text-green-600'
  }

  if (props.stepStatus === EStepStatus.STOPPED) {
    return 'text-red-600'
  }

  if (props.stepStatus === EStepStatus.FINISHED) {
    return 'text-blue-600'
  }

  return ''
}

function getStatusText() {
  if (props.stepStatus === EStepStatus.CREATED) {
    return '已创建'
  }

  if (props.stepStatus === EStepStatus.RUNNING) {
    if (props.type === 'upload') {
      return getUploadStepName(props.stepId as EUploadSteps)
    }

    if (props.type === 'download') {
      return getDownloadStepName(props.stepId as EDownloadSteps)
    }

    return '运行中'
  }

  if (props.stepStatus === EStepStatus.STOPPED) {
    return '已停止'
  }

  if (props.stepStatus === EStepStatus.FINISHED) {
    return '已完成'
  }

  return '无状态'
}

async function onPlayClick() {
  try {
    await httpActTask({
      id: props.id,
      type: props.type,
      action: 'play',
    })
  } catch {}
}

async function onPauseClick() {
  try {
    await httpActTask({
      id: props.id,
      type: props.type,
      action: 'pause',
    })
  } catch {}
}

async function onDeleteClick() {
  if (!(await Dialog.confirm({ title: '删除任务', okText: '删除', okType: 'error' }))) {
    return
  }

  try {
    await httpActTask({
      id: props.id,
      type: props.type,
      action: 'del',
    })
  } catch {}
}

const filename = computed(() => {
  return props.local.split('/').pop()
})

const fileSuffix = computed(() => {
  return (props.local.split('.').pop() || '').toLowerCase()
})

function getFileIconClass() {
  for (const item of __FILEICONS__) {
    if (item.matches.includes(fileSuffix.value)) {
      return item.className
    }
  }

  return 'png-unknown'
}

const percentage = computed(() => {
  if (props.type === 'upload') {
    if (props.stepId === EUploadSteps.VERIFY_DOWNLOAD) {
      return (props.downBytes / props.comSize) * 100
    }

    return (props.upBytes / props.comSize) * 100
  } else {
    return (props.downBytes / props.comSize) * 100
  }
})
</script>
