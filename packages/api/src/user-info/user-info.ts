import { AxiosRequestConfig } from 'axios'
import { request } from '../common/request'

interface IQuery {
  access_token: string
}

interface IRes {
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

export function httpUserInfo(inQuery: IQuery, inOpts?: AxiosRequestConfig) {
  return request<IRes>(
    {
      ...Object.assign({}, inOpts),
      url: 'https://pan.baidu.com/rest/2.0/xpan/nas',
      method: 'GET',
      params: Object.assign(
        {
          method: 'uinfo',
        },
        inQuery,
        inOpts?.params
      ),
    },
    {
      errMap: __ERR_MAP__,
    }
  )
}
