<template>
  <div class="flex flex-1 flex-col">
    <div class="shadow-light">
      <div
        class="mx-auto pb-8 pt-16"
        :class="config.isMobile ? 'max-w-full px-8' : 'max-w-[1280px]'"
      >
        <div class="mb-16 flex items-center gap-8">
          <div
            class="rounded-3"
            :class="{ 'bg-gray-200': view === 'list' }"
          >
            <IconButton
              icon-class="icon-listview"
              @click="view = 'list'"
            />
          </div>
          <div
            class="rounded-3"
            :class="{ 'bg-gray-200': view === 'grid' }"
          >
            <IconButton
              icon-class="icon-gridview"
              @click="view = 'grid'"
            />
          </div>

          <IconButton
            icon-class="icon-refresh"
            @click="onRefreshClick"
          />
        </div>

        <div class="flex gap-8">
          <IconButton
            icon-class="icon-arrow-up"
            class="-rotate-90"
            @click="path !== '/' && paths.pop()"
          />

          <div class="flex flex-1 flex-wrap items-center leading-[30px]">
            <div
              v-for="(item, i) in paths"
              :key="i"
              class="has-hover:hover:text-blue-700 cursor-pointer"
              @click="paths = paths.slice(0, i + 1)"
            >
              <span>{{ item.name }}</span>
              <span
                v-if="i < paths.length - 1"
                class="pl-4 pr-8"
              >
                >
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      ref="listRef"
      class="flex flex-1 flex-col overflow-auto"
      @scroll="listRef && (scrollPos = listRef.scrollTop)"
    >
      <div
        v-if="firstLoading"
        class="flex flex-1 items-center justify-center"
      >
        <div class="loader h-[96px] w-[96px] text-orange-600"></div>
      </div>

      <div
        v-else-if="!isEnd && files.length === 0"
        class="flex flex-1 items-center justify-center"
      >
        <Button>重新加载</Button>
      </div>

      <div
        v-else-if="isEnd && files.length === 0"
        class="flex flex-1 items-center justify-center"
      >
        <i class="iconfont icon-empty text-[120px] text-gray-400"></i>
      </div>

      <div
        v-else
        class="pt-16"
        :class="{ 'px-8': config.isMobile, 'pb-16': isEnd }"
      >
        <div
          v-if="view === 'list'"
          class="mx-auto flex flex-col gap-8"
          :class="config.isMobile ? 'max-w-full' : 'max-w-[1280px]'"
        >
          <div
            v-for="file in files"
            :key="file.fs_id"
            class="has-hover:hover:bg-gray-100 rounded-3 flex cursor-default select-none items-center gap-8 px-4"
            @dblclick="onDBClick(file)"
            @contextmenu="e => onContextMenu(e, file)"
          >
            <div class="flex h-48 w-48 flex-1 items-center gap-8">
              <div
                class="h-36 w-36 bg-contain bg-center bg-no-repeat"
                :class="getFileIconClass(file.path, file.isdir === 1)"
              ></div>
              <div class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {{ file.path.split('/').pop() || '' }}
              </div>
            </div>
            <div v-if="!config.isMobile">
              {{ formatDate(file.mtime * 1000) }}
            </div>
            <div class="w-[80px] text-right">
              {{ file.isdir === 1 ? '' : formatFileSize(file.size) }}
            </div>
          </div>
        </div>

        <div
          v-else
          class="mx-auto flex flex-wrap items-center gap-16"
          :class="config.isMobile ? 'max-w-full justify-center' : 'max-w-[1280px]'"
        >
          <div
            v-for="file in files"
            :key="file.fs_id"
            class="has-hover:hover:bg-gray-100 rounded-3 flex h-[92px] w-[92px] cursor-default select-none flex-col items-center justify-center gap-8"
            @dblclick="onDBClick(file)"
            @contextmenu="e => onContextMenu(e, file)"
          >
            <div
              class="h-36 w-36 bg-contain bg-center bg-no-repeat"
              :class="getFileIconClass(file.path, file.isdir === 1)"
            ></div>
            <div class="line-clamp-2 w-full flex-1 overflow-hidden break-words text-center">
              {{ file.path.split('/').pop() || '' }}
            </div>
          </div>
        </div>
      </div>

      <div
        ref="loadRef"
        class="h-[60px] items-center justify-center"
        :style="{
          display: !isEnd && files.length > 0 ? 'flex' : 'none',
        }"
      >
        <div
          v-if="moreLoading"
          class="loader h-[32px] w-[32px] text-orange-600"
        ></div>
        <div
          v-else
          class="text-gray-400"
        >
          加载更多
        </div>
      </div>
    </div>

    <ModalDownload
      v-if="modalDownloadInfo"
      :fsid="modalDownloadInfo.fsid"
      :remote="modalDownloadInfo.remote"
      :is-dir="modalDownloadInfo.isDir"
      @ok="onModalDownloadOk"
      @cancel="modalDownloadInfo = void 0"
    />
  </div>
</template>

<script setup lang="ts">
import { httpDiskList } from '@src/common/api'
import { config } from '@src/common/config'
import { __FILEICONS__ } from '@src/common/const'
import { formatDate, formatFileSize } from '@src/common/utils'
import ModalDownload, { type IModalDownloadInfo } from '@src/components/modal-download.vue'
import Button from '@src/ui-components/button.vue'
import { showContextMenu } from '@src/ui-components/context-menu'
import IconButton from '@src/ui-components/icon-button.vue'
import Message from '@src/ui-components/message'
import { type IHttpDiskListItem } from 'baidu-netdisk-srv/types'
import { computed, onActivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const firstLoading = ref(false)
const moreLoading = ref(false)
const files = ref<IHttpDiskListItem[]>([])
const page = ref(1)
const isEnd = ref(false)
const view = ref<'list' | 'grid'>('list')
const scrollPos = ref(0)
const listRef = ref<HTMLElement | undefined>(void 0)
const loadRef = ref<HTMLElement | undefined>(void 0)
const loadObs = ref<IntersectionObserver | undefined>(void 0)
const modalDownloadInfo = ref<IModalDownloadInfo | undefined>(void 0)
const paths = ref<{ name: string; path: string }[]>([{ name: '根目录', path: '/' }])
const path = computed(() => {
  return paths.value[paths.value.length - 1].path
})

async function fetchList(inPath: string, inForce = false) {
  if (isEnd.value || firstLoading.value || moreLoading.value) {
    return
  }

  if (files.value.length === 0) {
    firstLoading.value = true
  } else {
    moreLoading.value = true
  }

  try {
    const data = await httpDiskList({
      path: inPath,
      page: page.value,
      force: inForce ? 1 : 0,
    })

    files.value = files.value.concat(data.list)
    isEnd.value = data.isEnd
    page.value = page.value + 1
  } catch (inErr) {
    Message.error(`获取列表失败: ${(inErr as Error).message}`)
  } finally {
    firstLoading.value = false
    moreLoading.value = false
  }
}

function createLoadObs() {
  if (!loadRef.value) {
    return
  }

  loadObs.value = new IntersectionObserver(
    entries => {
      if (isEnd.value || moreLoading.value || files.value.length === 0) {
        return
      }

      const triggerEntry = entries[0]

      if (!triggerEntry || !triggerEntry.isIntersecting) {
        return
      }

      fetchList(path.value)
    },
    {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    }
  )

  loadObs.value.observe(loadRef.value)
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

function reset() {
  page.value = 1
  files.value = []
  isEnd.value = false
}

function onContextMenu(e: MouseEvent, inItem: IHttpDiskListItem) {
  showContextMenu({
    event: e,
    menus: [
      {
        item: '下载 (至服务器)',
        callback: () => {
          modalDownloadInfo.value = {
            fsid: inItem.fs_id,
            remote: inItem.path,
            isDir: inItem.isdir === 1,
          }
        },
      },
    ],
  })
}

function onRefreshClick() {
  reset()
  fetchList(path.value, true)
}

function onDBClick(inItem: IHttpDiskListItem) {
  if (inItem.isdir === 1) {
    const nextName = inItem.path.split('/').pop() || ''

    if (!nextName) {
      Message.error('文件夹名称非法')

      return
    }

    paths.value.push({ name: nextName, path: inItem.path })
  }
}

function onModalDownloadOk() {
  modalDownloadInfo.value = void 0
  router.push(`/workbench/disk/tasks${window.location.search || ''}`)
}

onMounted(() => {
  createLoadObs()
})

onUnmounted(() => {
  if (loadObs.value) {
    loadObs.value.disconnect()
    loadObs.value = void 0
  }
})

onActivated(() => {
  if (listRef.value && scrollPos.value > 0) {
    listRef.value.scrollTop = scrollPos.value
  }
})

watch(
  path,
  inPath => {
    reset()
    fetchList(inPath)
  },
  { immediate: true }
)
</script>
