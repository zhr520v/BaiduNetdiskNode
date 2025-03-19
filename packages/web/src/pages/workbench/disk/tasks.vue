<template>
  <div class="flex-1 overflow-auto pt-16">
    <div
      class="mx-auto mb-16 border-gray-200"
      :class="config.isMobile ? 'max-w-full border-b' : 'max-w-[1280px] border'"
    >
      <div class="flex items-center bg-gray-700 p-8 text-white">自定义任务</div>

      <div class="flex flex-col gap-8 p-8">
        <div
          v-if="info.downloadTasks.length"
          class="flex flex-col gap-8"
        >
          <WidgetTask
            v-for="task in info.downloadTasks"
            :key="task.id"
            v-bind="task"
            type="download"
          />
        </div>

        <div
          v-if="info.downloadQueue"
          class="flex items-center gap-8"
        >
          <div
            v-if="info.downloadQueue"
            class="rounded-3 flex items-center bg-gray-100 px-4 py-1"
          >
            <i class="iconfont icon-download text-20 text-blue-600"></i>
            <span class="flex-1 pl-8 pr-4 text-center text-blue-600">
              {{ info.downloadQueue }}
            </span>
          </div>
        </div>

        <div
          v-if="!info.downloadTasks.length && !info.downloadQueue"
          class="text-center text-gray-400"
        >
          无任务
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { httpDiskTasks } from '@src/common/api'
import { config } from '@src/common/config'
import WidgetTask from '@src/components/widget-task.vue'
import Message from '@src/ui-components/message'
import { type IHttpDiskTasksRes } from 'baidu-netdisk-srv/types'
import { onMounted, onUnmounted, ref } from 'vue'

const timer = ref<number | undefined>(void 0)

const info = ref<IHttpDiskTasksRes>({
  downloadQueue: 0,
  downloadTasks: [],
})

onMounted(async () => {
  getTasks()
})

onUnmounted(() => {
  if (timer.value) {
    clearTimeout(timer.value)
    timer.value = void 0
  }
})

async function getTasks() {
  try {
    info.value = await httpDiskTasks()
  } catch (inErr) {
    Message.error(`获取列表失败: ${(inErr as Error).message}`)
  } finally {
    timer.value = window.setTimeout(() => {
      getTasks()
    }, 3000)
  }
}
</script>
