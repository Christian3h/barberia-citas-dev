// ============================================
// SERVICIO: Cache Simple
// Evita peticiones duplicadas a Google Sheets
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

  // Tiempo de vida del caché: 30 segundos
  private readonly TTL = 30 * 1000;

  /**
   * Obtiene datos del caché o ejecuta la función si no existe/expiró
   */
  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Verificar si hay datos en caché válidos
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.data as T;
    }

    // Si ya hay una petición en curso para esta key, esperar a que termine
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    // Crear nueva petición
    const request = fetcher().then((data) => {
      this.cache.set(key, { data, timestamp: Date.now() });
      this.pendingRequests.delete(key);
      return data;
    }).catch((error) => {
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, request);
    return request;
  }

  /**
   * Invalida una entrada específica del caché
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalida todas las entradas que empiezan con un prefijo
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

export const cache = new SimpleCache();
export default cache;
