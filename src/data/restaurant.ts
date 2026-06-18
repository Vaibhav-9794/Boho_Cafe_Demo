// ============================================
// Boho Cafe & Lounge — Restaurant Configuration
// ============================================

export interface TableConfig {
  number: number;
  capacity: number;
  label: string;
}

export const RESTAURANT_CONFIG = {
  name: "Boho Cafe & Lounge",
  totalTables: 10,
  operatingHours: {
    open: "12:00 PM",
    close: "12:00 AM",
  },
  maxPerSlot: 10,
  bufferMinutes: 30,   // Cleaning/setup time after each reservation
  holdMinutes: 10,     // Table hold duration when customer selects
  vipThreshold: 5,     // Completed visits to become VIP
  noShowWarning: 3,    // No-shows to flag as risky customer
} as const;

export const TABLES: TableConfig[] = [
  { number: 1, capacity: 2, label: "Table 1 (2 seats)" },
  { number: 2, capacity: 2, label: "Table 2 (2 seats)" },
  { number: 3, capacity: 4, label: "Table 3 (4 seats)" },
  { number: 4, capacity: 4, label: "Table 4 (4 seats)" },
  { number: 5, capacity: 6, label: "Table 5 (6 seats)" },
  { number: 6, capacity: 6, label: "Table 6 (6 seats)" },
  { number: 7, capacity: 8, label: "Table 7 (8 seats)" },
  { number: 8, capacity: 8, label: "Table 8 (8 seats)" },
  { number: 9, capacity: 10, label: "Table 9 (10 seats)" },
  { number: 10, capacity: 12, label: "Table 10 (12 seats)" },
];

export const TIME_SLOTS = [
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
  "9:00 PM",
  "10:00 PM",
  "11:00 PM",
] as const;

export const BOOKING_TYPES = [
  { value: "TABLE", label: "Table Booking", icon: "🪑", description: "Reserve a specific table" },
  { value: "FULL_CAFE", label: "Full Cafe", icon: "🏠", description: "Reserve the entire cafe" },
  { value: "EVENT", label: "Event Booking", icon: "🎉", description: "Private event or party" },
] as const;

export const EVENT_TYPES = [
  "Birthday",
  "Anniversary",
  "Corporate Event",
  "Kitty Party",
  "Private Gathering",
] as const;

export const OCCASIONS = [
  "Casual Dining",
  "Birthday",
  "Anniversary",
  "Date Night",
  "Business Meeting",
  "Other",
] as const;

export type BookingType = "TABLE" | "FULL_CAFE" | "EVENT";

// Convert time string to minutes since midnight
export function timeToMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// Check if two time ranges overlap (no buffer)
export function timesOverlap(
  start1: string, end1: string,
  start2: string, end2: string
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
}

// Check if two time ranges overlap WITH buffer time
// Buffer is added to the END of the existing reservation (start2/end2)
export function timesOverlapWithBuffer(
  start1: string, end1: string,
  start2: string, end2: string,
  bufferMinutes: number = RESTAURANT_CONFIG.bufferMinutes
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2) + bufferMinutes; // Add buffer to existing reservation end
  return s1 < e2 && s2 < e1;
}

// Convert minutes to time string
export function minutesToTime(minutes: number): string {
  let hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  return `${hours}:${mins.toString().padStart(2, "0")} ${period}`;
}
