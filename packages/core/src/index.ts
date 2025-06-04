import fs from 'fs'
import path from 'path'

export interface Chunk {
  code: string
  start: number
  file: string
  name: string
}

export type ChunkDictionary = Record<string, Chunk>

/**
 * Markdown から TypeScript のコードチャンクを抽出する
 */
export function parseChunks(md: string, uri: string): ChunkDictionary {
  const lines = md.split(/\r?\n/)
  const chunks: ChunkDictionary = {}
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = line.match(/^```ts\s+(\S+)/)
    if (m) {
      const name = m[1]
      const start = i + 2
      const codeLines: string[] = []
      i++
      while (i < lines.length && lines[i] !== '```') {
        codeLines.push(lines[i])
        i++
      }
      chunks[name] = { code: codeLines.join('\n'), start, file: uri, name }
    }
  }
  return chunks
}

export interface ImportInfo {
  file: string
  name: string
}

/**
 * チャンクインポート "#path:name" を importer からの相対パスで解決する
 */
export function resolveImport(id: string, importer: string): ImportInfo | null {
  if (!id.startsWith('#')) return null
  const body = id.slice(1)
  const idx = body.lastIndexOf(':')
  if (idx === -1) return null
  const filePart = body.slice(0, idx)
  const name = body.slice(idx + 1)
  const importerDir = path.dirname(importer)
  const file = path.resolve(importerDir, filePart)
  return { file, name }
}

/**
 * エントリ Markdown ファイルから再帰的に仮想ファイルを収集する
 */
export function collectVirtualFiles(entry: string): Record<string, Chunk> {
  const result: Record<string, Chunk> = {}
  const visited = new Set<string>()
  const stack = new Set<string>()

  function dfs(file: string) {
    if (stack.has(file)) {
      throw new Error(`circular dependency detected: ${file}`)
    }
    if (visited.has(file)) return
    stack.add(file)
    const md = fs.readFileSync(file, 'utf8')
    const chunks = parseChunks(md, file)
    for (const chunk of Object.values(chunks)) {
      result[`${chunk.file}:${chunk.name}`] = chunk
    }
    visited.add(file)
    for (const chunk of Object.values(chunks)) {
      const importRegex = /import\s+['"](#.+?)['"]/g
      let match: RegExpExecArray | null
      while ((match = importRegex.exec(chunk.code))) {
        const info = resolveImport(match[1], file)
        if (info) {
          const depFile = info.file
          dfs(depFile)
        }
      }
    }
    stack.delete(file)
  }

  dfs(path.resolve(entry))
  return result
}
