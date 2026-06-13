import { Account, Category, CatRule } from './index';

export const DEFAULT_SANTE_KEYWORDS = (): string[] => [
  'AMELI', 'AMELIE', 'CPAM', 'SECU', 'SECURITE SOCIALE',
  'MALAKOFF', 'ALAN SANTE', 'ALAN ASSURANCE',
  'HARMONIE MUTUELLE', 'MGEN', 'MACSF', 'SWISSLIFE', 'GROUPAMA MUTUELLE',
  'KENKO', 'SANTIANE', 'REMBOURSEMENT SANTE', 'REMBOURS',
];

export const DEFAULT_ACCOUNTS = (): Account[] => [];

export const DEFAULT_RULES = (): CatRule[] => [
  { keywords: ['COMMUN','CPT COMMUN','COMPTE COMMUN','GOUETTA-BARAN','BARANES SACHA','BARANES GOUE'], category: 'Contribution compte commun' },
  { keywords: ['PARIS HAB','HABITAT OPH','LOYER'], category: 'Loyer' },
  { keywords: ['EVANCIA'], category: 'Crèche' },
  { keywords: ['PHARMACIE','DR ISHAK','DR DAME','POINTGYN','JAVELO','PHIE DU','OPTICIEN','DENTISTE','INFIRMIER','CABINET'], category: 'Santé' },
  { keywords: ['MACIF','ROEDERER SAS','SIMAX','MMA ','AXA ','MAAF','ALLIANZ'], category: 'Assurance' },
  { keywords: ['EDF','ENEDIS','ENGIE','TOTAL ENERGIES'], category: 'Électricité' },
  { keywords: ['FREE TELECOM','BOUYGUES','ORANGE','SFR','SOSH'], category: 'Internet / Téléphone' },
  { keywords: ['NETFLIX','SPOTIFY','APPLE.COM','AMAZON PRIME','DISNEY','CANAL','DEEZER','GOVOYAGES'], category: 'Abonnements' },
  { keywords: ['NAVIGO','RATP','SNCF','TRANSDEV','VELIB'], category: 'Transport' },
  { keywords: ['TAXI','UBER ','BOLT ','KAPTEN','HEETCH'], category: 'Transport' },
  { keywords: ['UBER   * EATS','DELIVEROO','JUST EAT','DOMINO','PIZZA','RESTAURANT','BRASSERIE','BISTROT','CAFE ','TRAITEUR','SUSHI','RAMEN','KEBAB','BURGER','HIPPO','TMG ITALIE','PARIS BREIZH','YS TOLBIAC','RAMIO','ALLODONS','PRETAMANGER','AMJ '], category: 'Restaurants & Sorties' },
  { keywords: ['OPERA','THEATRE','CINEMA','MUSEE','BOWLING','KARTING','ESCAPE','CONCERT','SPECTACLE','ON PARTICIPE'], category: 'Loisirs & Culture' },
  { keywords: ["L'HEURE DU PAIN",'ERIC KAYSER','LE SON DU PAIN','BOULANGERIE','BRIOCHE'], category: 'Boulangerie' },
  { keywords: ['FRANPRIX','CARREFOUR','NATURALIA','PICARD','BIOCOOP','METRO FRANCE','GRIBDISTRI','DISTRI','INTERMARCHE','LECLERC','AUCHAN','LIDL','ALDI','MONOPRIX','ED ','LEADER PRICE','SIMPLY MARKET','CORA','HYPER','SUPER U','AUX GOURMANDS'], category: 'Courses' },
  { keywords: ['IKEA','BRICORAMA','CASTORAMA','LEROY MERLIN','MAISONS DU MONDE','ZARA HOME','BUT ','CONFORAMA','MURFY'], category: 'Maison & Déco' },
  { keywords: ['EPARGNE','LIVRET','ASSURANCE VIE'], category: 'Épargne' },
  { keywords: ['ASSURANCE DECOUVERT','FRAIS TENUE'], category: 'Charges bancaires' },
];

export const DEFAULT_CATEGORIES = (): Category[] => [
  { name: 'Loyer',                      color: '#f59e0b', budget: 1200 },
  { name: 'Crèche',                     color: '#8b5cf6', budget: 400 },
  { name: 'Courses',                    color: '#10b981', budget: 500 },
  { name: 'Boulangerie',                color: '#f97316', budget: 60 },
  { name: 'Restaurants & Sorties',      color: '#ec4899', budget: 200 },
  { name: 'Transport',                  color: '#3b82f6', budget: 150 },
  { name: 'Santé',                      color: '#ef4444', budget: 150 },
  { name: 'Assurance',                  color: '#06b6d4', budget: 200 },
  { name: 'Internet / Téléphone',       color: '#0ea5e9', budget: 60 },
  { name: 'Abonnements',                color: '#a855f7', budget: 50 },
  { name: 'Électricité',                color: '#eab308', budget: 80 },
  { name: 'Loisirs & Culture',          color: '#14b8a6', budget: 100 },
  { name: 'Maison & Déco',              color: '#d97706', budget: 100 },
  { name: 'Contribution compte commun', color: '#22c55e', budget: 0 },
  { name: 'Charges bancaires',          color: '#94a3b8', budget: 0 },
  { name: 'Épargne',                    color: '#4ade80', budget: 300 },
  { name: 'Divers',                     color: '#64748b', budget: 0 },
];
