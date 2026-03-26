import { User } from '@/types'
import { useState } from 'react'
import { appsScriptApi } from '@/services';

interface BarbersManagerProps {
  barbers: User[]
  onRefetch: () => void
}

export function BarbersManager({
  barbers, onRefetch
}: BarbersManagerProps) {
   const [showForm, setShowForm] = useState(false);
    const [editingBarber, setEditingBarber] = useState<User | null>(null);
    const [deletingBarber, setDeletingBarber] = useState<User | null>(null);
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
      active: true,
    });
    const [saving, setSaving] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const resetForm = () => {
      setFormData({ name: '', email: '', phone: '', active: true });
      setEditingBarber(null);
      setShowForm(false);
    };

    const handleEdit = (barber: User) => {
      setFormData({
        name: barber.name,
        email: barber.email,
        phone: barber.phone,
        active: barber.active,
      });
      setEditingBarber(barber);
      setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        if (editingBarber) {
          await appsScriptApi.updateUser(editingBarber.id, formData);
        } else {
          await appsScriptApi.createUser({ ...formData, role: 'barber' });
        }
        resetForm();
        onRefetch();
      } catch (err) {
        console.error('Error saving barber:', err);
      }
      setSaving(false);
    };

    const toggleActive = async (barber: User) => {
      setTogglingId(barber.id);
      try {
        await appsScriptApi.updateUser(barber.id, { active: !barber.active });
        onRefetch();
      } finally {
        setTogglingId(null);
      }
    };

    const confirmDelete = async () => {
      if (!deletingBarber) return;

      setSaving(true);
      try {
        await appsScriptApi.deleteUser(deletingBarber.id);
        setDeletingBarber(null);
        onRefetch();
      } catch (err) {
        console.error('Error deleting barber:', err);
        alert('Error al eliminar el barbero. Por favor intenta de nuevo.');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="admin-section">
        <div className="section-header" style={{ display: 'none' }}>
          <h2>💈 Barberos</h2>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? 'Cancelar' : '+ Nuevo barbero'}
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
                <label>Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : editingBarber ? 'Actualizar' : 'Crear'}
            </button>
          </form>
        )}

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Barbero</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {barbers.map((barber) => (
                <tr key={barber.id} className={barber.active ? '' : 'row-inactive'}>
                  <td>
                    <div className="barber-info">
                      <div className="barber-avatar">{barber.name.charAt(0)}</div>
                      <span className="barber-name">{barber.name}</span>
                    </div>
                  </td>
                  <td>{barber.phone || '-'}</td>
                  <td>{barber.email || '-'}</td>
                  <td>
                    <button
                      className={`status-toggle ${barber.active ? 'active' : 'inactive'}`}
                      onClick={() => toggleActive(barber)}
                      disabled={togglingId === barber.id}
                    >
                      {togglingId === barber.id ? '⏳...' : barber.active ? '✅ Activo' : '❌ Inactivo'}
                    </button>
                  </td>
                  <td className="actions-cell">
                    <button className="btn btn-small btn-secondary" onClick={() => handleEdit(barber)}>
                      ✏️
                    </button>
                    <button
                      className="btn btn-small btn-accent"
                      onClick={() => {
                        const url = `${window.location.origin}/barbero/${barber.id}`;
                        navigator.clipboard.writeText(url);
                        alert(`✅ Link copiado:\n${url}`);
                      }}
                      title="Copiar link del barbero"
                    >
                      🔗
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => setDeletingBarber(barber)}
                      title="Eliminar barbero"
                      style={{ display: 'none' }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {deletingBarber && (
          <div className="modal-overlay" onClick={() => !saving && setDeletingBarber(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal-title">Eliminar Barbero</h2>
              <p>¿Estás seguro de que deseas eliminar a <strong>{deletingBarber.name}</strong>?</p>
              <p className="text-warning">Esta acción no se puede deshacer y el barbero dejará de estar disponible inmediatamente en todas las páginas.</p>

              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setDeletingBarber(null)}
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
    )
}