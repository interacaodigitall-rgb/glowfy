import { BusinessType } from '../types';

export interface BusinessTypeMeta {
  type: BusinessType;
  label: string;
  description: string;
  professionalTerm: string;
  serviceTerm: string;
  spaceTerm: string;
  iconName: string;
  defaultCategories: string[];
  defaultServices: { name: string; category: string; price: number; durationMinutes: number; commissionPercentage: number }[];
  defaultProducts?: { name: string; categoryName: string; price: number; costPrice: number; stock: number; minStock: number; sku: string; description?: string }[];
  defaultProfessionals?: { name: string; email: string; roleTitle: string; specialties: string[]; commissionRate: number }[];
}

export const BUSINESS_TYPES: Record<BusinessType, BusinessTypeMeta> = {
  barbershop: {
    type: 'barbershop',
    label: 'Barbearia / Barbershop',
    description: 'Cortes masculinos, barba, pigmentação e tratamentos capilares.',
    professionalTerm: 'Barbeiro',
    serviceTerm: 'Serviço de Barba/Cabelo',
    spaceTerm: 'Cadeira',
    iconName: 'Scissors',
    defaultCategories: ['Cabelo', 'Barba', 'Combos', 'Tratamentos'],
    defaultServices: [
      { name: 'Corte Degradê / Fade', category: 'Cabelo', price: 18, durationMinutes: 45, commissionPercentage: 40 },
      { name: 'Barba Tradicional com Toalha Quente', category: 'Barba', price: 14, durationMinutes: 30, commissionPercentage: 40 },
      { name: 'Combo Corte + Barba Premium', category: 'Combos', price: 28, durationMinutes: 60, commissionPercentage: 45 },
      { name: 'Hidratação Capilar Masculina', category: 'Tratamentos', price: 15, durationMinutes: 20, commissionPercentage: 35 }
    ],
    defaultProducts: [
      { name: 'Pomada Modeladora Matte Mr. Navalha', categoryName: 'Cabelo', price: 15.00, costPrice: 7.50, stock: 25, minStock: 5, sku: 'POM-MAT-MN', description: 'Pomada modeladora de alta fixação com efeito seco/matte para um penteado natural e duradouro.' },
      { name: 'Óleo Hidratante de Barba Premium Mr. Navalha', categoryName: 'Barba', price: 18.00, costPrice: 9.00, stock: 15, minStock: 3, sku: 'OLE-BRB-MN', description: 'Óleo com ativos naturais para amaciar os fios da barba e hidratar a pele do rosto profundamente.' },
      { name: 'Shampoo Tonificante Anticaspa Mr. Navalha', categoryName: 'Cabelo', price: 14.50, costPrice: 6.80, stock: 20, minStock: 4, sku: 'SHA-ANT-MN', description: 'Shampoo refrescante de limpeza profunda com hortelã e ativos anticaspa para fortalecimento capilar.' }
    ],
    defaultProfessionals: [
      { name: 'Mr. Navalha (Oficial)', email: 'mr@misternavalha.pt', roleTitle: 'Barbeiro Principal / Fundador', specialties: ['Corte Degradê', 'Barba Tradicional', 'Navalha'], commissionRate: 40 },
      { name: 'Carlos Antunes', email: 'carlos@misternavalha.pt', roleTitle: 'Mestre Barbeiro', specialties: ['Corte Degradê', 'Visagismo', 'Pigmentação'], commissionRate: 40 },
      { name: 'Diogo Silva', email: 'diogo@misternavalha.pt', roleTitle: 'Barbeiro Júnior', specialties: ['Corte Clássico', 'Desenhos/Hair Tattoo'], commissionRate: 35 }
    ]
  },
  beauty_salon: {
    type: 'beauty_salon',
    label: 'Salão de Beleza',
    description: 'Cabeleireiro, coloração, escova, penteados e estética capilar.',
    professionalTerm: 'Cabeleireira(o)',
    serviceTerm: 'Serviço Capilar',
    spaceTerm: 'Bancada',
    iconName: 'Sparkles',
    defaultCategories: ['Cortes & Penteados', 'Coloração & Mechas', 'Tratamentos', 'Escova'],
    defaultServices: [
      { name: 'Corte Feminino + Escova', category: 'Cortes & Penteados', price: 35, durationMinutes: 60, commissionPercentage: 40 },
      { name: 'Coloração Raiz', category: 'Coloração & Mechas', price: 45, durationMinutes: 90, commissionPercentage: 35 },
      { name: 'Balayage / Mechas Creativas', category: 'Coloração & Mechas', price: 95, durationMinutes: 180, commissionPercentage: 35 },
      { name: 'Reconstrução Capilar Olaplex', category: 'Tratamentos', price: 40, durationMinutes: 45, commissionPercentage: 40 }
    ],
    defaultProducts: [
      { name: 'Máscara Reconstrutora Professional', categoryName: 'Tratamentos', price: 34.00, costPrice: 16.00, stock: 12, minStock: 3, sku: 'MAS-REC-GG', description: 'Máscara profissional de alta performance para reposição de massa capilar e brilho espelhado.' },
      { name: 'Sérum Capilar Nutritivo de Pontas', categoryName: 'Tratamentos', price: 24.50, costPrice: 11.50, stock: 18, minStock: 4, sku: 'SER-CAP-GG', description: 'Sérum anti-frizz de pontas secas com proteção térmica e filtro solar capilar.' }
    ],
    defaultProfessionals: [
      { name: 'Gabriela Glow', email: 'gabriela@glowglam.pt', roleTitle: 'Hair Stylist / Colorista', specialties: ['Balayage', 'Corte Feminino'], commissionRate: 40 },
      { name: 'Sofia Martins', email: 'sofia@glowglam.pt', roleTitle: 'Terapeuta Capilar', specialties: ['Reconstrução', 'Escova Progressiva'], commissionRate: 35 }
    ]
  },
  nail_salon: {
    type: 'nail_salon',
    label: 'Manicure & Pedicure / Nail Bar',
    description: 'Unhas de gel, verniz gel, pedicure médica e nail art.',
    professionalTerm: 'Nail Designer',
    serviceTerm: 'Serviço de Unhas',
    spaceTerm: 'Mesa de Unhas',
    iconName: 'Hand',
    defaultCategories: ['Manicure', 'Pedicure', 'Unhas de Gel', 'Nail Art'],
    defaultServices: [
      { name: 'Manicure com Verniz Gel', category: 'Manicure', price: 20, durationMinutes: 45, commissionPercentage: 45 },
      { name: 'Aplicação Unhas de Gel', category: 'Unhas de Gel', price: 40, durationMinutes: 90, commissionPercentage: 45 },
      { name: 'Manutenção Unhas de Gel', category: 'Unhas de Gel', price: 28, durationMinutes: 60, commissionPercentage: 45 },
      { name: 'Pedicure Completa + Spa de Pés', category: 'Pedicure', price: 30, durationMinutes: 60, commissionPercentage: 40 }
    ],
    defaultProducts: [
      { name: 'Óleo Secante e Fortalecedor de Cutículas', categoryName: 'Manicure', price: 6.50, costPrice: 2.80, stock: 30, minStock: 5, sku: 'OLE-CUT-DN', description: 'Óleo nutritivo para fortalecimento das unhas e hidratação das cutículas secas.' },
      { name: 'Creme Regenerador de Mãos Toque Seco', categoryName: 'Manicure', price: 12.00, costPrice: 5.50, stock: 22, minStock: 4, sku: 'CRE-MAO-DN', description: 'Creme com manteiga de karité de absorção rápida para mãos macias e unhas fortalecidas.' }
    ],
    defaultProfessionals: [
      { name: 'Ana Diva', email: 'ana@divanails.pt', roleTitle: 'Senior Nail Designer', specialties: ['Unhas de Gel', 'Nail Art 3D'], commissionRate: 45 },
      { name: 'Beatriz Costa', email: 'beatriz@divanails.pt', roleTitle: 'Manicure & Pedicure', specialties: ['Verniz Gel', 'Pedicure Médica'], commissionRate: 40 }
    ]
  },
  aesthetic_clinic: {
    type: 'aesthetic_clinic',
    label: 'Clínica de Estética & Dermato',
    description: 'Limpeza de pele, botox, preenchimentos, lasers e remodelação corporal.',
    professionalTerm: 'Esteticista / Dra.',
    serviceTerm: 'Procedimento Estético',
    spaceTerm: 'Gabinete',
    iconName: 'HeartPulse',
    defaultCategories: ['Estética Facial', 'Estética Corporal', 'Injetáveis', 'Tecnologias/Lasers'],
    defaultServices: [
      { name: 'Limpeza de Pele Profunda Ultrassónica', category: 'Estética Facial', price: 50, durationMinutes: 75, commissionPercentage: 30 },
      { name: 'Peeling Químico Renovador', category: 'Estética Facial', price: 65, durationMinutes: 45, commissionPercentage: 35 },
      { name: 'Drenagem Linfática Corporal', category: 'Estética Corporal', price: 45, durationMinutes: 60, commissionPercentage: 40 },
      { name: 'Sessão Depilação a Laser Alexandrite', category: 'Tecnologias/Lasers', price: 70, durationMinutes: 30, commissionPercentage: 25 }
    ],
    defaultProducts: [
      { name: 'Sérum Facial Ácido Hialurónico Puríssimo', categoryName: 'Estética Facial', price: 45.00, costPrice: 20.00, stock: 10, minStock: 2, sku: 'SER-HIA-AC', description: 'Sérum de hidratação profunda e preenchimento de linhas de expressão para pele madura.' },
      { name: 'Gel de Limpeza Purificante Facial', categoryName: 'Estética Facial', price: 19.50, costPrice: 8.50, stock: 20, minStock: 5, sku: 'GEL-LIM-AC', description: 'Gel higienizante para remoção de impurezas e controlo de oleosidade sem ressecar a pele.' }
    ]
  },
  spa: {
    type: 'spa',
    label: 'Spa & Bem-Estar',
    description: 'Massagens relaxantes, rituais de spa, aromaterapia e banhos termais.',
    professionalTerm: 'Terapeuta Spa',
    serviceTerm: 'Ritual de Spa',
    spaceTerm: 'Sala de Tratamento',
    iconName: 'Flower2',
    defaultCategories: ['Massagens', 'Rituais Spa', 'Tratamentos de Corpo', 'Aromaterapia'],
    defaultServices: [
      { name: 'Massagem Relaxante Velas Quentes', category: 'Massagens', price: 60, durationMinutes: 60, commissionPercentage: 40 },
      { name: 'Ritual Spa Casal (Banho + Massagem)', category: 'Rituais Spa', price: 140, durationMinutes: 90, commissionPercentage: 35 },
      { name: 'Exfoliação Corporal com Sal Marinho', category: 'Tratamentos de Corpo', price: 50, durationMinutes: 45, commissionPercentage: 40 }
    ]
  },
  lash_brow: {
    type: 'lash_brow',
    label: 'Lash & Brow / Cílios e Sobrancelhas',
    description: 'Extensão de pestanas, lash lifting, design de sobrancelhas e micropigmentação.',
    professionalTerm: 'Lash & Brow Designer',
    serviceTerm: 'Design / Extensão',
    spaceTerm: 'Maca',
    iconName: 'Eye',
    defaultCategories: ['Pestanas / Cílios', 'Sobrancelhas', 'Micropigmentação'],
    defaultServices: [
      { name: 'Extensão de Pestanas Volume Russo', category: 'Pestanas / Cílios', price: 55, durationMinutes: 120, commissionPercentage: 45 },
      { name: 'Lash Lifting + Nutrição', category: 'Pestanas / Cílios', price: 35, durationMinutes: 60, commissionPercentage: 45 },
      { name: 'Design de Sobrancelhas com Henna', category: 'Sobrancelhas', price: 20, durationMinutes: 30, commissionPercentage: 50 }
    ]
  },
  makeup: {
    type: 'makeup',
    label: 'Estúdio de Maquilhagem / Makeup',
    description: 'Maquilhagem social, noivas, produções fotográficas e consultoria de imagem.',
    professionalTerm: 'Maquilhador(a)',
    serviceTerm: 'Sessão de Maquilhagem',
    spaceTerm: 'Cadeira de Maquilhagem',
    iconName: 'Palette',
    defaultCategories: ['Social', 'Noivas', 'Cursos & Auto-Maquilhagem'],
    defaultServices: [
      { name: 'Maquilhagem Social com Cílios', category: 'Social', price: 50, durationMinutes: 60, commissionPercentage: 50 },
      { name: 'Pacote Noiva (Teste + Dia D)', category: 'Noivas', price: 180, durationMinutes: 120, commissionPercentage: 50 }
    ]
  },
  massage: {
    type: 'massage',
    label: 'Centro de Massagem & Quiropraxia',
    description: 'Massagem terapêutica, desportiva, shiatsu e libertação miofascial.',
    professionalTerm: 'Massoterapeuta',
    serviceTerm: 'Sessão de Massagem',
    spaceTerm: 'Maca Terapêutica',
    iconName: 'Activity',
    defaultCategories: ['Terapêutica', 'Desportiva', 'Oriental'],
    defaultServices: [
      { name: 'Massagem Terapêutica de Dor/Tensão', category: 'Terapêutica', price: 50, durationMinutes: 50, commissionPercentage: 45 },
      { name: 'Massagem Desportiva com Ventosas', category: 'Desportiva', price: 55, durationMinutes: 60, commissionPercentage: 45 }
    ]
  },
  beauty_professional: {
    type: 'beauty_professional',
    label: 'Profissional Independente / Atendimento ao Domicílio',
    description: 'Especialista autónomo com atendimento no próprio estúdio ou ao domicílio.',
    professionalTerm: 'Profissional',
    serviceTerm: 'Atendimento',
    spaceTerm: 'Estúdio / Domicílio',
    iconName: 'UserCheck',
    defaultCategories: ['Geral', 'Tratamentos VIP'],
    defaultServices: [
      { name: 'Atendimento Personalizado VIP', category: 'Tratamentos VIP', price: 40, durationMinutes: 60, commissionPercentage: 100 }
    ]
  },
  other: {
    type: 'other',
    label: 'Outro Negócio de Beleza',
    description: 'Configuração flexível para qualquer conceito de estética e estética avançada.',
    professionalTerm: 'Especialista',
    serviceTerm: 'Procedimento',
    spaceTerm: 'Posto de Trabalho',
    iconName: 'Scissors',
    defaultCategories: ['Geral'],
    defaultServices: [
      { name: 'Consulta / Avaliação Inicial', category: 'Geral', price: 25, durationMinutes: 30, commissionPercentage: 40 }
    ]
  }
};
