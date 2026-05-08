export const formatDate = (d: string | Date) => new Intl.DateTimeFormat('en-BS', { dateStyle: 'medium' }).format(new Date(d))
