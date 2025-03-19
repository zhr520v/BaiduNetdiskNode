<template>
  <div
    class="flow-bg absolute bottom-0 left-0 right-0 top-0 flex flex-wrap items-center justify-center"
  >
    <div class="flex flex-1 flex-wrap items-center justify-center">
      <div
        v-for="user in users"
        :key="user.id"
        class="rounded-4 flex max-w-[160px] cursor-pointer flex-col items-center justify-center p-16 hover:bg-white/[.3]"
        @click="handleClick(user.id)"
      >
        <img
          class="mb-8 h-36 w-36 rounded-full"
          :src="user.avatar_url"
        />
        <div class="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-white">
          {{ user.netdisk_name }}
        </div>
      </div>

      <div
        class="rounded-4 flex max-w-[160px] cursor-pointer flex-col items-center justify-center p-16 hover:bg-white/[.3]"
        @click="handleNewClick"
      >
        <i
          class="iconfont icon-add text-36 mb-8 h-36 w-36 rounded-full text-center text-white"
        ></i>
        <div class="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-white">
          新增
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { httpUsers } from '@src/common/api'
import Message from '@src/ui-components/message'
import { type IHttpUsersRes } from 'baidu-netdisk-srv/types'
import { onMounted, ref } from 'vue'

const users = ref<IHttpUsersRes['users']>([])

onMounted(() => {
  getUsers()
})

async function getUsers() {
  try {
    users.value = (await httpUsers()).users
  } catch (inErr) {
    Message.error(`获取用户列表失败: ${(inErr as Error).message}`)
  }
}

function handleClick(inId: string) {
  location.href = `/workbench/sync?id=${inId}`
}

function handleNewClick() {
  location.href = '/init-custom?more=1'
}
</script>
