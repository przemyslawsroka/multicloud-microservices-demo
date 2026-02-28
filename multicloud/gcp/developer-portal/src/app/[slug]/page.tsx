import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

export async function generateStaticParams() {
  const contentDir = path.join(process.cwd(), 'src/content');
  try {
    const files = fs.readdirSync(contentDir);
    return files
      .filter(file => file.endsWith('.md'))
      .map(file => ({
        slug: file.replace('.md', ''),
      }));
  } catch (err) {
    return [];
  }
}

export default async function DocumentPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const contentDir = path.join(process.cwd(), 'src/content');
  const filePath = path.join(contentDir, `${slug}.md`);

  let content = 'Document not found.';
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    // leave as not found
  }

  const title = slug.replace(/_/g, ' ');

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gray-900 border-b border-gray-800 shadow-sm p-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center text-white">
          <Link href="/" className="flex items-center hover:text-blue-400 transition font-medium">
             <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
             Back to Portal Home
          </Link>
          <div className="ml-auto flex items-center space-x-4 text-sm font-semibold">
            <span className="text-gray-400 capitalize">{title.toLowerCase()}</span>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto py-12 px-6 lg:px-8">
        <article className="prose prose-blue prose-lg md:prose-xl max-w-none 
                            prose-headings:font-bold prose-headings:text-gray-900 
                            prose-h1:text-5xl prose-h1:mb-8 prose-h2:mt-12 prose-h2:border-b-2 prose-h2:border-gray-100 prose-h2:pb-4
                            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                            prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-pink-600
                            prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:shadow-lg
                            prose-img:rounded-xl prose-img:shadow-md
                            prose-strong:text-gray-900 prose-strong:font-bold">
          <ReactMarkdown
            components={{
              a: ({node, ...props}) => {
                // If it's a GCP doc link, open in new tab
                const isExternal = props.href?.startsWith('http');
                return (
                  <a target={isExternal ? "_blank" : "_self"} rel={isExternal ? "noopener noreferrer" : ""} {...props} />
                )
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
