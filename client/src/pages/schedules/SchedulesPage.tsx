import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Settings } from 'lucide-react';
import { useShiftStore } from '../../store/shiftStore';
import { useEmployeeStore } from '../../store/employeeStore';
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

  const handleOpenModal = () => {
    setEditingShift(null);
    setPreselectedEmployeeId(undefined);
    setPreselectedDate(undefined);
    setIsModalOpen(true);
  };

  const handleAddShiftFromCell = (employeeId: string, date: string) => {
    setEditingShift(null);
    setPreselectedEmployeeId(employeeId);
    setPreselectedDate(date);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingShift(null);
    setPreselectedEmployeeId(undefined);
    setPreselectedDate(undefined);
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
          <div className="flex items-center justify-between flex-wrap gap-4">
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
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('employee')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'employee'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Por Empleado
                </button>
                <button
                  onClick={() => setViewMode('hourly')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'hourly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Por Horario
                </button>
              </div>

              {viewMode === 'hourly' && (
                <button
                  onClick={() => setIsSlotsConfigModalOpen(true)}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  title="Configurar franjas horarias"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                </button>
              )}

              <button
                onClick={handleOpenModal}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Añadir Turno
              </button>
            </div>
          </div>

          {/* Schedule View */}
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
              />
            )
          ) : (
            <div className="text-center py-12 text-gray-500">
              Cargando horario semanal...
            </div>
          )}
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
