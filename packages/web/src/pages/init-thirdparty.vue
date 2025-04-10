<template>
  <div
    class="flow-bg absolute bottom-0 left-0 right-0 top-0 flex flex-row items-center justify-center"
  >
    <div
      class="relative mx-8 max-w-[calc(100%-16px)] rounded-lg"
      style="background-color: rgba(255, 255, 255, 0.65)"
    >
      <div class="text-20 m-16 font-bold">{{ steps[currStep] }}</div>
      <div class="px-16">
        <div v-if="currStep === 0">
          <div class="text-16">
            使用百度网盘官方 API 需要开发者身份, 可以通过以下链接前往申请个人开发者身份。
          </div>
          <a
            class="mb-16 block text-blue-600"
            href="https://pan.baidu.com/union/home"
            target="_blank"
          >
            https://pan.baidu.com/union/home
          </a>
          <div class="text-16 mb-16">或使用其他开发者提供的认证服务。</div>
          <div class="text-16 mb-16">
            远程认证是防止开发者 SecretKey 暴露而在远程服务器代为验证的方式。
          </div>
          <div class="text-16 mb-16">
            使用默认服务器地址时, AppName 为 BaiduSync, 即远程可上传文件夹为 /apps/BaiduSync。
          </div>

          <div class="text-16 mb-4 font-bold">远程认证服务器地址:</div>
          <input
            key="input_secret_key"
            v-model="remoteUrl"
            name="secret_key"
            class="rounded-3 text-16 mb-8 w-full p-8 indent-4 outline-none"
          />

          <Button
            size="small"
            @click="remoteUrl = defaultRemoteUrl"
          >
            默认
          </Button>
        </div>

        <div v-if="currStep === 1">
          <div class="text-16">点击以下链接, 登录百度网盘, 授权完成后得到授权码</div>
          <a
            class="text-16 text-blue-600"
            :href="getCodeUrl()"
            target="_blank"
          >
            前往百度网盘官方授权
          </a>
          <div class="text-16 mb-4 mt-24 font-bold">授权码</div>
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
          @click="handleBackToDeveloper"
        >
          我是开发者
        </Button>

        <Button
          type="primary"
          :disabled="!getCanNext()"
          @click="handleNext"
        >
          {{ currStep === 1 ? '完成' : '下一步' }}
        </Button>
      </div>

      <div
        v-if="loading"
        class="absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center bg-[rgba(255,255,255,0.3)]"
      >
        <div class="loader h-[96px] w-[96px]"></div>
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
import { httpProxyAuth, httpProxyInfo } from '@src/common/api'
import Button from '@src/ui-components/button.vue'
import IconButton from '@src/ui-components/icon-button.vue'
import Message from '@src/ui-components/message'
import { onMounted, ref, watch } from 'vue'

const defaultRemoteUrl = 'https://baiduauth.keenghost.com'

const steps = ['远程认证服务器信息', '远程认证服务器授权']
const currStep = ref(0)
const remoteUrl = ref(defaultRemoteUrl)
const authCode = ref('')
const remoteInfo = ref<{ appId: string; appKey: string; appName: string }>({
  appId: '',
  appKey: '',
  appName: '',
})
const loading = ref(false)
const more = ref(false)

onMounted(() => {
  const searchParams = new URLSearchParams(window.location.search)
  const searchParamsObject = Object.fromEntries(searchParams.entries())
  more.value = !!searchParamsObject.more
})

watch(currStep, async () => {
  if (currStep.value === 1) {
    loading.value = true

    try {
      const info = await httpProxyInfo({
        addr: remoteUrl.value,
      })

      remoteInfo.value.appId = info.appId
      remoteInfo.value.appKey = info.appKey
      remoteInfo.value.appName = info.appName

      Message.success('获取远程信息成功')
    } catch (inErr) {
      Message.error(`获取远程信息失败: ${(inErr as Error).message}`)
    } finally {
      loading.value = false
    }
  }
})

function getCanNext() {
  if (currStep.value === 0) {
    return !!remoteUrl.value
  }

  return !!remoteUrl.value
}

function handlePrevious() {
  if (currStep.value > 0) {
    currStep.value = currStep.value - 1
  }
}

async function handleNext() {
  if (currStep.value === 0) {
    currStep.value = currStep.value + 1
  } else if (currStep.value === 1) {
    loading.value = true

    try {
      await httpProxyAuth({
        addr: remoteUrl.value,
        appId: remoteInfo.value.appId,
        appKey: remoteInfo.value.appKey,
        appName: remoteInfo.value.appName,
        authCode: authCode.value,
      })

      location.href = '/pick-user'
    } catch (inErr) {
      Message.error(`远程认证失败: ${(inErr as Error).message}`)
    } finally {
      loading.value = false
    }
  }
}

function handleBackToDeveloper() {
  const searchParams = new URLSearchParams(window.location.search)
  const query = searchParams.toString() ? '?' + searchParams.toString() : ''
  location.href = `/init-custom${query}`
}

function getCodeUrl() {
  return encodeURI(
    'https://openapi.baidu.com/oauth/2.0/authorize?' +
      'response_type=code&' +
      `client_id=${remoteInfo.value.appKey}&` +
      'redirect_uri=oob&' +
      'scope=basic,netdisk&' +
      `device_id=${remoteInfo.value.appId}`
  )
}

function onCloseClick() {
  location.href = '/pick-user'
}
</script>
