"use client";
import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Download } from "lucide-react";

interface MermaidDiagramProps {
  code: string;
}

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
    });
  }, []);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code) return;
      try {
        setError(null);
        const { svg } = await mermaid.render(`mermaid-${Date.now()}`, code);
        setSvg(svg);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError("Failed to render diagram. Syntax might be invalid.");
      }
    };

    renderDiagram();
  }, [code]);

  const handleDownload = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "er-diagram.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (error) {
    return <div className="text-red-500 p-4 border border-red-300 rounded bg-red-50">{error}</div>;
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={handleDownload}
          className="p-2 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-md shadow-sm border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          title="Download SVG"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
      <div 
        ref={ref} 
        className="w-full overflow-auto p-4 bg-white rounded-lg shadow-sm border border-zinc-200 min-h-[300px] flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

