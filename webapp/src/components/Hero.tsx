import Link from 'next/link';

export default function Hero() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      {/* Top link */}
      <div className="mb-16">
        <Link 
          href="/article" 
          className="inline-flex items-center px-4 py-2 bg-gray-50 rounded-full text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Läs vår lanseringsartikel
          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Main content */}
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-light tracking-tight mb-8">
          This is something
          <span className="block">beautiful</span>
        </h1>
        
        <p className="text-xl text-gray-600 mb-12 leading-relaxed">
          Managing a small business today is already tough. Avoid further complications
          by ditching outdated, tedious trade methods. Our goal is to streamline SMB
          trade, making it easier and faster than ever.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Jump on a call
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <button className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg text-base font-medium text-white bg-black hover:bg-gray-900 transition-colors">
            Sign up here
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
} 