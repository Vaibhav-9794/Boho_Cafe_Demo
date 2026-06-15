import { PartyPopper, Heart, Briefcase, Lock } from "lucide-react";
import { ElementType } from "react";

export interface EventType {
  id: number;
  title: string;
  description: string;
  features: string[];
  icon: ElementType;
  image: string;
}

export const events: EventType[] = [
  {
    id: 1,
    title: "Birthday Parties",
    description:
      "Make your birthday unforgettable at Boho! From intimate gatherings to grand celebrations, we craft the perfect birthday experience with themed decorations, customized cakes, and a curated menu that your guests will remember.",
    features: [
      "Custom cake arrangements",
      "Themed decorations & balloon setups",
      "Dedicated party coordinator",
      "Special DJ & music requests",
      "Customized menu packages",
    ],
    icon: PartyPopper,
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80",
  },
  {
    id: 2,
    title: "Anniversary Celebrations",
    description:
      "Rekindle the romance in our elegantly decorated private dining space. Let us set the mood with candlelit tables, rose petals, soft music, and a specially curated couple's menu for your milestone celebration.",
    features: [
      "Romantic candlelit setup",
      "Rose petal decorations",
      "Customized couple's menu",
      "Complimentary dessert platter",
      "Photography assistance",
    ],
    icon: Heart,
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80",
  },
  {
    id: 3,
    title: "Corporate Gatherings",
    description:
      "Elevate your corporate events with our premium lounge space. Whether it's a team dinner, product launch, or client meeting, Boho offers the perfect blend of professionalism and warmth.",
    features: [
      "AV equipment & projector",
      "Seated capacity up to 60 guests",
      "Customized corporate packages",
      "Dedicated event manager",
      "Branded setup options",
    ],
    icon: Briefcase,
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80",
  },
  {
    id: 4,
    title: "Private Events",
    description:
      "From engagement ceremonies to farewell dinners, our exclusive private event space can be fully customized to match your vision. Complete privacy, personalized service, and an unforgettable atmosphere.",
    features: [
      "Fully private dining area",
      "Custom theme & decor",
      "Personalized menu curation",
      "Live music options",
      "Flexible timing arrangements",
    ],
    icon: Lock,
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&q=80",
  },
];
