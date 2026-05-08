export const formatCurrency = (n: number, currency = 'BSD') => new Intl.NumberFormat('en-BS', { style: 'currency', currency }).format(n)
