import { ImageResponse } from "next/og";

// Next.js App Router file-convention favicon — a bold cap/column/base
// silhouette reads at 16px where the full 3D mark turns to mud.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0FA37F",
          borderRadius: 7,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <div style={{ width: 17, height: 3, background: "#FAFAFA", borderRadius: 1 }} />
        <div style={{ width: 7, height: 9, background: "#FAFAFA" }} />
        <div style={{ width: 21, height: 4, background: "#FAFAFA", borderRadius: 1 }} />
      </div>
    ),
    { ...size },
  );
}
