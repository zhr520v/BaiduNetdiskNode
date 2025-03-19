<template>
  <div class="flex h-full w-full flex-col">
    <div class="shadow-light flex bg-white">
      <div class="mx-auto flex max-w-[1280px] flex-1">
        <div class="flex h-48 flex-1 items-center">
          <div class="flex flex-1 items-center gap-8">
            <div
              class="flex gap-16"
              :class="config.isMobile ? 'ml-8' : ''"
            >
              <router-link
                :to="`/workbench/sync${currentSearchParams}`"
                :class="[
                  'rounded-4 px-8 py-4',
                  isCurrentPath('/workbench/sync')
                    ? 'bg-gray-700 font-medium text-white'
                    : 'bg-[rgba(250,250,250,1)]',
                ]"
              >
                同步
              </router-link>
              <router-link
                :to="`/workbench/disk${currentSearchParams}`"
                :class="[
                  'rounded-4 px-8 py-4',
                  isCurrentPath('/workbench/disk')
                    ? 'bg-gray-700 font-medium text-white'
                    : 'bg-[rgba(250,250,250,1)]',
                ]"
              >
                网盘
              </router-link>
            </div>
            <div class="flex flex-1 items-center justify-end">
              <Popover
                position="BR"
                class="max-w-full"
              >
                <template #trigger>
                  <div
                    class="rounded-4 flex cursor-pointer items-center justify-center px-8 py-4 hover:bg-gray-100"
                  >
                    <img
                      class="mr-8 h-24 w-24 rounded-full"
                      :src="user.avatar_url"
                    />
                    <div class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      {{ user.netdisk_name }}
                    </div>
                  </div>
                </template>
                <div class="flex flex-col bg-white p-16">
                  <Progress
                    :percentage="(user.used / user.total) * 100"
                    class="my-8"
                  ></Progress>
                  <div class="flex items-center justify-between">
                    <div class="mr-16">
                      {{ (user.used / 1024 / 1024 / 1024).toFixed(2) }} GB
                      <span class="text-green-600">
                        ({{ ((user.used / user.total) * 100).toFixed(2) }}%)
                      </span>
                    </div>
                    <div>{{ (user.total / 1024 / 1024 / 1024).toFixed(2) }} GB</div>
                  </div>
                  <div>
                    登录有效期:
                    {{ ((user.expireAt - Date.now()) / 1000 / 60 / 60).toFixed(1) }}小时
                    <span class="text-red-600">
                      {{ user.expireAt - Date.now() <= 0 ? '已过期' : '' }}
                    </span>
                  </div>
                  <div class="mt-8 flex items-center justify-end">
                    <Button
                      size="small"
                      @click="removeBaiduUser"
                    >
                      移除此百度用户
                    </Button>
                  </div>
                </div>
              </Popover>
            </div>

            <IconButton
              icon-class="icon-add-folder"
              @click="folderDialogVisible = true"
            ></IconButton>

            <Popover
              position="BR"
              class="mr-8"
            >
              <template #trigger>
                <IconButton icon-class="icon-options"></IconButton>
              </template>

              <div class="flex flex-col bg-white">
                <Button
                  type="transparent"
                  size="small"
                  @click="onManageUserClick"
                >
                  管理百度用户
                </Button>
                <Button
                  type="transparent"
                  size="small"
                  @click="modConfigDialogVisible = true"
                >
                  设置
                </Button>
                <Button
                  type="transparent"
                  size="small"
                  @click="aboutDialogVisible = true"
                >
                  关于
                </Button>
                <Button
                  type="transparent"
                  size="small"
                  @click="logout"
                >
                  退出登录
                </Button>
              </div>
            </Popover>
          </div>
        </div>
      </div>
    </div>

    <router-view></router-view>

    <ModalModConfig
      v-if="modConfigDialogVisible"
      @ok="modConfigDialogVisible = false"
      @cancel="modConfigDialogVisible = false"
    />

    <ModalAbout
      v-if="aboutDialogVisible"
      @ok="aboutDialogVisible = false"
    />

    <ModalFolder
      v-if="folderDialogVisible"
      :app-name="user.app_name"
      @ok="folderDialogVisible = false"
      @cancel="folderDialogVisible = false"
    ></ModalFolder>
  </div>
</template>

<script setup lang="ts">
import { httpDelUser, httpLogout, httpUsers } from '@src/common/api'
import { config } from '@src/common/config'
import ModalAbout from '@src/components/modal-about.vue'
import ModalFolder from '@src/components/modal-folder.vue'
import ModalModConfig from '@src/components/modal-mod-config.vue'
import Button from '@src/ui-components/button.vue'
import Dialog from '@src/ui-components/dialog'
import IconButton from '@src/ui-components/icon-button.vue'
import Message from '@src/ui-components/message'
import Popover from '@src/ui-components/popover.vue'
import Progress from '@src/ui-components/progress.vue'
import { type IHttpUsersRes } from 'baidu-netdisk-srv/types'
import { computed, onMounted, ref } from 'vue'

const __USER_INIT__: IHttpUsersRes['users'][number] = {
  id: '',
  expire: true,
  expireAt: 0,
  free: 0,
  total: 0,
  used: 0,
  avatar_url: '',
  baidu_name: '',
  netdisk_name: '',
  uk: 0,
  vip_type: 0,
  app_name: '',
}

const dynamicPadding = ref(0)
const user = ref<IHttpUsersRes['users'][number]>(__USER_INIT__)
const modConfigDialogVisible = ref(false)
const aboutDialogVisible = ref(false)
const folderDialogVisible = ref(false)

const currentSearchParams = computed(() => {
  return window.location.search || ''
})

const isCurrentPath = (path: string) => {
  return window.location.pathname.startsWith(path)
}

onMounted(() => {
  watchHtml()
  getUser()
})

function watchHtml() {
  const htmlElement = document.querySelector('html')

  if (!htmlElement) {
    return
  }

  const observer = new MutationObserver(mutationsList => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const marginRight = htmlElement.style.marginRight.replace('px', '')
        const val = parseInt(marginRight, 10)

        if (Number.isNaN(val)) {
          dynamicPadding.value = 0
        } else {
          dynamicPadding.value = val
        }
      }
    }
  })

  observer.observe(htmlElement, { attributes: true })
}

async function getUser() {
  try {
    const searchParams = new URLSearchParams(window.location.search)
    const searchParamsObject = Object.fromEntries(searchParams.entries())
    const userId = searchParamsObject.id
    const users = (await httpUsers({ id: userId })).users
    user.value = users.find(item => item.id === userId) || __USER_INIT__
  } catch (inErr) {
    Message.error(`获取用户失败: ${(inErr as Error).message}`)
  }
}

function onManageUserClick() {
  location.href = '/pick-user'
}

async function logout() {
  if (!(await Dialog.confirm({ title: '退出登录', okText: '登出' }))) {
    return
  }

  try {
    await httpLogout()
    location.href = '/login'
  } catch (inErr) {
    Message.error(`登出失败: ${(inErr as Error).message}`)
  }
}

async function removeBaiduUser() {
  if (
    !(await Dialog.confirm({
      title: '移除百度用户',
      content: user.value.netdisk_name,
      okText: '移除',
      okType: 'error',
    }))
  ) {
    return
  }

  try {
    await httpDelUser({ id: user.value.id })

    location.href = '/pick-user'
  } catch (inErr) {
    Message.error(`移除用户失败: ${(inErr as Error).message}`)
  }
}
</script>
