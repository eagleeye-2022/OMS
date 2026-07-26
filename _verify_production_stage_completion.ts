/**
 * Regression check for lib/production-stage.ts:isStageDone — the fix for
 * "Mark Production Complete" staying clickable (and the server accepting it)
 * even when a stage's status was set to 'completed' by hand while its units
 * completed never actually reached the total (screenshot: Stitching/
 * Finishing/QC Check all showed "Completed" with "Units: 0/500").
 *
 * Run with: npx tsx _verify_production_stage_completion.ts
 */
import { isStageDone } from './lib/production-stage'

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
  // Exactly the screenshot's bug: status says completed, units say otherwise.
  check(
    'status=completed with 0/500 units is NOT considered done (the reported bug)',
    isStageDone({ status: 'completed', unitsCompleted: 0, totalUnits: 500 }, 500) === false
  )
  check(
    'status=completed with a partial count (250/500) is NOT considered done',
    isStageDone({ status: 'completed', unitsCompleted: 250, totalUnits: 500 }, 500) === false
  )
  check(
    'status=completed with units fully accounted for IS considered done',
    isStageDone({ status: 'completed', unitsCompleted: 500, totalUnits: 500 }, 500) === true
  )
  check(
    'status=completed with units exceeding total (over-reported) still counts as done',
    isStageDone({ status: 'completed', unitsCompleted: 520, totalUnits: 500 }, 500) === true
  )
  check(
    'status=in_progress is never considered done regardless of units',
    isStageDone({ status: 'in_progress', unitsCompleted: 500, totalUnits: 500 }, 500) === false
  )
  check(
    'status=pending is never considered done',
    isStageDone({ status: 'pending', unitsCompleted: 0, totalUnits: 500 }, 500) === false
  )
  // totalUnits falls back to the order's own quantity when unset/zero on the stage.
  check(
    'totalUnits=0 on the stage falls back to the order quantity',
    isStageDone({ status: 'completed', unitsCompleted: 300, totalUnits: 0 }, 300) === true &&
      isStageDone({ status: 'completed', unitsCompleted: 299, totalUnits: 0 }, 300) === false
  )

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
