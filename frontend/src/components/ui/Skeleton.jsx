export default function Skeleton({ width = "100%", height = "14px", radius = "6px", style = {} }) {
  return (
    <div
      style={{
        width, height, borderRadius: radius,
        background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%)",
        backgroundSize: "400% 100%",
        animation: "skeleton-pulse 1.4s ease infinite",
        ...style,
      }}
    />
  );
}
