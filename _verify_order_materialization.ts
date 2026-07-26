/**
 * Regression check for lib/order-creation.ts:materializeOrderPreferences —
 * the fix for "an order added during client onboarding doesn't show up in
 * the Orders module."
 *
 * Root cause: creating a client's initial "Order Preferences" rows into
 * real Order documents only ever ran at client-creation time
 * (POST /api/clients). Editing an already-active client to add another
 * preference row (PUT /api/clients/[id]) only ever updated the Client
 * document's own productPreferences array — no Order was ever created for
 * it, so it showed up in the client's own "Order Preferences" summary but
 * never in Order History (Order.find({ client })) or the Orders module
 * (/api/orders, which reads the same Order collection).
 *
 * The fix makes both POST /api/clients and PUT /api/clients/[id] call the
 * same materializeOrderPreferences() helper, which creates a real Order for
 * any preference row carrying pricing that doesn't already have one, and
 * stamps `orderId` onto the row in place so a later re-save never creates a
 * duplicate for a row that's already a real order.
 *
 * This project has no test runner / real MongoDB available to this
 * harness (see _verify_client_upload.ts and _verify_number_input_scroll.ts
 * for the same constraint), so Order/ActivityLog's model methods are
 * monkey-patched with an in-memory fake here instead of hitting a live DB —
 * this still exercises the exact function every route calls, just without
 * a real connection.
 *
 * Run with: npx tsx _verify_order_materialization.ts
 */
import Order from '@/models/Order'
import ActivityLog from '@/models/ActivityLog'
import { materializeOrderPreferences, type PreferenceOrderInput } from './lib/order-creation'

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

// --- In-memory fake of the two model calls materializeOrderPreferences uses ---
let lastOrderNumber: string | null = null
const createdOrders: Array<Record<string, unknown>> = []

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(Order as any).findOne = () => {
  const chain = {
    collation: () => chain,
    sort: () => chain,
    select: () => chain,
    lean: async () => (lastOrderNumber ? { orderNumber: lastOrderNumber } : null),
  }
  return chain
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(Order as any).create = async (doc: Record<string, unknown>) => {
  lastOrderNumber = doc.orderNumber as string
  createdOrders.push(doc)
  return { _id: { toString: () => `mockOrderId-${createdOrders.length}` }, ...doc }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(ActivityLog as any).create = async () => ({})

async function main() {
  const createdBy = { id: 'user1', name: 'Test User' }

  // 1. Two fresh preference rows (pricing set, no orderId yet) — mirrors an
  //    onboarding client with two "Order Preferences" rows, or two new rows
  //    added while editing an existing client.
  const rows: PreferenceOrderInput[] = [
    { preferredProductCategory: 'T-Shirts', orderQuantity: 2250, orderNote: 'Onboarding row 1', totalAmount: 50000 },
    { preferredProductCategory: 'Promotional Merchandise', orderQuantity: 100, orderNote: 'Onboarding row 2', totalAmount: 10000 },
  ]
  const firstPass = await materializeOrderPreferences('client1', '2026-07-26', rows, createdBy)

  check('both fresh rows produce a real Order', firstPass.length === 2, `got ${firstPass.length}`)
  check('both rows are stamped with the new orderId', rows.every((r) => !!r.orderId))
  check('order numbers are distinct and sequential', createdOrders.length === 2 && createdOrders[0].orderNumber !== createdOrders[1].orderNumber)

  // 2. Re-run materialization on the SAME (now-stamped) rows — simulates
  //    saving the client again (e.g. editing an unrelated field) without
  //    adding a new preference row. This is the exact scenario that used to
  //    have no protection against duplicate creation once PUT started
  //    calling this too.
  const secondPass = await materializeOrderPreferences('client1', '2026-07-26', rows, createdBy)
  check('re-saving already-materialized rows creates zero new orders', secondPass.length === 0, `got ${secondPass.length}`)
  check('total orders created across both passes is still 2 (no duplicates)', createdOrders.length === 2, `got ${createdOrders.length}`)

  // 3. A third, genuinely new row appended alongside the two already-linked
  //    ones — simulates "Add another order" during a later edit. Only the
  //    new row should produce an Order.
  const withNewRow: PreferenceOrderInput[] = [
    ...rows,
    { preferredProductCategory: 'Bags', orderQuantity: 500, orderNote: 'Added during edit', totalAmount: 10000 },
  ]
  const thirdPass = await materializeOrderPreferences('client1', '2026-07-26', withNewRow, createdBy)
  check('only the newly-added row produces an Order', thirdPass.length === 1, `got ${thirdPass.length}`)
  check('total orders created is now 3', createdOrders.length === 3, `got ${createdOrders.length}`)

  // 4. A row with no pricing (sales-reference only, never meant to be a
  //    real order) is skipped — matches the required-in-UI-but-not-in-model
  //    distinction already documented on IProductPreference.
  const noPricingRow: PreferenceOrderInput[] = [
    { preferredProductCategory: 'Caps', orderQuantity: 50, orderNote: 'No pricing yet', totalAmount: 0 },
  ]
  const fourthPass = await materializeOrderPreferences('client1', '2026-07-26', noPricingRow, createdBy)
  check('a row with no totalAmount produces no Order', fourthPass.length === 0)
  check('a row with no totalAmount is not stamped with an orderId', !noPricingRow[0].orderId)

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
