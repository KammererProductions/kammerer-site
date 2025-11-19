// src/pages/AdminFacilities.js — FINAL MASTERPIECE
import React, { useState, useEffect } from 'react';
import { API, graphqlOperation, Storage } from 'aws-amplify';

const listFacilitiesQuery = /* GraphQL */ `
  query ListFacilities {
    listFacilities {
      items {
        id
        name
        timeZone
        address
        city
        state
        zipcode
        latitude
        longitude
        facilityType
        logos
        description
      }
    }
  }
`;

const listEvents = /* GraphQL */ `
  query ListEvents {
    listEvents {
      items {
        facilityID
      }
    }
  }
`;

const createFacility = /* GraphQL */ `
  mutation CreateFacility($input: CreateFacilityInput!) {
    createFacility(input: $input) {
      id
    }
  }
`;

const updateFacility = /* GraphQL */ `
  mutation UpdateFacility($input: UpdateFacilityInput!) {
    updateFacility(input: $input) {
      id
    }
  }
`;

const deleteFacility = /* GraphQL */ `
  mutation DeleteFacility($input: DeleteFacilityInput!) {
    deleteFacility(input: $input) {
      id
    }
  }
`;

const FACILITY_TYPES = ['INDOOR_TRACK', 'OUTDOOR_TRACK', 'CROSS_COUNTRY_COURSE'];
const TIMEZONES = [
  // Americas
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto', 'America/Vancouver',
  'America/Mexico_City', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires',

  // Europe
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid',
  'Europe/Amsterdam', 'Europe/Zurich', 'Europe/Oslo', 'Europe/Stockholm',

  // Africa / Middle East
  'Africa/Cairo', 'Africa/Johannesburg', 'Asia/Dubai',

  // Asia / Pacific
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore', 'Asia/Seoul',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Pacific/Auckland'
];

export default function AdminFacilities() {
  const [facilities, setFacilities] = useState([]);
  const [eventCounts, setEventCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [addLogoFacilityId, setAddLogoFacilityId] = useState(null);
  const [logoFiles, setLogoFiles] = useState([]);

  // FILTER STATES
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [facilityForm, setFacilityForm] = useState({
    name: '', address: '', city: '', state: '', zipcode: '', latitude: '', longitude: '',
    facilityType: '', logos: [], description: '', timeZone: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [facRes, eventRes] = await Promise.all([
        API.graphql(graphqlOperation(listFacilitiesQuery)),
        API.graphql(graphqlOperation(listEvents))
      ]);

      const items = facRes.data?.listFacilities?.items || [];
      const cleanItems = items.filter(f => f !== null);

      // Count events per facility
      const counts = {};
      (eventRes.data?.listEvents?.items || []).forEach(ev => {
        if (ev.facilityID) {
          counts[ev.facilityID] = (counts[ev.facilityID] || 0) + 1;
        }
      });

      setEventCounts(counts);
      setFacilities(cleanItems);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load facilities. Check console.');
    } finally {
      setLoading(false);
    }
  };

  // === FILTERED & GROUPED DATA ===
  const filteredFacilities = facilities.filter(f => {
    if (searchTerm && !f.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (stateFilter && f.state !== stateFilter) return false;
    if (typeFilter && f.facilityType !== typeFilter) return false;
    return true;
  });

// === GROUP BY STATE OR "INTERNATIONAL" ===
const facilitiesByGroup = filteredFacilities.reduce((groups, f) => {
  let key = f.state || 'Unknown';
  
  // ANYTHING NOT A U.S. STATE → "International"
  const usStates = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  
  if (!usStates.includes(f.state) && f.state) {
    key = 'International';
  }

  if (!groups[key]) groups[key] = [];
  groups[key].push(f);
  return groups;
}, {});

// Sort: USA states alphabetical, then "International" at bottom
const sortedKeys = Object.keys(facilitiesByGroup)
  .sort((a, b) => {
    if (a === 'International') return 1;
    if (b === 'International') return -1;
    return a.localeCompare(b);
  });

// Within each group, alphabetize by name
Object.keys(facilitiesByGroup).forEach(key => {
  facilitiesByGroup[key].sort((a, b) => a.name.localeCompare(b.name));
});

  // === LOGO UPLOAD LOGIC (unchanged) ===
  const logoExists = (fileName) => {
    return facilityForm.logos.some(url => {
      const existingName = decodeURIComponent(url.split('/').pop().split('?')[0]);
      return existingName === fileName;
    });
  };

  const uploadLogos = async (facilityName) => {
    const sanitizedName = facilityName.replace(/[^a-zA-Z0-9-]/g, '_');
    const urls = [];
    for (const file of logoFiles) {
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const exists = logoExists(cleanFileName);
      let shouldUpload = true;
      if (exists) {
        shouldUpload = window.confirm(`"${cleanFileName}" already exists. Replace it?`);
        if (!shouldUpload) continue;
      }
      const key = `facilities/${sanitizedName}/${cleanFileName}`;
      try {
        await Storage.put(key, file, {
          level: 'public',
          contentType: file.type || 'image/png'
        });
        const url = `https://${process.env.REACT_APP_S3_BUCKET || 'kammererfacilitiesba978-dev'}.s3.amazonaws.com/public/${key}`;
        urls.push(url);
      } catch (err) {
        console.error('Upload failed:', err);
        alert(`Failed to upload ${cleanFileName}`);
      }
    }
    return urls.filter(Boolean);
  };

  const openModal = (f = null) => {
    if (f) {
      setEditingFacility(f.id);
      setFacilityForm({
        name: f.name ?? '',
        address: f.address ?? '',
        city: f.city ?? '',
        state: f.state ?? '',
        zipcode: f.zipcode ?? '',
        latitude: f.latitude ?? '',
        longitude: f.longitude ?? '',
        facilityType: f.facilityType ?? '',
        logos: f.logos ?? [],
        description: f.description ?? '',
        timeZone: f.timeZone ?? ''
      });
    } else {
      setEditingFacility(null);
      setFacilityForm({
        name: '', address: '', city: '', state: '', zipcode: '', latitude: '', longitude: '',
        facilityType: '', logos: [], description: '', timeZone: ''
      });
    }
    setLogoFiles([]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingFacility(null);
    setAddLogoFacilityId(null);
    setLogoFiles([]);
  };

  const handleSaveFacility = async () => {
    if (!addLogoFacilityId && (!facilityForm.name?.trim() || !facilityForm.timeZone)) {
      alert('Name and Time Zone are required');
      return;
    }
    if (logoFiles.length === 0 && addLogoFacilityId) {
      alert('Please select at least one logo');
      return;
    }

    try {
      let logoUrls = facilityForm.logos || [];
      if (logoFiles.length > 0) {
        const newUrls = await uploadLogos(facilityForm.name);
        const uploadedNames = logoFiles.map(f => f.name.replace(/[^a-zA-Z0-9.\-_]/g, '_'));
        logoUrls = logoUrls.filter(url => {
          const existingName = decodeURIComponent(url.split('/').pop().split('?')[0]);
          return !uploadedNames.includes(existingName);
        });
        logoUrls = [...logoUrls, ...newUrls];
      }

      const input = {
        name: facilityForm.name,
        address: facilityForm.address || null,
        city: facilityForm.city || null,
        state: facilityForm.state || null,
        zipcode: facilityForm.zipcode || null,
        latitude: facilityForm.latitude ? parseFloat(facilityForm.latitude) : null,
        longitude: facilityForm.longitude ? parseFloat(facilityForm.longitude) : null,
        facilityType: facilityForm.facilityType || null,
        description: facilityForm.description || null,
        timeZone: facilityForm.timeZone,
        logos: logoUrls
      };

      if (editingFacility || addLogoFacilityId) {
        input.id = editingFacility || addLogoFacilityId;
        await API.graphql(graphqlOperation(updateFacility, { input }));
      } else {
        await API.graphql(graphqlOperation(createFacility, { input }));
      }
      closeModal();
      loadData();
    } catch (e) {
      console.error('Save failed:', e);
      alert('Save failed — check console');
    }
  };

  const handleAddLogoClick = (facilityId, facilityName) => {
    setAddLogoFacilityId(facilityId);
    setFacilityForm(prev => ({ ...prev, name: facilityName }));
    setShowModal(true);
  };

  const handleDeleteFacility = async (id) => {
    if (!window.confirm('Delete facility?')) return;
    try {
      await API.graphql(graphqlOperation(deleteFacility, { input: { id } }));
      loadData();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const handleDeleteLogo = async (url, index) => {
    if (!window.confirm('Delete this logo?')) return;
    try {
      const key = decodeURIComponent(url.split('/public/')[1]?.split('?')[0] || '');
      await Storage.remove(key);
      const newLogos = facilityForm.logos.filter((_, i) => i !== index);
      setFacilityForm({ ...facilityForm, logos: newLogos });
    } catch (e) {
      console.error('Delete logo failed:', e);
      alert('Failed to delete logo');
    }
  };

  if (loading) return <p>Loading facilities...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  const uniqueStates = [...new Set(facilities.map(f => f.state).filter(Boolean))].sort();

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Facilities ({filteredFacilities.length})</h1>
        <button onClick={() => openModal()} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}>
          + Create Facility
        </button>
      </div>

      {/* FILTERS */}
      <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
            <option value="">All States</option>
            {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {FACILITY_TYPES.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      { sortedKeys.length === 0 ? (
  <p>No facilities match your filters.</p>
) : (
  <div>
    {sortedKeys.map(groupKey => (
      <div key={groupKey} style={{ marginBottom: '3rem' }}>
        <h2 style={{
          margin: '0 0 1.5rem 0',
          padding: '0.75rem 1.5rem',
          backgroundColor: groupKey === 'International' ? '#1e40af' : '#0A2B4E',
          color: 'white',
          borderRadius: '12px',
          fontSize: '1.8rem',
          fontWeight: 'bold',
          display: 'inline-block'
        }}>
          {groupKey === 'International' ? `International (${facilitiesByGroup[groupKey].length})` : `${groupKey} (${facilitiesByGroup[groupKey].length})`}
        </h2>

        <ul style={{ listStyle: 'none', padding: 0 }}>
  {facilitiesByGroup[groupKey].map(f => {
    const isExpanded = expanded[f.id] || false;
    const eventCount = eventCounts[f.id] || 0;

    return (
      <li key={f.id} style={{ marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
        <div
          style={{ padding: '0.75rem', backgroundColor: '#f8f9fa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          onClick={() => setExpanded(prev => ({ ...prev, [f.id]: !prev[f.id] }))}
        >
          {f.logos?.[0] && (
            <img src={f.logos[0]} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain', marginRight: '0.75rem' }} />
          )}
          <div style={{ flex: 1 }}>
            <strong>{f.name}</strong>
            <div style={{ fontSize: '0.875rem', color: '#555' }}>
              {f.city && `${f.city}, `}{f.state || 'International'} • {f.facilityType?.replace(/_/g, ' ')}
            </div>
          </div>
          <span style={{ fontSize: '1.2rem' }}>{isExpanded ? '−' : '+'}</span>
        </div>

        {isExpanded && (
          <div style={{ padding: '1.5rem', backgroundColor: 'white' }}>
            <p><strong>Address:</strong> {f.address || '—'}, {f.city}, {f.state || 'International'} {f.zipcode}</p>
            <p><strong>Coordinates:</strong> {f.latitude ?? '—'}, {f.longitude ?? '—'}</p>
            <p><strong>Time Zone:</strong> {f.timeZone}</p>
            <p><strong>Number of Events Hosted:</strong> <strong style={{ color: '#007bff' }}>{eventCount}</strong></p>
            {f.description && <p><em>{f.description}</em></p>}

            {f.logos?.length > 0 && (
              <div style={{ margin: '1rem 0' }}>
                <strong>Logos:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '0.5rem' }}>
                  {f.logos.map((url, i) => (
                    <img key={i} src={url} alt="Logo" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '6px' }} />
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={() => openModal(f)}>Edit Facility</button>
              <button onClick={() => handleAddLogoClick(f.id, f.name)} style={{ backgroundColor: '#007bff', color: 'white' }}>
                Add Logo
              </button>
              <button onClick={() => handleDeleteFacility(f.id)} style={{ color: 'red' }}>Delete</button>
            </div>
          </div>
        )}
      </li>
    );
  })}
</ul>
            </div>
          ))}
        </div>
      )}

      {/* MODAL — UNCHANGED BUT CLEANED */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>
              {addLogoFacilityId ? `Add Logo to ${facilityForm.name}` : editingFacility ? 'Update' : 'Create'} Facility
            </h2>
            {!addLogoFacilityId && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input placeholder="Name *" value={facilityForm.name} onChange={e => setFacilityForm({ ...facilityForm, name: e.target.value })} />
                <input placeholder="Address" value={facilityForm.address} onChange={e => setFacilityForm({ ...facilityForm, address: e.target.value })} />
                <input placeholder="City" value={facilityForm.city} onChange={e => setFacilityForm({ ...facilityForm, city: e.target.value })} />
                <input placeholder="State" value={facilityForm.state} onChange={e => setFacilityForm({ ...facilityForm, state: e.target.value })} />
                <input placeholder="Zipcode" value={facilityForm.zipcode} onChange={e => setFacilityForm({ ...facilityForm, zipcode: e.target.value })} />
                <input placeholder="Latitude" value={facilityForm.latitude} onChange={e => setFacilityForm({ ...facilityForm, latitude: e.target.value })} />
                <input placeholder="Longitude" value={facilityForm.longitude} onChange={e => setFacilityForm({ ...facilityForm, longitude: e.target.value })} />
                <select value={facilityForm.facilityType} onChange={e => setFacilityForm({ ...facilityForm, facilityType: e.target.value })}>
                  <option value="">Select Type</option>
                  {FACILITY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
                <select value={facilityForm.timeZone} onChange={e => setFacilityForm({ ...facilityForm, timeZone: e.target.value })}>
                  <option value="">Select Time Zone *</option>
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
                <textarea placeholder="Description" value={facilityForm.description} onChange={e => setFacilityForm({ ...facilityForm, description: e.target.value })} rows={2} style={{ gridColumn: '1 / -1' }} />
              </div>
            )}
            <div style={{ marginTop: '1rem' }}>
              <label>Add Logos (PNG):</label>
              <input type="file" multiple accept="image/png" onChange={e => setLogoFiles(Array.from(e.target.files))} />
            </div>
            {facilityForm.logos?.length > 0 && !addLogoFacilityId && (
              <div style={{ marginTop: '0.75rem' }}>
                <label>Current Logos:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {facilityForm.logos.map((url, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={url} alt="Logo" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '4px' }} />
                      <button
                        onClick={() => handleDeleteLogo(url, i)}
                        style={{
                          position: 'absolute', top: -8, right: -8,
                          background: 'red', color: 'white', border: 'none',
                          borderRadius: '50%', width: 24, height: 24, fontSize: '0.8rem', cursor: 'pointer'
                        }}
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleSaveFacility}>
                {addLogoFacilityId ? 'Upload Logos' : editingFacility ? 'Update' : 'Create'}
              </button>
              <button onClick={closeModal} style={{ backgroundColor: '#6c757d', color: 'white' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}