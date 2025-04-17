'use client';

import React, { useState, ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase/client'; // Använd klient-klient
import { useRouter } from 'next/navigation';

interface ProjectImageUploaderProps {
  projectId: string;
  currentImageUrl: string | null; // För att kunna visa aktuell bild eller uppdatera den
  onUploadComplete: (newUrl: string) => void; // Callback för att meddela förälder om ny URL
}

export default function ProjectImageUploader({ projectId, currentImageUrl, onUploadComplete }: ProjectImageUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null); // Rensa tidigare fel vid nytt filval
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Ingen fil vald.');
      return;
    }

    setUploading(true);
    setError(null);

    const fileExtension = selectedFile.name.split('.').pop();
    const uniqueFileName = `${projectId}-${Date.now()}.${fileExtension}`;
    const filePath = uniqueFileName;

    try {
      // 1. Ladda upp filen till Storage
      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(filePath, selectedFile!, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage Upload Error:', uploadError);
        throw new Error(`Kunde inte ladda upp filen: ${uploadError.message}`);
      }

      // 2. Hämta den publika URL:en för filen
      const { data: urlData } = supabase.storage
        .from('project-images')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
           console.error('Error getting public URL');
           throw new Error('Kunde inte hämta bildens URL efter uppladdning.');
      }
      
      const publicUrl = urlData.publicUrl;

      // 3. Uppdatera projektet i databasen
      const { error: dbError } = await supabase
        .from('projects')
        .update({ building_image_url: publicUrl })
        .eq('id', projectId);

      if (dbError) {
        console.error('Database Update Error:', dbError);
        // Försök radera den uppladdade filen om databasuppdateringen misslyckas? (Valfritt)
        await supabase.storage.from('project-images').remove([filePath]);
        throw new Error(`Kunde inte spara bildlänken i databasen: ${dbError.message}`);
      }

      // Meddela förälderkomponenten och rensa state
      onUploadComplete(publicUrl);
      setSelectedFile(null); 
      // Optional: Trigger refresh if parent doesn't handle UI update via callback/state
      // router.refresh(); 

    } catch (err: any) {
      console.error('Upload process error:', err);
      setError(err.message || 'Ett okänt fel inträffade vid uppladdningen.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-4 p-4 border rounded-md bg-gray-50">
      <h3 className="text-md font-semibold mb-2">Ladda upp Byggnadsbild</h3>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className={`block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className={`px-4 py-2 rounded-md text-white text-sm font-medium whitespace-nowrap
            ${!selectedFile || uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
          `}
        >
          {uploading ? 'Laddar upp...' : 'Ladda upp'}
        </button>
      </div>
      {selectedFile && !uploading && (
         <p className="text-xs text-gray-600 mt-2">Vald fil: {selectedFile.name}</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
} 