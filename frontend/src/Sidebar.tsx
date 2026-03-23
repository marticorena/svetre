import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { History, LayoutGrid, MapPin, Network, Search, ShieldCheck, X } from 'lucide-react';

export const ADD_HORSE = gql`
  mutation AddHorse($name: String!, $sex: String!, $status: String!, $departmentId: String, $dateOfBirth: String) {
    addHorse(name: $name, sex: $sex, status: $status, departmentId: $departmentId, dateOfBirth: $dateOfBirth) { 
      id name sex status dateOfBirth departmentId 
    }
  }
`;
export const UPDATE_HORSE = gql`
  mutation UpdateHorse($id: ID!, $name: String, $sex: String, $status: String, $departmentId: String, $dateOfBirth: String) {
    updateHorse(id: $id, name: $name, sex: $sex, status: $status, departmentId: $departmentId, dateOfBirth: $dateOfBirth) { 
      id name sex status dateOfBirth departmentId hasParents hasChildren 
    }
  }
`;
export const DELETE_HORSE = gql`
  mutation DeleteHorse($id: ID!) { deleteHorse(id: $id) }
`;

export function Sidebar(props: any) {
  const { horses, onNodeJump, refetch, statusFilters, setStatusFilters, viewControls, setViewControls } = props;
  const [search, setSearch] = useState('');
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', sex: 'Male', status: 'in_service', dateOfBirth: '', departmentId: '' });

  const [addHorseMut] = useMutation(ADD_HORSE);
  const [updateHorseMut] = useMutation(UPDATE_HORSE);
  const [deleteHorseMut] = useMutation(DELETE_HORSE);

  const filtered = horses.filter((h: any) => {
    if (search && !h.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilters[h.status] === false) return false;
    return true;
  });

  const handleSave = async (id?: string) => {
    if (formData.name.trim().length === 0) return alert('Name required');
    if (id) {
      await updateHorseMut({ variables: { id, ...formData } });
    } else {
      const res = await addHorseMut({ variables: { ...formData } });
      if (res?.data?.addHorse) onNodeJump(res.data.addHorse);
    }
    setActiveForm(null);
    refetch();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Permanently discharge this record? This clears all histories and linkages.")) {
      await deleteHorseMut({ variables: { id } });
      refetch();
    }
  };

  // Convert Date to YYYY-MM-DD for form input
  const dateFmt = (iso?: string) => iso ? new Date(iso).toISOString().split('T')[0] : '';

  const startEdit = (h: any, e: React.MouseEvent) => {
    e.stopPropagation();
    let dob = '';
    if (h.dateOfBirth) {
      dob = new Date(isNaN(Number(h.dateOfBirth)) ? h.dateOfBirth : Number(h.dateOfBirth)).toISOString().split('T')[0];
    }
    setFormData({ name: h.name, sex: h.sex, status: h.status, dateOfBirth: dob, departmentId: h.departmentId || '' });
    setActiveForm(h.id);
  };

  const startAdd = () => {
    setFormData({ name: '', sex: 'Male', status: 'in_service', dateOfBirth: '', departmentId: '' });
    setActiveForm('new');
  };

  const toggleFilter = (status: string) => setStatusFilters((prev: any) => ({ ...prev, [status]: !prev[status] }));
  const toggleView = (key: string) => setViewControls((prev: any) => ({ ...prev, [key]: !prev[key] }));

  const deps = Array.from(new Map(horses.filter((h: any) => h.department).map((h: any) => [h.department.id, h.department])).values());

  return (
    <div className="sidebar-panel" style={{ width: 360, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><ShieldCheck size={24} /> Military Records</h2>
        <button onClick={props.triggerResetLayout} style={{ background: '#e5e5ea', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: '0.8em', fontWeight: 600, cursor: 'pointer' }}>Reset Layout</button>
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={16} color="#999" style={{ position: 'absolute', left: 12, top: 12 }} />
        <input
          className="search-box"
          placeholder="Lookup registry..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', paddingLeft: 38, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ background: 'rgba(0,0,0,0.03)', padding: 12, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <strong>Global Layout Directives</strong>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`view-btn ${viewControls.groupDepart ? 'active' : ''}`} onClick={() => toggleView('groupDepart')}>
            <LayoutGrid size={14} /> Group by Department
          </button>
          <button className={`view-btn ${viewControls.groupCities ? 'active' : ''}`} onClick={() => toggleView('groupCities')}>
            <MapPin size={14} /> Group by City
          </button>
          <button className={`view-btn ${viewControls.hideEdges ? 'active' : ''}`} onClick={() => toggleView('hideEdges')}>
            <Network size={14} /> {viewControls.hideEdges ? 'Edges Hidden' : 'Edges Active'}
          </button>
        </div>
      </div>

      <div className="filters">
        {['in_service', 'retired', 'deceased'].map(status => (
          <label key={status} className="filter-chip" style={{ opacity: statusFilters[status] !== false ? 1 : 0.5 }}>
            <input type="checkbox" checked={statusFilters[status] !== false} onChange={() => toggleFilter(status)} />
            {status.replace('_', ' ').toUpperCase()}
          </label>
        ))}
      </div>

      <button className="add-btn" onClick={startAdd}>+ Enlist Record</button>

      {activeForm === 'new' && (
        <div className="form-card">
          <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Rank/Name" />
          <div style={{ display: 'flex', gap: 6 }}>
            <select style={{ flex: 1 }} value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })}>
              <option value="Male">Male</option><option value="Female">Female</option>
            </select>
            <select style={{ flex: 1 }} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
              <option value="in_service">In Service</option><option value="retired">Retired</option><option value="deceased">Deceased</option>
            </select>
          </div>
          <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} placeholder="DOB" />
          <select value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })}>
            <option value="">-- No Assignment --</option>
            {(deps as any[]).map(d => <option key={d.id} value={d.id}>{d.name} ({d.city})</option>)}
          </select>
          <div className="actions"><button onClick={() => handleSave()}>Submit</button><button onClick={() => setActiveForm(null)}>Cancel</button></div>
        </div>
      )}

      <div className="list" style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map((h: any) => (
          <div key={h.id} className="list-item" onClick={() => onNodeJump(h)}>
            <div className="list-item-header">
              <strong>{h.name}</strong>
              <span style={{ opacity: 0.5, fontSize: '0.8em', background: '#f0f0f0', padding: '2px 8px', borderRadius: 10 }}>{h.status.replace('_', ' ').toUpperCase()}</span>
            </div>

            {activeForm === h.id ? (
              <div className="form-card inner-form" onClick={e => e.stopPropagation()} style={{ marginTop: 12 }}>
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <select style={{ flex: 1 }} value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })}>
                    <option value="Male">Male</option><option value="Female">Female</option>
                  </select>
                  <select style={{ flex: 1 }} value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="in_service">In Service</option><option value="retired">Retired</option><option value="deceased">Deceased</option>
                  </select>
                </div>
                <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                <select value={formData.departmentId} onChange={e => setFormData({ ...formData, departmentId: e.target.value })}>
                  <option value="">-- No Assignment --</option>
                  {(deps as any[]).map(d => <option key={d.id} value={d.id}>{d.name} ({d.city})</option>)}
                </select>
                <div className="actions">
                  <button onClick={(e) => { e.stopPropagation(); handleSave(h.id); }}>Save Update</button>
                  <button onClick={(e) => { e.stopPropagation(); setActiveForm(null); }}>Discard</button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                {h.histories?.length > 0 && (
                  <div style={{ fontSize: '0.8em', color: '#666', marginBottom: 10, background: '#f9f9f9', padding: 8, borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <History size={12} /> Service History ({h.histories.length})
                    </div>
                    {h.histories.slice(0, 2).map((hist: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', opacity: i === 0 ? 1 : 0.6 }}>
                        <span>{hist.department.name}</span>
                        <span>{hist.startDate.split('T')[0]} - {hist.endDate ? hist.endDate.split('T')[0] : 'Present'}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="actions">
                  <button onClick={(e) => startEdit(h, e)}>Update File</button>
                  <button className="del" onClick={(e) => handleDelete(h.id, e)}>Discharge</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
