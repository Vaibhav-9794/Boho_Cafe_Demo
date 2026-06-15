export interface Testimonial {
  id: number;
  name: string;
  role: string;
  review: string;
  rating: number;
  date: string;
  avatar: string;
}

export const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Priya Sharma",
    role: "Food Blogger",
    review:
      "Boho Cafe is an absolute gem in Kanpur! The ambience is stunning — perfect for Instagram. Their Butter Chicken is to die for, and the mocktails are crafted beautifully. A must-visit for anyone who appreciates good food and great vibes.",
    rating: 5,
    date: "March 2026",
    avatar: "PS",
  },
  {
    id: 2,
    name: "Rahul Verma",
    role: "Regular Customer",
    review:
      "We celebrate every special occasion at Boho. The staff is incredibly attentive, the food is consistently excellent, and the bohemian decor creates such a warm atmosphere. Their Truffle Mushroom Pizza is our family favorite!",
    rating: 5,
    date: "February 2026",
    avatar: "RV",
  },
  {
    id: 3,
    name: "Ananya Gupta",
    role: "Event Organizer",
    review:
      "Hosted my company's annual dinner at Boho and it was flawless. The private event space, customized menu, and seamless coordination made it effortless. Everyone raved about the Chicken Satay and the Boho Sunset mocktail.",
    rating: 5,
    date: "January 2026",
    avatar: "AG",
  },
  {
    id: 4,
    name: "Vikash Singh",
    role: "Couple Visit",
    review:
      "Took my wife here for our anniversary and she absolutely loved it. The rooftop-like setting on the 3rd floor, candlelit tables, and soft music made it incredibly romantic. The Tiramisu was the perfect ending to a perfect evening.",
    rating: 4,
    date: "April 2026",
    avatar: "VS",
  },
  {
    id: 5,
    name: "Sneha Agarwal",
    role: "College Student",
    review:
      "Best cafe in Kanpur, hands down! The aesthetic decor is unmatched. Love hanging out here with friends. The Loaded Nachos and Virgin Mojitos are our go-to order. Great music, great vibes, great food — what more do you need?",
    rating: 5,
    date: "May 2026",
    avatar: "SA",
  },
  {
    id: 6,
    name: "Amit Khanna",
    role: "Business Professional",
    review:
      "A sophisticated yet relaxed dining experience. The continental menu is impressive for Kanpur. Their Alfredo Chicken Pasta rivals the best I've had in Delhi. Perfect for business lunches or casual weekend dinners.",
    rating: 4,
    date: "March 2026",
    avatar: "AK",
  },
  {
    id: 7,
    name: "Meera Joshi",
    role: "Birthday Celebration",
    review:
      "Celebrated my 25th birthday at Boho and it was magical! They decorated the space beautifully, the cake was arranged perfectly, and the Molten Lava Cake they served was heavenly. The staff made me feel so special!",
    rating: 5,
    date: "April 2026",
    avatar: "MJ",
  },
  {
    id: 8,
    name: "Karan Malhotra",
    role: "Food Enthusiast",
    review:
      "The fusion menu at Boho is creative and delicious. I was blown away by the Gulab Jamun Cheesecake — such an innovative twist! The interiors with macrame and boho decor give it a unique character that no other cafe in Kanpur has.",
    rating: 5,
    date: "May 2026",
    avatar: "KM",
  },
];
