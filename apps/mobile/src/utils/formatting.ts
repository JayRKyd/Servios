export const formatCurrency = (n: number) => new Intl.NumberFormat('en-BS', { style: 'currency', currency: 'USD' }).format(n)
export const formatDate = (d: string) => new Intl.DateTimeFormat('en-BS', { dateStyle: 'medium' }).format(new Date(d))
