import { type AxiosRequestConfig } from 'axios'
import { request } from '../common/request.js'

export interface IRefreshTokenQuery {
  client_id: string
  client_secret: string
  refresh_token: string
}

export interface IRefreshTokenRes {
  access_token: string
  expires_in: number
  refresh_token: string
  scope: string
  session_key: string
  session_secret: string
}

const __ERR_MAP__: { [key: string]: string } = {}

export function httpRefreshToken(inQuery: IRefreshTokenQuery, inOpts?: AxiosRequestConfig) {
  return request<IRefreshTokenRes>(
    {
      ...Object.assign({}, inOpts),
      url: 'https://openapi.baidu.com/oauth/2.0/token',
      method: 'GET',
      params: Object.assign(
        {
          grant_type: 'refresh_token',
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
