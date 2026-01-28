// Dynamic import of activity images
const activityImages = import.meta.glob<{ default: string }>(
  '/src/assets/activities/*.png',
  { eager: true }
);

// Create a map from activity name to image URL
const imageMap: Record<string, string> = {};

for (const path in activityImages) {
  // Extract filename without extension: /src/assets/activities/Badminton.png -> Badminton
  const filename = path.split('/').pop()?.replace('.png', '') || '';
  // Replace underscores with spaces for matching: Gry_planszowe -> Gry planszowe
  const activityName = filename.replace(/_/g, ' ').replace(/-/g, '/');
  imageMap[activityName.toLowerCase()] = activityImages[path].default;
}

// Manual aliases for activities with different names in database vs image files
const activityAliases: Record<string, string> = {
  // Database name -> Image file name (without extension, spaces instead of underscores)
  'beach party': 'impreza na plaży',
  'wyjście do baru': 'do baru',
  'mecz piłki nożnej': 'piłka nożna',
  'festiwale piwa-wina': 'festiwale piwa',
  'narty-snowboard': 'narty/snowboard',
  'siłownia-fitness': 'siłownia/fitness',
  'rower (kolarstwo)': 'rower kolarstwo',
  'rower (wyczynowo)': 'rower wyczynowo',
  'impreza tematyczna': 'imprezy kostiumowe',
  'impreza charytatywna': 'impreza charytatywna',
  'impreza firmowa': 'impreza firmowa',
};

/**
 * Get activity image URL by activity name
 * @param activityName - The name of the activity (e.g., "Gry planszowe", "Badminton")
 * @returns The image URL or undefined if not found
 */
export function getActivityImage(activityName: string): string | undefined {
  if (!activityName) return undefined;
  
  const normalizedName = activityName.toLowerCase().trim();
  
  // Check alias first
  const aliasKey = activityAliases[normalizedName];
  if (aliasKey && imageMap[aliasKey]) {
    return imageMap[aliasKey];
  }
  
  // Direct match (case-insensitive)
  if (imageMap[normalizedName]) {
    return imageMap[normalizedName];
  }
  
  // Try partial match - activity name might be slightly different
  for (const key in imageMap) {
    if (key.includes(normalizedName) || normalizedName.includes(key)) {
      return imageMap[key];
    }
  }
  
  return undefined;
}

/**
 * Get all available activity images
 */
export function getAllActivityImages(): Record<string, string> {
  return { ...imageMap };
}
