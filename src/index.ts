import type { Plugin, PluginOptions } from "@opencode-ai/plugin"
import { LEARNING_CORE, LEARNING_INSIGHT } from "./instructions.js"
import { readdir, readFile } from "node:fs/promises"
import { join, basename, extname, isAbsolute } from "node:path"

const BUILTIN_STYLES: Record<string, (options: PluginOptions) => string | undefined> = {
  learning: (options) => (options.insights === false ? LEARNING_CORE : LEARNING_CORE + LEARNING_INSIGHT),
  default: () => undefined,
}

export const OutputStyles: Plugin = async (ctx, options) => {
  const home = process.env.HOME
  const globalRoot = home ? join(process.env.XDG_CONFIG_HOME || join(home, ".config"), "opencode") : undefined
  const dirs: string[] = []
  if (globalRoot) {
    dirs.push(join(globalRoot, "styles"), join(globalRoot, "style"))
  }
  dirs.push(
    join(ctx.directory, ".opencode", "styles"),
    join(ctx.directory, ".opencode", "style"),
  )

  const discovered: Record<string, string> = {}
  for (const dir of dirs) {
    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT") continue
      throw new Error(
        `opencode-output-styles: cannot read styles directory "${dir}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
    for (const entry of entries) {
      if (extname(entry).toLowerCase() !== ".md") continue
      try {
        const name = entry.slice(0, entry.length - extname(entry).length)
        discovered[name] = (await readFile(join(dir, entry), "utf8")).trim()
      } catch {
      }
    }
  }

  const styles: Record<string, (options: PluginOptions) => string | undefined> = { ...BUILTIN_STYLES }
  for (const [name, content] of Object.entries(discovered)) {
    styles[name] = () => content
  }

  return {
    "experimental.chat.system.transform": async (_input, output) => {
      const styleOpt = options?.style
      if (styleOpt !== undefined && typeof styleOpt !== "string") {
        throw new Error(`opencode-output-styles: "style" option must be a string, got ${typeof styleOpt}`)
      }
      const requested = typeof styleOpt === "string" ? styleOpt : "default"

      const render = styles[requested]
      if (render) {
        const text = render(options ?? {})
        if (text) output.system.push(text)
        return
      }

      const isPath = requested.includes("/") || requested.includes("\\")
      const isFileExt = !isPath && (requested.endsWith(".md") || requested.endsWith(".txt"))
      if (isPath || isFileExt) {
        try {
          const content = (await readFile(isAbsolute(requested) ? requested : join(ctx.directory, requested), "utf8")).trim()
          if (content) output.system.push(content)
          return
        } catch (err) {
          throw new Error(`opencode-output-styles: cannot read style file "${requested}": ${err instanceof Error ? err.message : String(err)}`)
        }
      }

      const searched = dirs.map(d => (globalRoot && d.startsWith(globalRoot) ? "global " : "project ") + basename(d)).join(", ")
      throw new Error(`opencode-output-styles: unknown style "${requested}" (available: ${Object.keys(styles).join(", ")}; searched: ${searched})`)
    },
  }
}