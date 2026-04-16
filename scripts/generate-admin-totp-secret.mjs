#!/usr/bin/env node

import { randomBytes } from 'node:crypto'

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const bytes = randomBytes(20)

let bits = ''
for (const byte of bytes) {
  bits += byte.toString(2).padStart(8, '0')
}

let secret = ''
for (let index = 0; index < bits.length; index += 5) {
  const chunk = bits.slice(index, index + 5).padEnd(5, '0')
  secret += alphabet[Number.parseInt(chunk, 2)]
}

console.log(secret)
