

export type BurgerCategory = 'Beef' | 'Chicken' | 'Vegan';

export interface BurgerItem {
  id: number;
  name: string;
  category: BurgerCategory;
  description: string;
  price: number;
  rating: number;
  image: string;
  badge?: string;
  popular?: boolean;
  prepMinutes: number;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  categories?: BurgerCategory[];
}

export interface CartItem {
  key: string;
  burgerId: number;
  name: string;
  category: BurgerCategory;
  image: string;
  addOnIds: string[];
  quantity: number;
  unitPrice: number;
}

export const addOns: AddOn[] = [
  { id: 'cheese', name: 'Extra cheese', price: 20, categories: ['Beef', 'Chicken'] },
  { id: 'bacon', name: 'Smoky bacon', price: 35, categories: ['Beef', 'Chicken'] },
  { id: 'sauce', name: 'Signature sauce', price: 15 },
  { id: 'jalapeno', name: 'Spicy jalapeños', price: 20 },
  { id: 'vegan-cheese', name: 'Vegan cheese', price: 25, categories: ['Vegan'] },
];

export const burgerMenu: BurgerItem[] = [
  {
    id: 1,
    name: 'Crispy Chicken',
    category: 'Chicken',
    description: 'Golden chicken fillet, chili mayo, pickles and crunchy slaw.',
    price: 99.15,
    rating: 5,
    image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=1000&q=85',
    badge: 'FAN FAVORITE',
    popular: true,
    prepMinutes: 12,
  },
  {
    id: 2,
    name: 'Ultimate Bacon',
    category: 'Beef',
    description: 'Juicy beef, smoked bacon, cheddar and mustard sauce.',
    price: 99.32,
    rating: 5,
    image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=1000&q=85',
    badge: 'BESTSELLER',
    popular: true,
    prepMinutes: 15,
  },
  {
    id: 3,
    name: 'Black Sheep',
    category: 'Beef',
    description: 'Cheesy beef patty, tomato relish, lettuce and red onion.',
    price: 69.15,
    rating: 4,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=85',
    badge: 'GREAT VALUE',
    popular: true,
    prepMinutes: 12,
  },
  {
    id: 4,
    name: 'Vegan Burger',
    category: 'Vegan',
    description: 'Plant-based patty with fresh lettuce and vegan-friendly sauce.',
    price: 99.25,
    rating: 4,
    image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1000&q=85',
    prepMinutes: 14,
  },
  {
    id: 5,
    name: 'Double Trouble',
    category: 'Beef',
    description: 'Two beef patties, double cheddar and our secret burger sauce.',
    price: 179,
    rating: 5,
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1000&q=85',
    badge: 'EXTRA LOADED',
    popular: true,
    prepMinutes: 18,
  },
  {
    id: 6,
    name: 'Firecracker Chicken',
    category: 'Chicken',
    description: 'Crispy chicken, spicy glaze, crunchy cabbage and pickles.',
    price: 139,
    rating: 5,
    image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=1000&q=85',
    badge: 'SPICY PICK',
    prepMinutes: 16,
  },
  {
    id: 7,
    name: 'Garden Crunch',
    category: 'Vegan',
    description: 'Plant patty, tangy slaw, tomato and herbed dressing.',
    price: 119,
    rating: 4,
    image: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=1000&q=85',
    prepMinutes: 13,
  },
  {
    id: 8,
    name: 'Classic Smash',
    category: 'Beef',
    description: 'Griddled beef patty, melted cheddar, pickles and special sauce.',
    price: 129,
    rating: 5,
    image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=1000&q=85',
    badge: 'THE ORIGINAL',
    prepMinutes: 12,
  },
];
