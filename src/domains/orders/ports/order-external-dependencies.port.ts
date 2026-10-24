export interface OrderCartItemProduct {
  id: string;
  name: string;
  price: string;
  image: string;
  type: string;
  grape: string;
  country?: string | null;
  harvest: number | string;
  deletedAt?: Date | null;
}

export interface OrderCartItem {
  id: string;
  quantity: number;
  product: OrderCartItemProduct;
}

export interface CartRepositoryPort {
  listByUser(userId: string): Promise<OrderCartItem[]>;
}

export interface OrderCatalogProduct {
  id: string;
  name: string;
  price: string;
  image: string;
  type: string;
  grape: string;
  harvest: number | string;
  deletedAt: Date | null;
}

export interface CatalogRepositoryPort {
  findById(id: string): Promise<OrderCatalogProduct | null>;
}

export interface OrderDeliveryAddress {
  id: string;
  userId: string;
  zipCode: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
}

export interface AddressRepositoryPort {
  findById(id: string, userId: string): Promise<OrderDeliveryAddress | null>;
}
