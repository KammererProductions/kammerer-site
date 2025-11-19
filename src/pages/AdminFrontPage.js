// src/pages/AdminFrontPage.js — FINAL & PERFECT
import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { API, graphqlOperation } from 'aws-amplify';

const listEvents = `query List {
  listEvents {
    items {
      id name startDateTime endDateTime status timeZone featured eventLogo frontPageOrder
      registrationUrl showRegistration
      meetInfoUrl showMeetInfo
      scheduleUrl showSchedule
      entriesUrl showEntries
      startListsUrl showStartLists
      liveResultsUrl showLiveResults
      pdfResultsUrl showPdfResults
      tfrrsResultsUrl showTfrrsResults
      facility { id name city state }
      client { id companyName logo }
    }
  }
}`;

const updateEvent = `mutation Update($input: UpdateEventInput!) { updateEvent(input: $input) { id } }`;

// === SMART DATE FORMATTER ===
const formatEventDate = (startISO, endISO) => {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonth = months[start.getMonth()];
  const startDay = start.getDate();
  const endMonth = months[end.getMonth()];
  const endDay = end.getDate();

  if (start.toDateString() === end.toDateString()) {
    return `${startMonth} ${startDay}`;
  }
  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${shortMonths[start.getMonth()]} ${startDay} - ${shortMonths[end.getMonth()]} ${endDay}`;
};

// === STATUS CALCULATION (CLIENT-SIDE) ===
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

const STATUS_COLORS = {
  SCHEDULED: '#6c757d',
  COMING_UP: '#007bff',
  LIVE: '#28a745',
  COMPLETED: '#6c757d'
};

function SortableEventCard({ event, isExpanded, onToggleExpand, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const status = event.status || calculateStatus(event.startDateTime, event.endDateTime);

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          padding: '0.75rem',
          backgroundColor: '#f8f9fa',
          cursor: 'pointer',
          border: '1px solid #ddd',
          borderRadius: '8px',
          marginBottom: '1rem',
          overflow: 'hidden',
          position: 'relative'
        }}
        onClick={() => onToggleExpand(event.id)}
      >
        <div
          {...attributes}
          {...listeners}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            cursor: 'grab',
            fontSize: '1_viewer.6rem',
            color: '#888',
            userSelect: 'none',
            zIndex: 10
          }}
          onClick={(e) => e.stopPropagation()}
        >
          ⋮⋮
        </div>

        <div style={{ display: 'flex', alignItems: 'center', paddingRight: '3rem' }}>
          {event.eventLogo && (
            <img src={event.eventLogo} alt="" style={{ width: 40, height: 40, objectFit: 'contain', marginRight: '0.75rem' }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <strong>{event.name}</strong>
              <span style={{
                backgroundColor: STATUS_COLORS[status] || '#999',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>
                {status.replace(/_/g, ' ')}
              </span>
            </div>
            <div style={{ fontSize: '0.875rem', color: '#555', marginTop: '4px' }}>
              {event.facility?.name && `${event.facility.name} • `}
              {event.facility?.city && `${event.facility.city}, ${event.facility.state} • `}
              {formatEventDate(event.startDateTime, event.endDateTime)}
            </div>
          </div>

          {/* CLIENT LOGO */}
          {event.client?.logo && (
            <img
              src={event.client.logo}
              alt={event.client.companyName}
              style={{ width: 50, height: 30, objectFit: 'contain', marginLeft: '1rem' }}
            />
          )}

          <span style={{ fontSize: '1.2rem', color: '#666', marginLeft: '1rem' }}>
            {isExpanded ? '−' : '+'}
          </span>
        </div>
      </div>

      {/* EXPANDED CONTENT */}
      {isExpanded && (
        <div style={{ padding: '1rem', backgroundColor: 'white', border: '1px solid #ddd', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
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
              const url = event[urlKey];
              const show = event[showKey];
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
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onEdit(event.id, key)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '1rem', textAlign: 'right' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(event.id);
              }}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Edit Event
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminFrontPage() {
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await API.graphql(graphqlOperation(listEvents));
      const items = res.data.listEvents.items || [];
      const featured = items
        .filter(e => e.featured)
        .sort((a, b) => (a.frontPageOrder || 999) - (b.frontPageOrder || 999));
      setFeaturedEvents(featured);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFeaturedEvents((items) => {
      const oldIndex = items.findIndex(i => i.id === active.id);
      const newIndex = items.findIndex(i => i.id === over.id);
      const newOrder = arrayMove(items, oldIndex, newIndex);

      newOrder.forEach((ev, idx) => {
        if ((ev.frontPageOrder || 999) !== idx) {
          API.graphql(graphqlOperation(updateEvent, {
            input: { id: ev.id, frontPageOrder: idx }
          })).catch(console.error);
        }
      });
      return newOrder;
    });
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleUrlShow = async (eventId, field) => {
    const showKey = `show${field.charAt(0).toUpperCase() + field.slice(1)}`;
    const currentEvent = featuredEvents.find(e => e.id === eventId);
    if (!currentEvent) return;
    const currentValue = currentEvent[showKey];

    try {
      await API.graphql(graphqlOperation(updateEvent, {
        input: { id: eventId, [showKey]: !currentValue }
      }));
      setFeaturedEvents(prev => prev.map(ev =>
        ev.id === eventId ? { ...ev, [showKey]: !currentValue } : ev
      ));
    } catch (e) {
      console.error('Toggle failed:', e);
      alert('Failed to update visibility');
    }
  };

  const handleEdit = (eventId) => {
    window.location.href = `/admin/events#${eventId}`;
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ margin: 0, marginBottom: '2rem' }}>Front Page Admin</h1>

      <section style={{ marginBottom: '3rem' }}>
        <h2>Featured Events (Drag to Reorder)</h2>
        <p>Click card to expand • Drag by ⋮⋮ to reorder • Order is saved automatically</p>

        {featuredEvents.length === 0 ? (
          <div style={{ padding: '2rem', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#666' }}>
            No featured events. Go to Events tab and mark some as Featured.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={featuredEvents.map(e => e.id)} strategy={verticalListSortingStrategy}>
              {featuredEvents.map(event => {
                const isExpanded = expanded[event.id];
                return (
                  <div key={event.id}>
                    <SortableEventCard
                      event={event}
                      isExpanded={isExpanded}
                      onToggleExpand={toggleExpand}
                      onEdit={handleEdit}
                    />
                  </div>
                );
              })}
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* LIVE PREVIEW */}
      <section style={{ padding: '2rem', background: '#0A2B4E', color: 'white', borderRadius: '12px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Live Front Page Preview</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center' }}>
          {featuredEvents.map(event => (
            <div key={event.id} style={{
              background: 'white',
              color: '#000',
              padding: '1.5rem',
              borderRadius: '12px',
              width: '320px',
              textAlign: 'center',
              boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
            }}>
              {event.eventLogo ? (
                <img src={event.eventLogo} alt={event.name} style={{ width: 180, height: 180, objectFit: 'contain', marginBottom: '1rem' }} />
              ) : (
                <div style={{ height: 180, background: '#eee', marginBottom: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                  No Logo
                </div>
              )}
              <h3 style={{ margin: '0.5rem 0', fontSize: '1.3rem' }}>{event.name}</h3>
              <p style={{
                margin: '0.5rem 0',
                color: '#1e40af',
                fontWeight: '600',
                fontSize: '1.1rem',
                letterSpacing: '0.5px'
              }}>
                {formatEventDate(event.startDateTime, event.endDateTime)}
              </p>
              <p style={{ margin: 0, color: '#555', fontSize: '0.95rem' }}>
                {event.facility?.name}<br />
                {event.facility?.city}, {event.facility?.state}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}