'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Database } from '@/lib/supabase/database.types'; // Antagen standardplats
import { companyTypes, contractorTypes } from '@/lib/constants';
import { registerEmailAction } from './actions'; // Server action för att spara
import { fetchRegisteredEmails } from './data'; // Behövs för att uppdatera listan

// Typer importerade eller kopierade från page.tsx (eller bättre: flytta till types/index.ts)
export type RegisteredEmail = Database['public']['Tables']['registered_emails']['Row'];
export type Project = Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'title'>;

// Props för komponenten
interface RegisterEmailClientContentProps {
  initialEmails: RegisteredEmail[];
  initialProjects: Project[];
}

// Zod schema (behövs här för useForm)
const emailRegistrationSchema = z.object({
  email: z.string().email('Ange en giltig e-postadress.'),
  city: z.string().optional(),
  company_type: z.enum(companyTypes, { errorMap: () => ({ message: 'Välj en giltig företagstyp.' }) }),
  contractor_type: z.enum(contractorTypes, { errorMap: () => ({ message: 'Välj en giltig entreprenörstyp.' }) }),
});

type EmailRegistrationFormData = z.infer<typeof emailRegistrationSchema>;

export default function RegisterEmailClientContent({ 
  initialEmails, 
  initialProjects 
}: RegisterEmailClientContentProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  
  // Använd initial data från props för state
  const [registeredEmails, setRegisteredEmails] = useState<RegisteredEmail[]>(initialEmails);
  const [projects] = useState<Project[]>(initialProjects); // Projektlistan ändras sällan, inget behov av setProjects just nu
  const [filteredEmails, setFilteredEmails] = useState<RegisteredEmail[]>(initialEmails);
  const [filters, setFilters] = useState({ city: '', companyType: '', contractorType: '' });
  const [selectedProject, setSelectedProject] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmailRegistrationFormData>({
    resolver: zodResolver(emailRegistrationSchema),
    defaultValues: {
      city: '',
      company_type: undefined,
      contractor_type: undefined,
    },
  });

  // Uppdatera filtrerad lista när filter eller ursprungslistan ändras
  useEffect(() => {
    const lowerCaseCityFilter = filters.city.toLowerCase();
    const filtered = registeredEmails.filter(email => {
      const cityMatch = !filters.city || (email.city && email.city.toLowerCase().includes(lowerCaseCityFilter));
      const companyTypeMatch = !filters.companyType || email.company_type === filters.companyType;
      const contractorTypeMatch = !filters.contractorType || email.contractor_type === filters.contractorType;
      return cityMatch && companyTypeMatch && contractorTypeMatch;
    });
    setFilteredEmails(filtered);
  }, [filters, registeredEmails]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSend = () => {
    if (!selectedProject) {
      alert('Välj ett projekt att skicka till.');
      return;
    }
    if (filteredEmails.length === 0) {
      alert('Inga e-postadresser matchar filtret.');
      return;
    }
    const emailList = filteredEmails.map(e => e.email);
    console.log(`Skickar projekt ID: ${selectedProject} till följande e-postadresser:`, emailList);
    alert(`Simulerar utskick av projekt ${selectedProject} till ${emailList.length} adresser. Se konsolen för detaljer.`);
    // Här skulle logiken för faktiskt utskick implementeras
  };

  const onSubmit: SubmitHandler<EmailRegistrationFormData> = (data) => {
    startTransition(async () => {
      setFormError(null);
      setFormSuccess(null);
      const result = await registerEmailAction(data); // Anropa Server Action
      if (result.error) {
        setFormError(result.error);
      } else {
        setFormSuccess('E-postadress registrerad!');
        reset();
        // Ladda om listan FÖRSIKTIGT - kan orsaka race conditions
        // Överväg att returnera den nya posten från action och lägga till den i state
        const emails = await fetchRegisteredEmails(); 
        setRegisteredEmails(emails); 
      }
    });
  };

  // All JSX från gamla page.tsx flyttas hit
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Registrera och hantera e-postadresser</h1>

      {/* Registreringsformulär */}
      <section className="bg-white p-6 rounded shadow-md border">
         <h2 className="text-xl font-semibold mb-4 border-b pb-2">Registrera ny e-post</h2>
         <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
           {/* Email */}
           <div>
             <label htmlFor="email" className="block text-sm font-medium text-gray-700">
               E-postadress <span className="text-red-600">*</span>
             </label>
             <input
               id="email"
               type="email"
               {...register('email')}
               className={`mt-1 block w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
             />
             {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
           </div>

           {/* Stad */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                Stad (valfritt)
              </label>
              <input
                id="city"
                type="text"
                {...register('city')}
                className={`mt-1 block w-full px-3 py-2 border ${errors.city ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
              />
              {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>}
            </div>

           {/* Företagstyp */}
            <div>
              <label htmlFor="company_type" className="block text-sm font-medium text-gray-700">
                Företagstyp <span className="text-red-600">*</span>
              </label>
              <select
                id="company_type"
                {...register('company_type')}
                className={`mt-1 block w-full px-3 py-2 border ${errors.company_type ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white`}
                defaultValue=""
              >
                <option value="" disabled>Välj typ...</option>
                {companyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.company_type && <p className="mt-1 text-sm text-red-600">{errors.company_type.message}</p>}
            </div>

            {/* Entreprenörstyp */}
            <div>
              <label htmlFor="contractor_type" className="block text-sm font-medium text-gray-700">
                Entreprenörstyp <span className="text-red-600">*</span>
              </label>
              <select
                id="contractor_type"
                {...register('contractor_type')}
                className={`mt-1 block w-full px-3 py-2 border ${errors.contractor_type ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white`}
                defaultValue=""
              >
                <option value="" disabled>Välj typ...</option>
                {contractorTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.contractor_type && <p className="mt-1 text-sm text-red-600">{errors.contractor_type.message}</p>}
            </div>

           {formError && <p className="text-sm text-red-600 text-center">{formError}</p>}
           {formSuccess && <p className="text-sm text-green-600 text-center">{formSuccess}</p>}

           <div className="flex justify-end">
             <button
               type="submit"
               disabled={isPending}
               className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isPending ? 'Registrerar...' : 'Registrera e-post'}
             </button>
           </div>
         </form>
       </section>

      {/* Listning och filtrering */}
       <section className="bg-white p-6 rounded shadow-md border">
         <h2 className="text-xl font-semibold mb-4 border-b pb-2">Registrerade adresser ({filteredEmails.length})</h2>

         {/* Filter controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="filterCity" className="block text-sm font-medium text-gray-700">Filtrera på Stad</label>
              <input
                id="filterCity"
                name="city"
                type="text"
                value={filters.city}
                onChange={handleFilterChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Sök stad..."
              />
            </div>
             <div>
              <label htmlFor="filterCompanyType" className="block text-sm font-medium text-gray-700">Filtrera på Företagstyp</label>
              <select
                id="filterCompanyType"
                name="companyType"
                value={filters.companyType}
                onChange={handleFilterChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
              >
                <option value="">Alla</option>
                {companyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
             <div>
              <label htmlFor="filterContractorType" className="block text-sm font-medium text-gray-700">Filtrera på Entreprenörstyp</label>
              <select
                id="filterContractorType"
                name="contractorType"
                value={filters.contractorType}
                onChange={handleFilterChange}
                 className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
             >
                <option value="">Alla</option>
                {contractorTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

         {/* Email list */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stad</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Företagstyp</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entreprenörstyp</th>
                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registrerad</th>
               </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmails.length > 0 ? (
                  filteredEmails.map(email => (
                    <tr key={email.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{email.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{email.city || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{email.company_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{email.contractor_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(email.created_at).toLocaleDateString('sv-SE')}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 italic">Inga matchande adresser hittades.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
       </section>

      {/* Projektval och utskick */}
        <section className="bg-white p-6 rounded shadow-md border">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Skicka projektinformation</h2>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className='flex-grow'>
               <label htmlFor="selectProject" className="block text-sm font-medium text-gray-700 mb-1">Välj projekt</label>
               <select
                   id="selectProject"
                   value={selectedProject}
                   onChange={(e) => setSelectedProject(e.target.value)}
                   className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
               >
                   <option value="" disabled>Välj ett projekt...</option>
                   {projects.map(project => (
                       <option key={project.id} value={project.id}>{project.title} (ID: {project.id})</option>
                   ))}
               </select>
            </div>
           <div className='pt-2 md:pt-6'>
               <button
                   onClick={handleSend}
                   disabled={!selectedProject || filteredEmails.length === 0}
                   className="w-full md:w-auto px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                   Skicka till valda ({filteredEmails.length})
               </button>
            </div>
          </div>
        </section>
    </div>
  );
} 