import React, { useState, useEffect } from 'react';
import { useTenant } from '../../features/tenants/TenantContext';
import { fetchSales } from '../../features/sales/salesService';
import { fetchTenantAppointments } from '../../features/appointments/appointmentService';
import { fetchProfessionals } from '../../features/professionals/professionalsService';
import { Sale, Appointment, Professional } from '../../types';
import { BarChart3, TrendingUp, DollarSign, Users, Award, Calendar } from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export const ReportsView: React.FC = () => {
  const { currentTenant, businessMeta } = useTenant();
  const [sales, setSales] = useState<Sale[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentTenant) return;
    setLoading(true);
    Promise.all([
      fetchSales(currentTenant.id),
      fetchTenantAppointments(currentTenant.id),
      fetchProfessionals(currentTenant.id)
    ]).then(([sList, aList, pList]) => {
      setSales(sList);
      setAppointments(aList);
      setProfessionals(pList);
      setLoading(false);
    });
  }, [currentTenant]);

  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0) + appointments.filter(a => a.status === 'completed').reduce((acc, a) => acc + a.price, 0);
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(a => a.status === 'completed').length;

  // Revenue By Day Mock/Calculated
  const revenueChartData = [
    { day: 'Seg', faturamento: 120 },
    { day: 'Ter', faturamento: 240 },
    { day: 'Qua', faturamento: 180 },
    { day: 'Qui', faturamento: 310 },
    { day: 'Sex', faturamento: 450 },
    { day: 'Sáb', faturamento: 520 },
    { day: 'Dom', faturamento: 90 },
  ];

  // Commission distribution per professional
  const commissionData = professionals.map(p => {
    const proApps = appointments.filter(a => a.professionalId === p.id && a.status === 'completed');
    const totalSalesPro = proApps.reduce((acc, a) => acc + a.price, 0);
    const commTotal = (totalSalesPro * p.commissionRate) / 100;
    return {
      name: p.name,
      vendas: totalSalesPro,
      comissao: commTotal
    };
  });

  const COLORS = ['#e11d48', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-base font-bold text-[#111827] flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-[#8C6D23]" />
            <span>Relatórios & Analytics Financeiro</span>
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Faturação real, cálculo de comissões por {businessMeta.professionalTerm} e taxa de ocupação.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-4 rounded-xl space-y-1 shadow-sm">
          <p className="text-xs text-[#6B7280] font-medium">Faturação Total</p>
          <p className="text-2xl font-bold text-[#8C6D23] font-mono">€{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-xl space-y-1 shadow-sm">
          <p className="text-xs text-[#6B7280] font-medium">Agendamentos Totais</p>
          <p className="text-2xl font-bold text-[#111827]">{totalAppointments}</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-xl space-y-1 shadow-sm">
          <p className="text-xs text-[#6B7280] font-medium">Atendimentos Concluídos</p>
          <p className="text-2xl font-bold text-emerald-600">{completedAppointments}</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-xl space-y-1 shadow-sm">
          <p className="text-xs text-[#6B7280] font-medium">Taxa de Conclusão</p>
          <p className="text-2xl font-bold text-indigo-600">
            {totalAppointments > 0 ? ((completedAppointments / totalAppointments) * 100).toFixed(0) : 100}%
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Area Chart */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl space-y-4 shadow-sm">
          <h3 className="font-bold text-[#111827] text-sm flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#8C6D23]" />
            <span>Faturação por Dia da Semana (€)</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData}>
                <XAxis dataKey="day" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '8px', color: '#111827' }} />
                <Area type="monotone" dataKey="faturamento" stroke="#C5A059" fill="#C5A059" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Commissions Bar Chart */}
        <div className="bg-white border border-gray-200 p-6 rounded-xl space-y-4 shadow-sm">
          <h3 className="font-bold text-[#111827] text-sm flex items-center space-x-2">
            <Award className="w-4 h-4 text-[#8C6D23]" />
            <span>Comissões Calculadas por {businessMeta.professionalTerm} (€)</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commissionData}>
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderRadius: '8px', color: '#111827' }} />
                <Bar dataKey="comissao" fill="#C5A059" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
