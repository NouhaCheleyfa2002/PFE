"use client";

import { useState, useEffect } from 'react';
import { Package, Calendar, CreditCard, CheckCircle, XCircle, Clock, Download, Eye, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface OrderItem {
  id: string;
  resourceId: string;
  resourceType: string;
  resourceTitle: string;
  price: number;
  teacherId: string;
  teacherName: string;
}

interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const pageSize = 10;

  useEffect(() => {
    loadOrders();
  }, [page]);

  const loadOrders = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please login to view orders');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/payment/orders?page=${page}&pageSize=${pageSize}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load orders');
      }

      const data = await response.json();
      setOrders(data.orders);
      setTotal(data.total);
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            <XCircle className="w-4 h-4" />
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
            <XCircle className="w-4 h-4" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const handleRetryPayment = async (order: Order) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please login to continue');
        return;
      }

      toast.loading('Creating checkout session...');

      // Create checkout session with resource IDs (not items)
      const checkoutData = {
        resourceIds: order.items.map(item => item.resourceId),
      };

      console.log('Checkout data:', checkoutData);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/payment/checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(checkoutData),
        }
      );

      const data = await response.json();
      console.log('Checkout response:', data);

      if (!response.ok) {
        toast.dismiss();
        toast.error(data.message || 'Failed to create checkout session');
        return;
      }
      
      // Redirect to Stripe checkout
      if (data.checkoutUrl || data.url) {
        toast.dismiss();
        toast.success('Redirecting to payment...');
        window.location.href = data.checkoutUrl || data.url;
      } else {
        toast.dismiss();
        toast.error('Failed to get payment URL');
      }
    } catch (error: any) {
      console.error('Failed to retry payment:', error);
      toast.dismiss();
      toast.error(error.message || 'Failed to proceed with payment');
    }
  };

  const handleCancelOrder = async (order: Order) => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please login to continue');
        return;
      }

      toast.loading('Cancelling order...');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/payment/orders/${order.id}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.dismiss();
        toast.error(data.message || 'Failed to cancel order');
        return;
      }

      toast.dismiss();
      toast.success('Order cancelled successfully');
      
      // Refresh orders list
      loadOrders();
    } catch (error: any) {
      console.error('Failed to cancel order:', error);
      toast.dismiss();
      toast.error(error.message || 'Failed to cancel order');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 absolute top-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative mb-8 p-8 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">Order History</h1>
            </div>
            <p className="text-purple-100 text-lg">
              {total} {total === 1 ? 'order' : 'orders'} in total
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Package className="w-16 h-16 text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">No orders yet</h2>
            <p className="text-gray-600 mb-8">
              Start shopping to see your order history here
            </p>
            <a
              href="/dashboard/library"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold"
            >
              Browse Resources
              <ChevronRight className="w-5 h-5" />
            </a>
          </div>
        ) : (
          /* Orders List */
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                {/* Order Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleOrderDetails(order.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            Order #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            {formatDate(order.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {getStatusBadge(order.status)}
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Total</p>
                        <p className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                          {order.totalAmount.toFixed(2)} {order.currency}
                        </p>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          expandedOrder === order.id ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Order Details (Expanded) */}
                {expandedOrder === order.id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      Order Items ({order.items.length})
                    </h3>
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 mb-1">
                              {item.resourceTitle}
                            </p>
                            <p className="text-sm text-gray-500">
                              by {item.teacherName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {item.price.toFixed(2)} {order.currency}
                            </p>
                            {order.status === 'paid' && (
                              <a
                                href={`/dashboard/resources?tab=library&highlight=${item.resourceId}`}
                                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 justify-end mt-1"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Summary */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 mb-1">Order Date</p>
                          <p className="font-medium text-gray-900">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        {order.completedAt && (
                          <div>
                            <p className="text-gray-500 mb-1">Completed Date</p>
                            <p className="font-medium text-gray-900">
                              {formatDate(order.completedAt)}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-500 mb-1">Payment Status</p>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>

                      {/* Action Buttons for Pending Orders */}
                      {order.status === 'pending' && (
                        <div className="mt-6 flex justify-end gap-3">
                          <button
                            onClick={() => handleCancelOrder(order)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-semibold"
                          >
                            <XCircle className="w-5 h-5" />
                            Cancel Order
                          </button>
                          <button
                            onClick={() => handleRetryPayment(order)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold"
                          >
                            <CreditCard className="w-5 h-5" />
                            Proceed with Payment
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {total > pageSize && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-600">
                  Page {page} of {Math.ceil(total / pageSize)}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(total / pageSize)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
