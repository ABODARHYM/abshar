import type { Order } from '../lib/types/order'
import StatusBadge from './StatusBadge'
import { ORDER_TYPE_ICONS, ORDER_TYPE_LABELS } from '../lib/types/order'
import { formatPrice } from '../lib/utils/pricing'

export default function OrderCard({ order }: { order: Order }) {
  return (
    <a
      href={`/orders/${order.id}`}
      className="block bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-2xl">
            {ORDER_TYPE_ICONS[order.order_type]}
          </div>
          <div>
            <p className="font-bold text-gray-900">
              {ORDER_TYPE_LABELS[order.order_type]}
            </p>
            <p className="text-xs text-gray-500" dir="ltr">
              {order.order_number}
            </p>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2 text-sm">
          <span className="text-green-600">●</span>
          <span className="text-gray-700 line-clamp-1">{order.pickup_address}</span>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="text-red-600">●</span>
          <span className="text-gray-700 line-clamp-1">{order.dropoff_address}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {new Date(order.created_at).toLocaleDateString('ar-YE')}
        </span>
        <span className="font-bold text-primary-600">
          {formatPrice(order.total_price)}
        </span>
      </div>
    </a>
  )
}
