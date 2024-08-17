import pico from 'picocolors'
import { isAsyncFunction } from 'util/types'

type SyncAsyncFunc = (() => void) | (() => Promise<void>)

const __TEST_INFO__: {
  current: { name: string; its: { name: string; func: SyncAsyncFunc }[] } | null
  describes: { name: string; its: { name: string; func: SyncAsyncFunc }[] }[]
} = {
  current: null,
  describes: [],
}

export function describe(inName: string, inFunc: () => void) {
  __TEST_INFO__.current = { name: inName, its: [] }

  inFunc()

  __TEST_INFO__.describes.push(__TEST_INFO__.current)
  __TEST_INFO__.current = null
}

export function it(inName: string, inFunc: SyncAsyncFunc) {
  if (__TEST_INFO__.current) {
    __TEST_INFO__.current.its.push({ name: inName, func: inFunc })
  } else {
    const desc = {
      name: '',
      its: [
        {
          name: inName,
          func: inFunc,
        },
      ],
    }

    __TEST_INFO__.describes.push(desc)
  }
}

export async function runTest() {
  let curItName = ''

  try {
    while (__TEST_INFO__.describes.length > 0) {
      const desc = __TEST_INFO__.describes.shift()

      if (!desc) {
        return
      }

      const descName = desc.name
      const its = desc.its

      if (descName) {
        console.log('  ' + descName)
      }

      for (const item of its) {
        curItName = item.name
        const func = item.func

        process.stdout.write(pico.yellow('    = ') + curItName + '\r')

        if (isAsyncFunction(func)) {
          await func()
        } else {
          func()
        }

        if (curItName) {
          console.log(pico.green('    \u2713 ') + curItName)
        }
      }

      console.log()
    }

    console.log('  ' + pico.bgGreen(' PASS ') + '\n')
  } catch (err) {
    console.log(pico.red('    \u2717 ') + curItName + '\n')
    console.log(pico.yellow((err as Error).message) + '\n')
    console.log('  ' + pico.bgRed(' FAIL ') + '\n')

    process.exit(0)
  }
}

export function expect(inActual: any) {
  return {
    toBe: (inToBeValue: any) => {
      if (inToBeValue !== inActual) {
        throw new Error(`  Expect: ${inToBeValue}\n  Actual: ${inActual}`)
      }
    },
    toBeGreaterThan: (inVal: any) => {
      const result = inActual > inVal

      if (!result) {
        throw new Error(`  Expect: ${inActual} > ${inVal}\n  Actual: ${inActual} <= ${inVal}`)
      }
    },
    toBePlainArrayEqual: (inVal: any[]) => {
      const len = inVal.length

      if ((inActual as any[]).length !== inVal.length) {
        throw new Error(`  toBeArrayEqual\n  length not equal`)
      }

      const a = (inActual as any[]).map(i => i).sort()
      const b = inVal.map(i => i).sort()

      for (let i = 0; i < len; i++) {
        const pA = a.pop()
        const pB = b.pop()

        if (pA !== pB) {
          throw new Error(`  toBeArrayEqual\n  Expect: ${pA}\n  !==\n  Actual: ${pB}`)
        }
      }
    },
    toBeTruthy: () => {
      if (!inActual) {
        throw new Error(`  Expect: Truthy: ${inActual}\n  Actual: Falsy: ${inActual}`)
      }
    },
    toHaveProperties: (...args: string[]) => {
      for (const arg of args) {
        if (!(inActual as Object).hasOwnProperty(arg)) {
          throw new Error(
            `  Expect: '${arg}'\n  Actual: ${Object.keys(inActual as Object)
              .map(i => `'${i}'`)
              .join(' ')}`
          )
        }
      }
    },
  }
}
