import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { DbSchema, LastPosition } from './types'

export interface IDatabase {
  get<K extends keyof DbSchema>(key: K): DbSchema[K]
  set<K extends keyof DbSchema>(key: K, value: DbSchema[K]): void
  push(key: 'historicPosition', value: LastPosition): void
  flush(): void
}

export class Database implements IDatabase {
  private data: DbSchema
  private dirty = false

  public constructor(
    private readonly path: string,
    defaultModel: DbSchema,
  ) {
    this.data = structuredClone(defaultModel)
    try {
      const raw = readFileSync(path, 'utf-8')
      this.data = JSON.parse(raw) as DbSchema
    } catch (err: unknown) {
      const isNotFound =
        err instanceof Error && 'code' in err && err.code === 'ENOENT'
      if (!isNotFound && !(err instanceof SyntaxError)) {
        throw err
      }
      if (!isNotFound && err instanceof SyntaxError) {
        throw new Error(`Corrupted database file: ${path}`)
      }
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, JSON.stringify(defaultModel, null, 2))
    }
  }

  public get<K extends keyof DbSchema>(key: K): DbSchema[K] {
    return this.data[key]
  }

  public set<K extends keyof DbSchema>(key: K, value: DbSchema[K]): void {
    ;(this.data as Record<string, unknown>)[key] = value
    this.dirty = true
  }

  public push(key: 'historicPosition', value: LastPosition): void {
    this.data[key].push(value)
    this.dirty = true
  }

  public flush(): void {
    if (!this.dirty) return
    writeFileSync(this.path, JSON.stringify(this.data, null, 2))
    this.dirty = false
  }
}
