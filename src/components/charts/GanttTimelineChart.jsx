import React from 'react';
import dayjs from 'dayjs';

export default function GanttTimelineChart({ projects = [] }) {
  if (!projects || projects.length === 0) {
    return <div className="text-muted">No projects available to display schedule timeline.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {projects.map((p) => {
        const startStr = p.startDate ? dayjs(p.startDate).format('DD MMM YYYY') : 'Not Set';
        const endStr = p.endDate ? dayjs(p.endDate).format('DD MMM YYYY') : 'Not Set';

        let progressPercent = 30;
        if (p.status === 'completed') progressPercent = 100;
        else if (p.status === 'upcoming') progressPercent = 5;
        else if (p.status === 'active') progressPercent = 65;

        return (
          <div key={p._id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px' }}>{p.name} <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>[{p.code}]</span></span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {startStr} — {endStr} ({p.durationDays || 0} days)
              </span>
            </div>

            <div style={{
              height: '10px',
              width: '100%',
              backgroundColor: '#E2E8F0',
              borderRadius: '999px',
              overflow: 'hidden',
              marginTop: '6px'
            }}>
              <div style={{
                height: '100%',
                width: `${progressPercent}%`,
                backgroundColor: p.status === 'completed' ? 'var(--color-success)' : p.status === 'active' ? 'var(--color-brand)' : '#94A3B8',
                borderRadius: '999px',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
