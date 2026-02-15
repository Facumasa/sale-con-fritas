import EmployeesTab from '../../components/schedules/EmployeesTab';

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Gestión de Empleados</h1>
      <EmployeesTab hideHeading />
    </div>
  );
}
