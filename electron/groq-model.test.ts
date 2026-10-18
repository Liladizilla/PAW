import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidGroqModelId } from './groq-model'

test('accepts Groq model IDs with provider namespaces', () => {
  assert.equal(isValidGroqModelId('openai/gpt-oss-120b'), true)
  assert.equal(isValidGroqModelId('meta-llama/llama-prompt-guard-2-22m'), true)
})

test('accepts simple Groq model IDs', () => {
  assert.equal(isValidGroqModelId('llama-3.3-70b-versatile'), true)
})

test('rejects empty, malformed, whitespace, and overlong model IDs', () => {
  assert.equal(isValidGroqModelId(''), false)
  assert.equal(isValidGroqModelId('/openai/gpt-oss-120b'), false)
  assert.equal(isValidGroqModelId('openai/gpt oss 120b'), false)
  assert.equal(isValidGroqModelId('a'.repeat(121)), false)
})
