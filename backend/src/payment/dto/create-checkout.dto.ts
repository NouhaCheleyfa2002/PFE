import { IsArray, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateCheckoutDto {
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  resourceIds: string[]; // Array of document/exam IDs from cart
}

export class CheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
  orderId: string;
}
