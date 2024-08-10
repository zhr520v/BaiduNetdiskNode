import { AxiosRequestConfig } from 'axios'
import request from '../common/request'

export interface IAuthRefreshTokenQuery {
  client_id: string
  client_secret: string
  refresh_token: string
}

export interface IAuthRefreshTokenResponse {
  access_token: string
  expires_in: number
  refresh_token: string
  scope: string
  session_key: string
  session_secret: string
}

export function authRefreshToken(query: IAuthRefreshTokenQuery, options?: AxiosRequestConfig) {
  return request<IAuthRefreshTokenResponse>({
    ...Object.assign({}, options),
    url: 'https://openapi.baidu.com/oauth/2.0/token',
    method: 'GET',
    params: Object.assign(
      {
        grant_type: 'refresh_token',
      },
      query,
      options?.params
    ),
  })
}
