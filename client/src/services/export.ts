import * as XLSX from 'xlsx';
import { shiftService } from './shifts';
import { employeeService } from './employees';

export const exportAllWeeksToExcel = async () => {
  try {
    // Obtener TODOS los turnos
    const allShifts = await shiftService.getAll();
    
    if (!allShifts || allShifts.length === 0) {
      alert('No hay turnos para exportar.');
      return;
    }
    
    // Obtener empleados para tener los nombres
    const employees = await employeeService.getAll();
    
    // Crear mapa de empleados por ID
    const employeeMap: Record<string, any> = {};
    employees.forEach((emp: any) => {
      employeeMap[emp.id] = emp;
    });
    
    // Procesar y formatear datos para Excel
    const excelData = allShifts.map((shift: any) => {
      const shiftDate = new Date(shift.date);
      const weekNumber = getWeekNumber(shiftDate);
      const employee = employeeMap[shift.employeeId];
      
      return {
        'Semana': weekNumber,
        'Año': shiftDate.getFullYear(),
        'Fecha': formatDate(shiftDate),
        'Día': getDayName(shiftDate),
        'Empleado': employee?.name || 'Desconocido',
        'Puesto': employee?.position || '-',
        'Hora Inicio': shift.startTime,
        'Hora Fin': shift.endTime,
        'Tipo Turno': formatShiftType(shift.type),
        'Horas': calculateHours(shift.startTime, shift.endTime),
      };
    });
    
    // Ordenar por fecha
    excelData.sort((a: any, b: any) => {
      const dateA = new Date(a.Fecha.split('/').reverse().join('-'));
      const dateB = new Date(b.Fecha.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });
    
    // Crear workbook y worksheet principal
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 8 },  // Semana
      { wch: 6 },  // Año
      { wch: 12 }, // Fecha
      { wch: 12 }, // Día
      { wch: 20 }, // Empleado
      { wch: 15 }, // Puesto
      { wch: 12 }, // Hora Inicio
      { wch: 12 }, // Hora Fin
      { wch: 15 }, // Tipo Turno
      { wch: 8 },  // Horas
    ];
    
    // Añadir worksheet principal
    XLSX.utils.book_append_sheet(wb, ws, 'Todos los Horarios');
    
    // Crear hoja de resumen por empleado
    const summaryData = createEmployeeSummary(allShifts, employeeMap);
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [
      { wch: 20 }, // Empleado
      { wch: 15 }, // Puesto
      { wch: 12 }, // Total Turnos
      { wch: 12 }, // Total Horas
      { wch: 12 }, // Turnos Mañana
      { wch: 12 }, // Turnos Tarde
      { wch: 12 }, // Turnos Noche
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen por Empleado');
    
    // Crear hoja de resumen por semana
    const weeklySummary = createWeeklySummary(allShifts);
    const wsWeekly = XLSX.utils.json_to_sheet(weeklySummary);
    wsWeekly['!cols'] = [
      { wch: 8 },  // Semana
      { wch: 6 },  // Año
      { wch: 12 }, // Total Turnos
      { wch: 12 }, // Total Horas
      { wch: 15 }, // Empleados Únicos
    ];
    XLSX.utils.book_append_sheet(wb, wsWeekly, 'Resumen por Semana');
    
    // Generar nombre de archivo con fecha
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const fileName = `horarios-completos-${dateStr}.xlsx`;
    
    // Descargar archivo
    XLSX.writeFile(wb, fileName);
    
    alert(`✓ Exportados ${allShifts.length} turnos a ${fileName}`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('Error al exportar. Verifica que tengas turnos guardados.');
  }
};

// Funciones auxiliares
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getDayName = (date: Date): string => {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[date.getDay()];
};

const formatShiftType = (type: string): string => {
  const types: Record<string, string> = {
    'MORNING': 'Mañana',
    'AFTERNOON': 'Tarde',
    'NIGHT': 'Noche',
    'OFF': 'Libre'
  };
  return types[type] || type;
};

const calculateHours = (start: string, end: string): number => {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  let hours = endH - startH;
  let minutes = endM - startM;
  
  if (minutes < 0) {
    hours -= 1;
    minutes += 60;
  }
  
  if (hours < 0) hours += 24;
  
  return parseFloat((hours + minutes / 60).toFixed(2));
};

const createEmployeeSummary = (shifts: any[], employeeMap: Record<string, any>) => {
  const summary: Record<string, any> = {};
  
  shifts.forEach((shift: any) => {
    const employee = employeeMap[shift.employeeId];
    const employeeName = employee?.name || 'Desconocido';
    
    if (!summary[employeeName]) {
      summary[employeeName] = {
        'Empleado': employeeName,
        'Puesto': employee?.position || '-',
        'Total Turnos': 0,
        'Total Horas': 0,
        'Turnos Mañana': 0,
        'Turnos Tarde': 0,
        'Turnos Noche': 0,
      };
    }
    
    summary[employeeName]['Total Turnos']++;
    summary[employeeName]['Total Horas'] = parseFloat(
      (summary[employeeName]['Total Horas'] + calculateHours(shift.startTime, shift.endTime)).toFixed(2)
    );
    
    if (shift.type === 'MORNING') summary[employeeName]['Turnos Mañana']++;
    if (shift.type === 'AFTERNOON') summary[employeeName]['Turnos Tarde']++;
    if (shift.type === 'NIGHT') summary[employeeName]['Turnos Noche']++;
  });
  
  return Object.values(summary);
};

const createWeeklySummary = (shifts: any[]) => {
  const summary: Record<string, any> = {};
  
  shifts.forEach((shift: any) => {
    const shiftDate = new Date(shift.date);
    const weekNumber = getWeekNumber(shiftDate);
    const year = shiftDate.getFullYear();
    const key = `${year}-W${weekNumber}`;
    
    if (!summary[key]) {
      summary[key] = {
        'Semana': weekNumber,
        'Año': year,
        'Total Turnos': 0,
        'Total Horas': 0,
        'Empleados Únicos': new Set(),
      };
    }
    
    summary[key]['Total Turnos']++;
    summary[key]['Total Horas'] = parseFloat(
      (summary[key]['Total Horas'] + calculateHours(shift.startTime, shift.endTime)).toFixed(2)
    );
    summary[key]['Empleados Únicos'].add(shift.employeeId);
  });
  
  return Object.values(summary).map((item: any) => ({
    'Semana': item.Semana,
    'Año': item.Año,
    'Total Turnos': item['Total Turnos'],
    'Total Horas': item['Total Horas'],
    'Empleados Únicos': item['Empleados Únicos'].size,
  }));
};
