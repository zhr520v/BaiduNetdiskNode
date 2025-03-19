<template>
  <div
    class="flow-bg absolute bottom-0 left-0 right-0 top-0 flex flex-row items-center justify-center"
  >
    <div
      class="mx-8 max-w-[calc(100%-16px)] rounded-lg"
      style="background-color: rgba(255, 255, 255, 0.65)"
    >
      <div class="text-20 m-16 font-bold">{{ steps[currStep] }}</div>
      <div class="px-16">
        <div v-if="currStep === 0">
          <div class="text-16 mb-16 text-gray-800">
            填写你在
            <a
              class="pl-4 text-blue-800"
              href="https://pan.baidu.com/union/console/applist"
              target="_blank"
            >
              百度网盘·开放平台
            </a>
            中的软件信息
          </div>
          <div class="mb-4 text-lg font-bold text-gray-800">AppName</div>
          <input
            key="input_app_name"
            v-model="appName"
            name="app_name"
            class="rounded-3 text-16 mb-24 w-full p-8 indent-4 outline-none"
          />
          <div class="text-16 mb-4 font-bold text-gray-800">AppID</div>
          <input
            key="input_app_id"
            v-model="appId"
            name="app_id"
            class="rounded-3 text-16 mb-24 w-full p-8 indent-4 outline-none"
          />
          <div class="text-16 mb-4 font-bold text-gray-800">AppKey</div>
          <input
            key="input_app_key"
            v-model="appKey"
            name="app_key"
            class="rounded-3 text-16 mb-24 w-full p-8 indent-4 outline-none"
          />
          <div class="text-16 mb-4 font-bold text-gray-800">SecretKey</div>
          <input
            key="input_secret_key"
            v-model="secretKey"
            name="secret_key"
            class="rounded-3 text-16 mb-24 w-full p-8 indent-4 outline-none"
          />
        </div>

        <div v-if="currStep === 1">
          <div class="text-16 text-gray-800">
            点击以下链接, 登录百度网盘, 授权完成后得到授权码
          </div>
          <a
            class="text-16 text-blue-800"
            :href="getCodeUrl()"
            target="_blank"
          >
            前往百度网盘官方授权
          </a>
          <div class="text-16 mb-4 mt-24 font-bold text-gray-800">授权码</div>
          <input
            key="input_auth_code"
            v-model="authCode"
            name="auth_code"
            class="rounded-3 text-16 mb-24 w-full p-8 indent-4 outline-none"
          />
        </div>
      </div>
      <div class="m-16 flex justify-between">
        <Button
          v-if="currStep > 0"
          @click="handlePrevious"
        >
          上一步
        </Button>

        <Button
          v-if="currStep === 0"
          type="transparent"
          @click="handleNotDeveloper"
        >
          我不是开发者
        </Button>

        <Button
          type="primary"
          :disabled="!getCanNext()"
          @click="handleNext"
        >
          {{ currStep === 1 ? '完成' : '下一步' }}
        </Button>
      </div>
    </div>

    <IconButton
      v-if="more"
      icon-class="icon-close"
      class="fixed right-16 top-16"
      @click="onCloseClick"
    ></IconButton>
  </div>
</template>

<script setup lang="ts">
import { httpAddUser } from '@src/common/api'
import Button from '@src/ui-components/button.vue'
import IconButton from '@src/ui-components/icon-button.vue'
import Message from '@src/ui-components/message'
import { onMounted, ref } from 'vue'

const more = ref(false)
const steps = ['开发者信息', '百度网盘授权']
const currStep = ref(0)
const appName = ref('')
const appId = ref('')
const appKey = ref('')
const secretKey = ref('')
const authCode = ref('')

onMounted(() => {
  const searchParams = new URLSearchParams(window.location.search)
  const searchParamsObject = Object.fromEntries(searchParams.entries())
  more.value = !!searchParamsObject.more
})

function getCanNext() {
  if (currStep.value === 0) {
    return !!(appName.value && appId.value && appKey.value && secretKey.value)
  }

  return !!(appName.value && appId.value && appKey.value && secretKey.value && authCode.value)
}

function handlePrevious() {
  if (currStep.value > 0) {
    currStep.value = currStep.value - 1
  }
}

async function handleNext() {
  try {
    if (currStep.value === 0) {
      currStep.value = currStep.value + 1
    } else if (currStep.value === 1) {
      await httpAddUser({
        app_name: appName.value,
        app_id: appId.value,
        app_key: appKey.value,
        secret_key: secretKey.value,
        code: authCode.value,
      })

      location.href = '/pick-user'
    }
  } catch (inErr) {
    Message.error(`添加用户失败: ${(inErr as Error).message}`)
  }
}

function getCodeUrl() {
  return encodeURI(
    'https://openapi.baidu.com/oauth/2.0/authorize?' +
      'response_type=code&' +
      `client_id=${appKey.value}&` +
      'redirect_uri=oob&' +
      'scope=basic,netdisk&' +
      `device_id=${appId.value}`
  )
}

function onCloseClick() {
  location.href = '/pick-user'
}

function handleNotDeveloper() {
  const searchParams = new URLSearchParams(window.location.search)
  const query = searchParams.toString() ? '?' + searchParams.toString() : ''
  location.href = `/init-thirdparty${query}`
}
</script>
