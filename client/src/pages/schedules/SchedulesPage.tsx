import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Settings, Camera } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useShiftStore } from '../../store/shiftStore';
import { useEmployeeStore } from '../../store/employeeStore';
import { useAuthStore } from '../../store/authStore';
import WeeklyView from '../../components/schedules/WeeklyView';
import HourlyView from '../../components/schedules/HourlyView';
import HourSlotsConfigModal from '../../components/schedules/HourSlotsConfigModal';
import EmployeesTab from '../../components/schedules/EmployeesTab';
import AddShiftModal from '../../components/schedules/AddShiftModal';
import { Shift, CreateShiftRequest, UpdateShiftRequest } from '../../services/shifts';
import { HourlySlot } from '../../constants/hourlySlots';

export default function SchedulesPage() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'employees'>('schedule');
  const [viewMode, setViewMode] = useState<'employee' | 'hourly'>('employee');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSlotsConfigModalOpen, setIsSlotsConfigModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const { weeklySchedule, currentWeek, currentYear, fetchWeekly, addShift, updateShift, deleteShift, setWeek } =
    useShiftStore();
  const { fetchEmployees } = useEmployeeStore();
  const { restaurant } = useAuthStore();
  const [isExporting, setIsExporting] = useState(false);
  const scheduleContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEmployees();
    fetchWeekly(currentWeek, currentYear);
  }, []);

  const handlePrevWeek = () => {
    let newWeek = currentWeek - 1;
    let newYear = currentYear;

    if (newWeek < 1) {
      newYear = currentYear - 1;
      newWeek = getWeeksInYear(newYear);
    }

    setWeek(newWeek, newYear);
    fetchWeekly(newWeek, newYear);
  };

  const handleNextWeek = () => {
    let newWeek = currentWeek + 1;
    let newYear = currentYear;
    const weeksInYear = getWeeksInYear(currentYear);

    if (newWeek > weeksInYear) {
      newYear = currentYear + 1;
      newWeek = 1;
    }

    setWeek(newWeek, newYear);
    fetchWeekly(newWeek, newYear);
  };

  const getWeeksInYear = (year: number): number => {
    const d = new Date(year, 11, 31);
    const week = getWeekNumber(d);
    return week === 1 ? 52 : week;
  };

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const handleSaveShift = async (data: CreateShiftRequest) => {
    if (editingShift) {
      await updateShift(editingShift.id, data as UpdateShiftRequest);
    } else {
      await addShift(data);
    }
  };

  const handleDeleteShift = async (id: string) => {
    await deleteShift(id);
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setIsModalOpen(true);
  };

  const [preselectedEmployeeId, setPreselectedEmployeeId] = useState<string | undefined>();
  const [preselectedDate, setPreselectedDate] = useState<string | undefined>();
  const [preselectedStartTime, setPreselectedStartTime] = useState<string | undefined>();
  const [preselectedEndTime, setPreselectedEndTime] = useState<string | undefined>();

  const handleOpenModal = () => {
    setEditingShift(null);
    setPreselectedEmployeeId(undefined);
    setPreselectedDate(undefined);
    setPreselectedStartTime(undefined);
    setPreselectedEndTime(undefined);
    setIsModalOpen(true);
  };

  const handleAddShiftFromCell = (employeeId: string, date: string) => {
    setEditingShift(null);
    setPreselectedEmployeeId(employeeId);
    setPreselectedDate(date);
    setPreselectedStartTime(undefined);
    setPreselectedEndTime(undefined);
    setIsModalOpen(true);
  };

  const handleAddShiftFromHourlyView = (date: string, startTime: string, endTime: string) => {
    setEditingShift(null);
    setPreselectedEmployeeId(undefined);
    setPreselectedDate(date);
    setPreselectedStartTime(startTime);
    setPreselectedEndTime(endTime);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingShift(null);
    setPreselectedEmployeeId(undefined);
    setPreselectedDate(undefined);
    setPreselectedStartTime(undefined);
    setPreselectedEndTime(undefined);
  };

  const handleExportToImage = async () => {
    if (!scheduleContainerRef.current || !weeklySchedule) return;

    setIsExporting(true);
    try {
      // Ocultar elementos que no deben aparecer en la imagen
      const elementsToHide = document.querySelectorAll('.export-hide');
      const originalDisplay: (string | null)[] = [];
      elementsToHide.forEach((el) => {
        originalDisplay.push((el as HTMLElement).style.display || null);
        (el as HTMLElement).style.display = 'none';
      });

      // Ocultar controles de semana y botones
      const weekControls = document.querySelector('.export-hide-controls');
      if (weekControls) {
        (weekControls as HTMLElement).style.display = 'none';
      }

      // Esperar un momento para que los cambios se apliquen
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capturar la imagen
      const canvas = await html2canvas(scheduleContainerRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });

      // Crear header con información del restaurante
      const headerCanvas = document.createElement('canvas');
      headerCanvas.width = canvas.width;
      headerCanvas.height = 80;
      const headerCtx = headerCanvas.getContext('2d');
      if (headerCtx) {
        headerCtx.fillStyle = '#ffffff';
        headerCtx.fillRect(0, 0, headerCanvas.width, headerCanvas.height);

        headerCtx.fillStyle = '#111827';
        headerCtx.font = 'bold 24px Arial';
        headerCtx.textAlign = 'left';
        headerCtx.fillText(restaurant?.name || 'Restaurante', 20, 30);

        headerCtx.font = '16px Arial';
        headerCtx.fillStyle = '#6b7280';
        headerCtx.fillText(`Semana ${currentWeek} - ${currentYear}`, 20, 55);

        const now = new Date();
        const dateStr = now.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        headerCtx.font = '14px Arial';
        headerCtx.fillText(`Generado el ${dateStr}`, canvas.width - 200, 55);
      }

      // Combinar header y tabla
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = canvas.width;
      finalCanvas.height = headerCanvas.height + canvas.height;
      const finalCtx = finalCanvas.getContext('2d');
      if (finalCtx) {
        finalCtx.drawImage(headerCanvas, 0, 0);
        finalCtx.drawImage(canvas, 0, headerCanvas.height);
      }

      // Descargar la imagen
      finalCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `horario-semanal-semana-${currentWeek}-${currentYear}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');

      // Restaurar elementos ocultos
      elementsToHide.forEach((el, index) => {
        if (originalDisplay[index] !== null) {
          (el as HTMLElement).style.display = originalDisplay[index] || '';
        } else {
          (el as HTMLElement).style.removeProperty('display');
        }
      });

      if (weekControls) {
        (weekControls as HTMLElement).style.removeProperty('display');
      }

      // Mostrar mensaje de éxito (podrías usar un toast aquí)
      alert('Imagen descargada exitosamente');
    } catch (error) {
      console.error('Error al exportar imagen:', error);
      alert('Error al exportar la imagen. Por favor, inténtalo de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'schedule'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Horario Semanal
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'employees'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Empleados
          </button>
        </nav>
      </div>

      {activeTab === 'schedule' ? (
        <div className="space-y-4">
          {/* Week Selector and View Toggle */}
          <div className="flex items-center justify-between flex-wrap gap-4 export-hide-controls">
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePrevWeek}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-lg font-semibold text-gray-900">
                Semana {currentWeek}, {currentYear}
              </div>
              <button
                onClick={handleNextWeek}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-gray-100/60 backdrop-blur-sm rounded-full p-1">
                <button
                  onClick={() => setViewMode('employee')}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                    viewMode === 'employee'
                      ? 'bg-white shadow-sm border border-gray-200 text-blue-600 font-semibold'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Por Empleado
                </button>
                <button
                  onClick={() => setViewMode('hourly')}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                    viewMode === 'hourly'
                      ? 'bg-white shadow-sm border border-gray-200 text-blue-600 font-semibold'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Por Horario
                </button>
              </div>

              <button
                onClick={handleOpenModal}
                className="flex items-center px-4 py-2 bg-blue-500/90 hover:bg-blue-600 backdrop-blur-sm text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 export-hide"
              >
                <Plus className="h-4 w-4 mr-2" />
                Añadir Turno
              </button>

              <button
                onClick={handleExportToImage}
                disabled={isExporting || !weeklySchedule}
                className="flex items-center px-4 py-2 bg-emerald-500/90 hover:bg-emerald-600 backdrop-blur-sm text-white rounded-lg shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 export-hide"
                title="Exportar como imagen"
              >
                <Camera className="h-4 w-4 mr-2" />
                {isExporting ? 'Generando...' : 'Exportar Imagen'}
              </button>
            </div>
          </div>

          {/* Schedule View */}
          <div ref={scheduleContainerRef}>
            {weeklySchedule ? (
              viewMode === 'employee' ? (
                <WeeklyView
                  schedule={weeklySchedule}
                  onDeleteShift={handleDeleteShift}
                  onEditShift={handleEditShift}
                  onAddShift={handleAddShiftFromCell}
                />
              ) : (
                <HourlyView
                  schedule={weeklySchedule}
                  onEditShift={handleEditShift}
                  onDeleteShift={handleDeleteShift}
                  onAddShift={handleAddShiftFromHourlyView}
                  onConfigSlots={() => setIsSlotsConfigModalOpen(true)}
                  onRefreshSchedule={() => fetchWeekly(currentWeek, currentYear)}
                />
              )
            ) : (
              <div className="text-center py-12 text-gray-500">
                Cargando horario semanal...
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmployeesTab />
      )}

      {/* Add/Edit Shift Modal */}
      <AddShiftModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveShift}
        editingShift={editingShift}
        preselectedEmployeeId={preselectedEmployeeId}
        preselectedDate={preselectedDate}
        preselectedStartTime={preselectedStartTime}
        preselectedEndTime={preselectedEndTime}
      />

      {/* Hourly Slots Configuration Modal */}
      <HourSlotsConfigModal
        isOpen={isSlotsConfigModalOpen}
        onClose={() => setIsSlotsConfigModalOpen(false)}
        onSlotsChange={(slots: HourlySlot[]) => {
          // Forzar re-render de HourlyView cuando cambian los slots
          if (weeklySchedule) {
            fetchWeekly(currentWeek, currentYear);
          }
        }}
      />
    </div>
  );
}
