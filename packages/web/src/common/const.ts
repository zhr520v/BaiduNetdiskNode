import { EDownloadSteps, EUploadSteps } from 'baidu-netdisk-sdk/types'

export const __FILEICONS__ = [
  {
    matches: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    className: 'png-picture',
  },
  {
    matches: ['mp4', 'mkv', 'avi', 'rmvb', 'wmv', 'flv', 'ts', 'webm', 'vob'],
    className: 'png-video',
  },
  {
    matches: ['mp3', 'wav', 'flac', 'aac', 'ape'],
    className: 'png-music',
  },
  {
    matches: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
    className: 'png-zip',
  },
  {
    matches: ['exe'],
    className: 'png-exe',
  },
]

export function getUploadStepName(inStep: EUploadSteps) {
  switch (inStep) {
    case EUploadSteps.FILE_INFO:
      return '获取文件信息'
    case EUploadSteps.LOCAL_MD5:
      return '获取本地MD5'
    case EUploadSteps.UPLOAD_ID:
      return '获取上传ID'
    case EUploadSteps.UPLOAD_SLICES:
      return '上传分片'
    case EUploadSteps.COMBINE:
      return '合并分片'
    case EUploadSteps.MOVE:
      return '移动文件'
    case EUploadSteps.DOWNLOAD_INFO:
      return '预下载信息'
    case EUploadSteps.VERIFY_DOWNLOAD:
      return '校验下载'
    case EUploadSteps.REMOVE_DUP:
      return '删除云端重命名文件'
    case EUploadSteps.FINISH:
      return '完成'
    default:
      return '运行中'
  }
}

export function getDownloadStepName(inStep: EDownloadSteps) {
  switch (inStep) {
    case EDownloadSteps.FSID_BY_PATH:
      return '获取文件信息'
    case EDownloadSteps.DLINK_BY_FSID:
      return '获取下载链接'
    case EDownloadSteps.DOWNLOAD_INFO:
      return '校验下载信息'
    case EDownloadSteps.DECRYPT_INFO:
      return '获取解密信息'
    case EDownloadSteps.PREPARE_DOWNLOAD:
      return '准备下载'
    case EDownloadSteps.DOWNLOAD_SLICES:
      return '下载分片'
    case EDownloadSteps.MD5_ON_DISK:
      return '校验MD5'
    case EDownloadSteps.LOCAL_MTIME:
      return '设置本地时间'
    case EDownloadSteps.FINISH:
      return '完成'
    default:
      return '运行中'
  }
}
