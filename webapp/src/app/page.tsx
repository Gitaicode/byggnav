import Image from "next/image";

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Välkommen till Byggprojekt-mäklaren</h1>
      <p className="text-gray-700">
        Detta är startsidan. Om du är inloggad kan du navigera till din dashboard via menyn.
      </p>
      {/* Lägg till mer information eller länkar här vid behov */}
    </div>
  );
}
