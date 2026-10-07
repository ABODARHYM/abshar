import { ORDER_STATUS_LABELS, type OrderStatus } from '../lib/types/order'
const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  accepted: 'bg-blue-100 text-blue-700 border-blue-200',
  heading_to_pickup: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  picked_up: 'bg-purple-100 text-purple-700 border-purple-200',
  on_the_way: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  delivered: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}
export default function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`px-3 py-1.5 rounded-2xl text-xs font-bold border ${statusStyles[status]}`}>{ORDER_STATUS_LABELS[status]}</span>
}
