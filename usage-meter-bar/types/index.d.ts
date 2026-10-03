export type Snap = {
  rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[]
  usd: number | null
}

export type Tokens = {
  input: number
  output: number
  cache: number
}

declare module 'claude-code' {
  interface PluginState {
    'meter': { snap: Snap | null; tokens: Tokens }
  }
}
