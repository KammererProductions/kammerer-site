// src/pages/AdminEvents.js — FINAL MASTERPIECE
import React, { useState, useEffect } from 'react';
import { API, graphqlOperation } from 'aws-amplify';

const listEvents = `query List {
  listEvents {
    items {
      id name startDateTime endDateTime timeZone featured eventLogo
      registrationUrl showRegistration
      meetInfoUrl showMeetInfo
      scheduleUrl showSchedule
      entriesUrl showEntries
      startListsUrl showStartLists
      liveResultsUrl showLiveResults
      pdfResultsUrl showPdfResults
      tfrrsResultsUrl showTfrrsResults
      notes isPublic
      facility { id name timeZone logos city state facilityType }
      client { id companyName logo }
      eventType
    }
  }
}`;

const createEvent = `mutation Create($input: CreateEventInput!) { createEvent(input: $input) { id } }`;
const updateEvent = `mutation Update($input: UpdateEventInput!) { updateEvent(input: $input) { id } }`;
const deleteEvent = `mutation Delete($input: DeleteEventInput!) { deleteEvent(input: $input) { id } }`;
const listFacilities = `query List { listFacilities { items { id name timeZone logos city state facilityType } } }`;
const listClients = `query List { listClients { items { id companyName logo } } }`;

const EVENT_TYPES = ['INDOOR_TRACK', 'OUTDOOR_TRACK', 'CROSS_COUNTRY'];
const TYPE_MAP = {
  INDOOR_TRACK: 'INDOOR_TRACK',
  OUTDOOR_TRACK: 'OUTDOOR_TRACK',
  CROSS_COUNTRY: 'CROSS_COUNTRY_COURSE'
};

const STATUS_COLORS = {
  SCHEDULED: '#6c757d',
  COMING_UP: '#007bff',
  LIVE: '#28a745',
  COMPLETED: '#6c757d'
};

const formatEventDate = (startISO, endISO) => {
  if (!startISO) return '';
  const start = new Date(startISO);
  const end = new Date(endISO || startISO);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonth = months[start.getMonth()];
  const startDay = start.getDate();
  const endMonth = months[end.getMonth()];
  const endDay = end.getDate();

  if (start.toDateString() === end.toDateString()) return `${startMonth} ${startDay}`;
  if (start.getMonth() === end.getMonth()) return `${startMonth} ${startDay}-${endDay}`;
  return `${shortMonths[start.getMonth()]} ${startDay} - ${shortMonths[end.getMonth()]} ${endDay}`;
};

const toLocalDateTime = (utcString, timeZone) => {
  if (!utcString || !timeZone) return '';
  try {
    const date = new Date(utcString);
    const options = { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
    const formatter = new Intl.DateTimeFormat('sv-SE', options);
    const parts = formatter.formatToParts(date);
    const map = parts.reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
  } catch (e) {
    console.error('Time conversion failed:', e);
    return '';
  }
};

const formatDateTime = (localString) => !localString ? null : new Date(localString).toISOString();

const calculateStatus = (startDateTime, endDateTime) => {
  const now = new Date();
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  const fiveDaysBefore = new Date(start);
  fiveDaysBefore.setDate(start.getDate() - 5);

  if (now < fiveDaysBefore) return 'SCHEDULED';
  if (now < start) return 'COMING_UP';
  if (now >= start && now <= end) return 'LIVE';
  return 'COMPLETED';
};

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // FILTER STATES — YOUR ORIGINAL FILTERING
  const [typeFilter, setTypeFilter] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [eventForm, setEventForm] = useState({
    name: '', start: '', end: '', facilityId: '', clientId: '', eventType: '',
    timeZone: '', eventLogo: '',
    registrationUrl: '', showRegistration: false,
    meetInfoUrl: '', showMeetInfo: false,
    scheduleUrl: '', showSchedule: false,
    entriesUrl: '', showEntries: false,
    startListsUrl: '', showStartLists: false,
    liveResultsUrl: '', showLiveResults: false,
    pdfResultsUrl: '', showPdfResults: false,
    tfrrsResultsUrl: '', showTfrrsResults: false,
    notes: '', isPublic: true, featured: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eRes, fRes, cRes] = await Promise.all([
        API.graphql(graphqlOperation(listEvents)),
        API.graphql(graphqlOperation(listFacilities)),
        API.graphql(graphqlOperation(listClients))
      ]);

      const rawEvents = eRes.data.listEvents.items || [];
      const eventsWithStatus = rawEvents.map(ev => ({
        ...ev,
        status: calculateStatus(ev.startDateTime, ev.endDateTime)
      }));

      const sortedEvents = eventsWithStatus.sort((a, b) => {
        const order = { LIVE: 0, COMING_UP: 1, SCHEDULED: 2, COMPLETED: 3 };
        const diff = (order[a.status] || 3) - (order[b.status] || 3);
        if (diff !== 0) return diff;
        return a.status === 'COMPLETED'
          ? new Date(b.endDateTime) - new Date(a.endDateTime)
          : new Date(a.startDateTime) - new Date(b.startDateTime);
      });

      setEvents(sortedEvents);
      setFacilities(fRes.data.listFacilities.items || []);
      setClients(cRes.data.listClients.items || []);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventForm.facilityId) {
      const facility = facilities.find(f => f.id === eventForm.facilityId);
      if (facility) {
        setEventForm(prev => ({ ...prev, timeZone: facility.timeZone || '' }));
      }
    }
  }, [eventForm.facilityId, facilities]);

  const openModal = (ev = null) => {
    if (ev) {
      setEditingEvent(ev.id);
      const facilityTimeZone = ev.facility?.timeZone || 'America/New_York';
      setEventForm({
        name: ev.name || '',
        start: toLocalDateTime(ev.startDateTime, facilityTimeZone),
        end: toLocalDateTime(ev.endDateTime, facilityTimeZone),
        facilityId: ev.facility?.id || '',
        clientId: ev.client?.id || '',
        eventType: ev.eventType || '',
        timeZone: ev.timeZone || '',
        eventLogo: ev.eventLogo || '',
        registrationUrl: ev.registrationUrl || '',
        showRegistration: !!ev.showRegistration,
        meetInfoUrl: ev.meetInfoUrl || '',
        showMeetInfo: !!ev.showMeetInfo,
        scheduleUrl: ev.scheduleUrl || '',
        showSchedule: !!ev.showSchedule,
        entriesUrl: ev.entriesUrl || '',
        showEntries: !!ev.showEntries,
        startListsUrl: ev.startListsUrl || '',
        showStartLists: !!ev.showStartLists,
        liveResultsUrl: ev.liveResultsUrl || '',
        showLiveResults: !!ev.showLiveResults,
        pdfResultsUrl: ev.pdfResultsUrl || '',
        showPdfResults: !!ev.showPdfResults,
        tfrrsResultsUrl: ev.tfrrsResultsUrl || '',
        showTfrrsResults: !!ev.showTfrrsResults,
        notes: ev.notes || '',
        isPublic: ev.isPublic ?? true,
        featured: ev.featured ?? false
      });
    } else {
      setEditingEvent(null);
      setEventForm({
        name: '', start: '', end: '', facilityId: '', clientId: '', eventType: '',
        timeZone: '', eventLogo: '',
        registrationUrl: '', showRegistration: false,
        meetInfoUrl: '', showMeetInfo: false,
        scheduleUrl: '', showSchedule: false,
        entriesUrl: '', showEntries: false,
        startListsUrl: '', showStartLists: false,
        liveResultsUrl: '', showLiveResults: false,
        pdfResultsUrl: '', showPdfResults: false,
        tfrrsResultsUrl: '', showTfrrsResults: false,
        notes: '', isPublic: true, featured: false
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.name || !eventForm.start || !eventForm.end || !eventForm.facilityId || !eventForm.eventType || !eventForm.timeZone) {
      alert('Name, Start, End, Facility, Type, and Time Zone are REQUIRED');
      return;
    }

    try {
      const input = {
        name: eventForm.name,
        startDateTime: formatDateTime(eventForm.start),
        endDateTime: formatDateTime(eventForm.end),
        facilityID: eventForm.facilityId,
        clientID: eventForm.clientId || null,
        eventType: eventForm.eventType,
        timeZone: eventForm.timeZone,
        eventLogo: eventForm.eventLogo || null,
        registrationUrl: eventForm.registrationUrl || null,
        showRegistration: eventForm.showRegistration,
        meetInfoUrl: eventForm.meetInfoUrl || null,
        showMeetInfo: eventForm.showMeetInfo,
        scheduleUrl: eventForm.scheduleUrl || null,
        showSchedule: eventForm.showSchedule,
        entriesUrl: eventForm.entriesUrl || null,
        showEntries: eventForm.showEntries,
        startListsUrl: eventForm.startListsUrl || null,
        showStartLists: eventForm.showStartLists,
        liveResultsUrl: eventForm.liveResultsUrl || null,
        showLiveResults: eventForm.showLiveResults,
        pdfResultsUrl: eventForm.pdfResultsUrl || null,
        showPdfResults: eventForm.showPdfResults,
        tfrrsResultsUrl: eventForm.tfrrsResultsUrl || null,
        showTfrrsResults: eventForm.showTfrrsResults,
        notes: eventForm.notes || null,
        isPublic: eventForm.isPublic,
        featured: eventForm.featured
      };

      if (editingEvent) {
        input.id = editingEvent;
        await API.graphql(graphqlOperation(updateEvent, { input }));
      } else {
        await API.graphql(graphqlOperation(createEvent, { input }));
      }
      closeModal();
      loadData();
    } catch (e) {
      console.error('Save failed:', e);
      alert('Save failed — check console');
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Delete event?')) return;
    try {
      await API.graphql(graphqlOperation(deleteEvent, { input: { id } }));
      loadData();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const toggleShow = async (id, field) => {
    const showKey = `show${field.charAt(0).toUpperCase() + field.slice(1)}`;
    const currentEvent = events.find(ev => ev.id === id);
    const newValue = !currentEvent[showKey];
    try {
      await API.graphql(graphqlOperation(updateEvent, { input: { id, [showKey]: newValue } }));
      setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, [showKey]: newValue } : ev));
    } catch (e) {
      alert('Toggle failed');
    }
  };

  const filteredFacilities = eventForm.eventType
    ? facilities.filter(f => f.facilityType === TYPE_MAP[eventForm.eventType])
    : facilities;
  const selectedFacility = facilities.find(f => f.id === eventForm.facilityId);
  const facilityLogos = selectedFacility?.logos || [];

  // YOUR ORIGINAL FILTERING SYSTEM
  const filteredEvents = events.filter(ev => {
    if (typeFilter && ev.eventType !== typeFilter) return false;
    if (facilityFilter && ev.facility?.id !== facilityFilter) return false;
    if (clientFilter && ev.client?.id !== clientFilter) return false;
    if (dateFrom && new Date(ev.startDateTime) < new Date(dateFrom)) return false;
    if (dateTo && new Date(ev.endDateTime) > new Date(dateTo)) return false;
    return true;
  });

  // GROUP BY YEAR
  const eventsByYear = filteredEvents.reduce((groups, ev) => {
    const year = new Date(ev.startDateTime).getFullYear();
    if (!groups[year]) groups[year] = [];
    groups[year].push(ev);
    return groups;
  }, {});
  const years = Object.keys(eventsByYear).sort((a, b) => b - a);

  if (loading) return <p>Loading events...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Events ({filteredEvents.length})</h1>
        <button onClick={() => openModal()} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}>
          + Create Event
        </button>
      </div>

      {/* YOUR ORIGINAL FILTERS */}
      <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={facilityFilter} onChange={e => setFacilityFilter(e.target.value)}>
            <option value="">All Facilities</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="To" />
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <p>No events match your filters.</p>
      ) : (
        <div>
          {years.map(year => (
            <div key={year} style={{ marginBottom: '2rem' }}>
              <h2 style={{
                margin: '0 0 1rem 0',
                padding: '0.5rem 1rem',
                backgroundColor: '#0A2B4E',
                color: 'white',
                borderRadius: '8px',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>
                {year}
              </h2>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {eventsByYear[year].map(ev => {
                  const isExpanded = expanded[ev.id] || false;
                  return (
                    <li key={ev.id} style={{ marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                      <div
                        style={{ padding: '0.75rem', backgroundColor: '#f8f9fa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        onClick={() => setExpanded(prev => ({ ...prev, [ev.id]: !prev[ev.id] }))}
                      >
                        {ev.eventLogo && (
                          <img src={ev.eventLogo} alt="Event Logo" style={{ width: 40, height: 40, objectFit: 'contain', marginRight: '0.75rem' }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong>{ev.name}</strong>
                            {ev.featured && <span style={{ backgroundColor: '#ffc107', color: '#212529', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>FEATURED</span>}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#555' }}>
                            {formatEventDate(ev.startDateTime, ev.endDateTime)} • {ev.facility?.city}, {ev.facility?.state}
                          </div>
                        </div>
                        {ev.client?.logo && (
                          <img src={ev.client.logo} alt={ev.client.companyName} style={{ width: 60, height: 30, objectFit: 'contain', marginRight: '1rem' }} />
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            backgroundColor: STATUS_COLORS[ev.status] || '#999',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem'
                          }}>
                            {(ev.status || 'UNKNOWN').replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: '1.2rem' }}>{isExpanded ? '−' : '+'}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '1rem', backgroundColor: 'white' }}>
                          <p><strong>Facility:</strong> {ev.facility?.name || '—'}</p>
                          <p><strong>Client:</strong> {ev.client?.companyName || '—'}</p>
                          {ev.notes && <p><em>{ev.notes}</em></p>}

                          <div style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>
                            {[
                              { key: 'registration', label: 'Registration' },
                              { key: 'meetInfo', label: 'Meet Info' },
                              { key: 'schedule', label: 'Schedule' },
                              { key: 'entries', label: 'Entries' },
                              { key: 'startLists', label: 'Start Lists' },
                              { key: 'liveResults', label: 'Live Results' },
                              { key: 'pdfResults', label: 'PDF Results' },
                              { key: 'tfrrsResults', label: 'TFRRS Results' }
                            ].map(({ key, label }) => {
                              const urlKey = `${key}Url`;
                              const showKey = `show${key.charAt(0).toUpperCase() + key.slice(1)}`;
                              const url = ev[urlKey];
                              const show = ev[showKey];
                              return (
                                <div key={key} style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ width: '100px', color: '#666' }}>{label}:</span>
                                  <input
                                    type="text"
                                    value={url || ''}
                                    disabled
                                    style={{
                                      flex: 1,
                                      padding: '0.25rem',
                                      border: '1px solid #ccc',
                                      borderRadius: '4px',
                                      backgroundColor: '#f8f9fa',
                                      color: url ? '#007bff' : '#ccc'
                                    }}
                                  />
                                  <input
                                    type="checkbox"
                                    checked={show}
                                    onChange={() => toggleShow(ev.id, key)}
                                  />
                                </div>
                              );
                            })}
                          </div>

                          <div style={{ marginTop: '1rem' }}>
                            <button onClick={() => openModal(ev)}>Edit</button>
                            <button onClick={() => handleDeleteEvent(ev.id)} style={{ marginLeft: '0.5rem', color: 'red' }}>Delete</button>
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

      {/* MODAL — FULLY WORKING WITH TRUE LOCAL TIMES */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2>{editingEvent ? 'Update' : 'Create'} Event</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input placeholder="Name" value={eventForm.name} onChange={e => setEventForm({ ...eventForm, name: e.target.value })} />
              <input type="datetime-local" value={eventForm.start} onChange={e => setEventForm({ ...eventForm, start: e.target.value })} />
              <input type="datetime-local" value={eventForm.end} onChange={e => setEventForm({ ...eventForm, end: e.target.value })} />
              <select value={eventForm.eventType} onChange={e => setEventForm({ ...eventForm, eventType: e.target.value, facilityId: '' })}>
                <option value="">Select Type *</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
              <select value={eventForm.facilityId} onChange={e => setEventForm({ ...eventForm, facilityId: e.target.value })}>
                <option value="">Select Facility ({filteredFacilities.length})</option>
                {filteredFacilities.map(f => <option key={f.id} value={f.id}>{f.name} ({f.timeZone})</option>)}
              </select>
              <select value={eventForm.clientId} onChange={e => setEventForm({ ...eventForm, clientId: e.target.value })}>
                <option value="">Client (Optional)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
              {eventForm.facilityId && facilityLogos.length > 0 && (
                <select value={eventForm.eventLogo} onChange={e => setEventForm({ ...eventForm, eventLogo: e.target.value })}>
                  <option value="">Select Event Logo</option>
                  {facilityLogos.map((url, i) => {
                    const filename = url.split('/').pop().split('?')[0];
                    return <option key={i} value={url}>{filename}</option>;
                  })}
                </select>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Time Zone:</strong> {eventForm.timeZone || 'Select facility'}
              </div>
              {['registration', 'meetInfo', 'schedule', 'entries', 'startLists', 'liveResults', 'pdfResults', 'tfrrsResults'].map(key => {
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                const urlKey = `${key}Url`;
                const showKey = `show${key.charAt(0).toUpperCase() + key.slice(1)}`;
                return (
                  <div key={key} style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
                    <input placeholder={`${label} URL`} value={eventForm[urlKey]} onChange={e => setEventForm({ ...eventForm, [urlKey]: e.target.value })} />
                    <label><input type="checkbox" checked={eventForm[showKey]} onChange={e => setEventForm({ ...eventForm, [showKey]: e.target.checked })} /> Show</label>
                  </div>
                );
              })}
              <textarea placeholder="Notes" value={eventForm.notes} onChange={e => setEventForm({ ...eventForm, notes: e.target.value })} rows={2} style={{ gridColumn: '1 / -1' }} />
              <label style={{ gridColumn: '1 / -1' }}><input type="checkbox" checked={eventForm.isPublic} onChange={e => setEventForm({ ...eventForm, isPublic: e.target.checked })} /> Public Event</label>
              <label style={{ gridColumn: '1 / -1' }}><input type="checkbox" checked={eventForm.featured} onChange={e => setEventForm({ ...eventForm, featured: e.target.checked })} /> Featured</label>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleSaveEvent}>{editingEvent ? 'Update' : 'Create'}</button>
                <button onClick={closeModal} style={{ backgroundColor: '#6c757d' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}