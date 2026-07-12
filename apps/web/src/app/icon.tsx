import { ImageResponse } from 'next/og';

// Next.js App Router file-convention favicon, generated crisply at build time.
// A simple plinth/pedestal glyph (cap · column · base) reads at 16px where the
// detailed 3D logo turns to mud — favicons want a bold, legible silhouette.
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0FA37F',
          borderRadius: 7,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        {/* cap */}
        <div style={{ width: 17, height: 3, background: '#F5F5F3', borderRadius: 1 }} />
        {/* column */}
        <div style={{ width: 7, height: 9, background: '#F5F5F3' }} />
        {/* base */}
        <div style={{ width: 21, height: 4, background: '#F5F5F3', borderRadius: 1 }} />
      </div>
    ),
    { ...size },
  );
}
