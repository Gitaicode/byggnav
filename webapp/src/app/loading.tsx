// webapp/src/app/loading.tsx

// Detta är UI:t som visas medan startsidan laddar sin data
export default function Loading() {
  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6 px-4 sm:px-6 lg:px-8">
          {/* Behåll samma layout som sidan för att minska layout shift */}
          <h1 className="text-3xl font-bold">Projektöversikt</h1>
          {/* Platshållare för knappen */}
          <div className="h-9 w-36 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        {/* Tydligt laddningsmeddelande */}
        <div className="text-center py-4 mb-6">
          <div className="inline-flex items-center gap-2">
            <div className="w-5 h-5 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
            <span className="text-gray-700">Laddar projektdata...</span>
          </div>
        </div>
        
        {/* Skeleton loader för projektlistan */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-6 lg:px-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border rounded-lg shadow bg-white overflow-hidden">
              <div className="flex">
                <div className="p-4 w-1/2">
                  <div className="h-5 w-3/4 bg-gray-200 rounded mb-3 animate-pulse"></div>
                  <div className="h-4 w-full bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-4 w-2/3 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-4 w-1/2 bg-gray-200 rounded mb-2 animate-pulse"></div>
                </div>
                <div className="w-1/2 bg-gray-200 h-[180px]"></div>
              </div>
              <div className="p-4 border-t border-gray-200">
                <div className="h-5 w-1/3 bg-gray-200 rounded mb-2 animate-pulse"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 