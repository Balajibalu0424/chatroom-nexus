import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getEnvAdminDevices,
  isPlaceholderMeshNodeId,
  listAdminDevices,
} from '@/lib/admin-devices'

const originalAdminDevicesJson = process.env.ADMIN_DEVICES_JSON
const originalAdminDevicesJsonBase64 = process.env.ADMIN_DEVICES_JSON_BASE64

test.afterEach(() => {
  if (originalAdminDevicesJson === undefined) {
    delete process.env.ADMIN_DEVICES_JSON
  } else {
    process.env.ADMIN_DEVICES_JSON = originalAdminDevicesJson
  }

  if (originalAdminDevicesJsonBase64 === undefined) {
    delete process.env.ADMIN_DEVICES_JSON_BASE64
  } else {
    process.env.ADMIN_DEVICES_JSON_BASE64 = originalAdminDevicesJsonBase64
  }
})

test('admin devices can be loaded from ADMIN_DEVICES_JSON', async () => {
  process.env.ADMIN_DEVICES_JSON = JSON.stringify([
    {
      id: 'laptop',
      label: 'Laptop',
      mesh_node_id: 'node//laptop',
      platform: 'windows',
      sort_order: 2,
    },
    {
      id: 'desktop',
      label: 'Desktop',
      mesh_node_id: 'node//desktop',
      platform: 'windows',
      sort_order: 1,
    },
  ])

  const devices = await listAdminDevices()

  assert.deepEqual(
    devices.map((device) => device.id),
    ['desktop', 'laptop']
  )
  assert.equal(devices[0].label, 'Desktop')
})

test('admin devices can be loaded from ADMIN_DEVICES_JSON_BASE64', () => {
  delete process.env.ADMIN_DEVICES_JSON
  process.env.ADMIN_DEVICES_JSON_BASE64 = Buffer.from(
    JSON.stringify([
      {
        id: 'desktop',
        label: 'Desktop',
        mesh_node_id: 'node//desktop',
        platform: 'windows',
        sort_order: 1,
      },
    ])
  ).toString('base64')

  const devices = getEnvAdminDevices()

  assert.equal(devices?.length, 1)
  assert.equal(devices?.[0].id, 'desktop')
})

test('admin devices env config validates device shape', () => {
  delete process.env.ADMIN_DEVICES_JSON_BASE64
  process.env.ADMIN_DEVICES_JSON = JSON.stringify([{ label: 'Desktop' }])

  assert.throws(() => getEnvAdminDevices(), /mesh_node_id/)
})

test('placeholder MeshCentral node IDs are detected', () => {
  assert.equal(isPlaceholderMeshNodeId('REPLACE_WITH_DESKTOP_NODE_ID'), true)
  assert.equal(isPlaceholderMeshNodeId('node//real'), false)
})
