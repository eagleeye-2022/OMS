import type { WheelEvent } from 'react'

/**
 * Chrome/Safari step a focused `<input type="number">` up or down on
 * mouse-wheel/trackpad scroll — a trap for money and quantity fields, where
 * an accidental scroll while the cursor happens to be over the field
 * silently changes the value.
 *
 * `event.preventDefault()` from a React `onWheel` handler doesn't reliably
 * stop this (React registers wheel listeners as passive, so preventDefault
 * is a no-op there and logs a console warning). Blurring the input instead
 * works because the browser only applies the scroll-step while the number
 * input is focused — remove focus before that happens and the value is left
 * untouched, while the same scroll gesture continues on to scroll the page
 * as normal instead of being swallowed.
 */
export function blurNumberInputOnWheel(event: WheelEvent<HTMLInputElement>) {
  event.currentTarget.blur()
}
