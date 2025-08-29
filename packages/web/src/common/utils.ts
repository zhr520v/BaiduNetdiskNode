export function formatFileSize(inSize: number) {
  if (inSize < 1024) {
    return `${inSize} B`
  } else if (inSize < 1024 * 1024) {
    return `${(inSize / 1024).toFixed(1)} KB`
  } else if (inSize < 1024 * 1024 * 1024) {
    return `${(inSize / (1024 * 1024)).toFixed(1)} MB`
  } else {
    return `${(inSize / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
}

export function formatDate(inTime: number) {
  const date = new Date(inTime)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const CRON_REGEX =
  /^([0-5]?\d|\*)\s([01]?\d|2[0-3]|\*)\s([01]?\d|[12]\d|3[01]|\*)\s([1-9]|1[0-2]|\*)\s([0-6]|\*)$/

export function isCron(inCron: string) {
  return CRON_REGEX.test(inCron)
}
