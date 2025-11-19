// src/pages/AdminStats.js — FINAL & GORGEOUS
import React, { useState, useEffect } from 'react';
import { API, graphqlOperation } from 'aws-amplify';

const listEvents = `query List {
  listEvents {
    items {
      id startDateTime endDateTime status featured eventType facilityID clientID isPublic
    }
  }
}`;

const listFacilities = `query List { listFacilities { items { id name state } } }`;
const listClients = `query List { listClients { items { id companyName } } }`;

export default function AdminStats() {
  const [events, setEvents] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

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

      setEvents(eRes.data.listEvents.items || []);
      setFacilities(fRes.data.listFacilities.items || []);
      setClients(cRes.data.listClients.items || []);
    } catch (e) {
      console.error('Stats load error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}><p>Loading statistics...</p></div>;

  const now = new Date();
  const thisYear = now.getFullYear();

  const totalEvents = events.length;
  const featuredEvents = events.filter(e => e.featured).length;
  const publicEvents = events.filter(e => e.isPublic).length;
  const upcomingEvents = events.filter(e => new Date(e.startDateTime) > now).length;
  const liveEvents = events.filter(e => new Date(e.startDateTime) <= now && new Date(e.endDateTime) >= now).length;
  const pastEvents = events.filter(e => new Date(e.endDateTime) < now).length;
  const eventsThisYear = events.filter(e => new Date(e.startDateTime).getFullYear() === thisYear).length;

  const eventsByType = events.reduce((acc, e) => {
    acc[e.eventType] = (acc[e.eventType] || 0) + 1;
    return acc;
  }, {});

  const eventsByState = events.reduce((acc, e) => {
    const facility = facilities.find(f => f.id === e.facilityID);
    const state = facility?.state || 'Unknown';
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});

  const topClients = Object.entries(
    events.reduce((acc, e) => {
      const client = clients.find(c => c.id === e.clientID);
      const name = client?.companyName || 'No Client';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const topFacilities = Object.entries(
    events.reduce((acc, e) => {
      const facility = facilities.find(f => f.id === e.facilityID);
      const name = facility?.name || 'Unknown';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 2rem 0', fontSize: '2.8rem', color: '#0A2B4E', textAlign: 'center' }}>
        Events Statistics Dashboard
      </h1>

      {/* BIG METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ background: '#007bff', color: 'white', padding: '2rem', borderRadius: '16px', textAlign: 'center', boxShadow: '0 8px 20px rgba(0,123,255,0.2)' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '3.5rem' }}>{totalEvents}</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1.2rem' }}>Total Events</p>
        </div>
        <div style={{ background: '#28a745', color: 'white', padding: '2rem', borderRadius: '16px', textAlign: 'center', boxShadow: '0 8px 20px rgba(40,167,69,0.2)' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '3.5rem' }}>{upcomingEvents}</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1.2rem' }}>Upcoming</p>
        </div>
        <div style={{ background: '#ffc107', color: '#212529', padding: '2rem', borderRadius: '16px', textAlign: 'center', boxShadow: '0 8px 20px rgba(255,193,7,0.3)' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '3.5rem' }}>{liveEvents}</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1.2rem' }}>Live Now</p>
        </div>
        <div style={{ background: '#6c757d', color: 'white', padding: '2rem', borderRadius: '16px', textAlign: 'center', boxShadow: '0 8px 20px rgba(108,117,125,0.2)' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '3.5rem' }}>{pastEvents}</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1.2rem' }}>Completed</p>
        </div>
      </div>

      {/* CHARTS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        <div style={{ background: '#f8f9fa', padding: '2rem', borderRadius: '16px' }}>
          <h3 style={{ margin: '0 0 1.5rem', color: '#0A2B4E', fontSize: '1.6rem' }}>Events by Type</h3>
          {Object.entries(eventsByType).map(([type, count]) => (
            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #eee' }}>
              <span style={{ fontWeight: '500' }}>{type.replace(/_/g, ' ')}</span>
              <strong style={{ color: '#007bff' }}>{count}</strong>
            </div>
          ))}
        </div>

        <div style={{ background: '#f8f9fa', padding: '2rem', borderRadius: '16px' }}>
          <h3 style={{ margin: '0 0 1.5rem', color: '#0A2B4E', fontSize: '1.6rem' }}>Top 8 Clients</h3>
          {topClients.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No client data</p>
          ) : topClients.map(([name, count]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #eee' }}>
              <span style={{ fontWeight: '500' }}>{name}</span>
              <strong style={{ color: '#28a745' }}>{count}</strong>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ background: '#f8f9fa', padding: '2rem', borderRadius: '16px' }}>
          <h3 style={{ margin: '0 0 1.5rem', color: '#0A2B4E', fontSize: '1.6rem' }}>Top 8 Facilities</h3>
          {topFacilities.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No facility data</p>
          ) : topFacilities.map(([name, count]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #eee' }}>
              <span style={{ fontWeight: '500' }}>{name}</span>
              <strong style={{ color: '#dc3545' }}>{count}</strong>
            </div>
          ))}
        </div>

        <div style={{ background: '#f8f9fa', padding: '2rem', borderRadius: '16px' }}>
          <h3 style={{ margin: '0 0 1.5rem', color: '#0A2B4E', fontSize: '1.6rem' }}>Events by State</h3>
          {Object.entries(eventsByState).sort((a, b) => b[1] - a[1]).map(([state, count]) => (
            <div key={state} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #eee' }}>
              <span style={{ fontWeight: '500' }}>{state}</span>
              <strong style={{ color: '#6f42c1' }}>{count}</strong>
            </div>
          ))}
        </div>
      </div>

    
    </div>
  );
}