<template>
  <div class="flex flex-1 flex-col overflow-auto">
    <div class="shadow-light">
      <div
        class="mx-auto flex h-48 items-center gap-16"
        :class="config.isMobile ? 'ml-8 max-w-full' : 'max-w-[1280px]'"
      >
        <router-link
          :to="`/workbench/disk/list${currentSearchParams}`"
          :class="[
            'rounded-4 px-8 py-4',
            $route.name === 'workbench_disk_list'
              ? 'bg-gray-600 text-white'
              : 'bg-[rgba(250,250,250,1)]',
          ]"
        >
          文件
        </router-link>
        <router-link
          :to="`/workbench/disk/tasks${currentSearchParams}`"
          :class="[
            'rounded-4 px-8 py-4',
            $route.name === 'workbench_disk_tasks'
              ? 'bg-gray-600 text-white'
              : 'bg-[rgba(250,250,250,1)]',
          ]"
        >
          传输
        </router-link>
      </div>
    </div>

    <router-view v-slot="{ Component }">
      <keep-alive>
        <component
          :is="Component"
          v-if="$route.name === 'workbench_disk_list'"
        />
      </keep-alive>
      <component
        :is="Component"
        v-if="$route.name !== 'workbench_disk_list'"
      />
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { config } from '@src/common/config'
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

const currentSearchParams = computed(() => {
  return window.location.search || ''
})
</script>
