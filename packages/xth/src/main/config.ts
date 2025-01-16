import fs from 'node:fs'
import path from 'node:path'
import { toJSON } from '../common/utils.js'

export interface IProjConfig {
  app_id: string
  app_key: string
  app_name: string
  secret_key: string
  port: number
}

const configPath = path.resolve('runtime/config.json')

if (!fs.existsSync(configPath)) {
  const empty = {
    app_id: '',
    app_key: '',
    app_name: '',
    secret_key: '',
    port: 0,
  }

  fs.writeFileSync(configPath, JSON.stringify(empty, void 0, 2), { encoding: 'utf-8' })
}

const configStr = fs.readFileSync(configPath, { encoding: 'utf-8' })

class Config {
  #defaultConf: IProjConfig = {
    app_id: '',
    app_key: '',
    app_name: '',
    secret_key: '',
    port: 8888,
  }
  #envConf: Partial<IProjConfig> = {
    app_id: process.env['APP_ID'] || '',
    app_key: process.env['APP_KEY'] || '',
    app_name: process.env['APP_NAME'] || '',
    secret_key: process.env['SECRET_KEY'] || '',
    port: parseInt(process.env['LISTEN_PORT'] || '0', 10) || 0,
  }
  #userConf: Partial<IProjConfig> = toJSON<IProjConfig>(configStr)

  get<K extends keyof IProjConfig>(inKey: K): IProjConfig[K] {
    return this.#envConf[inKey] || this.#userConf[inKey] || this.#defaultConf[inKey]
  }
}

export const config = new Config()
