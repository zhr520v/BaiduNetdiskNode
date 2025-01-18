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
      path: '/',
      name: 'workbench',
      component: PageWorkbench,
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
