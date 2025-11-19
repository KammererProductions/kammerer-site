// src/pages/AdminCompanies.js
import React, { useState, useEffect } from 'react';
import { API, graphqlOperation, Storage } from 'aws-amplify';

const listClients = `query List {
  listClients {
    items {
      id companyName companyWebsite companyDescription logo
    }
  }
}`;
const createClient = `mutation Create($input: CreateClientInput!) { createClient(input: $input) { id } }`;
const updateClient = `mutation Update($input: UpdateClientInput!) { updateClient(input: $input) { id } }`;
const deleteClient = `mutation Delete($input: DeleteClientInput!) { deleteClient(input: $input) { id } }`;

export default function AdminCompanies() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const [clientForm, setClientForm] = useState({
    companyName: '', companyWebsite: '', companyDescription: '', logo: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await API.graphql(graphqlOperation(listClients));
      const items = res.data.listClients.items || [];
      setClients(items);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (companyName) => {
    if (!logoFile) return null;
    const sanitizedName = companyName.replace(/[^a-zA-Z0-9-]/g, '_');
    const key = `Companies/${sanitizedName}/${logoFile.name}`;
    await Storage.put(key, logoFile, {
      level: 'public',
      contentType: 'image/png'
    });
    return `https://${process.env.REACT_APP_S3_BUCKET || 'kammererfacilitiesba978-dev'}.s3.amazonaws.com/public/${key}`;
  };

  const openModal = (c = null) => {
    if (c) {
      setEditingClient(c.id);
      setClientForm({
        companyName: c.companyName ?? '',
        companyWebsite: c.companyWebsite ?? '',
        companyDescription: c.companyDescription ?? '',
        logo: c.logo ?? ''
      });
    } else {
      setEditingClient(null);
      setClientForm({
        companyName: '', companyWebsite: '', companyDescription: '', logo: ''
      });
    }
    setLogoFile(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setLogoFile(null);
  };

  const handleSaveClient = async () => {
    if (!clientForm.companyName?.trim()) {
      alert('Company Name is required');
      return;
    }
    try {
      const logoUrl = logoFile ? await uploadLogo(clientForm.companyName) : clientForm.logo;
      const input = {
        companyName: clientForm.companyName,
        companyWebsite: clientForm.companyWebsite || null,
        companyDescription: clientForm.companyDescription || null,
        logo: logoUrl
      };

      if (editingClient) {
        input.id = editingClient;
        await API.graphql(graphqlOperation(updateClient, { input }));
      } else {
        await API.graphql(graphqlOperation(createClient, { input }));
      }
      closeModal();
      loadData();
    } catch (e) {
      console.error('Save failed:', e);
      alert('Save failed — check console');
    }
  };

  const handleDeleteClient = async (id) => {
    if (!window.confirm('Delete company?')) return;
    try {
      await API.graphql(graphqlOperation(deleteClient, { input: { id } }));
      loadData();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  if (loading) return <p>Loading companies...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Companies</h1>
        <button onClick={() => openModal()} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}>
          + Create Company
        </button>
      </div>

      {clients.length === 0 ? (
        <p>No companies.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {clients.map(c => {
            const isExpanded = expanded[c.id] || false;
            return (
              <li key={c.id} style={{ marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                <div
                  style={{ padding: '0.75rem', backgroundColor: '#f8f9fa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  onClick={() => setExpanded(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                >
                  {c.logo && (
                    <img src={c.logo} alt="Logo" style={{ width: 60, height: 40, objectFit: 'contain', marginRight: '0.75rem' }} />
                  )}

                  <div style={{ flex: 1 }}>
                    <strong>{c.companyName}</strong>
                  </div>

                  <span style={{ fontSize: '1.2rem' }}>{isExpanded ? '−' : '+'}</span>
                </div>

                {isExpanded && (
                  <div style={{ padding: '1rem', backgroundColor: 'white' }}>
                    {c.companyWebsite && <p><a href={c.companyWebsite} target="_blank" rel="noreferrer">{c.companyWebsite}</a></p>}
                    {c.companyDescription && <p>{c.companyDescription}</p>}
                    {c.logo && <img src={c.logo} alt="Logo" style={{ width: 120, height: 80, objectFit: 'contain', marginTop: '0.5rem' }} />}

                    <div style={{ marginTop: '1rem' }}>
                      <button onClick={() => openModal(c)}>Edit</button>
                      <button onClick={() => handleDeleteClient(c.id)} style={{ marginLeft: '0.5rem', color: 'red' }}>Delete</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* === MODAL FORM === */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>{editingClient ? 'Update' : 'Create'} Company</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
              <input placeholder="Company Name *" value={clientForm.companyName} onChange={e => setClientForm({ ...clientForm, companyName: e.target.value })} />
              <input placeholder="Website" value={clientForm.companyWebsite} onChange={e => setClientForm({ ...clientForm, companyWebsite: e.target.value })} />
              <textarea placeholder="Description" value={clientForm.companyDescription} onChange={e => setClientForm({ ...clientForm, companyDescription: e.target.value })} rows={3} />
              <div>
                <label>Logo (PNG):</label>
                <input type="file" accept="image/png" onChange={e => setLogoFile(e.target.files[0])} />
              </div>
              {clientForm.logo && (
                <div>
                  <img src={clientForm.logo} alt="Current Logo" style={{ width: 120, height: 80, objectFit: 'contain', marginTop: '0.5rem' }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleSaveClient}>{editingClient ? 'Update' : 'Create'}</button>
                <button onClick={closeModal} style={{ backgroundColor: '#6c757d' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}