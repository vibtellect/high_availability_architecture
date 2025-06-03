export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  stock: number;
  rating: number;
  reviewCount: number;
  brand: string;
  tags: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}

export interface Address {
  street: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  address?: Address;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  shippingAddress: Address;
}

export type ProductCategory = 'Electronics' | 'Clothing' | 'Home & Kitchen' | 'Sports' | 'Furniture' | 'Books';

export const ProductCategories: ProductCategory[] = [
  'Electronics',
  'Clothing', 
  'Home & Kitchen',
  'Sports',
  'Furniture',
  'Books'
]; 