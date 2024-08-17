import axios, { AxiosRequestConfig } from 'axios'

interface IErr extends Error {
  res_data: { [key: string]: any }
}

export default async function request<T>(
  inAxiosConf: AxiosRequestConfig,
  inRestConf?: {
    errno2msg?: (inErrno: number) => string
  }
) {
  const res = await axios.request<T>(inAxiosConf)
  const data = res.data as { errno?: number; errmsg?: string }

  if (typeof data === 'object' && data && data.errno) {
    const errno2msg = inRestConf?.errno2msg || (() => '')
    const newmsg = `errno: ${data.errno}, errmsg: ${data.errmsg || errno2msg(data.errno) || 'none'}`

    const err = new Error(newmsg) as IErr
    err.res_data = data

    throw err
  }

  return res
}
