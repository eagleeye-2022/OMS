/**
 * Regression check for lib/numberInput.ts:blurNumberInputOnWheel — the fix
 * for scroll-wheel silently changing <input type="number"> values (money,
 * quantity, weight, GST% fields across the OMS).
 *
 * This project has no test runner / jsdom installed (no jest, RTL,
 * Playwright, Cypress — see package.json), and adding one is out of scope
 * for a minimal fix. So this harness verifies the handler's actual contract
 * with plain mock objects instead of a real DOM:
 *   1. On a wheel event, it blurs the target (the mechanism that stops the
 *      browser's scroll-to-step behavior — see the comment in
 *      lib/numberInput.ts for why blur() rather than preventDefault()).
 *   2. It never touches `value` itself, and never calls preventDefault()/
 *      stopPropagation() — so the same scroll gesture still reaches the
 *      page and scrolls it normally; only focus-driven value stepping is
 *      blocked.
 *
 * This does not (and cannot, without a browser/jsdom) prove Chrome's own
 * spin-button behavior is suppressed end-to-end — that's covered by the
 * manual checklist (Scenario A/B/C) instead.
 *
 * Run with: npx tsx _verify_number_input_scroll.ts
 */
import { blurNumberInputOnWheel } from './lib/numberInput'

let passed = 0
let failed = 0

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS  ${name}`)
    passed++
  } else {
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

function main() {
  let blurCalled = 0
  let preventDefaultCalled = 0
  let stopPropagationCalled = 0
  const typedValue = '99'

  const fakeInput = { value: typedValue, blur: () => { blurCalled++ } }
  const fakeEvent = {
    currentTarget: fakeInput,
    preventDefault: () => { preventDefaultCalled++ },
    stopPropagation: () => { stopPropagationCalled++ },
  } as unknown as Parameters<typeof blurNumberInputOnWheel>[0]

  blurNumberInputOnWheel(fakeEvent)

  check('wheel handler blurs the input exactly once', blurCalled === 1, `blur() called ${blurCalled} times`)
  check('the typed value is untouched after the wheel event', fakeInput.value === typedValue, `value became "${fakeInput.value}"`)
  check(
    'handler does not call preventDefault (would be a no-op under React\'s passive wheel listeners anyway, and would also block normal page scroll)',
    preventDefaultCalled === 0
  )
  check('handler does not call stopPropagation (page scroll for this gesture is unaffected)', stopPropagationCalled === 0)

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
