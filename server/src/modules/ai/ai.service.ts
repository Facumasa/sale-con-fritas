import Anthropic from '@anthropic-ai/sdk';
import prisma from '../../config/database';
import {
  GenerateScheduleRequest,
  GenerateScheduleResponse,
  ScheduleOption,
} from './ai.types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Genera horarios semanales usando IA (Claude)
 */
export const generateScheduleWithAI = async (
  request: GenerateScheduleRequest
): Promise<GenerateScheduleResponse> => {
  try {
    // 1. Obtener empleados del restaurante
    const employees = await prisma.employee.findMany({
      where: {
        restaurantId: request.restaurantId,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    if (employees.length === 0) {
      return {
        options: [],
        impossibleConstraints: ['No hay empleados activos en el restaurante'],
        suggestions: ['Agrega empleados antes de generar horarios'],
      };
    }

    // 2. Obtener horario actual si existe
    let currentSchedule: any[] = [];
    if (request.currentSchedule && request.currentSchedule.length > 0) {
      currentSchedule = request.currentSchedule;
    } else {
      // Intentar obtener horario actual de la base de datos
      const weekDates = getWeekDates(request.week, request.year);
      const existingShifts = await prisma.shift.findMany({
        where: {
          restaurantId: request.restaurantId,
          date: {
            gte: weekDates.start,
            lte: weekDates.end,
          },
        },
        include: {
          employee: true,
        },
      });
      currentSchedule = existingShifts.map((shift) => ({
        employeeId: shift.employeeId,
        employeeName: shift.employee.name,
        date: shift.date.toISOString().split('T')[0],
        startTime: shift.startTime,
        endTime: shift.endTime,
        type: shift.type,
      }));
    }

    // 3. Construir prompt estructurado para Claude
    const prompt = buildSchedulePrompt(employees, request, currentSchedule);

    // 4. Llamar a Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // 5. Parsear respuesta JSON
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No se recibió respuesta de texto de Claude');
    }

    let aiResponse: any;
    try {
      // Intentar extraer JSON del texto (puede venir con markdown)
      const text = textContent.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      } else {
        aiResponse = JSON.parse(text);
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', textContent.text);
      throw new Error('La respuesta de Claude no es JSON válido');
    }

    // 6. Validar y procesar opciones
    return processScheduleOptions(aiResponse, employees, request);
  } catch (error) {
    console.error('AI Schedule generation error:', error);
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('API key de Anthropic no configurada o inválida');
      }
      throw error;
    }
    throw new Error('Error al generar horario con IA');
  }
};

/**
 * Construye el prompt para Claude
 */
const buildSchedulePrompt = (
  employees: any[],
  request: GenerateScheduleRequest,
  currentSchedule: any[]
): string => {
  return `Eres un experto en planificación de horarios para restaurantes.

EMPLEADOS DISPONIBLES:
${employees.map((e) => `- ${e.name} (ID: ${e.id}, Puesto: ${e.position})`).join('\n')}

SLOTS DE HORARIO DISPONIBLES (configurados por el restaurante):
${request.hourlySlots.map((slot) => `- ${slot}`).join('\n')}

RESTRICCIONES ESTRUCTURADAS:
${JSON.stringify(request.constraints, null, 2)}

RESTRICCIONES EN LENGUAJE NATURAL:
${request.freeTextConstraints || 'Ninguna adicional'}

HORARIO ACTUAL (si existe):
${currentSchedule.length > 0 ? JSON.stringify(currentSchedule, null, 2) : 'Empezar desde cero'}

SEMANA: Semana ${request.week} del año ${request.year}

TAREA:
Genera 3 opciones de horario semanal que:
1. Cumplan TODAS las restricciones posibles
2. Usen SOLO los slots de horario proporcionados
3. Balanceen equitativamente las horas entre empleados
4. Minimicen conflictos y maximicen eficiencia

IMPORTANTE SOBRE SLOTS:
- Cada turno debe usar EXACTAMENTE uno de los slots proporcionados
- NO inventes horarios nuevos
- Puedes asignar diferentes slots a diferentes empleados el mismo día
- Ejemplo: María trabaja 12:00-16:00 y Juan trabaja 12:00-17:00 el mismo día
- Los días van del 1 (lunes) al 7 (domingo)

FORMATO DE RESPUESTA:
Responde SOLO con JSON válido en este formato:
{
  "options": [
    {
      "id": "option-1",
      "name": "Balance equitativo",
      "description": "Distribuye horas de forma pareja entre todos",
      "complianceScore": 95,
      "shifts": [
        {
          "employeeId": "employee-id",
          "day": 1,
          "startTime": "12:00",
          "endTime": "16:00",
          "type": "AFTERNOON"
        }
      ],
      "metrics": {
        "totalHours": 160,
        "employeesUsed": 4,
        "constraintsMet": 8,
        "constraintsTotal": 10
      },
      "warnings": ["María tiene solo 1 día libre esta semana"]
    }
  ],
  "impossibleConstraints": [
    "No hay suficientes empleados para cubrir sábados con mínimo 3 personas"
  ],
  "suggestions": [
    "Considera contratar un empleado adicional para fines de semana",
    "Podrías aumentar el slot de 12-16 a 12-17 para más flexibilidad"
  ]
}`;
};

/**
 * Procesa y valida las opciones de horario generadas por la IA
 */
const processScheduleOptions = (
  aiResponse: any,
  employees: any[],
  request: GenerateScheduleRequest
): GenerateScheduleResponse => {
  // Validar estructura básica
  if (!aiResponse.options || !Array.isArray(aiResponse.options)) {
    return {
      options: [],
      impossibleConstraints: ['La IA no generó opciones válidas'],
      suggestions: ['Intenta reformular las restricciones'],
    };
  }

  const employeeIds = new Set(employees.map((e) => e.id));
  const validSlots = new Set(request.hourlySlots);

  // Validar cada opción
  const validatedOptions: ScheduleOption[] = aiResponse.options
    .map((option: any, index: number) => {
      if (!option.shifts || !Array.isArray(option.shifts)) {
        return null;
      }

      // Validar y filtrar turnos
      const validShifts = option.shifts.filter((shift: any) => {
        // Validar que el empleado existe
        if (!employeeIds.has(shift.employeeId)) {
          return false;
        }

        // Validar que el día está en rango
        if (shift.day < 1 || shift.day > 7) {
          return false;
        }

        // Validar que el slot existe
        const shiftSlot = `${shift.startTime}-${shift.endTime}`;
        if (!validSlots.has(shiftSlot)) {
          // Intentar encontrar slot similar
          const matchingSlot = findMatchingSlot(
            shift.startTime,
            shift.endTime,
            request.hourlySlots
          );
          if (matchingSlot) {
            const [start, end] = matchingSlot.split('-');
            shift.startTime = start;
            shift.endTime = end;
            return true;
          }
          return false;
        }

        return true;
      });

      // Determinar tipo de turno si no está especificado
      const shiftsWithType = validShifts.map((shift: any) => {
        if (!shift.type) {
          shift.type = determineShiftType(shift.startTime, shift.endTime);
        }
        return shift;
      });

      return {
        id: option.id || `option-${index + 1}`,
        name: option.name || `Opción ${index + 1}`,
        description: option.description || '',
        complianceScore: option.complianceScore || 0,
        shifts: shiftsWithType,
        metrics: option.metrics || {
          totalHours: calculateTotalHours(shiftsWithType),
          employeesUsed: new Set(shiftsWithType.map((s: any) => s.employeeId)).size,
          constraintsMet: option.metrics?.constraintsMet || 0,
          constraintsTotal: option.metrics?.constraintsTotal || request.constraints.length,
        },
        warnings: option.warnings || [],
      };
    })
    .filter((option: any): option is ScheduleOption => option !== null);

  return {
    options: validatedOptions,
    impossibleConstraints: aiResponse.impossibleConstraints || [],
    suggestions: aiResponse.suggestions || [],
  };
};

/**
 * Encuentra un slot que coincida aproximadamente con el horario
 */
const findMatchingSlot = (
  startTime: string,
  endTime: string,
  availableSlots: string[]
): string | null => {
  for (const slot of availableSlots) {
    const [slotStart, slotEnd] = slot.split('-');
    if (slotStart === startTime && slotEnd === endTime) {
      return slot;
    }
  }
  return null;
};

/**
 * Determina el tipo de turno basado en las horas
 */
const determineShiftType = (startTime: string, endTime: string): string => {
  const [startHour] = startTime.split(':').map(Number);
  const [endHour] = endTime.split(':').map(Number);

  if (startHour >= 6 && startHour < 12) {
    return 'MORNING';
  } else if (startHour >= 12 && startHour < 18) {
    return 'AFTERNOON';
  } else {
    return 'NIGHT';
  }
};

/**
 * Calcula el total de horas de todos los turnos
 */
const calculateTotalHours = (shifts: any[]): number => {
  return shifts.reduce((total, shift) => {
    const [startHour, startMin] = shift.startTime.split(':').map(Number);
    const [endHour, endMin] = shift.endTime.split(':').map(Number);

    let startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;

    // Manejar turnos que cruzan medianoche
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }

    const durationHours = (endMinutes - startMinutes) / 60;
    return total + durationHours;
  }, 0);
};

/**
 * Obtiene las fechas de inicio y fin de una semana
 */
const getWeekDates = (week: number, year: number): { start: Date; end: Date } => {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());

  const start = new Date(ISOweekStart);
  const end = new Date(ISOweekStart);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

/**
 * Optimiza un horario existente según un objetivo
 */
export const optimizeExistingSchedule = async (
  restaurantId: string,
  week: number,
  year: number,
  goal: string
): Promise<GenerateScheduleResponse> => {
  try {
    // Obtener horario actual
    const weekDates = getWeekDates(week, year);
    const currentShifts = await prisma.shift.findMany({
      where: {
        restaurantId,
        date: {
          gte: weekDates.start,
          lte: weekDates.end,
        },
      },
      include: {
        employee: true,
      },
    });

    const employees = await prisma.employee.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
    });

    // Construir prompt de optimización
    const prompt = `Eres un experto en optimización de horarios para restaurantes.

HORARIO ACTUAL:
${JSON.stringify(
  currentShifts.map((s) => ({
    employeeId: s.employeeId,
    employeeName: s.employee.name,
    date: s.date.toISOString().split('T')[0],
    startTime: s.startTime,
    endTime: s.endTime,
    type: s.type,
  })),
  null,
  2
)}

EMPLEADOS:
${employees.map((e) => `- ${e.name} (ID: ${e.id}, Puesto: ${e.position})`).join('\n')}

OBJETIVO DE OPTIMIZACIÓN:
${goal}

TAREA:
Analiza el horario actual y genera una versión optimizada que mejore según el objetivo.
Responde con JSON en el mismo formato que la generación de horarios.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No se recibió respuesta de texto de Claude');
    }

    const text = textContent.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const aiResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

    // Obtener slots del restaurante (necesitarías una tabla de configuración)
    // Por ahora, extraer slots únicos del horario actual
    const slots = Array.from(
      new Set(
        currentShifts.map((s) => `${s.startTime}-${s.endTime}`)
      )
    );

    return processScheduleOptions(
      aiResponse,
      employees,
      {
        restaurantId,
        constraints: [],
        hourlySlots: slots,
        week,
        year,
      }
    );
  } catch (error) {
    console.error('Schedule optimization error:', error);
    throw new Error('Error al optimizar horario');
  }
};

/**
 * Chat conversacional para refinar restricciones
 */
export const chatAboutSchedule = async (
  message: string,
  context: any
): Promise<{ response: string; suggestedConstraints?: any[] }> => {
  try {
    const prompt = `Eres un asistente experto en planificación de horarios para restaurantes.

CONTEXTO ACTUAL:
${JSON.stringify(context, null, 2)}

MENSAJE DEL USUARIO:
${message}

Responde de forma conversacional y útil. Si el usuario menciona restricciones, sugiere cómo estructurarlas.
Si es relevante, puedes sugerir restricciones en formato JSON.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No se recibió respuesta de texto de Claude');
    }

    return {
      response: textContent.text,
    };
  } catch (error) {
    console.error('Chat error:', error);
    throw new Error('Error en el chat con IA');
  }
};

/**
 * Explica conflictos en un horario
 */
export const explainScheduleConflicts = async (shifts: any[]): Promise<string> => {
  try {
    const prompt = `Analiza estos turnos y explica cualquier conflicto o problema:

${JSON.stringify(shifts, null, 2)}

Identifica:
- Conflictos de horarios (mismo empleado, mismo tiempo)
- Sobrecarga de trabajo
- Días sin cobertura
- Problemas de distribución de horas

Responde en español de forma clara y concisa.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No se recibió respuesta de texto de Claude');
    }

    return textContent.text;
  } catch (error) {
    console.error('Conflict explanation error:', error);
    throw new Error('Error al explicar conflictos');
  }
};
