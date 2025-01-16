import { type Context } from 'koa'

export interface IContext<TResBody = Record<string, any>> extends Context {
  body: TResBody
}

export interface IInfoRes {
  appId: string
  appKey: string
  appName: string
}

export interface IAuthReq {
  authCode: string
}

export interface IAuthRes {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface IRefreshReq {
  refreshToken: string
}

export interface IRefreshRes {
  accessToken: string
  refreshToken: string
  expiresIn: number
}
