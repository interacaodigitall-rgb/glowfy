import { BusinessType } from '../../types';

export interface PortalUnit {
  id: string;
  name: string;
  shortName: string;
  region: string;
  address: string;
  phone: string;
  whatsapp: string;
  hours: string;
  imageUrl: string;
}

export interface PortalProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
}

export interface PortalBarber {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  rating: number;
  reviewsCount: number;
  specialties: string[];
}

export interface PortalTheme {
  primaryAccent: string;
  badgeText: string;
  heroHeadline: string;
  heroSlogans: string[];
  heroSubheadline: string;
  heroImageUrl: string;
  historyTitle: string;
  historyStackedWords: string[];
  historyText: string;
  clubTitle: string;
  clubSubtitle: string;
  quietServiceTitle: string;
  quietServiceSubtitle: string;
  modelPhotos: string[];
  defaultCategories: string[];
}

// 1. Barbearia (Barbershop)
const BARBERSHOP_THEME: PortalTheme = {
  primaryAccent: '#C5A059',
  badgeText: 'Barbearia tradicional com experiência contemporânea',
  heroHeadline: 'CORTE. BARBA. PRESENÇA.',
  heroSlogans: [
    'CORTE DE CABELO',
    'BARBA TRADICIONAL',
    'VISAGISMO MASCULINO',
    'EXPERIÊNCIA EXCLUSIVA'
  ],
  heroSubheadline: 'Barbearia tradicional com uma experiência contemporânea. Mestres em visagismo, toalhas quentes e precisão cirúrgica no centro da Guarda.',
  heroImageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1920&q=85',
  historyTitle: 'A ARTE DO VISAGISMO E DO ATENDIMENTO PERSONALIZADO',
  historyStackedWords: ['MR', 'NA', 'VALHA'],
  historyText: 'Fundada com o compromisso inabalável de resgatar o melhor da barbearia tradicional combinada com as técnicas contemporâneas de visagismo, o Mr. Navalha na Guarda consolidou-se como um espaço de referência para homens que prezam por elegância, pontualidade e bem-estar.',
  clubTitle: 'EXPERIÊNCIA MR. NAVALHA',
  clubSubtitle: 'Mais do que um corte. Uma experiência pensada para si.',
  quietServiceTitle: 'QUIET SERVICE (ATENDIMENTO SILENCIOSO)',
  quietServiceSubtitle: 'Prefiro relaxar sem conversas durante o corte e barba',
  modelPhotos: [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80'
  ],
  defaultCategories: ['Cabelo', 'Barba', 'Combos', 'Tratamentos']
};

// 2. Nails Designer & Manicure
const NAILS_THEME: PortalTheme = {
  primaryAccent: '#f43f5e',
  badgeText: 'Alta precisão em design de unhas & manicure russa',
  heroHeadline: 'ELEGÂNCIA, RESISTÊNCIA E BELEZA',
  heroSlogans: [
    'ALONGAMENTO EM GEL',
    'BLINDAGEM & ESMALTAÇÃO',
    'NAIL ART EXCLUSIVA',
    'SPA DAS MÃOS E PÉS'
  ],
  heroSubheadline: 'Unhas impecáveis, duradouras e saudáveis. Procedimentos esterilizados com produtos hipoalergênicos e técnicas internacionais.',
  heroImageUrl: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1920&q=85',
  historyTitle: 'ARQUITETURA DAS UNHAS & AUTOCUIDADO FEMININO',
  historyStackedWords: ['NAIL', 'DESI', 'GNER'],
  historyText: 'Com paixão pelo detalhe e simetria perfeita, nosso estúdio foi criado para elevar a autoestima feminina. Cada conjunto de unhas é uma obra de arte personalizada com curvatura C impecável e acabamento natural.',
  clubTitle: 'CLUBE NAILS VIP',
  clubSubtitle: 'Ganhe cashback em todas as manutenções e aplicações. Descontos especiais no mês do seu aniversário.',
  quietServiceTitle: 'ATENDIMENTO RELAX & FOCO',
  quietServiceSubtitle: 'Prefiro desfrutar de um momento de silêncio e relaxamento durante o procedimento',
  modelPhotos: [
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=600&q=80'
  ],
  defaultCategories: ['Unhas de Gel', 'Manicure Russa', 'Nail Art', 'Spa dos Pés', 'Blindagem']
};

// 3. Salão de Beleza (Hair Salon)
const SALON_THEME: PortalTheme = {
  primaryAccent: '#c084fc',
  badgeText: 'Transformação capilar, mechas e visagismo',
  heroHeadline: 'CABELOS RADIAIS, SAUDÁVEIS E ILUMINADOS',
  heroSlogans: [
    'MECHAS & BALAYAGE',
    'CORTE & VISAGISMO',
    'CRONOGRAMA CAPILAR',
    'PENTEADOS & PRODUÇÃO'
  ],
  heroSubheadline: 'Coloristas e estilistas dedicados a valorizar sua identidade com tratamentos de reconstrução profunda e atendimento VIP.',
  heroImageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1920&q=85',
  historyTitle: 'O EQUILÍBRIO ENTRE TENDÊNCIA E SAÚDE CAPILAR',
  historyStackedWords: ['SA', 'LÃO', 'BEAUTY'],
  historyText: 'Fundado com o propósito de oferecer tratamentos capilares inovadores, nosso salão combina visagismo moderno com as melhores marcas internacionais para resultados radiantes.',
  clubTitle: 'BEAUTY CLUB',
  clubSubtitle: 'Pontuação em todos os tratamentos capilares e mechas. Acesso antecipado a lançamentos de produtos exclusivos.',
  quietServiceTitle: 'QUIET SESSION',
  quietServiceSubtitle: 'Prefiro relaxar tranquilamente enquanto cuido do meu cabelo',
  modelPhotos: [
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=600&q=80'
  ],
  defaultCategories: ['Cortes & Escovas', 'Coloração & Mechas', 'Tratamentos', 'Penteados']
};

// 4. Clínica de Estética & Spa
const CLINIC_SPA_THEME: PortalTheme = {
  primaryAccent: '#14b8a6',
  badgeText: 'Estética avançada, rejuvenescimento e bem-estar',
  heroHeadline: 'CUIDADO CLÍNICO INTEGRADO & RITUAIS DE SPA',
  heroSlogans: [
    'LIMPEZA PROFUNDA',
    'DRENAGEM LINFÁTICA',
    'REJUVENESCIMENTO',
    'MASSAGEM RELAXANTE'
  ],
  heroSubheadline: 'Protocolos dermatológicos de alta performance e massagens terapêuticas para renovar sua energia e revitalizar a pele.',
  heroImageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1920&q=85',
  historyTitle: 'CIÊNCIA ESTÉTICA E HARMONIA CORPORAL',
  historyStackedWords: ['CLÍ', 'NICA', 'SPA'],
  historyText: 'Especialistas em cosmetologia e dermato-funcional dedicados a tratamentos não invasivos que promovem saúde, firmeza e relaxamento profundo.',
  clubTitle: 'GLOW CLUB SPA',
  clubSubtitle: 'Planos mensais de autocuidado com sessões acumulativas e vantagens exclusivas em cosmecêuticos.',
  quietServiceTitle: 'SESSÃO TERAPÊUTICA SILENCIOSA',
  quietServiceSubtitle: 'Ambiente de imersão total com aromaterapia e sons da natureza',
  modelPhotos: [
    'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80'
  ],
  defaultCategories: ['Estética Facial', 'Massagens & Spa', 'Corporal', 'Protocolos VIP']
};

export function getPortalTheme(businessType?: BusinessType): PortalTheme {
  switch (businessType) {
    case 'nail_salon':
    case 'lash_brow':
      return NAILS_THEME;
    case 'beauty_salon':
    case 'makeup':
      return SALON_THEME;
    case 'aesthetic_clinic':
    case 'spa':
    case 'massage':
      return CLINIC_SPA_THEME;
    case 'barbershop':
    default:
      return BARBERSHOP_THEME;
  }
}

// Dynamic Professionals by Business Type
export function getPortalProfessionals(businessType?: BusinessType): PortalBarber[] {
  return [
    {
      id: 'pro-team',
      name: 'Equipe Especializada',
      role: 'Atendimento Especializado',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      rating: 5.0,
      reviewsCount: 50,
      specialties: ['Atendimento VIP']
    }
  ];
}

// Dynamic Upselling Products by Business Type (Must be empty by default to prevent fake products)
export function getPortalProducts(_businessType?: BusinessType): PortalProduct[] {
  return [];
}

// Dynamic Units by Business Type & Tenant Name
export function getPortalUnits(_businessType?: BusinessType, tenantName?: string): PortalUnit[] {
  const name = tenantName || 'Glowfy Hub';
  return [
    {
      id: 'unit-main',
      name: `${name} - Unidade Principal`,
      shortName: 'Principal',
      region: 'PORTUGAL',
      address: 'Consulte o endereço no perfil da empresa',
      phone: '',
      whatsapp: '',
      hours: 'Consulte o horário de funcionamento',
      imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80'
    }
  ];
}

// Fallback legacy exports for backward compatibility
export const PORTAL_UNITS = getPortalUnits();
export const PORTAL_BARBERS = getPortalProfessionals();
export const PORTAL_PRODUCTS = getPortalProducts();
