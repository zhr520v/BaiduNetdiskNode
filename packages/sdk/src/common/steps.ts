export const enum EStatus {
  CREATED = 0,
  RUNNING = 1,
  STOPPED = 2,
  FINISHED = 3,
}

interface IStepItem {
  name: string
  exec: () => Promise<void>
  stop?: () => Promise<void>
}

interface ICurrStep {
  name: string
  stop: () => Promise<void>
  res: () => void
  rej: (inReason?: any) => void
}

export class Steps {
  #names: string[] = []
  #steps: IStepItem[] = []
  #status: EStatus = EStatus.CREATED
  #error: Error | null = null
  #step: ICurrStep | null = null
  #onBeforeRun: () => Promise<void> = async () => {}
  #onStatusChanged: (inNewStatus: EStatus) => void = () => {}

  constructor(inOpts: {
    steps: IStepItem[]
    onBeforeRun?: () => Promise<void>
    onStatusChanged?: (inNewStatus: EStatus) => void
  }) {
    this.#steps = inOpts.steps
    this.#onBeforeRun = inOpts.onBeforeRun || this.#onBeforeRun
    this.#onStatusChanged = inOpts.onStatusChanged || this.#onStatusChanged
  }

  async run() {
    if (this.#status === EStatus.FINISHED || this.#status === EStatus.RUNNING) {
      return
    }

    this.#error = null
    this.#setStatus(EStatus.RUNNING)

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

      this.#setStatus(EStatus.FINISHED)
    } catch (inError) {
      this.#error = inError as Error
      this.#setStatus(EStatus.STOPPED)
    }
  }

  async stop() {
    if (this.status !== EStatus.RUNNING || !this.#step) {
      return
    }

    try {
      await this.#step.stop()
      this.#step.rej(null)
    } catch (inError) {
      this.#step.rej(inError)
    }
  }

  #setStatus(inNewStatus: EStatus) {
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
