import type { Order } from '../lib/types/order'
import { ORDER_TYPE_ICONS, ORDER_TYPE_LABELS } from '../lib/types/order'
import { formatPrice } from '../lib/utils/pricing'
export default function OrderCard({ order }: { order: Order }) {
  return (
    <a href={`/orders/${order.id}`} className="block bg-white p-5 rounded-3xl shadow-soft hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-14 h-14 rounded-3xl bg-gradient-soft flex items-center justify-center text-2xl border border-primary-100">{ORDER_TYPE_ICONS[order.order_type]}</div>
        <div><p className="font-black text-gray-900">{ORDER_TYPE_LABELS[order.order_type]}</p><p className="text-xs text-gray-400 font-mono font-semibold" dir="ltr">{order.order_number}</p></div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-3 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" /><span className="text-gray-700 line-clamp-1 font-semibold">{order.pickup_address}</span></div>
        <div className="flex items-start gap-3 text-sm"><span className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" /><span className="text-gray-700 line-clamp-1 font-semibold">{order.dropoff_address}</span></div>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-400 font-semibold">{new Date(order.created_at).toLocaleDateString('ar-YE')}</span>
        <span className="font-black text-primary-600 text-lg">{formatPrice(order.total_price)}</span>
      </div>
    </a>
  )
}
