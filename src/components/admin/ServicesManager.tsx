import { BarberService } from '@/types';
import { useState } from 'react'
import { appsScriptApi } from '@/services';

interface ServicesManagerProps {
  allServices: BarberService[]
  onRefetch: () => void
}

export function ServicesManager({
  allServices, onRefetch
}: ServicesManagerProps) {
  const [showForm, setShowForm] = useState(false);
    const [editingService, setEditingService] = useState<BarberService | null>(null);
    const [deletingService, setDeletingService] = useState<BarberService | null>(null);
    const [formData, setFormData] = useState({
      name: '',
      duration_min: 30,
      price: 0,
      description: '',
      active: true,
    });
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const resetForm = () => {
      setFormData({ name: '', duration_min: 30, price: 0, description: '', active: true });
      setEditingService(null);
      setShowForm(false);
    };

    const handleEdit = (service: BarberService) => {
      setFormData({
        name: service.name,
        duration_min: service.duration_min,
        price: service.price,
        description: service.description || '',
        active: service.active ?? true,
      });
      setEditingService(service);
      setShowForm(true);
    };

    const handleDeleteClick = (service: BarberService) => {
      setDeletingService(service);
    };

    const confirmDelete = async () => {
      if (!deletingService) return;

      setSaving(true);
      try {
        const result = await appsScriptApi.deleteService(deletingService.id);
        if (result.success) {
          onRefetch();
          setDeletingService(null);
        } else {
          alert('Error: ' + (result.error || 'No se pudo eliminar el servicio'));
        }
      } catch (err) {
        console.error('Error deleting service:', err);
        alert('Error al eliminar el servicio');
      }
      setSaving(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        let result;
        if (editingService) {
          result = await appsScriptApi.updateService(editingService.id, formData);
        } else {
          result = await appsScriptApi.createService(formData as Omit<BarberService, 'id'>);
        }

        if (result.success) {
          resetForm();
          onRefetch();
        } else {
          alert('Error: ' + (result.error || 'No se pudo guardar el servicio'));
        }
      } catch (err) {
        console.error('Error saving service:', err);
        alert('Error al guardar el servicio');
      }
      setSaving(false);
    };

    const toggleActive = async (service: BarberService) => {
      setTogglingId(service.id);
      try {
        const result = await appsScriptApi.updateService(service.id, { active: !(service.active ?? true) });
        if (result.success) {
          onRefetch();
        } else {
          alert('Error: ' + (result.error || 'No se pudo cambiar el estado'));
        }
      } catch (err) {
        console.error('Error toggling service:', err);
        alert('Error al cambiar el estado del servicio');
      } finally {
        setTogglingId(null);
      }
    };

    return (
      <div className="admin-section">
        <div className="section-header">
          <h2>✂️ Servicios</h2>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? 'Cancelar' : '+ Nuevo servicio'}
          </button>
        </div>

        {showForm && (
          <form className="block-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Duración (min)</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={formData.duration_min}
                  onChange={(e) => setFormData({ ...formData, duration_min: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Precio</label>
                <input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : editingService ? 'Actualizar' : 'Crear'}
            </button>
          </form>
        )}

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Duración</th>
                <th>Precio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {allServices.map((service) => (
                <tr key={service.id} className={(service.active ?? true) ? '' : 'row-inactive'}>
                  <td>
                    <div className="service-info">
                      <span className="service-name">{service.name}</span>
                      {service.description && <span className="service-desc">{service.description}</span>}
                    </div>
                  </td>
                  <td>{service.duration_min} min</td>
                  <td>${service.price.toLocaleString()}</td>
                  <td>
                    <button
                      className={`status-toggle ${(service.active ?? true) ? 'active' : 'inactive'}`}
                      onClick={() => toggleActive(service)}
                      disabled={togglingId === service.id}
                    >
                      {togglingId === service.id ? '⏳...' : (service.active ?? true) ? '✅ Activo' : '❌ Inactivo'}
                    </button>
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-small btn-secondary" onClick={() => handleEdit(service)} title="Editar">
                      ✏️
                    </button>
                    <button className="btn btn-small btn-danger" onClick={() => handleDeleteClick(service)} title="Eliminar" style={{ marginLeft: '8px' }}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {deletingService && (
          <div className="modal-overlay" onClick={() => !saving && setDeletingService(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal-title">Eliminar Servicio</h2>
              <p>¿Estás seguro de que deseas eliminar el servicio <strong>{deletingService.name}</strong>?</p>
              <p className="text-warning">Esta acción no se puede deshacer y el servicio dejará de estar disponible inmediatamente.</p>

              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setDeletingService(null)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={confirmDelete}
                  disabled={saving}
                >
                  {saving ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
}