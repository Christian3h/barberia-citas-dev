import { useState, useEffect } from 'react'
import type { ApiResponse, AppSettings } from '@/types';


interface SettingsPanelProps {
  settings: AppSettings
  loading: boolean
  onUpdate: (payload: Partial<AppSettings>) => Promise<ApiResponse<AppSettings>>
  onRefetch: () => void
}

export function SettingsPanel({
  settings, loading, onUpdate, onRefetch
}: SettingsPanelProps) {
   const [editedSettings, setEditedSettings] = useState<AppSettings>(settings);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
      setEditedSettings(settings);
    }, [settings]);

    const handleSave = async () => {
      setSaving(true);
      setMessage('');
      try {
        const result = await onUpdate(editedSettings);
        if (result.success) {
          setMessage('✅ Configuración guardada');
          // Recargar settings desde el servidor para asegurar sincronización
          await onRefetch();
        } else {
          setMessage(`❌ Error: ${result.error || 'Error al guardar'}`);
        }
      } catch (err) {
        setMessage(`❌ Error: ${err instanceof Error ? err.message : 'Error al guardar'}`);
      }
      setSaving(false);
    };

    return (
      <div className="admin-section">
        <h2>⚙️ Configuración</h2>

        {loading ? (
          <div className="loading-state">Cargando...</div>
        ) : (
          <div className="settings-form">
            {message && <div className="settings-message">{message}</div>}

            <div className="settings-group">
              <h3>🏪 Negocio</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre del negocio</label>
                  <input
                    type="text"
                    value={editedSettings.business_name || ''}
                    onChange={(e) => setEditedSettings({ ...editedSettings, business_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Zona horaria</label>
                  <input
                    type="text"
                    value={editedSettings.timezone}
                    onChange={(e) => setEditedSettings({ ...editedSettings, timezone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="settings-group">
              <h3>🕐 Horario</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Hora apertura</label>
                  <input
                    type="time"
                    value={editedSettings.business_start}
                    onChange={(e) => setEditedSettings({ ...editedSettings, business_start: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Hora cierre</label>
                  <input
                    type="time"
                    value={editedSettings.business_end}
                    onChange={(e) => setEditedSettings({ ...editedSettings, business_end: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="settings-group">
              <h3>📅 Citas</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Intervalo de slots (min)</label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    step="5"
                    value={editedSettings.slot_interval_min}
                    onChange={(e) => setEditedSettings({ ...editedSettings, slot_interval_min: parseInt(e.target.value) || 15 })}
                  />
                </div>
                <div className="form-group">
                  <label>Máx. días anticipación</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={editedSettings.max_book_ahead_days}
                    onChange={(e) => setEditedSettings({ ...editedSettings, max_book_ahead_days: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Anticipación mínima (horas)</label>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.5"
                    value={editedSettings.min_advance_hours ?? 0}
                    onChange={(e) => setEditedSettings({ ...editedSettings, min_advance_hours: parseFloat(e.target.value) || 0 })}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Tiempo mínimo antes de una cita para el mismo día (0-2 horas)
                  </small>
                </div>
              </div>
            </div>

            <div className="settings-group">
              <h3>🔐 Seguridad</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>PIN de administrador</label>
                  <input
                    type="text"
                    value={editedSettings.admin_pin || ''}
                    onChange={(e) => setEditedSettings({ ...editedSettings, admin_pin: e.target.value })}
                    placeholder="1234"
                  />
                </div>
                <div className="form-group">
                  <label>Purgar citas después de (días)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={editedSettings.purge_after_days}
                    onChange={(e) => setEditedSettings({ ...editedSettings, purge_after_days: parseInt(e.target.value) || 7 })}
                  />
                </div>
              </div>
            </div>

            <button className="btn btn-primary btn-large" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    );
};