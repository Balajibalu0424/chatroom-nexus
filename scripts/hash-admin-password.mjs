#!/usr/bin/env node

import { randomBytes, scryptSync } from 'node:crypto'

const password = process.argv[2]

if (!password) {
  console.error('Usage: node scripts/hash-admin-password.mjs "<strong-password>"')
  process.exit(1)
}

const cost = 16384
const blockSize = 8
const parallelization = 1
const salt = randomBytes(16)
const derivedKey = scryptSync(password, salt, 64, {
  N: cost,
  r: blockSize,
  p: parallelization,
})

const encoded = [
  'scrypt',
  String(cost),
  String(blockSize),
  String(parallelization),
  salt.toString('base64url'),
  derivedKey.toString('base64url'),
].join('$')

console.log(encoded)
