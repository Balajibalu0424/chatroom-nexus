import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMeshCentralSessionUrl,
  createMeshCentralLoginToken,
  decodeMeshCentralLoginToken,
} from '@/lib/meshcentral'

const keyHex = 'ab'.repeat(80)

test('meshcentral login tokens decode to the expected payload', () => {
  const token = createMeshCentralLoginToken('user//integration-admin', keyHex, 1_710_000_000_000, 5)
  const payload = decodeMeshCentralLoginToken(token, keyHex)

  assert.equal(payload.u, 'user//integration-admin')
  assert.equal(payload.a, 3)
  assert.equal(payload.time, 1_710_000_000)
  assert.equal(payload.expire, 5)
})

test('meshcentral session URLs include the login token and view params', () => {
  const url = new URL(
    buildMeshCentralSessionUrl({
      baseUrl: 'https://mesh.example.com/',
      userId: 'user//integration-admin',
      keyHex,
      nodeId: 'node//desktop',
      mode: 'desktop',
      now: 1_710_000_000_000,
      expireMinutes: 5,
    })
  )

  assert.equal(url.origin, 'https://mesh.example.com')
  assert.equal(url.searchParams.get('viewmode'), '11')
  assert.equal(url.searchParams.get('hide'), '15')
  assert.equal(url.searchParams.get('gotonode'), 'node//desktop')
  assert.ok(url.searchParams.get('login'))
})
