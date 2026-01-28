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
// Format: 'database activity name' -> 'image file name (with spaces instead of underscores)'
const activityAliases: Record<string, string> = {
  // Direct mappings (DB name differs from file name)
  'beach party': 'impreza na plaży',
  'wyjście do baru': 'do baru',
  'festiwale piwa-wina': 'festiwale piwa',
  'impreza kostiumowa': 'imprezy kostiumowe',
  'impreza tematyczna': 'imprezy kostiumowe',
  'rower (kolarstwo)': 'rower kolarstwo',
  'rower (wyczynowo)': 'rower wyczynowo',
  'siłownia-fitness': 'siłownia/fitness',
  'narty-snowboard': 'narty/snowboard',
  
  // Similar activities mapped to closest available images
  'wspólne gotowanie': 'gotowanie',
  'piknik': 'grill/bbq',
  'pogadajmy': 'terapia grupowa',
  'sporty ekstremalne': 'paintball/asg',
  'sporty wodne': 'pływanie',
  'spotkanie z autorem': 'wykład',
  'sprzątanie świata': 'projekty ekologiczne',
  'stand-up': 'kabaret',
  'sztuka i malarstwo': 'warsztaty artystyczne',
  'spotkanie literackie': 'warsztaty teatralne',
  'spotkanie tematyczne': 'terapia grupowa',
  'wspólne hobby': 'rękodzieło',
  'wieczór przy winie': 'festiwale piwa',
  'kawa na mieście': 'gotowanie',
  'kolacja': 'gotowanie',
  'lunch-obiad': 'gotowanie',
  'lody': 'gotowanie',
  'śniadanie na mieście': 'gotowanie',
  'spacer po parku': 'wycieczki piesze',
  'spacer z psem': 'wycieczki piesze',
  'wspólne zakupy': 'zwiedzanie miasta',
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

/**
 * Get list of activities without images (for debugging)
 */
export function getActivitiesWithoutImages(activityNames: string[]): string[] {
  return activityNames.filter(name => !getActivityImage(name));
}
