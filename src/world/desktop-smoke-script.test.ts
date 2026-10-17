import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

test('desktop smoke command fails clearly when the application has not been built',async()=>{
 const cwd=await mkdtemp(join(tmpdir(),'paw-smoke-no-build-'))
 try{
  const result=spawnSync(process.execPath,[resolve('scripts/desktop-smoke.mjs')],{cwd,encoding:'utf8',timeout:5000})
  assert.equal(result.status,2)
  assert.match(result.stderr,/requires a successful build/)
 }finally{await rm(cwd,{recursive:true,force:true})}
})
