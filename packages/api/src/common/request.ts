import axios, { AxiosRequestConfig } from 'axios'

export default async function request<T>(inConfig: AxiosRequestConfig) {
  const res = await axios.request<T>(inConfig)

  if (typeof res.data === 'object' && res.data !== null && (res as any).data['errno']) {
    throw new Error((res as any).data['errmsg'])
  }

  return res
}
