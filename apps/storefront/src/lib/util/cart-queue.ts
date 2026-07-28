"use client"

/**
 * Runs cart mutations one at a time.
 *
 * Adding to the bag is optimistic, so nothing stops a shopper tapping three
 * times in a row — and concurrent adds are not safe. The first add has no
 * cart cookie yet, so it creates one; adds fired before it returns also see
 * no cookie and create their own. Three taps produced three carts with one
 * item each, and the badge settled on whichever cookie was written last.
 *
 * The button used to be disabled for the duration, which serialised them by
 * accident. Now that it isn't, they are serialised on purpose.
 *
 * A rejected link in the chain must not break the ones behind it, so failures
 * are swallowed here and surfaced by the caller's own catch.
 */
let chain: Promise<unknown> = Promise.resolve()

export function enqueueCartMutation<T>(task: () => Promise<T>): Promise<T> {
  const result = chain.then(task, task)
  chain = result.catch(() => undefined)
  return result
}
