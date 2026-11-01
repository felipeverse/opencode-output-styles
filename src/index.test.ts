import { mkdir, mkdtemp, utimes, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LEARNING_CORE, LEARNING_INSIGHT } from "./instructions.js"
import { resolveAgentTargets, resolveStyleText } from "./resolve.js"

let base: string
let projectDir: string
const originalHome = process.env.HOME
const originalXdg = process.env.XDG_CONFIG_HOME

beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), "oos-test-"))
  projectDir = join(base, "project")
  await mkdir(projectDir, { recursive: true })
  process.env.HOME = join(base, "home")
  delete process.env.XDG_CONFIG_HOME
})

afterEach(() => {
  process.env.HOME = originalHome
  if (originalXdg === undefined) delete process.env.XDG_CONFIG_HOME
  else process.env.XDG_CONFIG_HOME = originalXdg
})

async function writeProjectFile(rel: string, content: string): Promise<string> {
  const path = join(projectDir, rel)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
  return path
}

describe("resolveStyleText", () => {
  it("returns the learning core + insight block", async () => {
    expect(await resolveStyleText({ style: "learning" }, projectDir)).toBe(LEARNING_CORE + LEARNING_INSIGHT)
  })

  it("omits the insight block when insights is false", async () => {
    expect(await resolveStyleText({ style: "learning", insights: false }, projectDir)).toBe(LEARNING_CORE)
  })

  it("injects nothing for the default style", async () => {
    expect(await resolveStyleText({ style: "default" }, projectDir)).toBeUndefined()
  })

  it("discovers a custom style from the project styles dir", async () => {
    await writeProjectFile(".opencode/styles/my.md", "CUSTOM")
    expect(await resolveStyleText({ style: "my" }, projectDir)).toBe("CUSTOM")
  })

  it("reads a style file via the path escape hatch", async () => {
    await writeProjectFile("style.md", "PATH")
    expect(await resolveStyleText({ style: "./style.md" }, projectDir)).toBe("PATH")
  })

  it("throws listing available styles for an unknown name", async () => {
    await writeProjectFile(".opencode/styles/my.md", "CUSTOM")
    await expect(resolveStyleText({ style: "nope" }, projectDir)).rejects.toThrow(
      /unknown style "nope".*available: learning, default, my/s,
    )
  })

  it("throws when the style option is not a string", async () => {
    await expect(resolveStyleText({ style: 123 }, projectDir)).rejects.toThrow(/"style" option must be a string/)
  })

  it("warns and injects nothing for an empty discovered style", async () => {
    await writeProjectFile(".opencode/styles/empty.md", "   ")
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(await resolveStyleText({ style: "empty" }, projectDir)).toBeUndefined()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it("warns and injects nothing for an empty style file", async () => {
    await writeProjectFile("empty.md", "")
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(await resolveStyleText({ style: "./empty.md" }, projectDir)).toBeUndefined()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it("re-reads a style file when its mtime changes", async () => {
    const path = await writeProjectFile("style.md", "V1")
    expect(await resolveStyleText({ style: "./style.md" }, projectDir)).toBe("V1")
    await writeFile(path, "V2")
    await utimes(path, new Date(Date.now() + 2000), new Date(Date.now() + 2000))
    expect(await resolveStyleText({ style: "./style.md" }, projectDir)).toBe("V2")
  })

  it("serves cached content when mtime is unchanged", async () => {
    const path = await writeProjectFile("style.md", "V1")
    const fixed = new Date(1_700_000_000_000)
    await utimes(path, fixed, fixed)
    expect(await resolveStyleText({ style: "./style.md" }, projectDir)).toBe("V1")
    await writeFile(path, "CHANGED")
    await utimes(path, fixed, fixed)
    expect(await resolveStyleText({ style: "./style.md" }, projectDir)).toBe("V1")
  })
})

describe("resolveAgentTargets", () => {
  it("defaults to the build agent", () => {
    expect(resolveAgentTargets({}, ["build"])).toEqual(["build"])
  })

  it("targets a specific agent id", () => {
    expect(resolveAgentTargets({ agent: "plan" }, ["build", "plan"])).toEqual(["plan"])
  })

  it("expands all to the available agents", () => {
    expect(resolveAgentTargets({ agent: "all" }, ["build", "plan"])).toEqual(["build", "plan"])
  })

  it("throws for an invalid agent option", () => {
    expect(() => resolveAgentTargets({ agent: 123 }, ["build"])).toThrow(/"agent" option must be a string/)
  })
})
