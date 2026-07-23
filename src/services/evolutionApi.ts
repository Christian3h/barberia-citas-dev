import { EVOLUTION_API_CONFIG } from '@/config';

const { BASE_URL, API_KEY, INSTANCE_NAME } = EVOLUTION_API_CONFIG;

/**
 * Normaliza un teléfono colombiano al formato que Evolution API espera: 573XXXXXXXXX
 */
function normalizePhone(phone: string): string {
  const clean = phone.replace(/[\s\-\(\)\.]/g, '');
  if (clean.startsWith('+57')) return clean.slice(1); // quitar + => 573...
  if (clean.startsWith('57')) return clean;
  if (clean.startsWith('3') && clean.length === 10) return '57' + clean;
  return clean;
}

/**
 * Envía un mensaje de texto por WhatsApp vía Evolution API
 */
async function sendTextMessage(phone: string, text: string): Promise<{ success: boolean; error?: string }> {
  try {
    const number = normalizePhone(phone);
    const encodedInstance = encodeURIComponent(INSTANCE_NAME);
    const response = await fetch(`${BASE_URL}/message/sendText/${encodedInstance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
      },
      body: JSON.stringify({
        number,
        text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Evolution API error:', data);
      return { success: false, error: data.message || data.error || 'Error al enviar mensaje' };
    }

    return { success: true };
  } catch (error) {
    console.error('Evolution API connection error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error de conexión con Evolution API' };
  }
}

/**
 * Envía confirmación de cita nueva
 */
export function sendAppointmentConfirmation(
  customerName: string,
  phone: string,
  date: string,
  time: string,
  service: string,
  barberName: string,
): Promise<{ success: boolean; error?: string }> {
  const message = `✅ *Cita Confirmada*\n\nHola ${customerName}, tu cita ha sido agendada:\n\n📅 Fecha: ${date}\n⏰ Hora: ${time}\n💇 Servicio: ${service}\n✂️ Barbero: ${barberName}\n\n¡Te esperamos!`;
  return sendTextMessage(phone, message);
}

/**
 * Envía notificación de cancelación
 */
export function sendAppointmentCancellation(
  customerName: string,
  phone: string,
  date: string,
  time: string,
): Promise<{ success: boolean; error?: string }> {
  const message = `❌ *Cita Cancelada*\n\nHola ${customerName}, tu cita del ${date} a las ${time} ha sido cancelada.`;
  return sendTextMessage(phone, message);
}

export const evolutionApiService = {
  sendTextMessage,
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
};

export default evolutionApiService;
