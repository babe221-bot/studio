import type { ConstructionElement } from '@/types';

export const constructionElements: ConstructionElement[] = [
  { id: 'kuhinjska-ploca', name: 'Kuhinjska ploča', defaultLength: 280, defaultWidth: 62, defaultHeight: 3 },
  { id: 'prozorska-klupcica', name: 'Prozorska klupčica', defaultLength: 120, defaultWidth: 25, defaultHeight: 3 },
  { id: 'stepenica-gaziste', name: 'Stepenica - Gazište', defaultLength: 100, defaultWidth: 33, defaultHeight: 3 },
  { id: 'stepenica-celo', name: 'Stepenica - Čelo', defaultLength: 100, defaultWidth: 15, defaultHeight: 2 },
  { id: 'poklopnica-zida', name: 'Poklopnica zida', defaultLength: 100, defaultWidth: 30, defaultHeight: 3 },
  { id: 'podna-ploca', name: 'Podna ploča', defaultLength: 60, defaultWidth: 30, defaultHeight: 2, hasQuantityInput: true },
  { id: 'fasadna-ploca', name: 'Fasadna ploča', defaultLength: 80, defaultWidth: 40, defaultHeight: 2 },
];
