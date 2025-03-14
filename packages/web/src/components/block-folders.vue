<template>
  <div class="mb-16">
    <div v-if="folders.length">
      <div
        v-for="folder in folders"
        :key="folder.id"
        class="common-shadow mb-16"
      >
        <div class="flex items-center justify-between bg-gray-700 p-8 text-white">
          <div class="flex items-center gap-8">
            <div>目录</div>
            <i
              v-if="folder.encrypt"
              class="iconfont icon-lock text-20 text-green-400"
            ></i>
            <i
              v-else
              class="iconfont icon-nolock text-20 text-red-400"
            ></i>
          </div>

          <div class="flex items-center gap-8">
            <div
              v-if="folder.checking"
              class="loader h-20 w-20 border-[3px] border-[#fff]"
            ></div>
            <IconButton
              v-else
              icon-class="icon-manual"
              @click="manualCheck(folder.id)"
            ></IconButton>
            <IconButton
              icon-class="icon-edit"
              @click="modFolderId = folder.id"
            ></IconButton>
            <IconButton
              icon-class="icon-close"
              @click="onDeleteClick(folder.id)"
            ></IconButton>
          </div>
        </div>

        <div class="p-8 text-gray-700">
          <div
            v-if="config.isMobile"
            class="mb-8"
          >
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
            class="mb-8 flex items-center"
          >
            <div class="flex flex-1 items-center justify-end">
              <div
                class="mr-4 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-right"
              >
                {{ folder.local }}
              </div>
              <i class="iconfont icon-computer text-24"></i>
            </div>
            <div class="ml-8 mr-8 flex items-center">
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

          <div :class="config.isMobile ? '' : 'flex items-center gap-16'">
            <div
              class="flex items-center gap-16 text-gray-700"
              :class="config.isMobile ? 'mb-8' : ''"
            >
              <div class="w-[156px]">
                下次启动:
                <span class="text-yellow-700">{{ getNextTime(folder.trigger.starts) }}</span>
              </div>
              <div class="w-[156px]">
                下次停止:
                <span class="text-yellow-700">{{ getNextTime(folder.trigger.stops) }}</span>
              </div>
            </div>
            <div class="flex items-center">
              <div class="flex flex-1 items-center gap-16">
                <div class="w-[156px]">
                  等待上传:
                  <span class="text-orange-600">{{ folder.uploadQueue }}</span>
                </div>
                <div class="w-[156px]">
                  等待下载:
                  <span class="text-blue-600">{{ folder.downloadQueue }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="p-8">
          <div v-if="folder.uploadTasks.length || folder.downloadTasks.length">
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
            v-else
            class="pb-8 pt-8 text-center text-gray-400"
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

    <ModalFolder
      v-if="!!modFolderId"
      :id="modFolderId"
      :app-name="props.appName"
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
import { type IHttpFoldersInfoRes } from 'baidu-netdisk-srv/types'
import { onMounted, ref } from 'vue'

interface IProps {
  appName: string
}

const props = defineProps<IProps>()
const folders = ref<IHttpFoldersInfoRes['folders']>([])
const modFolderId = ref('')

onMounted(() => {
  getFoldersInfo()
})

async function getFoldersInfo() {
  try {
    const realTimeInfo = await httpFoldersInfo()
    folders.value = realTimeInfo.folders
  } catch (inErr) {
    Message.error(`获取目录失败: ${(inErr as Error).message}`)
  }

  setTimeout(() => getFoldersInfo(), 3000)
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

function getNextTime(inTimes: string[]) {
  if (inTimes.length === 0) {
    return '无 (手动)'
  }

  const sorted = inTimes.map(_ => _).sort()

  const hour = new Date().getHours()
  const minute = new Date().getMinutes()

  const i = sorted.findIndex(v => {
    const h = parseInt(v.split(':')[0], 10)
    const m = parseInt(v.split(':')[1], 10)

    if (h < hour) {
      return false
    }

    if (h === hour) {
      return m > minute
    }

    return true
  })

  if (i !== -1) {
    return `今天${sorted[i]}`
  }

  return `明天${sorted[0]}`
}
</script>
