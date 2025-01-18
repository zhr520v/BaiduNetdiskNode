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

          <div class="">
            <div class="text-gray-700">
              <div class="mb-4">
                <span class="mr-8 py-3">触发方式:</span>
                <span>{{ getTriggerWayText(folder.trigger.way) }}</span>
              </div>
              <div class="mb-4 flex items-baseline">
                <div class="mr-8 py-3">启动时间:</div>
                <div
                  v-if="folder.trigger.starts.length > 0"
                  class="flex flex-1 gap-8 overflow-y-auto"
                >
                  <Tag
                    v-for="start in folder.trigger.starts"
                    :key="start"
                  >
                    {{ start }}
                  </Tag>
                </div>

                <span v-else>无</span>
              </div>
              <div class="mb-4 flex items-baseline">
                <div class="mr-8 py-3">停止时间:</div>
                <div
                  v-if="folder.trigger.stops.length > 0"
                  class="flex flex-1 gap-8 overflow-y-auto"
                >
                  <Tag
                    v-for="stop in folder.trigger.stops"
                    :key="stop"
                    type="error"
                    :deleted="folder.trigger.way !== 1"
                  >
                    {{ stop }}
                  </Tag>
                </div>

                <span v-else>无</span>
              </div>
            </div>
          </div>
          <div class="flex items-center">
            <div class="flex flex-1 items-center gap-8">
              <div>
                等待上传:
                <span class="text-orange-600">{{ folder.uploadQueue }}</span>
              </div>
              <div>
                等待下载:
                <span class="text-blue-600">{{ folder.downloadQueue }}</span>
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
import IconButton from '@src/ui-components/icon-button.vue'
import Tag from '@src/ui-components/tag.vue'
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
  setInterval(getFoldersInfo, 3000)
})

async function getFoldersInfo() {
  try {
    const realTimeInfo = await httpFoldersInfo()
    folders.value = realTimeInfo.folders
  } catch {}
}

async function onDeleteClick(inFolderId: string) {
  try {
    await httpDelFolder({
      id: inFolderId,
    })
  } catch {}
}

function getTriggerWayText(inWay: number) {
  if (inWay === 1) {
    return '定时启停'
  }

  if (inWay === 2) {
    return '定时检查'
  }

  return ''
}

async function manualCheck(inId: string) {
  httpManualCheck({ id: inId }).catch()
}
</script>
