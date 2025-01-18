import { type UserManager } from '../common/user-manager.js'
import { type IUserConfig } from '../main/config.js'

declare module 'koa' {
  interface BaseContext {
    user: IUserConfig
    userMgr: UserManager
  }
}
