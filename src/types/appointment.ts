import { AppointmentStatus } from '@/config';

export type Appointment = {
  id: string;
  status: AppointmentStatus;
  customer_name: string;
  service: string;
  barber_id: string;
  phone?: string;
  date: string;
  time: string;
};