import type { PluginOptions } from "@opencode-ai/plugin"
import { LEARNING_CORE, LEARNING_INSIGHT } from "./instructions.js"
import { readdir, readFile, stat } from "node:fs/promises"
import { join, basename, extname, isAbsolute } from "node:path"

export const PLUGIN_ID = "opencode-output-styles"
const DEFAULT_AGENT_ID = "build"

type StyleRender = (options: PluginOptions) => string | undefined

const BUILTIN_STYLES: Record<string, StyleRender> = {
  learning: (options) => (options.insights === false ? LEARNING_CORE : LEARNING_CORE + LEARNING_INSIGHT),
  default: () => undefined,
}

const warn = (message: string) => console.warn(`[${PLUGIN_ID}] ${message}`)
const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err))

const globalConfigRoot = (): string | undefined =>
  process.env.HOME ? join(process.env.XDG_CONFIG_HOME || join(process.env.HOME, ".config"), "opencode") : undefined

type StyleDir = { path: string; scope: "global" | "project" }

const styleDirs = (projectDir: string): StyleDir[] => {
  const dirs: StyleDir[] = []
  const globalRoot = globalConfigRoot()
  if (globalRoot) {
    dirs.push({ path: join(globalRoot, "styles"), scope: "global" }, { path: join(globalRoot, "style"), scope: "global" })
  }
  dirs.push(
    { path: join(projectDir, ".opencode", "styles"), scope: "project" },
    { path: join(projectDir, ".opencode", "style"), scope: "project" }
  )
  return dirs
}

type CachedFile = { mtimeMs: number; text: string }
const fileCache = new Map<string, CachedFile>()

const readStyleFile = async (path: string): Promise<string> => {
  const info = await stat(path)
  const cached = fileCache.get(path)
  if (cached && cached.mtimeMs === info.mtimeMs) return cached.text
  const text = (await readFile(path, "utf8")).trim()
  fileCache.set(path, { mtimeMs: info.mtimeMs, text })
  return text
}

const discoverStyles = async (dirs: StyleDir[]): Promise<Record<string, string>> => {
  const discovered: Record<string, string> = {}
  for (const dir of dirs) {
    let entries: string[]
    try {
      entries = await readdir(dir.path)
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT") continue
      throw new Error(`${PLUGIN_ID}: cannot read styles directory "${dir.path}": ${errMsg(err)}`)
    }
    for (const entry of entries) {
      const ext = extname(entry)
      if (ext.toLowerCase() !== ".md") continue
      const name = entry.slice(0, entry.length - ext.length)
      try {
        discovered[name] = await readStyleFile(join(dir.path, entry))
      } catch (err) {
        warn(`skipping unreadable style "${join(dir.path, entry)}": ${errMsg(err)}`)
      }
    }
  }
  return discovered
}

const readRequestedFile = async (requested: string, projectDir: string): Promise<string> => {
  const path = isAbsolute(requested) ? requested : join(projectDir, requested)
  try {
    return await readStyleFile(path)
  } catch (err) {
    throw new Error(`${PLUGIN_ID}: cannot read style file "${requested}": ${errMsg(err)}`)
  }
}

export const resolveStyleText = async (
  options: PluginOptions | undefined,
  projectDir: string
): Promise<string | undefined> => {
  const opts = options ?? {}
  const styleOpt = opts.style
  if (styleOpt !== undefined && typeof styleOpt !== "string") {
    throw new Error(`${PLUGIN_ID}: "style" option must be a string, got ${typeof styleOpt}`)
  }
  const requested = typeof styleOpt === "string" ? styleOpt : "default"
  const dirs = styleDirs(projectDir)
  const discovered = await discoverStyles(dirs)

  const styles: Record<string, StyleRender | undefined> = { ...BUILTIN_STYLES }
  for (const [name, content] of Object.entries(discovered)) {
    styles[name] = () => content
  }

  const render = styles[requested]
  const isPath = requested.includes("/") || requested.includes("\\")
  const isStyleFilename = !isPath && (requested.endsWith(".md") || requested.endsWith(".txt"))
  if (!render && !isPath && !isStyleFilename) {
    const searched = dirs.map((d) => `${d.scope} ${basename(d.path)}`).join(", ")
    throw new Error(
      `${PLUGIN_ID}: unknown style "${requested}" (available: ${Object.keys(styles).join(", ")}; searched: ${searched})`
    )
  }

  const fromFile = render ? Object.hasOwn(discovered, requested) : true
  const text = render ? render(opts) : await readRequestedFile(requested, projectDir)
  if (!text) {
    if (fromFile) warn(`style "${requested}" is empty, injecting nothing`)
    return undefined
  }
  return text
}

export const resolveAgentTargets = (options: PluginOptions | undefined, availableIds: string[]): string[] => {
  const agentOpt = options?.agent
  if (agentOpt === undefined) return [DEFAULT_AGENT_ID]
  if (agentOpt === "all") return availableIds
  if (typeof agentOpt === "string" && agentOpt) return [agentOpt]
  throw new Error(`${PLUGIN_ID}: "agent" option must be a string or "all", got ${typeof agentOpt}`)
}
