import { AxiosRequestConfig } from 'axios'
import { request } from '../common/request'

export interface IQuery {
  access_token: string
  checkexpire: number
  checkfree: number
}

export interface IRes {
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

export function httpUserQuota(inQuery: IQuery, inOpts?: AxiosRequestConfig) {
  return request<IRes>(
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
