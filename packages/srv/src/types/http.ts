import { type Netdisk } from 'baidu-netdisk-sdk'
import { type IInfoRes } from 'baidu-netdisk-xth/types'
import { type Context } from 'koa'
import { type IFolder } from '../common/folder-manager.js'
import { type PromType } from '../common/utils.js'
import { type IUserConfig } from '../main/config.js'

export interface IContext<TResBody = Record<string, any>> extends Context {
  body: TResBody
}

export interface IHttpActTaskReq {
  id: string
  type: 'upload' | 'download'
  action: 'play' | 'pause' | 'del'
}

export type IHttpAddFolderReq = Omit<IFolder, 'id'>

export type IHttpAddUserReq = Pick<
  IUserConfig,
  'app_id' | 'app_key' | 'app_name' | 'secret_key'
> & { code: string }

export interface IHttpBasicReq {
  id: string
}

export interface IHttpBasicRes {
  users: number
  chosen: number
}

export interface IHttpConfigRes {
  tryTimes: number
  tryDelta: number
  maxUploadTasks: number
  maxDownloadTasks: number
  maxFailedTasks: number
  uploadThreads: number
  downloadThreads: number
  noVerifyUpload: boolean
  noVerifyDownload: boolean
  noVerifyDownloadOnDisk: boolean
  username: string
  password: string
  port: number
  token_secret: string
}

export interface IHttpDelFolderReq {
  id: string
}

export interface IHttpDelUserReq {
  id: string
}

export interface IHttpFolderReq {
  id: string
}

export type IHttpFolderRes = IFolder

export interface IHttpFoldersInfoItem {
  id: string
  local: string
  remote: string
  oriSize: number
  comSize: number
  upBytes: number
  downBytes: number
  stepId: number
  stepStatus: number
  stepErrMsg: string
}

export interface IHttpFoldersInfoRes {
  folders: (IFolder & {
    checking: boolean
    uploadQueue: number
    downloadQueue: number
    uploadTasks: IHttpFoldersInfoItem[]
    downloadTasks: IHttpFoldersInfoItem[]
  })[]
}

export interface IHttpLocalFolderListReq {
  path: string
}

export interface IHttpLocalFolderListRes {
  folders: string[]
}

export interface IHttpLoginReq {
  username: string
  password: string
}

export interface IHttpManualCheckReq {
  id: string
}

export interface IHttpModConfigReq {
  tryTimes: number
  tryDelta: number
  maxUploadTasks: number
  maxDownloadTasks: number
  maxFailedTasks: number
  uploadThreads: number
  downloadThreads: number
  noVerifyUpload: boolean
  noVerifyDownload: boolean
  noVerifyDownloadOnDisk: boolean
  username: string
  password: string
  port: number
  token_secret: string
}

export interface IHttpModFolderReq {
  id: string
  folder: Omit<IFolder, 'id'>
}

export interface IHttpUsersReq {
  id: string
}

export interface IHttpUsersRes {
  users: (PromType<ReturnType<Netdisk['getUserInfo']>> & { id: string; app_name: string })[]
}

export interface IHttpProxyAuthReq {
  addr: string
  appId: string
  appKey: string
  appName: string
  authCode: string
}

export interface IHttpProxyInfoReq {
  addr: string
}

export type IHttpProxyInfoRes = IInfoRes
