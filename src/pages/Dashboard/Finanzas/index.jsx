import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../../stores/useStore';
import { nowForAPI, toLocalDateString } from '../../../utils/helpers';
import {
   TrendingUp, DollarSign, Wallet, Clock, Users, ChevronDown, ChevronRight, CreditCard, ArrowLeftRight,
   Briefcase, Activity, ArrowUpRight, ArrowDownRight,
   Download, FileText, Plus, X, List, PieChart, BarChart2, Trash2, Pencil, Landmark, Receipt, CheckCircle2,
   Phone, Printer, Lightbulb
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';

import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import CustomDatePicker from '../../../components/ui/CustomDatePicker';
import CustomDateRangePicker from '../../../components/ui/CustomDateRangePicker';
import TransactionReceiptModal from '../../../components/TransactionReceiptModal/TransactionReceiptModal';

const EXPENSE_CATEGORIES = {
   'insumos': { color: '#0ea5e9', label: 'Insumos', keywords: ['insumo', 'material', 'descartable', 'jeringa', 'guante', 'medicamento', 'farmacia'] },
   'sueldos': { color: '#8b5cf6', label: 'Honorarios', keywords: ['sueldo', 'honorario', 'pago', 'salario', 'secretaria', 'medico', 'profesional'] },
   'servicios': { color: '#f97316', label: 'Servicios', keywords: ['luz', 'agua', 'internet', 'gas', 'afip', 'impuesto', 'monotributo', 'alquiler', 'expensas'] },
   'mantenimiento': { color: '#eab308', label: 'Mantenimiento', keywords: ['limpieza', 'arreglo', 'reparacion', 'mantenimiento', 'tecnico', 'computadora', 'impresora'] },
   'otros': { color: '#64748b', label: 'Otros Gastos', keywords: [] }
};

const getExpenseCategory = (concept) => {
   const lower = (concept || '').toLowerCase();
   for (const [key, data] of Object.entries(EXPENSE_CATEGORIES)) {
      if (data.keywords.some(kw => lower.includes(kw))) {
         return { id: key, ...data };
      }
   }
   return { id: 'otros', ...EXPENSE_CATEGORIES.otros };
};

export default function FinanzasPage() {
   const store = useStore();
   const doctors = store.doctors;
   const adminStaff = store.adminStaff;
   const userRole = store.userRole;
   const transactions = store.transactions;
   const appointments = store.appointments;
   const [dateRange, setDateRange] = useState('Mes en curso');
   const [customDateRange, setCustomDateRange] = useState({ dateFrom: '', dateTo: '' });
   const [activeTab, setActiveTab] = useState('diario'); // 'diario' | 'profesionales'
   const [expandedTxId, setExpandedTxId] = useState(null);

   const [isAddingExpense, setIsAddingExpense] = useState(false);
   const [newExpense, setNewExpense] = useState({ category: '', amount: '', method: 'Efectivo', date: toLocalDateString(new Date()), receipt: '', notes: '', doctor_id: '', isFixed: false });

   const [settlementDoctor, setSettlementDoctor] = useState(null);
   const [editingTxId, setEditingTxId] = useState(null);
   const [receiptTx, setReceiptTx] = useState(null);
   const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, txId: null });

   // Cargar maestros al montar
   useEffect(() => {
      store.fetchDoctors();
      store.fetchAdminStaff();
   }, []);

   // -- Paginación inteligente: fetch solo del rango de fechas actual --
   useEffect(() => {
      const now = new Date();
      let dateFrom, dateTo;

      const f = (d) => {
         const dObj = new Date(d);
         dObj.setMinutes(dObj.getMinutes() - dObj.getTimezoneOffset());
         return dObj.toISOString().split('T')[0];
      };

      if (dateRange === 'Hoy') {
         dateFrom = f(now);
         dateTo = f(now);
      } else if (dateRange === 'Esta Semana') {
         const weekAgo = new Date(now);
         weekAgo.setDate(now.getDate() - 7);
         dateFrom = f(weekAgo);
         dateTo = f(now);
      } else if (dateRange === 'Mes en curso') {
         // Fetch last month too, to calculate MoM
         const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
         const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
         dateFrom = f(firstDay);
         dateTo = f(lastDay);
      } else if (dateRange === 'Año en curso') {
         const firstDay = new Date(now.getFullYear(), 0, 1);
         const lastDay = new Date(now.getFullYear(), 11, 31);
         dateFrom = f(firstDay);
         dateTo = f(lastDay);
      } else if (dateRange === 'Personalizado') {
         if (customDateRange.dateFrom && customDateRange.dateTo) {
            dateFrom = customDateRange.dateFrom;
            dateTo = customDateRange.dateTo;
         } else {
            return; // Esperar a que el usuario seleccione el rango
         }
      }

      store.fetchTransactions({ dateFrom, dateTo });
      store.fetchAppointments({ dateFrom, dateTo });
   }, [dateRange, customDateRange]);

   const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);

   // Mensaje Toast Temporal para exportaciones
   const [toastMsg, setToastMsg] = useState('');

   const stats = useMemo(() => {
      const now = new Date();
      // Función robusta: obtiene 'YYYY-MM-DD' de una fecha sin que la timezone la rompa
      const toLocalDateStr = (dateStr) => {
         if (!dateStr) return '';
         // Si tiene T y Z (ISO UTC), convertir a local. Si no, tomar los primeros 10 chars.
         const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T'));
         const y = d.getFullYear();
         const m = String(d.getMonth() + 1).padStart(2, '0');
         const day = String(d.getDate()).padStart(2, '0');
         return `${y}-${m}-${day}`;
      };
      const todayStr = toLocalDateStr(now.toISOString());

      // 1. Filtrar transacciones por rango y ocultar ajustes técnicos
      const currentPeriodTxs = [];
      const prevPeriodTxs = [];

      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

      (transactions || []).forEach(t => {
         if (t.concept && t.concept.includes('Ajuste Honorarios (Redondeo)')) return;
         
         const txDateStr = toLocalDateStr(t.date);
         if (!txDateStr) {
            currentPeriodTxs.push(t);
            return;
         }
         
         if (dateRange === 'Hoy') {
            if (txDateStr === todayStr) currentPeriodTxs.push(t);
         } else if (dateRange === 'Esta Semana') {
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            if (txDateStr >= toLocalDateStr(weekAgo.toISOString())) currentPeriodTxs.push(t);
         } else if (dateRange === 'Mes en curso') {
            if (txDateStr.startsWith(currentMonthStr)) {
               currentPeriodTxs.push(t);
            } else if (txDateStr.startsWith(prevMonthStr)) {
               prevPeriodTxs.push(t);
            }
         } else if (dateRange === 'Personalizado' && customDateRange.dateFrom && customDateRange.dateTo) {
            if (txDateStr >= customDateRange.dateFrom && txDateStr <= customDateRange.dateTo) currentPeriodTxs.push(t);
         } else {
            if (txDateStr.startsWith(`${now.getFullYear()}`)) currentPeriodTxs.push(t);
         }
      });

      const dynamicExpenses = currentPeriodTxs.filter(t => t.type === 'Egreso').reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const dynamicIncome = currentPeriodTxs.filter(t => t.type === 'Ingreso').reduce((acc, t) => acc + Number(t.amount || 0), 0);
      
      const prevExpenses = prevPeriodTxs.filter(t => t.type === 'Egreso').reduce((acc, t) => acc + Number(t.amount || 0), 0);
      const prevIncome = prevPeriodTxs.filter(t => t.type === 'Ingreso').reduce((acc, t) => acc + Number(t.amount || 0), 0);

      let fixedExpenses = 0;
      let variableExpenses = 0;
      currentPeriodTxs.filter(t => t.type === 'Egreso').forEach(t => {
         if ((t.notes || '').includes('[FIJO]')) {
             fixedExpenses += Number(t.amount || 0);
         } else {
             variableExpenses += Number(t.amount || 0);
         }
      });
      
      let prevFixedExpenses = 0;
      prevPeriodTxs.filter(t => t.type === 'Egreso').forEach(t => {
         if ((t.notes || '').includes('[FIJO]')) {
             prevFixedExpenses += Number(t.amount || 0);
         }
      });

      // 2. Calcular Distribución de Categorías de Egresos (Donut)
      const categoryTotals = {};
      currentPeriodTxs.filter(t => t.type === 'Egreso').forEach(t => {
         const cat = getExpenseCategory(t.concept);
         if (!categoryTotals[cat.id]) {
            categoryTotals[cat.id] = { name: cat.label, value: 0, fill: cat.color };
         }
         categoryTotals[cat.id].value += Number(t.amount || 0);
      });
      const categoryDistribution = Object.values(categoryTotals).sort((a, b) => b.value - a.value);

      // 3. Flujo Evolución (Recharts: LineChart/AreaChart)
      const dataByDate = {};
      const sortedTxs = [...currentPeriodTxs].sort((a, b) => new Date(a.date) - new Date(b.date));
      sortedTxs.forEach(t => {
         const dateKey = new Date(t.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
         if (!dataByDate[dateKey]) {
            dataByDate[dateKey] = { date: dateKey, Ingresos: 0, Egresos: 0 };
         }
         if (t.type === 'Ingreso') dataByDate[dateKey].Ingresos += Number(t.amount || 0);
         else dataByDate[dateKey].Egresos += Number(t.amount || 0);
      });
      const evolutionData = Object.values(dataByDate);

      return {
         ingresos: dynamicIncome,
         egresos: dynamicExpenses,
         neta: dynamicIncome - dynamicExpenses,
         prevIngresos: prevIncome,
         prevEgresos: prevExpenses,
         prevNeta: prevIncome - prevExpenses,
         fixedExpenses,
         variableExpenses,
         prevFixedExpenses,
         donutData: categoryDistribution,
         evolutionData,
         totalTxs: currentPeriodTxs.length,
         currentPeriodTxs
      };
   }, [dateRange, transactions]);

   if (userRole !== 'admin') {
      return (
         <div className="flex flex-col items-center justify-center h-full max-h-screen text-slate-500">
            <Briefcase size={48} className="mb-4 text-slate-300" />
            <h2 className="text-xl font-bold text-slate-700">Acceso Denegado</h2>
            <p className="text-sm">El módulo de Business Intelligence es exclusivo para dueños o roles administrativos.</p>
         </div>
      );
   }

   // Manejador del Modal de Gasto
   const handleAddExpense = async (e) => {
      e.preventDefault();
      if (!newExpense.amount || !newExpense.category) return;

      const txData = {
         date: newExpense.date ? new Date(newExpense.date + 'T12:00:00Z').toISOString() : new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000).toISOString(),
         type: newExpense.type || 'Egreso',
         concept: newExpense.category + (newExpense.receipt ? ` (#${newExpense.receipt})` : ''),
         method: newExpense.method || 'Efectivo',
         amount: Number(newExpense.amount),
         notes: newExpense.isFixed ? `[FIJO] ${newExpense.notes}` : newExpense.notes,
         category: 'Gastos Generales'
      };

      if (editingTxId) {
         await store.updateTransaction(editingTxId, txData);
         setToastMsg(`✔ Transacción actualizada con éxito.`);
      } else {
         await store.createTransaction(txData);
         setToastMsg(`✔ Gasto registrado correctamente.`);
      }

      await store.fetchTransactions();
      setIsAddingExpense(false);
      setEditingTxId(null);
      setNewExpense({ category: '', amount: '', method: 'Efectivo', date: toLocalDateString(new Date()), receipt: '', notes: '', doctor_id: null, isFixed: false });
      setTimeout(() => setToastMsg(''), 3000);
   };

   const handleExport = (type) => {
      if (type === 'CSV') {
         const headers = "ID Ref.;Fecha;Hora;Tipo de Movimiento;Concepto Registrado;Método de Pago;Monto Neto (ARS)\n";
         const csvRows = stats.currentPeriodTxs.map(tx => {
            const dObj = new Date(tx.date);
            const fDate = dObj.toLocaleDateString();
            const fTime = dObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const formatMonto = formatMoney(tx.type === 'Ingreso' ? tx.amount : -tx.amount);
            return `"TX-${tx.id}";"${fDate}";"${fTime}";"${tx.type}";"${tx.concept}";"${tx.method}";"${formatMonto}"`;
         }).join("\n");
         const blob = new Blob(["\uFEFF" + headers + csvRows], { type: 'text/csv;charset=utf-8;' });
         const link = document.createElement('a');
         link.href = URL.createObjectURL(blob);
         link.setAttribute('download', 'Libro_Diario_Finanzas.csv');
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         setToastMsg('¡Archivo CSV descargado con éxito!');
      } else if (type === 'PDF') {
         setToastMsg('Preparando documento para impresión / PDF...');
         setTimeout(() => window.print(), 800);
      }
      setTimeout(() => setToastMsg(''), 4000);
   };

   const formatMoney = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(val);

   const generateReceipt = (doc) => {
      const receiptPrefix = 'EGR';
      const receiptNumber = `${receiptPrefix}-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`;
      
      const consultorioConfig = (() => {
         try { return JSON.parse(localStorage.getItem('consultorio_config') || '{}'); }
         catch { return {}; }
      })();
      const businessName    = consultorioConfig.businessName || 'Integrar Salud';
      const businessAddress = consultorioConfig.address || '';
      const businessPhone   = consultorioConfig.phone   || '';

      const now = new Date();
      const txDate = now.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
      const amount = Number(doc.pendingAmount);

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante ${receiptNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
    
    :root {
      --primary: #1e1b4b;
      --accent: #f43f5e;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --bg-light: #f8fafc;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Outfit', system-ui, sans-serif; 
      background: #e2e8f0; 
      color: var(--text-main); 
      font-size: 14px; 
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    
    .receipt-container {
      max-width: 760px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.08);
      position: relative;
      overflow: hidden;
    }
    .top-band {
      height: 12px;
      background: var(--accent);
    }
    .receipt-content {
      padding: 60px;
    }
    
    .header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 50px;
    }
    .logo {
      width: 56px;
      height: 56px;
      background: white;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 16px rgba(30, 27, 75, 0.15);
      overflow: hidden;
    }
    .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .company-info { flex: 1; }
    .company-name {
      font-size: 24px;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .company-contact {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
      font-weight: 500;
      display: flex;
      gap: 12px;
    }
    .company-contact span:not(:last-child)::after {
      content: '•';
      margin-left: 12px;
      color: var(--border);
    }
    
    .receipt-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 24px;
      border-bottom: 2px solid var(--text-main);
      margin-bottom: 40px;
    }
    .title {
      font-size: 13px;
      font-weight: 800;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }
    .receipt-no {
      font-size: 24px;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    .info-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .info-value {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 4px;
      line-height: 1.2;
    }
    .info-sub {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
    }
    .items-table th {
      text-align: left;
      padding: 0 0 16px 0;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
    }
    .items-table td {
      padding: 24px 0;
      border-bottom: 1px dashed var(--border);
    }
    .service-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-main);
    }
    .service-amount {
      font-size: 16px;
      font-weight: 700;
      text-align: right;
    }

    .summary-section {
      display: flex;
      justify-content: flex-end;
      align-items: flex-start;
      gap: 40px;
      margin-bottom: 60px;
    }
    .summary-details {
      flex: 1;
      max-width: 320px;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      padding: 14px 0;
      border-bottom: 1px dashed var(--border);
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .summary-line span:last-child {
      color: var(--text-main);
      font-weight: 700;
    }
    
    .total-block {
      background: var(--bg-light);
      padding: 32px 40px;
      border-radius: 20px;
      text-align: right;
      min-width: 340px;
      border: 1px solid var(--border);
    }
    .total-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .total-amount {
      font-size: 46px;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.04em;
      line-height: 1;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      background: #f43f5e15;
      color: #f43f5e;
      border-radius: 100px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 32px;
      border-top: 1px solid var(--border);
    }
    .disclaimer {
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 500;
      line-height: 1.6;
    }
    .generation {
      font-size: 10px;
      color: var(--text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    @media print {
      body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .receipt-container { margin: 0; padding: 0; box-shadow: none; border-radius: 0; max-width: 100%; border: none; }
      .top-band { display: none; }
      .receipt-content { padding: 20px; }
    }
  </style>
</head>
<body>
<div class="receipt-container">
  <div class="top-band"></div>
  
  <div class="receipt-content">
    <div class="header">
      <div class="logo"><img src="${window.location.origin}/pwa-192x192.png" alt="Logo" /></div>
      <div class="company-info">
        <div class="company-name">${businessName}</div>
        <div class="company-contact">
          ${businessAddress ? `<span>${businessAddress}</span>` : ''}
          ${businessPhone ? `<span>Tel: ${businessPhone}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="receipt-header">
      <div class="title">Liquidación de Honorarios</div>
      <div class="receipt-no">${receiptNumber}</div>
    </div>

    <div class="grid-2">
      <div>
        <div class="info-label">Entidad Pagadora</div>
        <div class="info-value">${businessName}</div>
        <div class="info-sub">Fecha de Registro: ${txDate}</div>
      </div>
      <div>
        <div class="info-label">A Favor De</div>
        <div class="info-value">${doc.name}</div>
        <div class="info-sub" style="margin-top:4px;">Liquidación Interna</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Concepto / Detalle</th>
          <th style="text-align: right">Importe Neto</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="service-title">Cierre de Honorarios — ${doc.name}</td>
          <td class="service-amount">${formatMoney(amount)}</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-section">
      <div class="summary-details">
        <div class="summary-line">
          <span>Método de Pago</span>
          <span>${doc.method || 'Transferencia'}</span>
        </div>
        <div class="summary-line">
          <span>Estado del Movimiento</span>
          <span class="status-badge">PAGADO</span>
        </div>
      </div>
      <div class="total-block">
        <div class="total-label">Total Entregado</div>
        <div class="total-amount" style="color: var(--accent);">${formatMoney(amount)}</div>
      </div>
    </div>

    <div style="margin-top: 60px; margin-bottom: 20px; display: flex; justify-content: flex-end;">
      <div style="text-align: center; width: 250px;">
        <div style="border-top: 1px solid var(--text-main); margin-bottom: 8px;"></div>
        <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em;">
          Firma y Aclaración<br>
          <span style="font-size: 9px; opacity: 0.7;">(Recibí Conforme)</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="disclaimer">
        Este documento es un comprobante de control interno.<br>
        No posee validez tributaria ante organismos fiscales.
      </div>
      <div class="generation">
        Generado el ${now.toLocaleDateString('es-AR')} ${now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  </div>
</div>
<script>
  window.onload = function() {
    setTimeout(() => { window.print(); }, 500);
  }
</script>
</body>
</html>`;
      const win = window.open('', '_blank');
      win.document.write(html);
      win.document.close();
   };

   const sendWhatsApp = (doc) => {
      const today = new Date().toLocaleDateString('es-AR');
      const text = `Hola ${doc.name}, te adjunto el resumen de tu liquidación de honorarios del día ${today}.\n\n*Monto Liquidado:* ${formatMoney(doc.pendingAmount)}\n*Método:* ${doc.method || 'Transferencia'}\n\nEl pago ya fue registrado en el sistema. ¡Saludos!`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
   };

   return (
      <div className="block animate-fade-in-quick text-[var(--text-primary)] print:bg-white">

         {/* TOAST SYSTEM */}
         {toastMsg && createPortal(
            <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border border-emerald-500/20 px-5 py-3.5 rounded-[1.25rem] shadow-[0_10px_40px_-10px_rgba(16,185,129,0.2)] z-[9999] flex items-center gap-3 animate-fade-in-quick print:hidden w-max max-w-[90vw]">
               <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={16} className="text-emerald-500" />
               </div>
               <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">{toastMsg.replace('✔', '').replace('¡', '').replace('!', '').trim()}</span>
            </div>,
            document.body
         )}

         {/* MODAL DE EGRESOS AVANZADO */}
         {isAddingExpense && createPortal(
            <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-quick">
               <div className="bg-[var(--bg-card)] rounded-[2.5rem] p-6 sm:p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar border border-[var(--glass-border)]">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2">
                        {editingTxId ? <Pencil size={20} className="text-amber-500" /> : <ArrowDownRight className="text-red-500" />}
                        {editingTxId ? 'Editar Movimiento' : 'Detalle de Egreso'}
                     </h3>
                     <button onClick={() => { setIsAddingExpense(false); setEditingTxId(null); }} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"><X size={24} /></button>
                  </div>
                  <form onSubmit={handleAddExpense} className="space-y-3 sm:space-y-4">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                           <label htmlFor="category" className="block text-[10px] font-black text-[var(--text-secondary)] mb-1.5 uppercase tracking-widest opacity-70">Categoría o Concepto *</label>
                           <input id="category" name="category" 
                              type="text" 
                              required 
                              list="category-suggestions"
                              value={newExpense.category} 
                              onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} 
                              className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/10 transition-all"
                              placeholder="Ej: Sueldos, Seña, etc."
                           />
                           <datalist id="category-suggestions">
                              <option value="Sueldos y Honorarios" />
                              <option value="Insumos Médicos" />
                              <option value="Mantenimiento e Infraestructura" />
                              <option value="Servicios (Luz/Internet)" />
                              <option value="Otros Gastos" />
                           </datalist>
                        </div>
                        <div>
                           <label htmlFor="amount" className="block text-[10px] font-black text-[var(--text-secondary)] mb-1.5 uppercase tracking-widest opacity-70">Monto ($) *</label>
                           <input id="amount" name="amount" type="number" required value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-black text-red-500 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/10 transition-all placeholder:text-[var(--text-secondary)]/30" placeholder="Ej: 45000" />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                           <span className="block text-[10px] font-black text-[var(--text-secondary)] mb-1.5 uppercase tracking-widest opacity-70">Fecha</span>
                           <CustomDatePicker 
                             value={newExpense.date} 
                             onChange={val => setNewExpense({ ...newExpense, date: val })} 
                             className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] transition-all" 
                           />
                        </div>
                        <div>
                           <label htmlFor="method" className="block text-[10px] font-black text-[var(--text-secondary)] mb-1.5 uppercase tracking-widest opacity-70">Método de Pago</label>
                           <select id="method" name="method" value={newExpense.method} onChange={e => setNewExpense({ ...newExpense, method: e.target.value })} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-red-400 transition-all">
                              <option value="Efectivo" className="bg-[var(--bg-card)]">Efectivo</option>
                              <option value="Tarjeta" className="bg-[var(--bg-card)]">Tarjeta (Débito/Crédito)</option>
                              <option value="Transferencia" className="bg-[var(--bg-card)]">Transferencia / Mercado Pago</option>
                           </select>
                        </div>
                     </div>

                     <div>
                        <label htmlFor="receipt" className="block text-[10px] font-black text-[var(--text-secondary)] mb-1.5 uppercase tracking-widest opacity-70">N° Comprobante / Factura</label>
                        <input id="receipt" name="receipt" type="text" value={newExpense.receipt} onChange={e => setNewExpense({ ...newExpense, receipt: e.target.value })} className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] outline-none focus:border-red-400 transition-all placeholder:text-[var(--text-secondary)]/30" placeholder="Opcional. Ej: FC-A-002-14002" />
                     </div>

                     <div className="flex items-center gap-3 bg-[var(--bg-main)] p-3.5 rounded-xl border border-[var(--border-color)] cursor-pointer" onClick={() => setNewExpense({ ...newExpense, isFixed: !newExpense.isFixed })}>
                        <input type="checkbox" id="isFixed" checked={newExpense.isFixed} onChange={e => setNewExpense({ ...newExpense, isFixed: e.target.checked })} onClick={e => e.stopPropagation()} className="w-5 h-5 text-red-500 rounded-md border-[var(--border-color)] focus:ring-red-500 cursor-pointer" />
                        <div>
                           <label htmlFor="isFixed" className="text-sm font-black text-[var(--text-primary)] cursor-pointer select-none block leading-none mb-1">Es un Gasto Fijo Recurrente</label>
                           <p className="text-[10px] text-[var(--text-secondary)] font-medium leading-none">Alquiler, Sueldos, Suscripciones mensuales, etc.</p>
                        </div>
                     </div>

                     <div>
                        <label htmlFor="notes" className="block text-[10px] font-black text-[var(--text-secondary)] mb-1.5 uppercase tracking-widest opacity-70">Detalles u Observaciones</label>
                        <textarea id="notes" name="notes" value={newExpense.notes} onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })} rows="2" className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm font-medium text-[var(--text-primary)] outline-none focus:border-red-400 transition-all resize-none placeholder:text-[var(--text-secondary)]/30" placeholder="Opcional. Motivo del gasto..."></textarea>
                     </div>

                     <div className="pt-2">
                        <button type="submit" className={`w-full ${editingTxId ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'} text-white font-black py-4 rounded-2xl transition-all shadow-lg`}>
                           {editingTxId ? 'Actualizar Transacción' : 'Confirmar y Registrar Egreso'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>,
            document.body
         )}

         {/* CABECERA (TOP BAR) */}
         <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 md:mb-8 px-4 pt-4 md:px-0 md:pt-0">
            <div>
               <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-[var(--accent-primary)]/10 rounded-xl">
                     <TrendingUp className="text-[var(--accent-primary)]" />
                  </div>
                  Dashboard de Negocio
               </h2>
               <p className="text-sm font-medium text-[var(--text-secondary)] mt-1 opacity-70">Control activo del flujo de caja, gastos operativos y análisis contable.</p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 print:hidden w-full xl:w-auto mt-4 xl:mt-0">
               <button onClick={() => setIsAddingExpense(true)} className="w-full sm:w-auto justify-center bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all">
                  <Plus size={16} /> Añadir Gasto
               </button>

               <div className="flex gap-3 w-full sm:w-auto">
                  <button onClick={() => handleExport('CSV')} className="flex-1 sm:flex-none justify-center bg-[var(--bg-card)] text-[var(--accent-primary)] border border-[var(--border-color)] text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-[var(--accent-light)] transition-all">
                     <Download size={16} /> CSV
                  </button>
                  <button onClick={() => handleExport('PDF')} className="flex-1 sm:flex-none justify-center bg-[var(--bg-card)] text-[var(--accent-primary)] border border-[var(--border-color)] text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-[var(--accent-light)] transition-all">
                     <FileText size={16} /> PDF
                  </button>
               </div>

               {/* DATE FILTER */}
               <div className="relative w-full sm:w-auto min-w-[170px]">
                  <button onClick={() => setIsDateMenuOpen(!isDateMenuOpen)} className="w-full sm:w-auto bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm text-xs font-black uppercase tracking-widest text-[var(--text-primary)] px-5 py-2.5 rounded-2xl flex items-center justify-between gap-3 hover:border-[var(--accent-primary)]/50 transition-all">
                     {dateRange} <ChevronDown size={14} className={`text-[var(--text-secondary)] transition-transform ${isDateMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDateMenuOpen && (
                     <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsDateMenuOpen(false)}></div>
                        <div className="absolute right-0 top-14 w-full bg-[var(--bg-card)] border border-[var(--glass-border)] shadow-2xl rounded-2xl p-2 z-20 animate-fade-in-quick backdrop-blur-xl">
                           {['Hoy', 'Esta Semana', 'Mes en curso', 'Año en curso', 'Personalizado'].map(r => (
                              <button
                                 key={r}
                                 onClick={() => { setDateRange(r); setIsDateMenuOpen(false); }}
                                 className={`block w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${dateRange === r ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-light)] hover:text-[var(--accent-primary)]'}`}
                              >
                                 {r}
                              </button>
                           ))}
                        </div>
                     </>
                  )}
               </div>

               {dateRange === 'Personalizado' && (
                  <div className="w-full sm:w-auto min-w-[220px] animate-fade-in-quick">
                     <CustomDateRangePicker 
                        dateFrom={customDateRange.dateFrom} 
                        dateTo={customDateRange.dateTo} 
                        onChange={setCustomDateRange} 
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm text-xs font-bold px-4 py-2.5 rounded-2xl h-full"
                     />
                  </div>
               )}
            </div>
         </div>

         {/* KPIS DE RENTABILIDAD - RESPONSIVO (CARRUSEL MÓVIL) */}
         <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-3 sm:gap-4 pb-6 px-4 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:mb-8 md:pb-0 print:grid print:grid-cols-3 print:gap-2">
            <div className="w-[75%] sm:w-[85%] shrink-0 snap-center md:w-auto bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-xl shadow-[var(--accent-primary)]/10 border border-white/10 relative overflow-hidden group text-white print:bg-white print:text-slate-800 print:border-slate-200 print:shadow-none">
               <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-bl-full -z-0 opacity-50 group-hover:scale-125 transition-transform duration-700 print:hidden"></div>
               <div className="relative z-10 flex items-start gap-3 sm:gap-4 print:gap-0">
                  <div className="bg-white/20 p-2 sm:p-3 rounded-xl sm:rounded-2xl backdrop-blur-md print:hidden"><ArrowUpRight size={20} className="sm:w-6 sm:h-6 text-white" /></div>
                  <div className="min-w-0 flex-1">
                     <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] print:text-[10px] print:text-slate-400 truncate">Ingresos Brutos</p>
                     <h3 className="text-2xl sm:text-3xl font-black mt-1 print:text-slate-800 print:text-lg print:tracking-tighter truncate leading-none">{formatMoney(stats.ingresos)}</h3>
                     {dateRange === 'Mes en curso' && stats.prevIngresos > 0 && (
                        <div className="mt-2 text-[11px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-full w-max backdrop-blur-sm">
                           {stats.ingresos >= stats.prevIngresos ? '↑' : '↓'} {Math.abs(((stats.ingresos / stats.prevIngresos) - 1) * 100).toFixed(1)}% vs Mes Anterior
                        </div>
                     )}
                  </div>
               </div>
            </div>

            <div className="w-[75%] sm:w-[85%] shrink-0 snap-center md:w-auto bg-gradient-to-br from-rose-500 to-rose-600 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-xl shadow-rose-500/10 border border-white/10 relative overflow-hidden group text-white print:bg-white print:text-slate-800 print:border-slate-200 print:shadow-none">
               <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-bl-full -z-0 opacity-50 group-hover:scale-125 transition-transform duration-700 print:hidden"></div>
               <div className="relative z-10 flex items-start gap-3 sm:gap-4 print:gap-0">
                  <div className="bg-white/20 p-2 sm:p-3 rounded-xl sm:rounded-2xl backdrop-blur-md print:hidden"><ArrowDownRight size={20} className="sm:w-6 sm:h-6 text-white" /></div>
                  <div className="min-w-0 flex-1">
                     <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] print:text-[10px] print:text-slate-400 truncate">Egresos Totales</p>
                     <h3 className="text-2xl sm:text-3xl font-black mt-1 print:text-slate-800 print:text-lg print:tracking-tighter truncate leading-none">{formatMoney(stats.egresos)}</h3>
                     {dateRange === 'Mes en curso' && stats.prevEgresos > 0 && (
                        <div className="mt-2 text-[11px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-full w-max backdrop-blur-sm">
                           {stats.egresos <= stats.prevEgresos ? '↓ (Bien)' : '↑ (Cuidado)'} {Math.abs(((stats.egresos / stats.prevEgresos) - 1) * 100).toFixed(1)}% vs Mes Anterior
                        </div>
                     )}
                  </div>
               </div>
            </div>

            <div className={`w-[75%] sm:w-[85%] shrink-0 snap-center md:w-auto bg-gradient-to-br ${stats.neta >= 0 ? 'from-emerald-500 to-emerald-600 shadow-emerald-500/10' : 'from-slate-700 to-slate-800 shadow-slate-900/10'} p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-xl border border-white/10 relative overflow-hidden group text-white print:bg-white print:text-slate-800 print:border-slate-200 print:shadow-none`}>
               <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-bl-full -z-0 opacity-50 group-hover:scale-125 transition-transform duration-700 print:hidden"></div>
               <div className="relative z-10 flex items-start gap-3 sm:gap-4 print:gap-0">
                  <div className="bg-white/20 p-2 sm:p-3 rounded-xl sm:rounded-2xl backdrop-blur-md print:hidden"><Activity size={20} className="sm:w-6 sm:h-6 text-white" /></div>
                  <div className="min-w-0 flex-1">
                     <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] print:text-[10px] print:text-slate-400 truncate">Rentabilidad Neta</p>
                     <h3 className="text-2xl sm:text-3xl font-black mt-1 print:text-slate-800 print:text-lg print:tracking-tighter truncate leading-none">{formatMoney(stats.neta)}</h3>
                     {dateRange === 'Mes en curso' && stats.prevNeta > 0 && (
                        <div className="mt-2 text-[11px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-full w-max backdrop-blur-sm">
                           {stats.neta >= stats.prevNeta ? '↑' : '↓'} {Math.abs(((stats.neta / stats.prevNeta) - 1) * 100).toFixed(1)}% vs Mes Anterior
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>

         {/* SMART BI ADVISOR CARD */}
         {dateRange === 'Mes en curso' && (
            <div className="mx-4 md:mx-0 mb-6 md:mb-8 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
               <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                  <Lightbulb size={24} />
               </div>
               <div className="flex-1">
                  <h3 className="text-lg font-black text-indigo-900 dark:text-indigo-300 mb-1">Asesor Financiero Inteligente</h3>
                  <div className="text-sm text-indigo-800/80 dark:text-indigo-200/70 space-y-2">
                     <p>
                        Este mes tienes <strong>{formatMoney(stats.fixedExpenses)}</strong> registrados en Costos Fijos y <strong>{formatMoney(stats.variableExpenses)}</strong> en Variables.
                     </p>
                     {(() => {
                        const estimatedFixedCost = Math.max(stats.fixedExpenses, stats.prevFixedExpenses);
                        if (estimatedFixedCost === 0) return <p>Marca tus próximos pagos recurrentes como "Gasto Fijo" para activar el análisis de punto de equilibrio.</p>;
                        
                        const margin = stats.ingresos > 0 ? (stats.neta / stats.ingresos) * 100 : 0;
                        const faltante = estimatedFixedCost - stats.ingresos;

                        return (
                           <>
                              {faltante > 0 ? (
                                 <p className="text-rose-600 dark:text-rose-400 font-bold">
                                    Tu Punto de Equilibrio mensual estimado es <strong>{formatMoney(estimatedFixedCost)}</strong>. Te faltan <strong>{formatMoney(faltante)}</strong> de ingresos para no tener pérdidas este mes.
                                 </p>
                              ) : (
                                 <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    ✅ ¡Superaste tu Punto de Equilibrio ({formatMoney(estimatedFixedCost)})! Ahora tienes un margen neto de ganancia del {margin.toFixed(1)}%.
                                 </p>
                              )}
                              
                              {margin < 30 && stats.ingresos > 0 && faltante <= 0 && (
                                 <p className="text-amber-600 dark:text-amber-400 text-xs mt-2">
                                    ⚠️ Sugerencia: Aunque no pierdes dinero, tu margen neto ({margin.toFixed(1)}%) está por debajo del 30% ideal. Considera un ajuste del 10% al 15% en el valor de tus honorarios.
                                 </p>
                              )}
                           </>
                        );
                     })()}
                  </div>
               </div>
            </div>
         )}

         {/* SECCION DE GRAFICOS (RECHARTS) */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 px-4 md:px-0 print:block print:space-y-6">
            
            {/* Gráfico de Evolución (Ocupa 2/3) */}
            <div className="card-premium p-5 sm:p-8 border border-[var(--glass-border)] shadow-sm flex flex-col print:border-slate-200 print:shadow-none animate-fade-in-quick lg:col-span-2">
               <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2"><TrendingUp size={18} className="text-[var(--accent-primary)]" /> Evolución Financiera</h4>
               </div>
               <div className="w-full">
                  <ResponsiveContainer width="100%" height={300}>
                     <AreaChart data={stats?.evolutionData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                           <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                           </linearGradient>
                           <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{fontSize: 10, fill: 'var(--text-secondary)'}} tickLine={false} axisLine={false} />
                        <YAxis tick={{fontSize: 10, fill: 'var(--text-secondary)'}} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                        <RechartsTooltip 
                           contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', fontSize: '12px', color: 'var(--text-primary)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                           itemStyle={{ fontWeight: 'bold' }}
                        />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.3} />
                        <Area type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" activeDot={{ r: 6 }} />
                        <Area type="monotone" dataKey="Egresos" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorEgresos)" activeDot={{ r: 6 }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Gráfico Donut de Gastos (Ocupa 1/3) */}
            <div className="card-premium p-5 sm:p-8 border border-[var(--glass-border)] shadow-sm flex flex-col print:border-slate-200 print:shadow-none animate-fade-in-quick lg:col-span-1">
               <h4 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest mb-2 flex items-center gap-2"><PieChart size={18} className="text-rose-500" /> Gastos por Categoría</h4>
               <div className="w-full flex items-center justify-center relative">
                  {!stats?.donutData || stats.donutData.length === 0 ? (
                     <p className="text-sm font-bold text-[var(--text-secondary)] opacity-50 py-20">No hay egresos registrados.</p>
                  ) : (
                     <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                           <Pie
                              data={stats.donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius="60%"
                              outerRadius="80%"
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                           >
                              {stats.donutData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                           </Pie>
                           <RechartsTooltip 
                              formatter={(value) => formatMoney(value)}
                              contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', fontSize: '12px', color: 'var(--text-primary)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                           />
                           <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        </RechartsPieChart>
                     </ResponsiveContainer>
                  )}
               </div>
            </div>
         </div>

         {/* SECCIÓN TABLAS */}
         <div className="flex flex-col min-h-[600px] print:block w-full">
            <div className="flex overflow-x-auto hide-scrollbar border-b border-[var(--border-color)]/50 px-2 sm:px-0 pt-2 sm:pt-4 gap-2 sm:gap-4 print:hidden mb-4 sm:mb-6">
               <button onClick={() => setActiveTab('diario')} className={`shrink-0 px-4 py-3 sm:px-6 sm:py-4 rounded-t-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'diario' ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-color)] border-b-transparent relative top-[1px]' : 'text-[var(--text-secondary)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-card)]/40'}`}>
                  <List size={16} /> Libro Diario
               </button>
               <button onClick={() => setActiveTab('profesionales')} className={`shrink-0 px-4 py-3 sm:px-6 sm:py-4 rounded-t-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'profesionales' ? 'bg-[var(--bg-card)] text-[var(--accent-primary)] shadow-sm border border-[var(--border-color)] border-b-transparent relative top-[1px]' : 'text-[var(--text-secondary)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-card)]/40'}`}>
                  <Users size={16} /> <span className="hidden sm:inline">Honorarios Personal</span><span className="sm:hidden">Honorarios</span>
               </button>
            </div>

            <div className="flex-1 w-full max-w-[1200px] mx-auto px-0 md:px-4">

               {activeTab === 'diario' && (
                  <div className="pb-8 animate-fade-in-quick">

                  {/* LISTADO DIARIO UNIFICADO (ESTILO MP) */}
                  <div className="bg-[var(--bg-card)] sm:rounded-[2rem] border-y sm:border border-[var(--glass-border)] sm:shadow-sm overflow-hidden w-full max-w-5xl mx-auto">
                     {(stats.currentPeriodTxs || [])
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((tx, idx, arr) => (
                        <div key={tx.id} className={`flex flex-col relative transition-colors ${expandedTxId === tx.id ? 'bg-[var(--bg-main)]/50' : 'hover:bg-[var(--bg-main)]/30'} ${idx !== arr.length - 1 ? 'border-b border-[var(--border-color)]/40' : ''}`}>
                           
                           <div 
                              className="p-4 sm:p-5 flex items-center gap-3 cursor-pointer select-none"
                              onClick={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}
                           >
                              {/* ICON */}
                              <div className="w-[46px] h-[46px] sm:w-[50px] sm:h-[50px] rounded-full border border-[var(--border-color)]/60 bg-[var(--bg-card)] flex items-center justify-center shrink-0 text-[var(--text-secondary)] shadow-sm">
                                 {tx.method === 'Efectivo' ? <Wallet size={20} strokeWidth={1.5} /> : tx.method === 'Tarjeta' ? <CreditCard size={20} strokeWidth={1.5} /> : <ArrowLeftRight size={20} strokeWidth={1.5} />}
                              </div>
                              
                              {/* MIDDLE TEXT */}
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-start gap-2">
                                    <h4 className="text-[14px] sm:text-[15px] font-semibold text-[var(--text-primary)] line-clamp-2 leading-tight">{tx.concept}</h4>
                                    {tx.type === 'Egreso' && (
                                       <span 
                                          className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md text-white shrink-0 hidden sm:block"
                                          style={{ backgroundColor: getExpenseCategory(tx.concept).color }}
                                       >
                                          {getExpenseCategory(tx.concept).label}
                                       </span>
                                    )}
                                 </div>
                                 <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[13px] text-[var(--text-secondary)] truncate">{tx.type === 'Ingreso' ? 'Ingreso de dinero' : 'Egreso de dinero'}</span>
                                 </div>
                                 <div className="flex items-center gap-1.5 mt-0.5">
                                    {tx.type === 'Ingreso' ? <ArrowDownRight size={10} className="text-emerald-500" /> : <ArrowUpRight size={10} className="text-[var(--text-secondary)]" />}
                                    <span className="text-[11px] font-medium text-[var(--text-secondary)] truncate opacity-80">{tx.method}</span>
                                    {tx.afip_cae && (
                                       <>
                                          <span className="w-1 h-1 rounded-full bg-[var(--text-secondary)] opacity-30"></span>
                                          <span className="text-[10px] font-bold text-indigo-500">AFIP</span>
                                       </>
                                    )}
                                 </div>
                              </div>

                              {/* RIGHT SIDE */}
                              <div className="text-right shrink-0 flex items-center gap-2">
                                 <div className="flex flex-col items-end">
                                    <span className={`text-[15px] sm:text-base font-semibold tracking-tight ${tx.type === 'Ingreso' ? 'text-emerald-600 dark:text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                                       {tx.type === 'Ingreso' ? '+' : '-'} {formatMoney(tx.amount).replace('$', '$ ')}
                                    </span>
                                    <span className="text-[12px] font-medium text-[var(--text-secondary)] mt-0.5 opacity-80">{new Date(tx.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                                 </div>
                                 <ChevronRight size={18} strokeWidth={2} className={`text-[var(--accent-primary)] transition-transform duration-300 opacity-60 ${expandedTxId === tx.id ? 'rotate-90' : ''}`} />
                              </div>
                           </div>

                           {/* EXPANDED ACTIONS */}
                           {expandedTxId === tx.id && (
                              <div className="px-4 pb-4 flex items-center justify-end gap-2 animate-fade-in-quick">
                                 <button onClick={(e) => { e.stopPropagation(); setReceiptTx(tx); }} className="px-4 py-2.5 flex justify-center items-center gap-2 text-xs font-bold text-[var(--text-primary)] hover:text-[var(--accent-primary)] bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]/50 transition-all shadow-sm"><Receipt size={14} /> Recibo</button>
                                 <button onClick={(e) => {
                                    e.stopPropagation();
                                    const parts = tx.concept.split(' (#');
                                    setNewExpense({
                                       type: tx.type,
                                       category: parts[0],
                                       amount: tx.amount,
                                       method: tx.method,
                                       date: tx.date.split(' ')[0],
                                       receipt: parts[1] ? parts[1].replace(')', '') : '',
                                       notes: tx.notes || ''
                                    });
                                    setEditingTxId(tx.id);
                                    setIsAddingExpense(true);
                                 }} className="px-4 py-2.5 flex justify-center items-center gap-2 text-xs font-bold text-[var(--text-primary)] hover:text-amber-500 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]/50 transition-all shadow-sm"><Pencil size={14} /> Editar</button>
                                 <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, txId: tx.id }); }} className="px-4 py-2.5 flex justify-center items-center gap-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]/50 hover:border-transparent transition-all shadow-sm"><Trash2 size={14} /></button>
                              </div>
                           )}
                        </div>
                     ))}
                  </div>
               </div>
            )}

               {activeTab === 'profesionales' && (
                  <div className="space-y-12 animate-fade-in-quick bg-[var(--bg-card)] p-4 sm:p-8 sm:rounded-[2rem] sm:border border-[var(--glass-border)]">
                     <div>
                        <h4 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-6 flex items-center gap-2 opacity-70">
                           <Activity size={14} className="text-[var(--accent-primary)]" /> Rendimiento Clínico (Médicos)
                        </h4>
                        <div className="overflow-x-auto pb-4">
                        <table className="w-full min-w-[700px] text-left border-collapse hidden md:table">
                           <thead>
                              <tr className="border-b border-[var(--border-color)]/50">
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 w-1/3">Profesional</th>
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-center">T. Atendidos</th>
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-center hidden sm:table-cell">Ocupación</th>
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-right">Fact. Bruta</th>
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-right">Hon. Pend.</th>
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-center w-24">Acción</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-[var(--border-color)]/30">
                              {doctors.map(doc => {
                                 const turnos = appointments.filter(a => a.doctorId === doc.id && (a.attendance === 'confirmado' || a.attendance === 'finalizado')).length;
                                 const facturacion = transactions
                                    .filter(t => t.doctor_id === doc.id && t.type === 'Ingreso')
                                    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
                                 const pagado = transactions
                                    .filter(t => t.doctor_id === doc.id && t.type === 'Egreso')
                                    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

                                 const isPorcentaje = doc.remuneration_type === 'porcentaje';
                                 const remuValue = Number(doc.remuneration) || 0;
                                 
                                 const honorariosTotales = isPorcentaje 
                                    ? (facturacion * remuValue) / 100 
                                    : (turnos * remuValue);
                                    
                                 const deuda = Math.max(0, honorariosTotales - pagado);
                                 const occ = turnos > 0 ? `${Math.min(100, Math.round((turnos / 20) * 100))}%` : "0%";

                                 return (
                                    <tr key={doc.id} className="hover:bg-[var(--bg-main)]/50 transition-colors group">
                                       <td className="py-5 px-2">
                                          <div className="flex items-center gap-4">
                                             <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-[var(--accent-primary)] text-sm font-black bg-[var(--accent-light)] border border-[var(--accent-primary)]/20">{doc.name.charAt(0)}</div>
                                             <div>
                                                <div className="text-sm font-black text-[var(--text-primary)]">{doc.name}</div>
                                                <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60">
                                                   {doc.specialty} 
                                                   <span className="text-[var(--accent-primary)] ml-1 font-mono">
                                                      [{isPorcentaje ? `${remuValue}%` : `$${remuValue}`}]
                                                   </span>
                                                </div>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="py-5 px-2 text-center text-sm font-black text-[var(--text-primary)]">{turnos}</td>
                                       <td className="py-5 px-2 text-center hidden sm:table-cell text-xs font-bold text-[var(--text-secondary)] font-mono">{occ}</td>
                                       <td className="py-5 px-2 text-right text-sm font-black text-[var(--text-secondary)] tracking-tighter">{formatMoney(facturacion)}</td>
                                       <td className={`py-5 px-2 text-right text-sm font-black ${deuda > 0 ? 'text-red-500' : 'text-emerald-500'} tracking-tighter`}>
                                          {formatMoney(deuda)}
                                       </td>
                                       <td className="py-5 px-2 text-center text-right pr-4">
                                          {deuda > 0 ? (
                                             <button onClick={() => setSettlementDoctor({ ...doc, pendingAmount: deuda, originalPending: deuda, autoAdjust: false })} className="bg-[var(--accent-primary)] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[var(--accent-primary)]/20 hover:scale-105 active:scale-95">Liquidar</button>
                                          ) : (
                                             <div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Saldado
                                             </div>
                                          )}
                                       </td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>

                        {/* MÓVIL PROFESIONALES */}
                        <div className="md:hidden space-y-4 mt-4">
                           {doctors.map(doc => {
                              const turnos = appointments.filter(a => a.doctorId === doc.id && (a.attendance === 'confirmado' || a.attendance === 'finalizado')).length;
                              const facturacion = transactions
                                 .filter(t => t.doctor_id === doc.id && t.type === 'Ingreso')
                                 .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
                              const pagado = transactions
                                 .filter(t => t.doctor_id === doc.id && t.type === 'Egreso')
                                 .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

                              const porc = doc.remuneration_type === 'porcentaje' ? (Number(doc.remuneration) || 0) : 0;
                              const honorariosTotales = (facturacion * porc) / 100;
                              const deuda = doc.remuneration_type === 'porcentaje' ? Math.max(0, honorariosTotales - pagado) : 0;
                              
                              return (
                                 <div key={doc.id} className="bg-[var(--bg-card)] rounded-[1.5rem] p-5 shadow-sm border border-[var(--glass-border)] flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                       <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center text-[var(--accent-primary)] text-xl font-black bg-[var(--accent-light)] shrink-0 border border-[var(--accent-primary)]/20">{doc.name.charAt(0)}</div>
                                       <div>
                                          <div className="text-base font-black text-[var(--text-primary)] leading-tight">{doc.name}</div>
                                          <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mt-0.5 opacity-80">{doc.specialty} <span className="text-[var(--accent-primary)] ml-1 font-mono">[{porc}%]</span></div>
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 bg-[var(--bg-main)] rounded-2xl p-4 border border-[var(--border-color)]/30">
                                       <div className="flex flex-col">
                                          <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60">Turnos</span>
                                          <span className="text-lg font-black text-[var(--text-primary)]">{turnos}</span>
                                       </div>
                                       <div className="flex flex-col">
                                          <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60">Facturado</span>
                                          <span className="text-lg font-black text-[var(--text-primary)] tracking-tighter">{formatMoney(facturacion)}</span>
                                       </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                       <div className="flex flex-col">
                                          <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 mb-0.5">Honorarios</span>
                                          <span className={`text-xl font-black ${deuda > 0 ? 'text-rose-500' : 'text-emerald-500'} tracking-tighter leading-none`}>{doc.remuneration_type === 'porcentaje' ? formatMoney(deuda) : '-'}</span>
                                       </div>
                                       {doc.remuneration_type === 'porcentaje' && deuda > 0 ? (
                                          <button onClick={() => setSettlementDoctor({ ...doc, pendingAmount: deuda, originalPending: deuda, autoAdjust: false })} className="bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] text-white px-5 py-3 rounded-[1rem] text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[var(--accent-primary)]/20 active:scale-95">Liquidar</button>
                                       ) : doc.remuneration_type === 'porcentaje' ? (
                                          <div className="flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 rounded-xl border border-emerald-100">
                                             <CheckCircle2 size={14} /> Saldado
                                          </div>
                                       ) : null}
                                    </div>
                                 </div>
                              )
                           })}
                        </div>
                        </div>
                     </div>

                     <div>
                        <h4 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-6 flex items-center gap-2 opacity-70">
                           <Briefcase size={14} className="text-[var(--accent-primary)]" /> Personal Administrativo
                        </h4>
                        <div className="overflow-x-auto pb-4">
                        <table className="w-full min-w-[500px] text-left border-collapse hidden md:table">
                           <thead>
                              <tr className="border-b border-[var(--border-color)]/50">
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 w-1/3">Empleado/a</th>
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-center">Función / Rol</th>
                                 <th className="py-4 px-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60 text-right">Costo Operativo</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-[var(--border-color)]/30">
                              {adminStaff.map(emp => (
                                 <tr key={emp.id} className="hover:bg-[var(--bg-main)]/50 transition-colors">
                                    <td className="py-5 px-2 flex items-center gap-4">
                                       <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-[var(--text-secondary)] text-sm font-black bg-[var(--bg-main)] border border-[var(--border-color)]">{emp.name.charAt(0)}</div>
                                       <div className="text-sm font-black text-[var(--text-primary)]">{emp.name}</div>
                                    </td>
                                    <td className="py-5 px-2 text-center text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest italic opacity-70">{emp.role}</td>
                                    <td className="py-5 px-2 text-right text-sm font-black text-[var(--text-primary)]">{emp.remunerationType === 'fijo' ? formatMoney(emp.remuneration) : 'Variable (%)'}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>

                        {/* MÓVIL ADMIN */}
                        <div className="md:hidden space-y-4 mt-4">
                           {adminStaff.map(emp => (
                              <div key={emp.id} className="bg-[var(--bg-card)] rounded-[1.5rem] p-5 shadow-sm border border-[var(--glass-border)] flex flex-col gap-4">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-[1rem] flex items-center justify-center text-[var(--text-secondary)] text-xl font-black bg-[var(--bg-main)] border border-[var(--border-color)] shrink-0 shadow-sm">{emp.name.charAt(0)}</div>
                                    <div className="flex flex-col">
                                       <span className="text-base font-black text-[var(--text-primary)] leading-tight">{emp.name}</span>
                                       <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mt-0.5 opacity-80">{emp.role}</span>
                                    </div>
                                 </div>
                                 <div className="flex justify-between items-center bg-[var(--bg-main)] p-4 rounded-2xl border border-[var(--border-color)]/30">
                                    <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-60">Costo Operativo</span>
                                    <span className="text-base font-black text-[var(--text-primary)]">{emp.remunerationType === 'fijo' ? formatMoney(emp.remuneration) : 'Variable (%)'}</span>
                                 </div>
                              </div>
                           ))}
                        </div>
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* MODAL DE LIQUIDACIO */}
         {settlementDoctor && (
            <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-quick">
               <div className="bg-[var(--bg-card)] rounded-[3rem] w-full max-w-md shadow-2xl relative overflow-hidden border border-[var(--glass-border)] p-10">
                  <div className="w-16 h-16 bg-[var(--accent-light)] rounded-[2rem] flex items-center justify-center mb-8 text-[var(--accent-primary)] shadow-inner"><Wallet size={32} /></div>
                  <h3 className="text-2xl font-black text-[var(--text-primary)] mb-2 tracking-tight">Liquidar Honorarios</h3>
                  <p className="text-sm font-medium text-[var(--text-secondary)] mb-8 leading-relaxed">Estás por registrar el pago de honorarios profesionales para <strong className="text-[var(--text-primary)]">{settlementDoctor.name}</strong>.</p>
                  
                  {settlementDoctor.success ? (
                     <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in-up">
                        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                           <CheckCircle2 size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-[var(--text-primary)] mb-2">Liquidación Exitosa</h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-8">El pago por <strong className="text-[var(--text-primary)]">{formatMoney(settlementDoctor.pendingAmount)}</strong> ha sido registrado.</p>
                        
                        <div className="flex flex-col gap-3 w-full">
                           <button onClick={() => generateReceipt(settlementDoctor)} className="w-full bg-[var(--bg-main)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all"><Printer size={16} /> Imprimir / Guardar PDF</button>
                           
                           <button onClick={() => sendWhatsApp(settlementDoctor)} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg shadow-[#25D366]/30"><Phone size={16} /> Avisar por WhatsApp</button>
                           
                           <button onClick={() => setSettlementDoctor(null)} className="mt-4 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest hover:text-[var(--text-primary)] transition-colors">Cerrar</button>
                        </div>
                     </div>
                  ) : (
                     <>
                        <div className="bg-[var(--bg-main)] rounded-2xl p-6 border border-[var(--border-color)] mb-6 shadow-inner">
                           <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest opacity-70">Importe a Liquidar ($)</label>
                              <input id="pendingAmount" name="pendingAmount" 
                                 type="number" 
                                 value={settlementDoctor.pendingAmount} 
                                 onChange={e => setSettlementDoctor({...settlementDoctor, pendingAmount: e.target.value})}
                                 className="text-3xl font-black text-red-500 font-mono tracking-tighter bg-transparent outline-none w-full border-b border-red-500/20 focus:border-red-500 transition-all"
                              />
                           </div>
                        </div>

                        <div className="mb-8">
                           <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-3 uppercase tracking-widest opacity-70">Método de Pago Empleado</label>
                           <div className="flex gap-2 p-1.5 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-color)]/30">
                              {['Efectivo', 'Transferencia'].map(m => (
                                 <button 
                                    key={m}
                                    type="button"
                                    onClick={() => setSettlementDoctor({...settlementDoctor, method: m})}
                                    className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                       (settlementDoctor.method || 'Transferencia') === m 
                                          ? 'bg-[var(--accent-primary)] text-white shadow-lg' 
                                          : 'text-[var(--text-secondary)] opacity-60 hover:opacity-100'
                                    }`}
                                 >
                                    {m}
                                 </button>
                              ))}
                           </div>
                        </div>

                        {Math.abs(Number(settlementDoctor.originalPending) - Number(settlementDoctor.pendingAmount)) > 0 && (
                           <div className="mb-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center gap-4 animate-fade-in-quick">
                              <div className="flex-1">
                                 <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Diferencia detectada: {formatMoney(Math.abs(Number(settlementDoctor.originalPending) - Number(settlementDoctor.pendingAmount)))}</p>
                                 <p className="text-[9px] font-bold text-amber-600/70 leading-tight">¿Desea dar por saldado el resto por redondeo?</p>
                              </div>
                              <button 
                                 type="button"
                                 onClick={() => setSettlementDoctor({...settlementDoctor, autoAdjust: !settlementDoctor.autoAdjust})}
                                 className={`w-12 h-6 rounded-full relative transition-all ${settlementDoctor.autoAdjust ? 'bg-amber-500' : 'bg-slate-300'}`}
                              >
                                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settlementDoctor.autoAdjust ? 'left-7' : 'left-1'}`}></div>
                              </button>
                           </div>
                        )}

                        <div className="flex gap-4">
                           <button onClick={() => setSettlementDoctor(null)} className="flex-1 py-4 text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest hover:text-[var(--text-primary)] transition-colors">Abortar</button>
                           <button onClick={async () => {
                              // 1. Pago Principal
                              await store.createTransaction({
                                 date: nowForAPI(),
                                 type: 'Egreso',
                                 concept: `Cierre de Honorarios — ${settlementDoctor.name}`,
                                 method: settlementDoctor.method || 'Transferencia',
                                 amount: Number(settlementDoctor.pendingAmount),
                                 category: 'Sueldos',
                                 doctor_id: settlementDoctor.id
                              });

                              // 2. Ajuste Automático si se marcó
                              if (settlementDoctor.autoAdjust) {
                                 const diff = Number(settlementDoctor.originalPending) - Number(settlementDoctor.pendingAmount);
                                 await store.createTransaction({
                                    date: nowForAPI(),
                                    type: 'Egreso',
                                    concept: `Ajuste Honorarios (Redondeo) — ${settlementDoctor.name}`,
                                    method: settlementDoctor.method || 'Transferencia',
                                    amount: diff,
                                    category: 'Sueldos',
                                    doctor_id: settlementDoctor.id
                                 });
                              }

                              await store.fetchTransactions();
                              setSettlementDoctor({...settlementDoctor, success: true});
                           }} className="flex-2 px-8 py-4 bg-[var(--accent-primary)] text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-[var(--accent-primary)]/20 active:scale-95 transition-all">Confirmar Pago</button>
                        </div>
                     </>
                  )}
               </div>
            </div>
         )}

         {/* DIALOGO DE CONFIRMACION PROFESIONAL */}
         <ConfirmDialog
            isOpen={deleteConfirm.isOpen}
            title="¿Eliminar registro contable?"
            description="Esta acción eliminará el movimiento permanentemente de los registros de finanzas y no podrá deshacerse."
            confirmText="Sí, eliminar"
            cancelText="Cancelar"
            onConfirm={async () => {
               await store.deleteTransaction(deleteConfirm.txId);
               setDeleteConfirm({ isOpen: false, txId: null });
            }}
            onCancel={() => setDeleteConfirm({ isOpen: false, txId: null })}
         />
         {receiptTx && (
            <TransactionReceiptModal
               transaction={receiptTx}
               onClose={() => setReceiptTx(null)}
            />
         )}
      </div>
   );
}
