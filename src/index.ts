// Type-only imports keep this module loadable on both OpenCode 1.x and 2.x.
import type { Hooks, PluginInput, PluginModule, PluginOptions } from "@opencode-ai/plugin"
import type { Plugin as PluginV2 } from "@opencode-ai/plugin/v2/promise"
import { PLUGIN_ID, resolveStyleText, resolveAgentTargets } from "./resolve.js"

export async function OutputStyles(ctx: PluginInput, options?: PluginOptions): Promise<Hooks> {
  return {
    "experimental.chat.system.transform": async (_input, output) => {
      const text = await resolveStyleText(options, ctx.directory)
      if (text) output.system.push(text)
    },
  }
}

// One default export for both loaders: OpenCode 1.x calls `server()` for the
// hooks (PluginModule); OpenCode 2.x reads `id` + `setup`.
const plugin: PluginModule & PluginV2 = {
  id: PLUGIN_ID,
  server: OutputStyles,
  setup: async (ctx) => {
    await ctx.agent.transform(async (editor) => {
      const text = await resolveStyleText(ctx.options, process.cwd())
      if (!text) return
      const availableIds = editor.list().map((a) => a.id)
      for (const id of resolveAgentTargets(ctx.options, availableIds)) {
        editor.update(id, (agent) => {
          agent.system = text
        })
      }
    })
  },
}

export default plugin
