import { AxiosRequestConfig } from 'axios'
import { request } from '../common/request'

export interface IUserInfoQuery {
  access_token: string
}

export interface IUserInfoResponse {
  avatar_url: string
  baidu_name: string
  errmsg: string
  errno: number
  netdisk_name: string
  request_id: string
  uk: number // UserID
  vip_type: number // 0 - Normal User   1 - Normal VIP   2 - Super VIP
}

const __ERR_MAP__: { [key: string]: string } = {
  '42905': '查询用户名失败，可重试',
}

export function userInfo(query: IUserInfoQuery, options?: AxiosRequestConfig) {
  return request<IUserInfoResponse>(
    {
      ...Object.assign({}, options),
      url: 'https://pan.baidu.com/rest/2.0/xpan/nas',
      method: 'GET',
      params: Object.assign(
        {
          method: 'uinfo',
        },
        query,
        options?.params
      ),
    },
    {
      errMap: __ERR_MAP__,
    }
  )
}
