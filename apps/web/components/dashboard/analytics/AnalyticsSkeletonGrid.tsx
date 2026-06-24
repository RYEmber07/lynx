
export function AnalyticsSkeletonGrid() {
  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full mt-6 md:mt-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface border border-outline h-32 animate-pulse" />
        <div className="bg-surface border border-outline h-32 animate-pulse" />
      </div>

      {/* Clicks Chart */}
      <div className="bg-surface border border-outline p-6 md:p-8 flex flex-col gap-6">
        <div className="flex items-center gap-2 border-b border-outline pb-4">
          <div className="w-32 h-3 bg-surface-bright animate-pulse" />
        </div>
        <div className="h-56 bg-surface-bright animate-pulse" />
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface border border-outline p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-outline pb-4">
              <div className="w-24 h-3 bg-surface-bright animate-pulse" />
            </div>
            <ul className="flex flex-col gap-4 py-2">
              {[1, 2, 3, 4, 5].map((j) => (
                <li key={j} className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <div className="w-24 h-3 bg-surface-bright animate-pulse" />
                    <div className="w-12 h-3 bg-surface-bright animate-pulse" />
                  </div>
                  <div className="w-full h-1 bg-surface-bright animate-pulse" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
