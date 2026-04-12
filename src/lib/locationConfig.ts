export interface CityConfig {
  name: string;
  areas: string[];
}

export const CITIES: CityConfig[] = [
  {
    name: "Harare",
    areas: ["Mt Pleasant", "Avondale", "Belvedere", "Marlborough", "Belgravia", "Strathaven", "Borrowdale", "Vainona"],
  },
  {
    name: "Bulawayo",
    areas: ["Selbourne Park", "Hillside", "Famona", "Nkulumane", "CBD", "Ascot"],
  },
  {
    name: "Gweru",
    areas: ["Senga", "Mkoba", "CBD"],
  },
  {
    name: "Chinhoyi",
    areas: ["Chinhoyi CBD", "Coldstream"],
  },
  {
    name: "Masvingo",
    areas: ["Mucheke", "Rujeko"],
  },
  {
    name: "Mutare",
    areas: [],
  },
  {
    name: "Bindura",
    areas: [],
  },
  {
    name: "Marondera",
    areas: [],
  },
  {
    name: "Lupane",
    areas: [],
  },
];

export const CITY_NAMES = CITIES.map((c) => c.name);

export function getAreasForCity(city: string): string[] {
  return CITIES.find((c) => c.name === city)?.areas || [];
}

export const UNIVERSITIES = [
  { value: "University of Zimbabwe", label: "UZ" },
  { value: "Midlands State University", label: "MSU" },
  { value: "National University of Science and Technology", label: "NUST" },
  { value: "Chinhoyi University of Technology", label: "CUT" },
  { value: "Bindura University of Science Education", label: "BUSE" },
  { value: "Great Zimbabwe University", label: "GZU" },
  { value: "Africa University", label: "AU" },
  { value: "Harare Institute of Technology", label: "HIT" },
  { value: "Lupane State University", label: "LSU" },
];

export const UNIVERSITY_SHORT: Record<string, string> = Object.fromEntries(
  UNIVERSITIES.map((u) => [u.value, u.label])
);

// Map universities to their default cities
export const UNIVERSITY_CITY_MAP: Record<string, string> = {
  "University of Zimbabwe": "Harare",
  "Harare Institute of Technology": "Harare",
  "National University of Science and Technology": "Bulawayo",
  "Midlands State University": "Gweru",
  "Chinhoyi University of Technology": "Chinhoyi",
  "Bindura University of Science Education": "Bindura",
  "Great Zimbabwe University": "Masvingo",
  "Africa University": "Mutare",
  "Lupane State University": "Lupane",
};
