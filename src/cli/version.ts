import fs from 'node:fs'
import path from 'node:path'

function loadCliVersion(): string {
  try {
    const packageJsonPath = path.resolve(__dirname, '../../package.json')
    const raw = fs.readFileSync(packageJsonPath, 'utf8')
    const parsed = JSON.parse(raw) as { version?: unknown }

    return typeof parsed.version === 'string' && parsed.version.trim() !== '' ? parsed.version : '0.0.0'
  } catch {
    return '0.0.0'
  }
}

export const CLI_VERSION = loadCliVersion()
