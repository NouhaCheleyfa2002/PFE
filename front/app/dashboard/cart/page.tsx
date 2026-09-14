"use client";

import { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShoppingBag, X, Sparkles, Tag, TrendingUp, Clock, Award, Package, Lock, Calendar, CreditCard, CheckCircle, XCircle, ChevronRight, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CartItem {
  id: string;
  documentId: string;
  title: string;
  subject: string;
  classLevel: string;
  price: number;
  license: string;
  quantity: number;
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [activeTab, setActiveTab] = useState<'cart' | 'history'>('cart');
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
    if (activeTab === 'history') {
      loadOrders();
    }
  }, [activeTab]);

  const loadCart = () => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to load cart:', error);
      }
    }
    setLoading(false);
  };

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please login to view orders');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/payment/orders?page=1&pageSize=20`,
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
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load payment history');
    } finally {
      setOrdersLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      paid: { bg: 'bg-green-100', text: 'text-green-700', icon: <Clock className="w-4 h-4" />, label: 'Completed' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <Clock className="w-4 h-4" />, label: 'Pending' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', icon: <X className="w-4 h-4" />, label: 'Failed' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <X className="w-4 h-4" />, label: 'Cancelled' },
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 ${badge.bg} ${badge.text} rounded-full text-sm font-medium`}>
        {badge.icon}
        {badge.label}
      </span>
    );
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

  const updateCart = (newCart: CartItem[]) => {
    setCartItems(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    // Dispatch event to update cart badge
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const removeItem = (documentId: string) => {
    const newCart = cartItems.filter(item => item.documentId !== documentId);
    updateCart(newCart);
    toast.success('Item removed from cart', { 
      icon: <Trash2 className="w-5 h-5" />,
      style: { background: '#FEE2E2', color: '#991B1B' }
    });
  };

  const updateQuantity = (documentId: string, delta: number) => {
    const newCart = cartItems.map(item => {
      if (item.documentId === documentId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    updateCart(newCart);
  };

  const clearCart = () => {
    if (confirm('Are you sure you want to clear your cart?')) {
      updateCart([]);
      toast.success('Cart cleared', { icon: <Trash2 className="w-5 h-5" /> });
    }
  };

  const checkout = async () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setIsProcessing(true);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please login to checkout');
        setIsProcessing(false);
        return;
      }

      // Extract document IDs from cart
      const resourceIds = cartItems.map(item => item.documentId);
      
      console.log('Checking out with resource IDs:', resourceIds);

      // Create Stripe checkout session
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/payment/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ resourceIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Checkout error response:', error);
        throw new Error(error.message || 'Checkout failed');
      }

      const result = await response.json();

      // Redirect to Stripe checkout
      toast.success('Redirecting to secure checkout...', { icon: <Lock className="w-5 h-5" /> });
      
      // Redirect to Stripe hosted checkout page
      window.location.href = result.checkoutUrl;

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to process checkout');
      setIsProcessing(false);
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const tax = subtotal * 0.19; // 19% TVA in Tunisia
  const total = subtotal + tax;
  const savings = cartItems.length >= 3 ? subtotal * 0.1 : 0; // 10% discount for 3+ items

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
        {/* Header with gradient background and tabs */}
        <div className="relative mb-8 p-8 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    {activeTab === 'cart' ? <ShoppingCart className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold">
                    {activeTab === 'cart' ? 'Your Cart' : 'Payment History'}
                  </h1>
                </div>
                <p className="text-purple-100 text-lg">
                  {activeTab === 'cart' 
                    ? `${cartItems.length} ${cartItems.length === 1 ? 'resource' : 'resources'} ready for checkout`
                    : `${orders.length} ${orders.length === 1 ? 'order' : 'orders'} in total`
                  }
                </p>
              </div>
              
              {activeTab === 'cart' && cartItems.length > 0 && (
                <button
                  onClick={clearCart}
                  className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-all duration-300 border border-white/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('cart')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'cart'
                    ? 'bg-white text-purple-600'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                Shopping Cart
                {cartItems.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'cart' ? 'bg-purple-100 text-purple-600' : 'bg-white/20'
                  }`}>
                    {cartItems.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'history'
                    ? 'bg-white text-purple-600'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Package className="w-5 h-5" />
                Order History
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'cart' ? (
          /* CART TAB */
          <>
            {cartItems.length === 0 ? (
          /* Enhanced Empty Cart State */
          <div className="text-center py-20">
            <div className="relative inline-block mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl flex items-center justify-center transform rotate-3 animate-pulse">
                <ShoppingBag className="w-16 h-16 text-purple-400" />
              </div>
              <div className="absolute -top-2 -right-2 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Your cart is waiting!</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Discover amazing educational resources and build your perfect learning toolkit
            </p>
            
            <a
              href="/dashboard/library"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold"
            >
              <ShoppingBag className="w-5 h-5" />
              Explore Marketplace
              <ArrowRight className="w-5 h-5" />
            </a>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
              <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Verified Content</h3>
                <p className="text-sm text-gray-600">All resources reviewed by educators</p>
              </div>
              
              <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Instant Access</h3>
                <p className="text-sm text-gray-600">Download immediately after purchase</p>
              </div>
              
              <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Quality Assured</h3>
                <p className="text-sm text-gray-600">Top-rated educational materials</p>
              </div>
            </div>
          </div>
        ) : (
          /* Enhanced Cart Items Layout */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items List */}
            <div className="lg:col-span-2 space-y-4">
              {/* Bulk discount banner */}
              {cartItems.length >= 3 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Tag className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-green-900">Special Discount Applied!</p>
                    <p className="text-sm text-green-700">You're saving {savings.toFixed(2)} TND with 3+ items</p>
                  </div>
                </div>
              )}

              {cartItems.map((item, index) => (
                <div
                  key={item.documentId}
                  className="group bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:border-purple-200 transition-all duration-300 transform hover:-translate-y-1"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start gap-4">
                    {/* Decorative Icon */}
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Package className="w-8 h-8 text-purple-600" />
                    </div>

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                        {item.title}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                          <TrendingUp className="w-3 h-3" />
                          {item.subject}
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                          {item.classLevel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                          {Number(item.price).toFixed(2)} TND
                        </p>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                            <button
                              onClick={() => updateQuantity(item.documentId, -1)}
                              disabled={item.quantity <= 1}
                              className="p-2 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus className="w-4 h-4 text-gray-700" />
                            </button>
                            <span className="px-4 py-2 font-bold text-gray-900 min-w-[3rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.documentId, 1)}
                              className="p-2 hover:bg-gray-100 transition-colors"
                            >
                              <Plus className="w-4 h-4 text-gray-700" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem(item.documentId)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove item"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Mobile: Clear cart button */}
              <button
                onClick={clearCart}
                className="md:hidden w-full flex items-center justify-center gap-2 px-5 py-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Items
              </button>
            </div>

            {/* Enhanced Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg sticky top-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
                </div>
                
                <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span className="font-semibold text-gray-900">{subtotal.toFixed(2)} TND</span>
                  </div>
                  
                  {savings > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        Bulk Discount (10%)
                      </span>
                      <span className="font-semibold">-{savings.toFixed(2)} TND</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (TVA 19%)</span>
                    <span className="font-semibold text-gray-900">{tax.toFixed(2)} TND</span>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center text-xl font-bold mb-2">
                    <span className="text-gray-900">Total</span>
                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {(total - savings).toFixed(2)} TND
                    </span>
                  </div>
                  {savings > 0 && (
                    <p className="text-sm text-green-600 font-medium text-right">
                      You saved {savings.toFixed(2)} TND!
                    </p>
                  )}
                </div>

                <button
                  onClick={checkout}
                  disabled={isProcessing}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Complete Purchase
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Award className="w-4 h-4 text-purple-600" />
                    <span>Instant access after purchase</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Secure payment processing</span>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100">
                <p className="text-xs text-center text-gray-600 font-medium flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" />
                  Secure checkout • 100% satisfaction guarantee
                </p>
              </div>
            </div>
          </div>
        )}
          </>
        ) : (
          /* HISTORY TAB */
          <>
            {ordersLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 absolute top-0"></div>
                </div>
              </div>
            ) : orders.length === 0 ? (
              /* Empty History State */
              <div className="text-center py-20">
                <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Package className="w-16 h-16 text-purple-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">No orders yet</h2>
                <p className="text-gray-600 mb-8">
                  Start shopping to see your order history here
                </p>
                <button
                  onClick={() => setActiveTab('cart')}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-semibold"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Go to Cart
                  <ArrowRight className="w-5 h-5" />
                </button>
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
                          Order Items ({order.items?.length || 0})
                        </h3>
                        <div className="space-y-3">
                          {order.items?.map((item: any) => (
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
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
