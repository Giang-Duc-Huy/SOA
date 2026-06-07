interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  trendUp?: boolean;
  progress?: number;
}

export function StatCard({ label, value, subtext, trend, trendUp, progress }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      {trend && (
        <p className={`text-sm mt-1 ${trendUp ? "text-green-600" : "text-red-500"}`}>
          {trend} {subtext}
        </p>
      )}
      {subtext && !trend && <p className="text-sm text-gray-500 mt-1">{subtext}</p>}
      {progress !== undefined && (
        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              progress >= 85 ? "bg-orange-500" : "bg-primary"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
