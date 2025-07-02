import type { ConstructionElement } from '@/types';

export const constructionElements: ConstructionElement[] = [
  { id: 'prozorska-klupcica', name: 'Prozorska klupčica', defaultLength: 120, defaultWidth: 25, defaultHeight: 3, orderUnit: 'piece' },
  { id: 'stepenica-gaziste', name: 'Stepenica - Gazište', defaultLength: 100, defaultWidth: 33, defaultHeight: 3, orderUnit: 'piece' },
  { id: 'stepenica-celo', name: 'Stepenica - Čelo', defaultLength: 100, defaultWidth: 15, defaultHeight: 2, orderUnit: 'piece' },
  { id: 'stepenica-cokl', name: 'Stepenica - Cokl', defaultLength: 100, defaultWidth: 10, defaultHeight: 2, orderUnit: 'lm' },
  { id: 'poklopnica-zida', name: 'Poklopnica zida (komad)', defaultLength: 100, defaultWidth: 30, defaultHeight: 3, orderUnit: 'piece' },
  { id: 'poklopnica-zida-lm', name: 'Poklopnica zida (m)', defaultLength: 100, defaultWidth: 30, defaultHeight: 3, orderUnit: 'lm' },
  { id: 'podna-ploca', name: 'Podna ploča', defaultLength: 60, defaultWidth: 30, defaultHeight: 2, orderUnit: 'sqm' },
  { id: 'fasadna-ploca', name: 'Fasadna ploča', defaultLength: 40, defaultWidth: 20, defaultHeight: 3, orderUnit: 'sqm' },
  { id: 'bunja', name: 'Bunja', defaultLength: 100, defaultWidth: 15, defaultHeight: 5, orderUnit: 'sqm', hasSpecialBunjaEdges: true },
  { id: 'obloga-kamina', name: 'Obloga kamina', defaultLength: 100, defaultWidth: 80, defaultHeight: 2, orderUnit: 'piece'},
  { id: 'rubni-kamen-bazena', name: 'Rubni kamen bazena', defaultLength: 60, defaultWidth: 33, defaultHeight: 4, orderUnit: 'lm' },
];
