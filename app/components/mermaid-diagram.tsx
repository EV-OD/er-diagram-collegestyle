"use client";
import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

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
        // Remove max-width constraint and ensure SVG takes full space
        const cleanSvg = svg
          .replace(/max-width:[^;"]+;?/g, "")
          .replace(/height="[^"]*"/, "")
          .replace(/width="[^"]*"/, 'width="100%"');
        setSvg(cleanSvg);
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
    <div className="relative w-full h-full flex flex-col bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <div className="flex bg-white dark:bg-zinc-800 rounded-md shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <button
                  onClick={() => zoomIn()}
                  className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors border-r border-zinc-200 dark:border-zinc-700"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => zoomOut()}
                  className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors border-r border-zinc-200 dark:border-zinc-700"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => resetTransform()}
                  className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleDownload}
                className="p-2 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-md shadow-sm border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                title="Download SVG"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
            <TransformComponent
              wrapperClass="w-full h-full min-h-[500px] overflow-hidden"
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentClass="w-full h-full flex items-center justify-center"
            >
              <div 
                ref={ref} 
                className="w-full h-full flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}

