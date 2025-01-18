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

const configPath = path.resolve('runtime/config.json')
const configStr = fs.existsSync(configPath)
  ? fs.readFileSync(configPath, { encoding: 'utf-8' })
  : '{}'

class Config {
  #defaultConf: IProjConfig = {
    username: 'admin',
    password: 'admin',
    port: 7777,
    token_secret: '',
    tryTimes: 3,
    tryDelta: 3000,
    maxUploadTasks: 1,
    maxDownloadTasks: 1,
    maxFailedTasks: 1,
    uploadThreads: 1,
    downloadThreads: 1,
    noVerifyUpload: false,
    noVerifyDownload: false,
    noVerifyDownloadOnDisk: false,
    users: [],
  }
  #envConf: Partial<IProjConfig> = {
    username: process.env['WEB_USER'] || '',
    password: process.env['WEB_PASS'] || '',
    token_secret: process.env['TOKEN_SECRET'] || '',
    port: parseInt(process.env['WEB_PORT'] || '0', 10) || 0,
  }
  #userConf: Partial<IProjConfig> = toJSON<IProjConfig>(configStr)

  constructor() {
    if (!this.#userConf.token_secret && !this.#envConf.token_secret) {
      this.modify({ token_secret: nanoid(32) })
    }
  }

  modify(inConf: Partial<IProjConfig>) {
    this.#userConf = Object.assign({}, this.#userConf, inConf)

    fs.writeFileSync(configPath, JSON.stringify(this.#userConf, void 0, 2), {
      encoding: 'utf-8',
    })
  }

  get<K extends keyof IProjConfig>(inKey: K): IProjConfig[K] {
    return this.#envConf[inKey] || this.#userConf[inKey] || this.#defaultConf[inKey]
  }
}

export const config = new Config()
