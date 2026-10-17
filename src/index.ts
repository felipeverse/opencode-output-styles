import type { Plugin, PluginOptions } from "@opencode-ai/plugin"
import { LEARNING_CORE, LEARNING_INSIGHT } from "./instructions.js"

const STYLES: Record<string, (options: PluginOptions) => string | undefined> = {
  learning: (options) => (options.insights === false ? LEARNING_CORE : LEARNING_CORE + LEARNING_INSIGHT),
  default: () => undefined,
}

export const OutputStyles: Plugin = async (_ctx, options) => ({
  "experimental.chat.system.transform": async (_input, output) => {
    const name = typeof options?.style === "string" ? options.style : "default"
    const render = STYLES[name]
    if (!render) throw new Error(`opencode-output-styles: unknown style "${name}" (valid: ${Object.keys(STYLES).join(", ")})`)
    const text = render(options ?? {})
    if (text) output.system.push(text)
  },
})
