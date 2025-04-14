'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import UploadQuoteForm from '@/components/projects/UploadQuoteForm';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function NewQuotePage() {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Tillbaka till projektet
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Ladda upp ny offert</h1>
      
      <div className="max-w-2xl">
        <UploadQuoteForm projectId={projectId} />
      </div>
    </div>
  );
} 