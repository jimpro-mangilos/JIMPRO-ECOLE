import { supabase } from '../lib/supabase';

export interface MatriculeGenerationResult {
  matricule: string;
  isUnique: boolean;
}

const FALLBACK_PREFIXES: Record<string, string> = {
  'MATERNELLE': 'SPM',
  'PRIMAIRE': 'SPP',
  'SECONDAIRE': 'SPS',
};

let prefixCache: Record<string, string> | null = null;
let prefixCacheExpiry = 0;

async function loadSectionPrefixes(): Promise<Record<string, string>> {
  const now = Date.now();
  if (prefixCache && now < prefixCacheExpiry) {
    return prefixCache;
  }

  const { data, error } = await supabase
    .from('section_prefixes')
    .select('section, prefix')
    .eq('is_active', true);

  if (error || !data || data.length === 0) {
    return FALLBACK_PREFIXES;
  }

  const map: Record<string, string> = {};
  for (const row of data) {
    map[row.section.toUpperCase()] = row.prefix;
  }

  prefixCache = map;
  prefixCacheExpiry = now + 60_000;
  return map;
}

export function invalidatePrefixCache() {
  prefixCache = null;
  prefixCacheExpiry = 0;
}

export async function getSectionPrefixAsync(section: string): Promise<string> {
  const prefixes = await loadSectionPrefixes();
  const normalized = section.trim().toUpperCase();
  return prefixes[normalized] || FALLBACK_PREFIXES[normalized] || 'SPX';
}

export function getSectionPrefix(section: string): string {
  const normalized = section.trim().toUpperCase();
  if (prefixCache) {
    return prefixCache[normalized] || FALLBACK_PREFIXES[normalized] || 'SPX';
  }
  return FALLBACK_PREFIXES[normalized] || 'SPX';
}

export function formatDateForMatricule(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function generateUniqueId(length: number = 7): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export function parseMatricule(matricule: string): { prefix: string; date: string; uniqueId: string } | null {
  const regex = /^([A-Z]{2,4})-(\d{8})-([A-Z0-9]{7})$/;
  const match = matricule.match(regex);

  if (!match) {
    return null;
  }

  return {
    prefix: match[1],
    date: match[2],
    uniqueId: match[3],
  };
}

export async function validateMatriculeUniqueness(matricule: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('eleves')
    .select('matricule')
    .eq('matricule', matricule)
    .maybeSingle();

  if (error) {
    console.error('Error validating matricule uniqueness:', error);
    return false;
  }

  return data === null;
}

export async function generateMatricule(section: string, maxRetries: number = 5): Promise<MatriculeGenerationResult> {
  const prefix = await getSectionPrefixAsync(section);
  const dateStr = formatDateForMatricule();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const uniqueId = generateUniqueId();
    const matricule = `${prefix}-${dateStr}-${uniqueId}`;

    const isUnique = await validateMatriculeUniqueness(matricule);

    if (isUnique) {
      return { matricule, isUnique: true };
    }
  }

  return {
    matricule: '',
    isUnique: false,
  };
}

export function buildMatricule(section: string, date: Date, uniqueId: string): string {
  const prefix = getSectionPrefix(section);
  const dateStr = formatDateForMatricule(date);
  return `${prefix}-${dateStr}-${uniqueId}`;
}
