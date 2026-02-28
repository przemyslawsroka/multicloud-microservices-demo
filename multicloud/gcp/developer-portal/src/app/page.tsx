import fs from 'fs';
import path from 'path';
import Link from 'next/link';

export default function Home() {
  const contentDir = path.join(process.cwd(), 'src/content');
  const files = fs.readdirSync(contentDir);

  const documents = files
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const slug = file.replace('.md', '');
      return {
        slug,
        title: slug.replace(/_/g, ' '),
        filename: file
      };
    });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-600 shadow-md p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-white">
          <h1 className="text-3xl font-bold tracking-tight">Multi-Cloud E-Commerce Demo</h1>
          <nav className="space-x-4">
            <Link href="/" className="hover:text-blue-200 transition">Portal Home</Link>
            <a href="https://cloud.google.com/docs" target="_blank" rel="noreferrer" className="hover:text-blue-200 transition">GCP Docs ↗</a>
          </nav>
        </div>
      </header>

      <main className="flex-grow max-w-6xl w-full mx-auto p-6 md:p-12 mb-10 mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="col-span-full mb-8">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Developer Reference Portal</h2>
          <p className="text-xl text-gray-600 leading-relaxed max-w-4xl">
            Welcome! The primary goal of this portal is to educate developers on how to construct a complex, real-world system with simulated traffic generators and leverage enterprise Google Cloud Platform networking products.
            <br /><br />
            Whether you are exploring the overarching Business architecture, investigating how we route Cloud Run workloads natively using Direct VPC Egress, or seeing how we simulate on-prem infrastructure using BGP Interconnects—everything is documented here.
          </p>
        </div>

        {documents.map(doc => (
          <Link href={`/${doc.slug}`} key={doc.slug} className="group flex flex-col justify-between bg-white rounded-xl shadow-sm hover:shadow-xl border border-gray-200 transition-all p-8 cursor-pointer overflow-hidden transform hover:-translate-y-1">
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                <svg className="w-6 h-6 text-blue-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 capitalize mb-3 group-hover:text-blue-600">{doc.title.toLowerCase()}</h3>
              <p className="text-gray-500 line-clamp-3">
                {doc.slug === 'NETWORKING_VIEW' ? 'Discover how Private Service Connect, Serverless VPC Access, and Cloud Load Balancing work together.'
                  : doc.slug === 'BUSINESS_VIEW' ? 'Understand the logical capabilities, ERP structures, and real-time operations across the multi-cloud architecture.'
                    : doc.slug === 'DEPLOYMENT_VIEW' ? 'Explore the Terraform pipelines, Kubernetes deployment YAMLs, and GKE operational parameters.'
                      : 'Deep dive into the underlying components driving the storefront.'}
              </p>
            </div>
            <div className="mt-8 text-blue-600 font-semibold group-hover:underline flex items-center">
              Read Document <span className="ml-2">→</span>
            </div>
          </Link>
        ))}

        <div className="col-span-full mt-12 bg-gray-900 text-white rounded-2xl shadow-lg p-10 overflow-hidden relative">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
            <div className="max-w-xl">
              <h3 className="text-3xl font-bold mb-4">Mastering GCP Networking</h3>
              <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                As you review the <strong>networking_view</strong>, notice how this demo eschews simplistic VPC Peering where possible in favor of precise <a href="https://cloud.google.com/vpc/docs/private-service-connect" target="_blank" className="text-blue-400 hover:text-blue-300 underline font-medium">Private Service Connect (PSC)</a> attachments to strictly control who can talk to internal VMs without compromising the entire subnet.
              </p>
            </div>
          </div>
          <div className="absolute right-0 top-0 opacity-10 scale-150 transform translate-x-1/4 -translate-y-1/4">
            <svg width="400" height="400" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M11.96 4C11.96 4 11.96 4 11.96 4C5.23 4 0 9.4 0 16.03C0 22.65 5.23 28 11.96 28C18.68 28 23.91 22.65 23.91 16.03C23.91 9.4 18.68 4 11.96 4ZM11.96 6.36C17.2 6.36 21.43 10.68 21.43 16.03C21.43 21.37 17.20 25.64 11.96 25.64C6.71 25.64 2.48 21.36 2.48 16.03C2.48 10.68 6.71 6.36 11.96 6.36ZM11.98 9.28C8.36 9.28 5.43 12.3 5.43 16.03C5.43 19.76 8.36 22.78 11.98 22.78C15.59 22.78 18.52 19.76 18.52 16.03C18.52 12.3 15.60 9.28 11.98 9.28ZM11.98 12.11C14.07 12.11 15.77 13.84 15.77 16.03C15.77 18.22 14.07 19.95 11.98 19.95C9.88 19.95 8.18 18.22 8.18 16.03C8.18 13.84 9.88 12.11 11.98 12.11Z" /></svg>
          </div>
        </div>
      </main>
    </div>
  );
}
