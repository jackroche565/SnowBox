import type { SVGProps } from "react";

// Small line icons drawn on a 24px grid. They inherit color from the surrounding text.
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 20 L10 8 L13 13 L16 9 L21 20 Z" />
      <path d="M8.2 11 L10 8 L11.6 10.6" />
    </Icon>
  );
}

export function MapIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 4 L3 6 V20 L9 18 L15 20 L21 18 V4 L15 6 Z" />
      <path d="M9 4 V18 M15 6 V20" />
    </Icon>
  );
}

export function CompareIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 20 V11 M12 20 V4 M19 20 V14" />
    </Icon>
  );
}

export function StarIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Icon {...props} fill={filled ? "currentColor" : "none"}>
      <path d="M12 3.5 L14.6 8.8 L20.4 9.6 L16.2 13.7 L17.2 19.5 L12 16.8 L6.8 19.5 L7.8 13.7 L3.6 9.6 L9.4 8.8 Z" />
    </Icon>
  );
}

export function WindIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 9 H14 A3 3 0 1 0 11 6" />
      <path d="M3 15 H18 A3 3 0 1 1 15 18" />
    </Icon>
  );
}

export function SnowflakeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 V21 M4.2 7.5 L19.8 16.5 M4.2 16.5 L19.8 7.5" />
      <path d="M9.5 4.5 L12 7 L14.5 4.5 M9.5 19.5 L12 17 L14.5 19.5" />
    </Icon>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4 H20 V10 M20 4 L11 13" />
      <path d="M18 14 V19 A1 1 0 0 1 17 20 H5 A1 1 0 0 1 4 19 V7 A1 1 0 0 1 5 6 H10" />
    </Icon>
  );
}
