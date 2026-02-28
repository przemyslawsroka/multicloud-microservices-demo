'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import rehypeRaw from 'rehype-raw';

const Mermaid = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'default' });
    const renderChart = async () => {
      try {
        const id = 'mermaid-svg-' + Math.random().toString(36).substring(7);
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
      } catch (err) {
        console.error("Mermaid parsing error", err);
        setSvg(`<div class="text-red-500 font-bold p-4 border border-red-200 bg-red-50">Syntax error in Mermaid flowchart.</div>`);
      }
    };
    if (chart) {
      renderChart();
    }
  }, [chart]);

  return (
    <div
      className="flex justify-center my-12 overflow-x-auto w-full max-w-full bg-white p-6 rounded-xl border border-gray-100 shadow-sm"
      dangerouslySetInnerHTML={{ __html: svg }}
      ref={ref}
    />
  );
};

export default function MarkdownViewer({ content }: { content: string }) {
  // Extract custom headings to properly render ids for anchoring
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeRaw]}
      components={{
        a: ({ ...props }) => {
          const isExternal = props.href && props.href.startsWith('http');
          return (
            <a
              target={isExternal ? '_blank' : '_self'}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              className={isExternal ? "text-blue-600 font-medium underline flex items-center gap-1 w-fit" : "text-blue-600 font-medium underline"}
              {...props}
            >
              {props.children}
              {isExternal && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
              )}
            </a>
          );
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          if (!inline && match && match[1] === 'mermaid') {
            return <Mermaid chart={String(children).replace(/\n$/, '')} />;
          }
          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
