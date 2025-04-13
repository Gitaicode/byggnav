import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-auto bg-gray-200 p-4 text-center text-sm text-gray-600 border-t border-gray-300">
      <div className="container mx-auto">
        © {new Date().getFullYear()} Byggprojekt-mäklare. Alla rättigheter förbehållna.
      </div>
    </footer>
  );
};

export default Footer; 