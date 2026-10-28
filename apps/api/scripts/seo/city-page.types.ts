export interface IndustrialHub {
  name: string;
  desc: string;
  accessRoads?: string;
  warehouseProfile?: string;
}

export interface SectorDetail {
  name: string;
  desc: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocalUseCase {
  heading: string;
  companyProfile: string;
  challenge: string;
  solution: string;
  metricsBadge: string;
}

export interface TechnicalPillar {
  badge: string;
  title: string;
  desc: string;
  docUrl: string;
  docLabel: string;
}

export interface TechSpecRow {
  param: string;
  value: string;
  docUrl: string;
  docLabel: string;
}

export interface IneStats {
  year: number;
  provincia: string;
  totalEmpresas: number;
  conAsalariados: number;
  pymes1a49: number;
  source: string;
}

export interface CityData {
  slug: string;
  name: string;
  province: string;
  region: string;
  schemaRegion: string;
  coordinates: Coordinates;
  tagline: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  customH1?: string;
  heroBadge?: string;
  heroSubtitle: string;
  contextHeading?: string;
  localContextParagraph: string;
  localLogisticsParagraph?: string;
  ineStats?: IneStats;
  ineAnalysis?: string;
  hubsHeading?: string;
  industrialHubs: IndustrialHub[];
  sectorsHeading?: string;
  sectors: string[];
  sectorsDetail?: SectorDetail[];
  localUseCase?: LocalUseCase;
  technicalHeading?: string;
  technicalLead?: string;
  technicalCaption?: string;
  technicalPillars?: TechnicalPillar[];
  techSpecsHeading?: string;
  techSpecs?: TechSpecRow[];
  faqHeading?: string;
  faqs: FaqItem[];
  ctaHeading?: string;
  ctaSubtitle?: string;
  corridorName?: string;
  fiscalRegime?: string;
  lastModified?: string;
}

export interface NeighborCityLink {
  city: CityData;
  distanceKm: number;
  relationLabel: string;
}

/**
 * Calcula la distancia ortodrómica (Haversine) en kilómetros entre dos coordenadas WGS84.
 */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

/**
 * Construye una malla de enlazado equilibrada y determinista para cada ciudad:
 * 1. Ciudades de su misma Comunidad Autónoma.
 * 2. Ciudades geográficamente más próximas por distancia Haversine real (km).
 * 3. Dos saltos de anillo determinista por índice para garantizar que las 51 ciudades
 *    reciban entre 12 y 16 enlaces contextuales entrantes sin dejar nodos aislados.
 */
export function selectRelatedCities(
  city: CityData,
  allCities: CityData[]
): NeighborCityLink[] {
  const chosen = new Map<string, NeighborCityLink>();

  // 1. Misma Comunidad Autónoma (ordenadas por cercanía)
  const sameRegion = allCities
    .filter((c) => c.slug !== city.slug && c.region === city.region)
    .map((c) => ({
      city: c,
      distanceKm: haversineKm(city.coordinates, c.coordinates),
      relationLabel: `Misma CC.AA. (${c.region})`,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  for (const item of sameRegion.slice(0, 6)) {
    chosen.set(item.city.slug, item);
  }

  // 2. Vecinos geográficos más cercanos fuera de su CC.AA.
  const byProximity = allCities
    .filter((c) => c.slug !== city.slug && !chosen.has(c.slug))
    .map((c) => ({
      city: c,
      distanceKm: haversineKm(city.coordinates, c.coordinates),
      relationLabel: c.corridorName || `Corredor ${c.region}`,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  for (const item of byProximity) {
    if (chosen.size >= 10) break;
    chosen.set(item.city.slug, item);
  }

  // 3. Anillo determinista por índice para repartir PageRank interno uniformemente
  const idx = allCities.findIndex((c) => c.slug === city.slug);
  const n = allCities.length;
  const offsets = [7, 19, 31, 43];
  for (const off of offsets) {
    if (chosen.size >= 12) break;
    const target = allCities[(idx + off) % n];
    if (target && target.slug !== city.slug && !chosen.has(target.slug)) {
      chosen.set(target.slug, {
        city: target,
        distanceKm: haversineKm(city.coordinates, target.coordinates),
        relationLabel: target.corridorName || `Nodo ${target.region}`,
      });
    }
  }

  return Array.from(chosen.values()).slice(0, 12);
}
