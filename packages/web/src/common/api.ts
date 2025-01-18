import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import {
  type IHttpActTaskReq,
  type IHttpAddFolderReq,
  type IHttpAddUserReq,
  type IHttpBasicReq,
  type IHttpBasicRes,
  type IHttpConfigRes,
  type IHttpDelFolderReq,
  type IHttpDelUserReq,
  type IHttpFolderReq,
  type IHttpFolderRes,
  type IHttpFoldersInfoRes,
  type IHttpLocalFolderListReq,
  type IHttpLocalFolderListRes,
  type IHttpLoginReq,
  type IHttpManualCheckReq,
  type IHttpModConfigReq,
  type IHttpModFolderReq,
  type IHttpProxyAuthReq,
  type IHttpProxyInfoReq,
  type IHttpProxyInfoRes,
  type IHttpUsersReq,
  type IHttpUsersRes,
} from 'baidu-netdisk-srv/types'

async function request<T, D = any>(inReqConfig: AxiosRequestConfig<D>) {
  try {
    const searchParams = new URLSearchParams(window.location.search)
    const searchParamsObject = Object.fromEntries(searchParams.entries())

    return await axios.request<T>({
      ...inReqConfig,
      params: Object.assign({}, inReqConfig.params, searchParamsObject),
    })
  } catch (inError) {
    const err = inError as AxiosError

    if (/\/api\//.test(err.request.responseURL)) {
      if (err.response?.status === 401) {
        if (location.pathname !== '/login') {
          location.href = '/login'
        }
      }
    }

    throw inError
  }
}

export async function httpActTask(inData: IHttpActTaskReq) {
  const { data } = await request({
    url: '/api/act-task',
    method: 'POST',
    data: inData,
  })

  return data
}

export async function httpAddFolder(inData: IHttpAddFolderReq) {
  const { data } = await request({
    url: '/api/add-folder',
    method: 'POST',
    data: inData,
  })

  return data
}

export async function httpAddUser(inData: IHttpAddUserReq) {
  const { data } = await request({
    url: '/api/add-user',
    method: 'POST',
    data: inData,
  })

  return data
}

export async function httpBasic(inData: IHttpBasicReq) {
  const { data } = await request<IHttpBasicRes>({
    url: '/api/basic',
    method: 'POST',
    data: inData,
  })

  return data
}

export async function httpConfig() {
  const { data } = await request<IHttpConfigRes>({
    url: '/api/config',
    method: 'POST',
  })

  return data
}

export async function httpDelFolder(inData: IHttpDelFolderReq) {
  const { data } = await request({
    url: '/api/del-folder',
    method: 'POST',
    data: inData,
  })

  return data
}

export async function httpDelUser(inData: IHttpDelUserReq) {
  const { data } = await request({
    url: '/api/del-user',
    method: 'POST',
    data: inData,
  })

  return data
}

export async function httpFolder(inData: IHttpFolderReq) {
  const { data } = await request<IHttpFolderRes>({
    url: '/api/folder',
    method: 'POST',
    data: inData,
  })

  return data
}

export async function httpFoldersInfo() {
  const { data } = await request<IHttpFoldersInfoRes>({
    url: '/api/folders-info',
    method: 'POST',
  })

  return data
}

export async function httpLocalFolderList(inData: IHttpLocalFolderListReq) {
  const { data } = await request<IHttpLocalFolderListRes>({
    url: '/api/local-folder-list',
    method: 'POST',
    data: inData,
  })

  return data
}

export async function httpLogin(inData: IHttpLoginReq) {
  const { data } = await request({
    url: '/api/login',
    method: 'POST',
    data: inData,
  })

  return data
}

export async function httpLogout() {
  const { data } = await request({
    url: '/api/logout',
    method: 'POST',
  })

  return data
}

export async function httpManualCheck(inData: IHttpManualCheckReq) {
  const { data } = await request({
    url: '/api/manual-check',
    method: 'POST',
    data: inData,
  })

  return data
}

export async function httpModConfig(inData: IHttpModConfigReq) {
  const { data } = await request({
    url: '/api/mod-config',
    method: 'POST',
    data: inData,
  })

  return data
}

export async function httpModFolder(inData: IHttpModFolderReq) {
  const { data } = await request({
    url: '/api/mod-folder',
    method: 'POST',
    data: inData,
  })

  return data
}

export async function httpUsers(inData?: IHttpUsersReq) {
  const { data } = await request<IHttpUsersRes>({
    url: '/api/users',
    method: 'POST',
    data: inData,
  })

  return data
}

export async function httpProxyAuth(inData: IHttpProxyAuthReq) {
  const { data } = await request({
    url: '/api/proxy-auth',
    method: 'POST',
    data: inData,
  })

  return data
}

export async function httpProxyInfo(inData: IHttpProxyInfoReq) {
  const { data } = await request<IHttpProxyInfoRes>({
    url: '/api/proxy-info',
    method: 'POST',
    data: inData,
  })

  return data
}
