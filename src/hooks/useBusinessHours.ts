import { useState, useEffect } from 'react';

interface BusinessHours {
  isOpen: boolean;
  currentTime: string;
  nextChange: string;
}

const BOGOTA_TZ = 'America/Bogota';
const BUSINESS_START = 9;
const BUSINESS_END = 20;
const CLOSED_DAY = 0;

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: BOGOTA_TZ,
  });
}

function getBogotaDate(): Date {
  const now = new Date();
  const bogotaStr = now.toLocaleString('en-US', { timeZone: BOGOTA_TZ });
  return new Date(bogotaStr);
}

export function useBusinessHours(): BusinessHours {
  const [state, setState] = useState<BusinessHours>(() => {
    const bogota = getBogotaDate();
    const hour = bogota.getHours();
    const day = bogota.getDay();
    const isOpen = day !== CLOSED_DAY && hour >= BUSINESS_START && hour < BUSINESS_END;
    return {
      isOpen,
      currentTime: formatTime(bogota),
      nextChange: isOpen ? `${BUSINESS_END}:00` : `${BUSINESS_START}:00`,
    };
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const bogota = getBogotaDate();
      const hour = bogota.getHours();
      const day = bogota.getDay();
      const isOpen = day !== CLOSED_DAY && hour >= BUSINESS_START && hour < BUSINESS_END;
      setState({
        isOpen,
        currentTime: formatTime(bogota),
        nextChange: isOpen ? `${BUSINESS_END}:00` : `${BUSINESS_START}:00`,
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return state;
}
