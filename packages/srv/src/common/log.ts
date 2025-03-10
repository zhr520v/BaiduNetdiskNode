function pad(inNo: number) {
  return inNo.toString().padStart(2, '0')
}

function dateString() {
  const d = new Date()
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

  return `${date} ${time}`
}

export function infoLog(inMessage: string) {
  console.log(`${dateString()} [INFO] ${inMessage}`)
}

export function errorLog(inMessage: string) {
  console.log(`${dateString()} [ERROR] ${inMessage}`)
}
