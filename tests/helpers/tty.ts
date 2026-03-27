export function setWritableValue<T extends object, TKey extends keyof T>(
  target: T,
  key: TKey,
  value: T[TKey]
): () => void {
  const original = Object.getOwnPropertyDescriptor(target, key)

  Object.defineProperty(target, key, {
    configurable: true,
    writable: true,
    value
  })

  return () => {
    if (original) {
      Object.defineProperty(target, key, original)
      return
    }

    delete (target as Record<PropertyKey, unknown>)[key as PropertyKey]
  }
}
