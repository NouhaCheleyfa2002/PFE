import { apiClient } from './client';

export interface CheckoutItem {
  documentId: string;
}

export interface CheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
  orderId: string;
}

export interface OrderItem {
  id: string;
  resourceId: string;
  resourceType: string;
  resourceTitle: string;
  price: number;
  teacherId: string;
  teacherName: string;
}

export interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  items: OrderItem[];
}

export interface OrderHistoryResponse {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Create Stripe checkout session from cart items
 */
export const createCheckoutSession = async (
  resourceIds: string[]
): Promise<CheckoutSessionResponse> => {
  const response = await apiClient.post('/payment/checkout', {
    resourceIds,
  });
  return response.data;
};

/**
 * Get order details by ID
 */
export const getOrder = async (orderId: string): Promise<Order> => {
  const response = await apiClient.get(`/payment/orders/${orderId}`);
  return response.data;
};

/**
 * Get user's order history with pagination
 */
export const getOrderHistory = async (
  page: number = 1,
  pageSize: number = 10
): Promise<OrderHistoryResponse> => {
  const response = await apiClient.get('/payment/orders', {
    params: { page, pageSize },
  });
  return response.data;
};
