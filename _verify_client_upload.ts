/**
 * Regression check for the client/order file-upload flow (lib/upload.ts:performUpload).
 *
 * Exercises the exact function every upload UI (FileUploadField, AssetsDocumentsCard)
 * now calls, against mocked `fetch` responses, so we can assert:
 *   1. A valid payload resolves with the uploaded file's data.
 *   2. A clean JSON error response (403/400/etc.) surfaces that specific message.
 *   3. A non-JSON response caused by a platform-level rejection (e.g. a 413 from
 *      a request that never reached our route handler) no longer shows the old,
 *      misleading generic "Network error" — it now reports file-size / auth /
 *      status-specific messages.
 *   4. A genuine fetch failure (offline/DNS/etc.) is the only case that still
 *      reports a network-specific message.
 *
 * Run with: npx tsx _verify_client_upload.ts
 */
import { performUpload } from './lib/upload'

let passed = 0
let failed = 0

function mockFetchOnce(impl: () => Promise<Response> | Response | never) {
  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = (async () => impl()) as typeof fetch
}

async function expectResolves(name: string, run: () => Promise<unknown>, check: (value: unknown) => boolean) {
  try {
    const value = await run()
    if (check(value)) {
      console.log(`PASS  ${name}`)
      passed++
    } else {
      console.log(`FAIL  ${name} — resolved with unexpected value: ${JSON.stringify(value)}`)
      failed++
    }
  } catch (err) {
    console.log(`FAIL  ${name} — expected success, threw: ${(err as Error).message}`)
    failed++
  }
}

async function expectRejects(name: string, run: () => Promise<unknown>, messageIncludes: string) {
  try {
    const value = await run()
    console.log(`FAIL  ${name} — expected rejection, resolved with: ${JSON.stringify(value)}`)
    failed++
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes(messageIncludes)) {
      console.log(`PASS  ${name} — "${message}"`)
      passed++
    } else {
      console.log(`FAIL  ${name} — message "${message}" does not include "${messageIncludes}"`)
      failed++
    }
  }
}

async function main() {
  const formData = new FormData()
  formData.append('file', new Blob(['x'], { type: 'image/png' }), 'logo.png')
  formData.append('clientId', 'client123')
  formData.append('field', 'companyLogo')

  // 1. Valid payload -> success, no network error.
  await expectResolves(
    'valid payload resolves with uploaded file data',
    () => {
      mockFetchOnce(
        () =>
          new Response(
            JSON.stringify({
              success: true,
              data: { url: 'https://blob.example/logo.png', originalName: 'logo.png', mimeType: 'image/png', size: 1, uploadedAt: new Date().toISOString() },
            }),
            { status: 200 }
          )
      )
      return performUpload(formData)
    },
    (value) => (value as { url: string }).url === 'https://blob.example/logo.png'
  )

  // 2. Clean JSON error response (e.g. wrong role) -> specific server message, not "Network error".
  await expectRejects(
    'JSON 403 response surfaces the specific server message',
    () => {
      mockFetchOnce(() => new Response(JSON.stringify({ success: false, error: 'Only sales or admin can upload files' }), { status: 403 }))
      return performUpload(formData)
    },
    'Only sales or admin can upload files'
  )

  // 3. Non-JSON 413 (platform/host rejected the request before our route ran) ->
  //    specific file-size message instead of the old generic "Network error".
  await expectRejects(
    'non-JSON 413 response reports file-too-large, not a generic network error',
    () => {
      mockFetchOnce(() => new Response('Request Entity Too Large', { status: 413 }))
      return performUpload(formData)
    },
    'too large'
  )

  // 4. Non-JSON 401 (e.g. an auth proxy returning an HTML page) -> specific auth message.
  await expectRejects(
    'non-JSON 401 response reports a session-expired message',
    () => {
      mockFetchOnce(() => new Response('<html>Unauthorized</html>', { status: 401 }))
      return performUpload(formData)
    },
    'session has expired'
  )

  // 5. Genuine network failure (fetch itself throws) -> this is the one case that
  //    should still say "Network error".
  await expectRejects(
    'a real fetch failure is reported as a network error',
    () => {
      mockFetchOnce(() => {
        throw new TypeError('Failed to fetch')
      })
      return performUpload(formData)
    },
    'Network error'
  )

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
