import '@assets/app.css'
import '@assets/iconfont.css'
import '@assets/pngs.css'
import { httpBasic } from '@src/common/api'
import App from '@src/main/app.vue'
import PageInitCustom from '@src/pages/init-custom.vue'
import PageInitThirdparty from '@src/pages/init-thirdparty.vue'
import PageLogin from '@src/pages/login.vue'
import PagePickUser from '@src/pages/pick-user.vue'
import PageWorkbench from '@src/pages/workbench.vue'
import PageWorkbenchDisk from '@src/pages/workbench/disk.vue'
import PageWorkbenchDiskList from '@src/pages/workbench/disk/list.vue'
import PageWorkbenchDiskTasks from '@src/pages/workbench/disk/tasks.vue'
import PageWorkbenchSync from '@src/pages/workbench/sync.vue'
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

const app = createApp(App)

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: PageLogin,
    },
    {
      path: '/init-custom',
      name: 'init-custom',
      component: PageInitCustom,
    },
    {
      path: '/init-thirdparty',
      name: 'init-thirdparty',
      component: PageInitThirdparty,
    },
    {
      path: '/pick-user',
      name: 'pick-user',
      component: PagePickUser,
    },
    {
      path: '/workbench',
      name: 'workbench',
      component: PageWorkbench,
      redirect: { name: 'workbench_disk' },
      children: [
        {
          path: 'sync',
          name: 'workbench_sync',
          component: PageWorkbenchSync,
        },
        {
          path: 'disk',
          name: 'workbench_disk',
          component: PageWorkbenchDisk,
          redirect: { name: 'workbench_disk_list' },
          children: [
            {
              path: 'list',
              name: 'workbench_disk_list',
              component: PageWorkbenchDiskList,
            },
            {
              path: 'tasks',
              name: 'workbench_disk_tasks',
              component: PageWorkbenchDiskTasks,
            },
          ],
        },
      ],
    },
    {
      path: '/',
      name: 'root',
      redirect: { name: 'workbench' },
    },
  ],
})

router.beforeEach(async to => {
  try {
    const basic = await httpBasic({
      id: typeof to.query.id === 'string' ? to.query.id : '',
    })

    if (basic.users === 0) {
      if (to.path === '/init-custom' || to.path === '/init-thirdparty') {
        return
      }

      return '/init-custom'
    }

    if (to.path === '/init-custom' || to.path === '/init-thirdparty') {
      return
    }

    if (to.path === '/login') {
      if (basic.chosen) {
        return {
          path: '/',
          query: to.query,
        }
      }

      return '/pick-user'
    }

    if (to.path === '/pick-user') {
      if (basic.chosen) {
        return {
          path: '/',
          query: to.query,
        }
      }

      return
    }

    if (!basic.chosen) {
      return '/pick-user'
    }

    return
  } catch {
    if (to.path === '/login') {
      return
    }

    return '/login'
  }
})

app.use(router)
app.mount('#app')
