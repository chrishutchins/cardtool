/**
 * Environment Indicator
 * Shows a visual badge when on non-production environments (staging, preview, local dev)
 */

export function EnvIndicator() {
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV;
  
  // Don't show anything in production
  if (env === "production") {
    return null;
  }

  const label = env === "preview" ? "STAGING" : env === "development" ? "DEV" : env?.toUpperCase();
  const bgColor = env === "preview" ? "bg-orange-600" : env === "development" ? "bg-purple-600" : "bg-gray-600";

  return (
    <div 
      className={`fixed bottom-4 left-16 z-50 ${bgColor} text-white text-xs font-bold px-2 py-1 rounded shadow-lg pointer-events-none select-none`}
      style={{ opacity: 0.9 }}
    >
      {label}
    </div>
  );
}

