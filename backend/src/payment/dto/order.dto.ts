export class OrderResponseDto {
  id: string;
  userId: string;
  totalAmount: number;
  currency: string;
  status: string;
  items: OrderItemDto[];
  createdAt: Date;
  completedAt?: Date;
}

export class OrderItemDto {
  id: string;
  resourceId: string;
  resourceType: string;
  resourceTitle: string;
  price: number;
  teacherId: string;
  teacherName: string;
}

export class OrderHistoryDto {
  orders: OrderResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}
