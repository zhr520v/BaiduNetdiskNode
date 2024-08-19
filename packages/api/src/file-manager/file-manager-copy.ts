import { AxiosRequestConfig } from 'axios'
import { IBody, IQuery, fileManager } from './file-manager'

export function fileManagerCopy(
  query: Omit<IQuery, 'opera'>,
  body: IBody,
  options?: AxiosRequestConfig
) {
  return fileManager(
    Object.assign({}, query, {
      opera: 'copy',
    }),
    body,
    options
  )
}
