import { ImageResponse } from "next/og";

// The home-screen icon on iPhones and iPads: the mountain mark on ink. iOS rounds the corners itself.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1a2a" }}>
        <svg width="120" height="80" viewBox="0 0 24 16">
          <path d="M0 16 L8 3 L12 9 L16 4 L24 16 Z" fill="#f3f5f8" />
          <path d="M8 3 L10.4 7 L8.6 6.2 L6.8 7.4 Z M16 4 L18 7.2 L16.4 6.6 L14.8 7.3 Z" fill="#0f1a2a" />
        </svg>
      </div>
    ),
    size,
  );
}
