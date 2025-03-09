import fs from 'node:fs'
import path from 'node:path'
import { type IFolder } from '../common/folder-manager.js'
import { nanoid, toJSON } from '../common/utils.js'

export interface IProjConfig {
  username: string
  password: string
  port: number
  token_secret: string
  tryTimes: number
  tryDelta: number
  maxUploadTasks: number
  maxDownloadTasks: number
  maxFailedTasks: number
  uploadThreads: number
  downloadThreads: number
  noVerifyUpload: boolean
  noVerifyDownload: boolean
  noVerifyDownloadOnDisk: boolean
  users: IUserConfig[]
}

export interface IUserConfig {
  app_name: string
  app_id: string // [生成授权URL时用到]
  app_key: string // [生成授权URL时用到] [Code转Token时用到] [刷新Token时用到]
  secret_key: string // [Code转Token时用到] [刷新Token时用到]
  access_token: string
  expire: number
  refresh_token: string
  uk: number // 百度网盘用户ID
  id: string // 自定义ID
  thiryparty: string
  folders: IFolder[]
}

const defaultConfig: IProjConfig = {
  username: '',
  password: '',
  token_secret: '',
  port: 0,
  tryTimes: 3,
  tryDelta: 3000,
  maxUploadTasks: 3,
  maxDownloadTasks: 3,
  maxFailedTasks: 3,
  uploadThreads: 3,
  downloadThreads: 3,
  noVerifyUpload: false,
  noVerifyDownload: false,
  noVerifyDownloadOnDisk: false,
  users: [],
}

const configPath = path.resolve('runtime/config.json')
const configStr = fs.existsSync(configPath)
  ? fs.readFileSync(configPath, { encoding: 'utf-8' })
  : '{}'
const rawConfig = toJSON<IProjConfig>(configStr)

const userConfig = {
  ...defaultConfig,
  ...rawConfig,
  users: (rawConfig.users || []).map(u => ({
    ...u,
    folders: (u.folders || []).map(f => ({
      ...{
        // 版本更新添加的属性
        operation: 1,
        excludes: [],
      },
      ...f,
    })),
  })),
}

class Config {
  #userConf: IProjConfig = userConfig
  #envConf: Partial<IProjConfig> = {
    username: process.env['WEB_USER'] || '',
    password: process.env['WEB_PASS'] || '',
    token_secret: process.env['TOKEN_SECRET'] || '',
    port: parseInt(process.env['WEB_PORT'] || '0', 10) || 0,
  }

  constructor() {
    if (!this.#envConf.token_secret && !this.#userConf.token_secret) {
      this.modify({ token_secret: nanoid(32) })
    }
  }

  modify(inConf: Partial<IProjConfig>) {
    this.#userConf = Object.assign({}, this.#userConf, inConf)

    fs.writeFileSync(configPath, JSON.stringify(this.#userConf, void 0, 2), {
      encoding: 'utf-8',
    })
  }

  get<K extends keyof IProjConfig>(inKey: K, inUserOnly?: boolean): IProjConfig[K] {
    if (inUserOnly) {
      return this.#userConf[inKey]
    }

    return this.#envConf[inKey] || this.#userConf[inKey]
  }
}

export const config = new Config()
