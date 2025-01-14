import { type AxiosRequestConfig } from 'axios'
import { request } from '../common/request.js'

export interface IUserQuotaQuery {
  access_token: string
  checkexpire: number
  checkfree: number
}

export interface IUserQuotaRes {
  errmsg: string
  errno: number
  expire: boolean // Will expire in 7 days
  free: number
  is_show_window: number
  newno: string
  recmd_vip: string
  recyclestatus: number
  request_id: number
  sbox_total: number
  sbox_used: number
  server_time: number
  total: number // Byte
  used: number // Byte
}

const __ERR_MAP__: { [key: string]: string } = {}

export function httpUserQuota(inQuery: IUserQuotaQuery, inOpts?: AxiosRequestConfig) {
  return request<IUserQuotaRes>(
    {
      ...Object.assign({}, inOpts),
      url: 'https://pan.baidu.com/api/quota',
      method: 'GET',
      params: Object.assign({}, inQuery, inOpts?.params),
    },
    {
      errMap: __ERR_MAP__,
    }
  )
}
