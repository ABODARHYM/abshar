import { ORDER_STATUS_LABELS, type OrderStatus } from '../lib/types/order'

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  heading_to_pickup: 'bg-indigo-100 text-indigo-700',
  picked_up: 'bg-purple-100 text-purple-700',
  on_the_way: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  )
}
