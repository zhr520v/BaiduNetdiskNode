import { IBaiduApiError } from 'baidu-netdisk-api'

export interface IBaiduSdkError extends Partial<IBaiduApiError> {}

export { ERtype } from './upload-task'
export { EAsync, EOndup } from './file-manage'
export { EStatus } from './steps'
