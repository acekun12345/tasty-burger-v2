import { addOns, burgerMenu } from './burgerData';
import type { BurgerItem, CartItem } from './burgerData';

export const MAX_QUANTITY = 20;
export const DELIVERY_FEE = 49;
export const FREE_DELIVERY_AT = 499;
export const PROMO_CODE = 'BURGER10';

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

export function allowedAddOnIds(burger: BurgerItem, ids: string[]): string[] {
  return [...new Set(ids)]
    .filter((id) => addOns.some((addon) => addon.id === id && (!addon.categories || addon.categories.includes(burger.category))))
    .sort();
}

export function makeCartKey(burgerId: number, ids: string[]): string {
  return `${burgerId}|${ids.join(',')}`;
}

export function calculateUnitPrice(burger: BurgerItem, ids: string[]): number {
  const valid = allowedAddOnIds(burger, ids);
  return burger.price + valid.reduce((sum, id) => sum + (addOns.find((addon) => addon.id === id)?.price ?? 0), 0);
}

export function addToCart(cart: CartItem[], burger: BurgerItem, addOnIds: string[] = [], quantity = 1): CartItem[] {
  const ids = allowedAddOnIds(burger, addOnIds);
  const key = makeCartKey(burger.id, ids);
  const amount = Math.max(1, Math.min(MAX_QUANTITY, Math.floor(quantity)));
  const found = cart.find((item) => item.key === key);
  if (found) {
    return cart.map((item) => item.key === key
      ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + amount) }
      : item);
  }
  return [...cart, {
    key,
    burgerId: burger.id,
    name: burger.name,
    category: burger.category,
    image: burger.image,
    addOnIds: ids,
    quantity: amount,
    unitPrice: calculateUnitPrice(burger, ids),
  }];
}

export function changeQuantity(cart: CartItem[], key: string, delta: number): CartItem[] {
  return cart.flatMap((item) => {
    if (item.key !== key) return [item];
    const quantity = Math.min(MAX_QUANTITY, item.quantity + delta);
    return quantity > 0 ? [{ ...item, quantity }] : [];
  });
}

export function removeFromCart(cart: CartItem[], key: string): CartItem[] {
  return cart.filter((item) => item.key !== key);
}

export function getCartCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function getDiscount(subtotal: number, promo: boolean): number {
  return promo ? Math.min(100, Math.round(subtotal * 0.1 * 100) / 100) : 0;
}

export function getDeliveryFee(subtotal: number, fulfillment: 'pickup' | 'delivery'): number {
  return fulfillment === 'delivery' && subtotal < FREE_DELIVERY_AT ? DELIVERY_FEE : 0;
}

// Rebuild stored cart lines from the current menu so outdated localStorage prices cannot be used.
export function restoreCart(saved: unknown): CartItem[] {
  if (!Array.isArray(saved)) return [];
  let cart: CartItem[] = [];
  for (const entry of saved) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    const burger = burgerMenu.find((candidate) => candidate.id === item.burgerId);
    if (!burger || !Array.isArray(item.addOnIds)) continue;
    const ids = item.addOnIds.filter((id): id is string => typeof id === 'string');
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) continue;
    cart = addToCart(cart, burger, ids, Math.min(MAX_QUANTITY, Math.floor(quantity)));
  }
  return cart;
}
