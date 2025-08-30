<template>
  <div class="flex-1 overflow-auto pt-16">
    <div
      class="mx-auto"
      :class="config.isMobile ? 'max-w-full' : 'max-w-[1280px]'"
    >
      <div v-if="folders.length">
        <div
          v-for="folder in folders"
          :key="folder.id"
          class="mb-16 border-gray-200"
          :class="config.isMobile ? 'border-b' : 'border'"
        >
          <div class="flex items-center justify-between bg-gray-800 p-8">
            <div class="flex items-center gap-16">
              <div class="text-white">目录</div>
              <Tooltip>
                <template #trigger>
                  <i
                    class="iconfont text-20"
                    :class="
                      folder.encrypt ? 'icon-lock text-green-400' : 'icon-nolock text-red-400'
                    "
                  ></i>
                </template>
                <div>加密状态: {{ folder.encrypt ? '加密' : '未加密' }}</div>
              </Tooltip>
              <Tooltip>
                <template #trigger>
                  <i
                    class="iconfont icon-timerstart text-20"
                    :class="folder.nextStart ? 'text-blue-400' : 'text-gray-400'"
                  ></i>
                </template>
                <div>下次启动时间: {{ getNextTime(folder.nextStart) }}</div>
              </Tooltip>
              <Tooltip>
                <template #trigger>
                  <i
                    class="iconfont icon-timerstop text-20"
                    :class="folder.nextStop ? 'text-orange-400' : 'text-gray-400'"
                  ></i>
                </template>
                <div>下次停止时间: {{ getNextTime(folder.nextStop) }}</div>
              </Tooltip>
            </div>

            <div class="flex items-center gap-8">
              <div
                v-if="folder.checking"
                class="loader h-28 w-28"
              ></div>
              <IconButton
                v-else
                icon-class="icon-manual"
                class="text-white"
                @click="manualCheck(folder.id)"
              ></IconButton>
              <IconButton
                icon-class="icon-edit"
                class="text-white"
                @click="modFolderId = folder.id"
              ></IconButton>
              <IconButton
                icon-class="icon-close"
                class="text-white"
                @click="onDeleteClick(folder.id)"
              ></IconButton>
            </div>
          </div>

          <div class="flex flex-col gap-8 p-8">
            <div v-if="config.isMobile">
              <div class="flex items-center">
                <div class="flex flex-col items-center justify-start">
                  <i
                    v-if="folder.direction === 1"
                    class="iconfont icon-arrow-up-long font-bold text-orange-600"
                  ></i>
                  <i
                    v-if="folder.direction === 2"
                    class="iconfont icon-arrow-up-long rotate-180 font-bold text-blue-600"
                  ></i>
                  <i
                    v-if="folder.direction === 3"
                    class="iconfont icon-arrow-up-down left-orange-right-blue font-bold"
                  ></i>
                </div>
                <div class="flex-1">
                  <div class="flex items-center">
                    <i class="iconfont icon-cloud text-24"></i>
                    <div class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      {{ folder.remote }}
                    </div>
                  </div>
                  <div class="flex items-center">
                    <i class="iconfont icon-computer text-24"></i>
                    <div class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      {{ folder.local }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              v-else
              class="flex items-center"
            >
              <div class="flex flex-1 items-center justify-end">
                <div
                  class="mr-4 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-right"
                >
                  {{ folder.local }}
                </div>
                <i class="iconfont icon-computer text-24"></i>
              </div>
              <div class="mx-8 flex items-center">
                <i
                  v-if="folder.direction === 1"
                  class="iconfont icon-arrow-up-long rotate-90 font-bold text-orange-600"
                ></i>
                <i
                  v-if="folder.direction === 2"
                  class="iconfont icon-arrow-up-long -rotate-90 font-bold text-blue-600"
                ></i>
                <i
                  v-if="folder.direction === 3"
                  class="iconfont icon-arrow-up-down left-orange-right-blue rotate-90 font-bold"
                ></i>
              </div>
              <div class="flex flex-1 items-center">
                <i class="iconfont icon-cloud text-24"></i>
                <div class="ml-4 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {{ folder.remote }}
                </div>
              </div>
            </div>

            <div
              v-if="folder.uploadTasks.length || folder.downloadTasks.length"
              class="flex flex-col gap-8"
            >
              <WidgetTask
                v-for="task in folder.uploadTasks"
                :key="task.id"
                v-bind="task"
                type="upload"
              />
              <WidgetTask
                v-for="task in folder.downloadTasks"
                :key="task.id"
                v-bind="task"
                type="download"
              />
            </div>

            <div
              v-if="folder.uploadQueue || folder.downloadQueue"
              class="flex items-center gap-8"
            >
              <Tooltip v-if="folder.uploadQueue">
                <template #trigger>
                  <div class="rounded-3 flex items-center bg-gray-100 px-4 py-1">
                    <i class="iconfont icon-upload text-20"></i>
                    <span class="flex-1 pl-8 pr-4 text-center">
                      {{ folder.uploadQueue }}
                    </span>
                  </div>
                </template>
                <div>上传队列: {{ folder.uploadQueue }}</div>
              </Tooltip>

              <Tooltip v-if="folder.downloadQueue">
                <template #trigger>
                  <div class="rounded-3 flex items-center bg-gray-100 px-4 py-1">
                    <i class="iconfont icon-download text-20"></i>
                    <span class="flex-1 pl-8 pr-4 text-center">
                      {{ folder.downloadQueue }}
                    </span>
                  </div>
                </template>
                <div>下载队列: {{ folder.downloadQueue }}</div>
              </Tooltip>
            </div>

            <div
              v-if="
                !folder.uploadTasks.length &&
                !folder.downloadTasks.length &&
                !folder.uploadQueue &&
                !folder.downloadQueue
              "
              class="text-center text-gray-400"
            >
              无任务
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        class="pb-16 pt-16 text-center text-gray-400"
      >
        无目录
      </div>
    </div>

    <ModalFolder
      v-if="!!modFolderId"
      :id="modFolderId"
      @ok="modFolderId = ''"
      @cancel="modFolderId = ''"
    />
  </div>
</template>

<script setup lang="ts">
import { httpDelFolder, httpFoldersInfo, httpManualCheck } from '@src/common/api'
import { config } from '@src/common/config'
import ModalFolder from '@src/components/modal-folder.vue'
import WidgetTask from '@src/components/widget-task.vue'
import Dialog from '@src/ui-components/dialog'
import IconButton from '@src/ui-components/icon-button.vue'
import Message from '@src/ui-components/message'
import Tooltip from '@src/ui-components/tooltip.vue'
import { type IHttpFoldersInfoRes } from 'baidu-netdisk-srv/types'
import dayjs from 'dayjs'
import { onMounted, onUnmounted, ref } from 'vue'

const folders = ref<IHttpFoldersInfoRes['folders']>([])
const modFolderId = ref('')
const timer = ref<number | undefined>(void 0)

onMounted(() => {
  getFoldersInfo()
})

onUnmounted(() => {
  if (timer.value) {
    clearTimeout(timer.value)
    timer.value = void 0
  }
})

async function getFoldersInfo() {
  try {
    const realTimeInfo = await httpFoldersInfo()
    folders.value = realTimeInfo.folders
  } catch (inErr) {
    Message.error(`获取目录失败: ${(inErr as Error).message}`)
  }

  timer.value = window.setTimeout(() => getFoldersInfo(), 3000)
}

async function onDeleteClick(inFolderId: string) {
  if (!(await Dialog.confirm({ title: '删除同步目录', okText: '删除', okType: 'error' }))) {
    return
  }

  try {
    await httpDelFolder({ id: inFolderId })
    Message.success('删除成功')
  } catch (inErr) {
    Message.error(`删除失败: ${(inErr as Error).message}`)
  }
}

async function manualCheck(inId: string) {
  try {
    await httpManualCheck({ id: inId })
    Message.success('手动检查成功')
  } catch (inErr) {
    Message.error(`手动检查失败: ${(inErr as Error).message}`)
  }
}

function getNextTime(inTime: number) {
  if (!inTime) {
    return '无'
  }

  const nextDate = dayjs(inTime)
  const nowDate = dayjs(Date.now())

  if (nextDate.isBefore(nowDate)) {
    return '已过'
  }

  if (nextDate.isSame(nowDate, 'day')) {
    return nextDate.format('今天 HH:mm')
  }

  if (nextDate.isSame(nowDate.add(1, 'day'), 'day')) {
    return nextDate.format('明天 HH:mm')
  }

  if (nextDate.isSame(nowDate.add(2, 'day'), 'day')) {
    return nextDate.format('后天 HH:mm')
  }

  return nextDate.format('MM-DD HH:mm')
}
</script>
