export const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
export const isValidPhone = (p: string) => /^\+?[\d\s\-()]{10,}$/.test(p)
