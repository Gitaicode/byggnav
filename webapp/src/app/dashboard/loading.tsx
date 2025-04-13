// webapp/src/app/dashboard/loading.tsx

// Detta är UI:t som visas medan dashboard-sidan laddar sin data
export default function DashboardLoading() {
  return (
    <div>
       <div className="flex justify-between items-center mb-6">
         {/* Behåll samma layout som sidan för att minska layout shift */}
         <h1 className="text-3xl font-bold">Dashboard</h1>
         {/* Platshållare för knappen */}
         <div className="h-9 w-36 bg-gray-200 rounded animate-pulse"></div>
       </div>

      <h2 className="text-xl font-semibold mb-4">Projektöversikt</h2>
      
      {/* Skeleton loader för projektlistan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 shadow bg-white">
              <div className="h-5 w-3/4 bg-gray-200 rounded mb-3 animate-pulse"></div>
              <div className="h-4 w-full bg-gray-200 rounded mb-4 animate-pulse"></div>
              <div className="flex justify-between items-center text-xs">
                <div className="h-3 w-1/4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-1/4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
        ))}
      </div>
    </div>
  );
} 