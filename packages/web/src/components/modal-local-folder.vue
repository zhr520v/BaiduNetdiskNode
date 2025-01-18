<template>
  <Modal
    title="选择文件夹"
    :size="config.isMobile ? 'tiny' : 'small'"
    @ok="props.onOk?.(selectedPath)"
    @cancel="props.onCancel?.()"
  >
    <div class="flex h-[360px] flex-col">
      <div class="mb-8 flex justify-start">
        <div class="mr-4 mt-6 font-bold">位置:</div>
        <div class="mt-6 flex-1">{{ formattedPath }}</div>
        <IconButton
          icon-class="icon-arrow-up"
          :disabled="paths.length <= 1"
          class="-rotate-90"
          @click="upLevel"
        ></IconButton>
      </div>
      <div class="mb-8 flex flex-1 flex-col overflow-y-scroll">
        <div
          v-for="folder in folders"
          :key="folder"
          :class="
            [
              'flex items-center justify-start p-8',
              (formattedPath + '/' + folder).replace(/^\/\//, '/') === selectedPath
                ? 'bg-gray-200'
                : 'cursor-pointer hover:bg-gray-100',
            ].join(' ')
          "
          @click="handleFolderClick(folder)"
        >
          <i class="iconfont icon-folder text-24 mr-8"></i>
          <div class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ folder }}</div>
        </div>
      </div>
      <div class="flex justify-start">
        <div class="mr-4 font-bold">当前选择:</div>
        <div class="flex-1">{{ selectedPath }}</div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { httpLocalFolderList } from '@src/common/api'
import { config } from '@src/common/config'
import IconButton from '@src/ui-components/icon-button.vue'
import Modal from '@src/ui-components/modal.vue'
import { computed, onMounted, ref, watch } from 'vue'

interface IProps {
  onOk?: (inPath: string) => void
  onCancel?: () => void
}

const props = defineProps<IProps>()

const paths = ref(['/'])
const selectedPath = ref('/')
const folders = ref<string[]>([])

const formattedPath = computed(() => paths.value.join('/').replace(/^\/\//, '/'))

watch(formattedPath, () => {
  getLocalFolderList()
})

onMounted(() => {
  getLocalFolderList()
})

async function getLocalFolderList() {
  try {
    folders.value = (await httpLocalFolderList({ path: formattedPath.value })).folders
  } catch {}
}

function upLevel() {
  paths.value.pop()
}

function handleFolderClick(inFolder: string) {
  paths.value = paths.value.concat([inFolder])
  selectedPath.value = paths.value.join('/').replace(/^\/\//, '/')
}
</script>
