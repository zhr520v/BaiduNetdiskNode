import { AxiosRequestConfig } from 'axios'
import { request } from '../common/request'

interface IQuery {
  client_id: string
  client_secret: string
  code: string
  redirect_uri?: string
}

interface IRes {
  access_token: string
  expires_in: number
  refresh_token: string
  scope: string
  session_key: string
  session_secret: string
}

const __ERR_MAP__: { [key: string]: string } = {}

export function authCode2Token(query: IQuery, options?: AxiosRequestConfig) {
  return request<IRes>(
    {
      ...Object.assign({}, options),
      url: 'https://openapi.baidu.com/oauth/2.0/token',
      method: 'GET',
      params: Object.assign(
        {
          grant_type: 'authorization_code',
          redirect_uri: 'oob',
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
