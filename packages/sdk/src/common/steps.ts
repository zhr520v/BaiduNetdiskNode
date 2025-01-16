import { EStepStatus } from '../types/enums.js'

export interface IStepItem {
  name: string
  exec: () => Promise<void>
  stop?: () => Promise<void>
}

export interface ICurrStep {
  name: string
  stop: () => Promise<void>
  res: () => void
  rej: (inReason?: any) => void
}

export class Steps {
  #names: string[] = []
  #steps: IStepItem[] = []
  #status: EStepStatus = EStepStatus.CREATED
  #error: Error | null = null
  #step: ICurrStep | null = null
  #onBeforeRun: () => Promise<void> = async () => {}
  #onStatusChanged: (inNewStatus: EStepStatus) => void = () => {}

  constructor(inOpts: {
    steps: IStepItem[]
    onBeforeRun?: () => Promise<void>
    onStatusChanged?: (inNewStatus: EStepStatus) => void
  }) {
    this.#steps = inOpts.steps
    this.#onBeforeRun = inOpts.onBeforeRun || this.#onBeforeRun
    this.#onStatusChanged = inOpts.onStatusChanged || this.#onStatusChanged
  }

  async run() {
    if (this.#status === EStepStatus.FINISHED || this.#status === EStepStatus.RUNNING) {
      return
    }

    this.#error = null
    this.#setStatus(EStepStatus.RUNNING)

    await this.#onBeforeRun()

    try {
      for (const step of this.#steps) {
        if (this.#names.includes(step.name)) {
          continue
        }

        await new Promise<void>((res, rej) => {
          this.#step = {
            name: step.name,
            stop: step.stop || (async () => {}),
            res: res,
            rej: rej,
          }

          step.exec().then(res).catch(rej)
        })

        this.#names.push(step.name)
        this.#step = null
      }

      this.#setStatus(EStepStatus.FINISHED)
    } catch (inError) {
      this.#error = inError as Error
      this.#setStatus(EStepStatus.STOPPED)
    }
  }

  async stop() {
    if (this.status !== EStepStatus.RUNNING || !this.#step) {
      return
    }

    try {
      await this.#step.stop()
      this.#step.rej(null)
    } catch (inError) {
      this.#step.rej(inError)
    }
  }

  #setStatus(inNewStatus: EStepStatus) {
    this.#status = inNewStatus
    this.#onStatusChanged(inNewStatus)
  }

  get name() {
    return this.#step?.name
  }

  get status() {
    return this.#status
  }

  get error() {
    return this.#error
  }
}
