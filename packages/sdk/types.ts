import { type IBaiduApiError } from 'baidu-netdisk-api/types'

export * from './src/types/enums.js'

export interface IBaiduSdkError extends IBaiduApiError {
  notused?: boolean
}
