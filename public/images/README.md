# Boho Cafe & Lounge — Image Asset Guide

## Folder Structure

```
public/images/
├── menu/        → Real dish photos (replace stock images in src/data/menu.ts)
├── gallery/     → Real cafe photos (replace stock images in GallerySection.tsx)
├── interior/    → Real interior shots (replace stock image in AboutSection.tsx)
└── events/      → Real event photos (replace stock images in src/data/events.ts)
```

## How to Replace Images

### Menu Dish Photos
1. Name files to match the dish, e.g., `kiwi-coconut-margarita.jpg`
2. Recommended size: **400×300px** (or 4:3 aspect ratio), JPEG, quality 80
3. Update the `image` field in `src/data/menu.ts` from:
   ```
   image: "https://images.unsplash.com/photo-..."
   ```
   to:
   ```
   image: "/images/menu/kiwi-coconut-margarita.jpg"
   ```

### Gallery Photos
1. Name files: `food-1.jpg`, `interior-1.jpg`, `events-1.jpg`, etc.
2. Recommended size: **600×600px** minimum, JPEG, quality 80
3. Update `galleryItems` array in `src/components/sections/GallerySection.tsx`

### Interior Photos (About Section)
1. Name files: `about-interior.jpg`
2. Recommended size: **600×500px** minimum, JPEG, quality 80
3. Update the `<img src="...">` in `src/components/sections/AboutSection.tsx`

### Event Photos
1. Name files: `birthday.jpg`, `anniversary.jpg`, `corporate.jpg`, `private-event.jpg`
2. Recommended size: **600×500px** minimum, JPEG, quality 80
3. Update `events` array in `src/data/events.ts`

## Image Optimization Tips
- Use JPEG for photos, WebP for better compression
- Keep file sizes under 200KB each
- Use tools like squoosh.app or tinypng.com
- Consider using Next.js `<Image>` component for automatic optimization
