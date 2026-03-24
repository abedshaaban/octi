import { input, select } from '@inquirer/prompts'

export async function promptInput(question: string, defaultValue = ''): Promise<string> {
  const answer = await input({
    message: question,
    ...(defaultValue !== '' ? { default: defaultValue } : {}),
  })

  const trimmed = answer.trim()
  if (!trimmed && defaultValue) return defaultValue
  return trimmed
}

export async function promptSelect(question: string, options: string[], defaultValue: string): Promise<string> {
  if (options.length === 0) {
    throw new Error('no options available for selection')
  }

  const effectiveDefault = options.includes(defaultValue) ? defaultValue : options[0]!

  return select({
    message: question,
    choices: options.map((opt) => ({ name: opt, value: opt })),
    default: effectiveDefault,
  })
}
