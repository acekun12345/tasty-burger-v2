export type BurgerCategory = 'Beef' | 'Chicken' | 'Vegan';

export interface BurgerItem {
  id: number;
  name: string;
  category: BurgerCategory;
  description: string;
  price: number;
  rating: number;
  image: string;
}

export interface CartItem extends BurgerItem {
  quantity: number;
}

// Original four menu items, images, and prices preserved.
export const burgerMenu: BurgerItem[] = [
  {
    id: 1,
    name: 'Crispy Chicken',
    category: 'Chicken',
    description: 'Chicken breast, chilli sauce, tomatoes, pickles, coleslaw',
    price: 99.15,
    rating: 5,
    image:
      'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 2,
    name: 'Ultimate Bacon',
    category: 'Beef',
    description: 'House patty, cheddar cheese, bacon, onion, mustard',
    price: 99.32,
    rating: 5,
    image:
      'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 3,
    name: 'Black Sheep',
    category: 'Beef',
    description: 'American cheese, tomato relish, avocado, lettuce, red onion',
    price: 69.15,
    rating: 4,
    image:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 4,
    name: 'Vegan Burger',
    category: 'Vegan',
    description: 'Plant-based patty, vegan cheese, lettuce, onion, mustard',
    price: 99.25,
    rating: 4,
    image:
      'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=900&q=85',
  },
];
