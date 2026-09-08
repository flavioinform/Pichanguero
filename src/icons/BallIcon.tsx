interface BallIconProps {
  size?: number;
}

export function BallIcon({ size = 24 }: BallIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 5.5l3.6 2.6-1.4 4.3H9.8L8.4 8.1z" fill="currentColor" stroke="none" />
      <path
        d="M12 5.5V3M12 5.5L8.4 8.1M12 5.5l3.6 2.6M9.8 12.4l-3.3 1M9.8 12.4L7 16M14.2 12.4l3.3 1M14.2 12.4L17 16M9.8 16.5H14.2M9.8 16.5L7 16M14.2 16.5L17 16"
        strokeWidth={0.9}
      />
    </svg>
  );
}
