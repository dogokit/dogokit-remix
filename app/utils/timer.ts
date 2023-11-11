export const DEFAULT_THRESHOLD = 500

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function delay(ms = DEFAULT_THRESHOLD) {
  await sleep(ms)
}

/**
 * Usage:
 * const timer = createTimer()
 * await timer.delay()
 */

export const createTimer = () => {
  const start = Date.now()

  return {
    delay: async (threshold = DEFAULT_THRESHOLD) => {
      const currentDuration = Date.now() - start
      const delayDuration = Math.min(threshold - currentDuration, threshold)
      if (delayDuration > 0) await delay(delayDuration)
    },
  }
}
