import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const script=resolve('scripts/write-checksums.mjs')
test('release checksum generator hashes every artifact and writes stable sorted output',async()=>{
 const root=await mkdtemp(join(tmpdir(),'paw-checksums-'))
 const directory=join(root,'release')
 await mkdir(directory)
 try{
  await writeFile(join(directory,'paw-z.zip'),'zip bytes')
  await writeFile(join(directory,'paw-a.AppImage'),'app bytes')
  const result=spawnSync(process.execPath,[script,directory],{encoding:'utf8'})
  assert.equal(result.status,0,result.stderr)
  const output=await readFile(join(directory,'SHA256SUMS.txt'),'utf8')
  const expected=[
   createHash('sha256').update('app bytes').digest('hex')+'  paw-a.AppImage',
   createHash('sha256').update('zip bytes').digest('hex')+'  paw-z.zip'
  ].join('\n')+'\n'
  assert.equal(output,expected)
  const second=spawnSync(process.execPath,[script,directory],{encoding:'utf8'})
  assert.equal(second.status,0,second.stderr)
  assert.equal(await readFile(join(directory,'SHA256SUMS.txt'),'utf8'),expected)
 }finally{await rm(root,{recursive:true,force:true})}
})
test('release checksum generator rejects an empty artifact directory',async()=>{
 const root=await mkdtemp(join(tmpdir(),'paw-checksums-empty-'))
 try{
  const result=spawnSync(process.execPath,[script,root],{encoding:'utf8'})
  assert.notEqual(result.status,0)
  assert.match(result.stderr,/No release artifacts found/)
 }finally{await rm(root,{recursive:true,force:true})}
})
