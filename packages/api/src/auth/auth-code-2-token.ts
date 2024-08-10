import { AxiosRequestConfig } from 'axios'
import request from '../common/request'

export interface IAuthCode2TokenQuery {
  client_id: string
  client_secret: string
  code: string
  redirect_uri?: string
}

export interface IAuthCode2TokenResponse {
  access_token: string
  expires_in: number
  refresh_token: string
  scope: string
  session_key: string
  session_secret: string
}

export function authCode2Token(query: IAuthCode2TokenQuery, options?: AxiosRequestConfig) {
  return request<IAuthCode2TokenResponse>({
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
  })
}
