export interface BuiltinCommand {
  command: string
  description: string
  usage?: string
  handler: (args: string) => { text: string; type: 'replace' | 'action' }
}

export const BUILTIN_COMMANDS: BuiltinCommand[] = [
  {
    command: '/shrug',
    description: 'Append a shrug \u00af\\_(\u30c4)_/\u00af',
    handler: (args) => ({ text: `${args} \u00af\\_(\u30c4)_/\u00af`.trim(), type: 'replace' }),
  },
  {
    command: '/tableflip',
    description: 'Append a table flip (\u256f\u00b0\u25a1\u00b0)\u256f\ufe35 \u253b\u2501\u253b',
    handler: (args) => ({ text: `${args} (\u256f\u00b0\u25a1\u00b0)\u256f\ufe35 \u253b\u2501\u253b`.trim(), type: 'replace' }),
  },
  {
    command: '/unflip',
    description: 'Put the table back \u252c\u2500\u252c\u30ce( \u00ba _ \u00ba\u30ce)',
