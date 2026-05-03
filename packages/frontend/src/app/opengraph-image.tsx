import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'AgentMesh - Decentralized AI Agent Infrastructure';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0A0810 0%, #0E0E18 50%, #080810 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
          position: 'relative',
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Mesh nodes */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
          {['Reentrancy', 'Access Control', 'Logic', 'Economic'].map((name, i) => (
            <div
              key={name}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: `3px solid ${i < 2 ? '#00FF88' : '#0EA5E9'}`,
                background: '#0E0E18',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: i < 2 ? '#00FF88' : '#0EA5E9',
                textAlign: 'center',
                padding: '8px',
              }}
            >
              {name}
            </div>
          ))}
        </div>
        {/* Title */}
        <div style={{ display: 'flex', fontSize: '64px', fontWeight: 800, letterSpacing: '-2px' }}>
          <span style={{ color: 'white' }}>Agent</span>
          <span
            style={{
              background: 'linear-gradient(90deg, #00FF88, #0EA5E9)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Mesh
          </span>
        </div>
        {/* Subtitle */}
        <div style={{ fontSize: '24px', color: '#6B6B80', marginTop: '16px' }}>
          Decentralized P2P Smart Contract Security Auditing
        </div>
        {/* Tech badges */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
          {['Gensyn AXL', '0G Compute', 'ENS', 'On-Chain Attestation'].map((tech) => (
            <div
              key={tech}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid #1A1A2A',
                background: '#0E0E18',
                fontSize: '14px',
                color: '#6B6B80',
              }}
            >
              {tech}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
