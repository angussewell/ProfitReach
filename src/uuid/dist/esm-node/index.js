// Mock implementation of UUID for NextAuth compatibility
// This file emulates the structure expected by NextAuth

const originalUuid = require('uuid');

// Re-export all the original functions
module.exports = {
  ...originalUuid,
  v4: originalUuid.v4,
  v1: originalUuid.v1,
  v3: originalUuid.v3,
  v5: originalUuid.v5,
  NIL: originalUuid.NIL,
  parse: originalUuid.parse,
  stringify: originalUuid.stringify,
  validate: originalUuid.validate,
  version: originalUuid.version
}; 