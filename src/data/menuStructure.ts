// ============================================
// Boho Cafe & Lounge — Hierarchical Menu Structure
// Maps flat categories from menu.ts into grouped hierarchy
// ============================================

export interface MenuSubcategory {
  id: string;
  label: string;
  /** Maps to the `category` field values in menuItems from menu.ts */
  originalCategories: string[];
}

export interface MenuGroup {
  id: string;
  label: string;
  icon: string;
  subcategories: MenuSubcategory[];
}

export const menuGroups: MenuGroup[] = [
  {
    id: "beverages",
    label: "Beverages",
    icon: "☕",
    subcategories: [
      { id: "mocktails", label: "Mocktails & Signature Drinks", originalCategories: ["Sober House"] },
      { id: "black-coffee", label: "Black Coffee", originalCategories: ["All Black Coffee"] },
      { id: "hot-coffee", label: "Hot Coffee", originalCategories: ["Hot Beverages"] },
      { id: "cold-coffee", label: "Cold Coffee", originalCategories: ["Cold Beverages"] },
      { id: "milkshakes", label: "Milkshakes", originalCategories: ["Milkshakes"] },
      { id: "other-beverages", label: "Other Beverages", originalCategories: ["Other Beverages"] },
    ],
  },
  {
    id: "chinese",
    label: "Chinese",
    icon: "🍜",
    subcategories: [
      { id: "soups", label: "Soups", originalCategories: ["Soups"] },
      { id: "chinese-starters-veg", label: "Starters (Veg)", originalCategories: ["Chinese Starters (Veg)"] },
      { id: "chinese-starters-nonveg", label: "Starters (Non-Veg)", originalCategories: ["Chinese Starters (Non-Veg)"] },
      { id: "noodles", label: "Noodles", originalCategories: ["Noodles"] },
      { id: "chinese-gravy", label: "Main Course", originalCategories: ["Chinese Gravy"] },
    ],
  },
  {
    id: "tandoor",
    label: "Tandoor",
    icon: "🔥",
    subcategories: [
      { id: "tandoori-veg", label: "Veg Tandoori", originalCategories: ["Tandoori Starters (Veg)"] },
      { id: "tandoori-nonveg", label: "Non-Veg Tandoori", originalCategories: ["Tandoori Starters (Non-Veg)"] },
    ],
  },
  {
    id: "cafe-specials",
    label: "Café Specials",
    icon: "🍔",
    subcategories: [
      { id: "small-plates", label: "Small Plates", originalCategories: ["Small Plates"] },
      { id: "sandwiches", label: "Sandwiches", originalCategories: ["Sandwiches"] },
      { id: "burgers", label: "Burgers", originalCategories: ["Burgers"] },
      { id: "sides", label: "Sides & Fries", originalCategories: ["Continental Sides"] },
      { id: "salads", label: "Salads", originalCategories: ["Salads"] },
    ],
  },
  {
    id: "italian",
    label: "Italian",
    icon: "🍕",
    subcategories: [
      { id: "pasta", label: "Pasta", originalCategories: ["Pasta"] },
      { id: "lasagna", label: "Lasagna", originalCategories: ["Lasagna"] },
      { id: "pizza", label: "Pizza", originalCategories: ["Pizza"] },
    ],
  },
  {
    id: "indian",
    label: "Indian",
    icon: "🍛",
    subcategories: [
      { id: "indian-veg", label: "Veg Main Course", originalCategories: ["Indian Veg"] },
      { id: "indian-nonveg", label: "Non-Veg Main Course", originalCategories: ["Indian Non-Veg"] },
      { id: "rice", label: "Rice & Biryani", originalCategories: ["Rice"] },
      { id: "breads", label: "Breads", originalCategories: ["Breads"] },
    ],
  },
  {
    id: "large-plates",
    label: "Large Plates",
    icon: "🍽️",
    subcategories: [
      { id: "platters", label: "Continental & Platters", originalCategories: ["Large Plates"] },
      { id: "sizzlers", label: "Sizzlers", originalCategories: ["Sizzlers"] },
    ],
  },
];
