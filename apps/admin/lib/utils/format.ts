export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('ar-YE')} ر.ي`
}
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ar-YE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
