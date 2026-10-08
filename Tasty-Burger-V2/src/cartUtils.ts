
import type { BurgerItem, CartItem } from './burgerData';

export const MAX_QUANTITY = 20;

export function addToCart(cart: CartItem[], burger: BurgerItem): CartItem[] {
  const found = cart.find(item => item.id === burger.id);

  if (!found) {
    return [...cart, { ...burger, quantity: 1 }];
  }

  return cart.map(item =>
    item.id === burger.id
      ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + 1) }
      : item
  );
}

export function changeQuantity(cart: CartItem[], id: number, delta: number): CartItem[] {
  return cart
    .map(item =>
      item.id === id
        ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + delta) }
        : item
    )
    .filter(item => item.quantity > 0);
}

export function removeFromCart(cart: CartItem[], id: number): CartItem[] {
  return cart.filter(item => item.id !== id);
}

export function getCartCount(cart: CartItem[]): number {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

export function getCartTotal(cart: CartItem[]): number {
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(amount);
}
