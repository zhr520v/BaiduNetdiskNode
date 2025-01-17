export const enum EUploadRtype {
  FAIL = 0,
  RENAME = 1,
  DIFF_RENAME = 2,
  OVERWRITE = 3,
}

export const enum EFileManageOndup {
  FAIL = 'fail',
  OVERWRITE = 'overwrite',
  NEWCOPY = 'newcopy',
  SKIP = 'skip',
}

export const enum EFileManageAsync {
  SYNC = 0,
  ADAPTIVE = 1,
  ASYNC = 2,
}

export const enum EStepStatus {
  CREATED = 0,
  RUNNING = 1,
  STOPPED = 2,
  FINISHED = 3,
}

export const enum EUploadSteps {
  FILE_INFO = 1,
  LOCAL_MD5 = 2,
  UPLOAD_ID = 3,
  UPLOAD_SLICES = 4,
  COMBINE = 5,
  MOVE = 6,
  DOWNLOAD_INFO = 7,
  VERIFY_DOWNLOAD = 8,
  REMOVE_DUP = 9,
  FINISH = 10,
}

export const enum EDownloadSteps {
  FSID_BY_PATH = 1,
  DLINK_BY_FSID = 2,
  DOWNLOAD_INFO = 3,
  DECRYPT_INFO = 4,
  PREPARE_DOWNLOAD = 5,
  DOWNLOAD_SLICES = 6,
  MD5_ON_DISK = 7,
  LOCAL_MTIME = 8,
  FINISH = 9,
}
