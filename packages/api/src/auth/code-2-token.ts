import { type AxiosRequestConfig } from 'axios'
import { request } from '../common/request.js'

export interface ICode2TokenQuery {
  client_id: string
  client_secret: string
  code: string
  redirect_uri?: string
}

export interface ICode2TokenRes {
  access_token: string
  expires_in: number
  refresh_token: string
  scope: string
  session_key: string
  session_secret: string
}

const __ERR_MAP__: { [key: string]: string } = {}

export function httpCode2Token(inQuery: ICode2TokenQuery, inOpts?: AxiosRequestConfig) {
  return request<ICode2TokenRes>(
    {
      ...Object.assign({}, inOpts),
      url: 'https://openapi.baidu.com/oauth/2.0/token',
      method: 'GET',
      params: Object.assign(
        {
          grant_type: 'authorization_code',
          redirect_uri: 'oob',
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
