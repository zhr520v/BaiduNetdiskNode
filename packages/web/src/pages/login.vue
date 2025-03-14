<template>
  <div
    class="flow-bg fixed bottom-0 left-0 right-0 top-0 flex flex-col items-center justify-center"
  >
    <div
      class="text-36 mb-32 text-center font-bold text-white"
      style="font-family: logo"
    >
      BAIDU SYNC
    </div>

    <input
      v-model="username"
      class="mb-32 w-[328px] rounded-l-full rounded-r-full bg-[#fff]/[.7] p-8 indent-12 outline-none placeholder:text-[#999]"
      placeholder="管理员用户名"
      auto-complete="on"
      autofocus
      @keyup.enter="onLoginClick"
    />

    <input
      v-model="password"
      class="mb-32 w-[328px] rounded-l-full rounded-r-full bg-[#fff]/[.7] p-8 indent-12 outline-none placeholder:text-[#999]"
      placeholder="管理员密码"
      auto-complete="on"
      type="password"
      @keyup.enter="onLoginClick"
    />

    <button
      class="mb-[80px] w-[328px] rounded-l-full rounded-r-full bg-[#303f9f] p-8 text-white hover:bg-[#1976d2]"
      @click="onLoginClick"
    >
      登录
    </button>
  </div>
</template>

<script setup lang="ts">
import { httpLogin } from '@src/common/api'
import Message from '@src/ui-components/message'
import { ref } from 'vue'

const loading = ref(false)
const username = ref('')
const password = ref('')

const onLoginClick = async () => {
  if (loading.value) {
    return
  }

  if (!username.value || !password.value) {
    return
  }

  loading.value = true

  try {
    await httpLogin({
      username: username.value,
      password: password.value,
    })
    location.href = '/'
  } catch (inErr) {
    Message.error(`登录失败: ${(inErr as Error).message}`)
  } finally {
    loading.value = false
  }
}
</script>
