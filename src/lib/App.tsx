/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Trash2, 
  Copy, 
  Check, 
  Eye, 
  Settings, 
  Sparkles, 
  Info,
  Type,
  List,
  Hash,
  Search,
  ArrowRight,
  Globe,
  Loader2,
  X,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { NoteBlock, OrganizerOptions } from './types';
import { parseNotes } from './lib/parser';
import { generatePDF } from './lib/pdfGenerator';

const INITIAL_TEXT = `Introduction to Pharmacology
Pharmacology is the study of drugs and their effects on biological systems.
It is divided into two main branches:
Pharmacokinetics: What the body does to the drug (ADME)
Pharmacodynamics: What the drug does to the body

Common Drug Classes:
Analgesics: Drugs used to relieve pain (e.g. Paracetamol, Ibuprofen)
Antibiotics: Agents that inhibit or kill bacteria
Antihypertensives: Used to treat high blood pressure

Drug Metabolism
Metabolism occurs primarily in the liver via cytochrome P450 enzymes.
First-pass effect reduces the concentration of a drug before it reaches systemic circulation.`;

const TEMPLATES = {
  medical: `Human Anatomy: Skeleton
The human skeletal system consists of 206 bones in the adult body.
It provides structural support and protects vital organs.

Major Bone Groups:
Axial Skeleton: Includes skull, vertebral column, and rib cage
Appendicular Skeleton: Includes limb bones and girdles

Terminology:
Osteocytes: Mature bone cells
Marrow: Soft tissue inside bones where blood cells are made`,
  coding: `React.js Fundamentals
React is a JavaScript library for building user interfaces.
Key hooks:
useState: Manages component state
useEffect: Handles side effects in functional components

Component Lifecycle:
Mounting: When a component is added to the DOM
Updating: When props or state change
Unmounting: When a component is removed`,
  business: `Marketing Mix (4P's)
The marketing mix is a set of tools used to achieve objectives.

Core Elements:
Product: The good or service being offered
Price: The amount customers pay
Place: Location where the product is sold
Promotion: Advertising and PR strategies

Goal:
To satisfy customer needs and provide maximum value.`
};

export default function App() {
  const [inputText, setInputText] = useState(() => {
    const saved = localStorage.getItem('notes_organizer_input');
    return saved !== null ? saved : INITIAL_TEXT;
  });

  useEffect(() => {
    localStorage.setItem('notes_organizer_input', inputText);
  }, [inputText]);
  const [options, setOptions] = useState<OrganizerOptions>({
    autoHeadings: true,
    bulletPoints: true,
    keyValues: true,
    numberedList: false,
    userName: '',
    pageTitle: '',
    seoDescription: '',
    seoKeywords: '',
  });

  const [isSeoOpen, setIsSeoOpen] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<null | 'text' | 'html'>(null);
  const [isMobile, setIsMobile] = useState(false);

  const blocks = useMemo(() => parseNotes(inputText, options), [inputText, options]);

  const stats = useMemo(() => {
    const headings = blocks.filter(b => b.type === 'heading').length;
    const points = blocks.filter(b => b.type === 'point').length;
    const words = inputText.trim().split(/\s+/).filter(Boolean).length;
    return { headings, points, words };
  }, [blocks, inputText]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCopyText = async () => {
    let t = '';
    let hIdx = 0;
    blocks.forEach(b => {
      if (b.type === 'heading') {
        hIdx++;
        t += `\n== ${b.text.toUpperCase()} ==\n\n`;
      } else if (b.type === 'subheading') {
        t += `\n  > ${b.text}\n`;
      } else if (b.type === 'point') {
        t += options.numberedList ? `  ${b.number}. ${b.text}\n` : `  - ${b.text}\n`;
      } else if (b.type === 'definition') {
        t += `  ${b.key}: ${b.value}\n`;
      } else {
        t += `${b.text}\n`;
      }
    });

    try {
      await navigator.clipboard.writeText(t.trim());
      setCopyStatus('text');
      setTimeout(() => setCopyStatus(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const generateHtml = () => {
    const title = options.pageTitle || 'Organized Notes | AnkitStudyPoint';
    const desc = options.seoDescription || 'Study notes organized with Auto Notes Organizer Pro.';
    const kw = options.seoKeywords || 'notes, study, D.Pharma';
    const author = options.userName || 'Student';
    
    let htmlContent = '';
    let hIdx = 0;
    blocks.forEach(b => {
      if (b.type === 'heading') {
        hIdx++;
        const tag = hIdx === 1 ? 'h1' : 'h2';
        htmlContent += `<${tag}>${b.text}</${tag}>\n`;
      } else if (b.type === 'subheading') {
        htmlContent += `<h3>${b.text}</h3>\n`;
      } else if (b.type === 'point') {
        htmlContent += `<li>${b.text}</li>\n`;
      } else if (b.type === 'definition') {
        htmlContent += `<p><strong>${b.key}</strong>: ${b.value}</p>\n`;
      } else {
        htmlContent += `<p>${b.text}</p>\n`;
      }
    });

    // Simple list wrapping logic
    const listTag = options.numberedList ? 'ol' : 'ul';
    htmlContent = htmlContent.replace(/(<li>.*?<\/li>\n)+/g, m => `<${listTag}>\n${m}</${listTag}>\n`);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <meta name="keywords" content="${kw}">
  <meta name="author" content="${author}">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; background: #f9f9f9; }
    .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #3b82f6; margin-top: 30px; border-left: 4px solid #3b82f6; padding-left: 15px; }
    h3 { color: #8b5cf6; }
    ul, ol { margin-bottom: 20px; }
    li { margin-bottom: 8px; }
    strong { color: #1e3a8a; }
  </style>
</head>
<body>
  <div class="card">
    ${htmlContent}
  </div>
</body>
</html>`;
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(generateHtml());
      setCopyStatus('html');
      setTimeout(() => setCopyStatus(null), 2000);
    } catch (err) {
      console.error('Failed to copy HTML:', err);
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([generateHtml()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organized-notes.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePreviewPdf = async () => {
    if (blocks.length === 0) return;
    setPdfGenerating(true);
    setShowPreviewModal(true);
    
    try {
      const pdfBytes = await generatePDF(blocks, options);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPreviewBlobUrl(url);
    } catch (err) {
      console.error('PDF Generation failed:', err);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (blocks.length === 0) return;
    setPdfGenerating(true);
    try {
      const pdfBytes = await generatePDF(blocks, options);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const fileName = (options.pageTitle || 'organized-notes')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-') + '.pdf';

      if (isMobile) {
        // For mobile, we open in a new tab which usually triggers the native viewer or download
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('PDF Download failed:', err);
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-brand selection:text-black">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,229,160,0.3)]">
            <FileText className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="font-mono text-lg font-bold tracking-tight text-white leading-tight">
              NOTES<span className="text-brand">ORGANIZER</span><span className="text-brand-secondary ml-1">PRO</span>
            </h1>
            <p className="text-[10px] text-white/50 font-mono tracking-widest uppercase">AnkitStudyPoint Tools</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            <span className="text-xs font-mono text-white/70">AUTO-PARSE ENABLED</span>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-white/80">v2.1 Stable</p>
            <p className="text-[10px] text-white/40">ankitstudypoint.github.io</p>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden h-[calc(100vh-73px)]">
        {/* Left: Input & Controls */}
        <div className="flex flex-col border-r border-white/10 bg-black/20 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                  <h2 className="text-xs font-mono font-bold tracking-wider text-white/70 uppercase">Input Text</h2>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    className="bg-white/5 border border-white/10 rounded-md text-[10px] font-mono text-white/60 px-2 py-1 outline-none focus:border-brand/40"
                    onChange={(e) => {
                      const val = e.target.value as keyof typeof TEMPLATES;
                      if (val) setInputText(TEMPLATES[val]);
                    }}
                  >
                    <option value="">Load Template</option>
                    <option value="medical">Medical</option>
                    <option value="coding">Programming</option>
                    <option value="business">Business</option>
                  </select>
                  <button 
                    onClick={() => setInputText('')}
                    className="p-1.5 text-white/40 hover:text-red-400 transition-colors rounded-md hover:bg-red-400/10"
                    title="Clear all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="relative group">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste your raw notes here..."
                  className="w-full h-80 bg-[#0d0f12] border border-white/10 rounded-xl p-4 font-mono text-sm leading-relaxed text-white/80 outline-none focus:border-brand/40 focus:ring-1 focus:ring-brand/20 transition-all custom-scrollbar placeholder:text-white/10"
                />
                <div className="absolute bottom-4 right-4 text-[10px] font-mono text-white/30 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                  {stats.words} WORDS | {inputText.length} CHARS
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <Settings className="w-4 h-4 text-brand-secondary" />
                <h2 className="text-xs font-mono font-bold tracking-wider text-white/70 uppercase">Organizer Settings</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Toggle 
                  label="Auto Headings" 
                  checked={options.autoHeadings} 
                  onChange={(v) => setOptions({...options, autoHeadings: v})}
                  icon={<Type className="w-3.5 h-3.5" />}
                />
                <Toggle 
                  label="Bullet Points" 
                  checked={options.bulletPoints} 
                  onChange={(v) => setOptions({...options, bulletPoints: v})}
                  icon={<List className="w-3.5 h-3.5" />}
                />
                <Toggle 
                  label="Definitions" 
                  checked={options.keyValues} 
                  onChange={(v) => setOptions({...options, keyValues: v})}
                  icon={<Search className="w-3.5 h-3.5" />}
                />
                <Toggle 
                  label="Numbered Lists" 
                  checked={options.numberedList} 
                  onChange={(v) => setOptions({...options, numberedList: v})}
                  icon={<Hash className="w-3.5 h-3.5" />}
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <Smartphone className="w-3 h-3 text-brand" /> Author Name
                  </label>
                  <input 
                    type="text"
                    value={options.userName}
                    onChange={(e) => setOptions({...options, userName: e.target.value})}
                    placeholder="Your name for headers..."
                    className="w-full bg-[#151820] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 outline-none focus:border-brand/30 transition-all font-sans"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    onClick={() => setIsSeoOpen(!isSeoOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-brand" />
                      <span className="text-xs font-mono font-bold text-white/70">SEO & METADATA</span>
                    </div>
                    <ArrowRight className={cn("w-3.5 h-3.5 text-white/30 transition-transform", isSeoOpen && "rotate-90")} />
                  </button>
                  
                  <AnimatePresence>
                    {isSeoOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 mt-2 bg-[#151820] border border-white/10 rounded-xl space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Page Title</label>
                            <input 
                              type="text"
                              value={options.pageTitle}
                              onChange={(e) => setOptions({...options, pageTitle: e.target.value})}
                              placeholder="e.g. Pharmacology Notes Chapter 1"
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80 outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Description</label>
                            <textarea 
                              value={options.seoDescription}
                              onChange={(e) => setOptions({...options, seoDescription: e.target.value})}
                              placeholder="Meta description for SEO..."
                              className="w-full h-20 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80 outline-none resize-none"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>
          </div>
          
          <div className="mt-auto p-6 border-t border-white/10 bg-black/40 backdrop-blur-sm space-y-3">
             <div className="flex gap-3">
                <button 
                  onClick={handlePreviewPdf}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand text-black font-mono font-bold py-3 rounded-xl hover:bg-brand/90 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,229,160,0.2)]"
                >
                  <Eye className="w-4 h-4" /> PREVIEW PDF
                </button>
                <button 
                  onClick={handleDownloadPdf}
                  disabled={pdfGenerating}
                  className="flex items-center justify-center bg-white/10 text-white p-3 rounded-xl hover:bg-white/20 active:scale-95 transition-all border border-white/10 disabled:opacity-50"
                  title="Direct Download"
                >
                  {pdfGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                </button>
             </div>
             <p className="text-[10px] text-center text-white/30 font-mono">PDF-LIB GENERATOR v1.17 • 128-BIT RENDER</p>
          </div>
        </div>

        {/* Right: Preview Output */}
        <div className="flex flex-col bg-[#0d0f12] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono font-bold text-brand uppercase tracking-widest">Live Preview</span>
              <div className="flex gap-2">
                <div className="text-[10px] bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full text-brand font-mono">
                  {stats.headings} HEADINGS
                </div>
                <div className="text-[10px] bg-brand-secondary/10 border border-brand-secondary/20 px-2 py-0.5 rounded-full text-brand-secondary font-mono">
                  {stats.points} POINTS
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopyText}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all border",
                  copyStatus === 'text' ? "bg-brand/10 border-brand text-brand" : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                )}
              >
                {copyStatus === 'text' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                COPY TEXT
              </button>
              <button 
                onClick={handleCopyHtml}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all border",
                  copyStatus === 'html' ? "bg-brand-secondary/10 border-brand-secondary text-brand-secondary" : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                )}
              >
                {copyStatus === 'html' ? <Check className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                COPY HTML
              </button>
              <button 
                onClick={handleDownloadHtml}
                className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                title="Download HTML"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand/5 via-transparent to-transparent">
            {blocks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-4">
                <Search className="w-16 h-16 stroke-[1]" />
                <p className="font-mono text-sm">Waiting for input content...</p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-6">
                <AnimatePresence mode="popLayout">
                  {blocks.map((block, idx) => (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group"
                    >
                      {block.type === 'heading' && (
                        <div className="space-y-2 mt-4 first:mt-0">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-brand border border-brand/20 bg-brand/5 px-2 py-0.5 rounded">H{Math.ceil((idx + 1) / 2)}</span>
                            <h3 className="text-xl font-bold text-white group-hover:text-brand transition-colors">{block.text}</h3>
                          </div>
                          <div className="h-0.5 w-full bg-brand/20 rounded-full" />
                        </div>
                      )}
                      
                      {block.type === 'subheading' && (
                        <h4 className="text-sm font-bold text-brand-secondary/80 flex items-center gap-2 pl-2 border-l-2 border-brand-secondary/30 mt-4 mb-2">
                          <ArrowRight className="w-3.5 h-3.5" />
                          {block.text}
                        </h4>
                      )}

                      {block.type === 'point' && (
                        <div className={cn(
                          "flex gap-3 pl-4 py-1 group-hover:bg-white/5 rounded-lg transition-all",
                          options.numberedList ? "items-baseline" : "items-start"
                        )}>
                          {options.numberedList ? (
                            <span className="text-xs font-mono text-brand min-w-[1.25rem]">{block.number}.</span>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-brand mt-2 flex-shrink-0" />
                          )}
                          <p className="text-sm text-white/80 leading-relaxed">{block.text}</p>
                        </div>
                      )}

                      {block.type === 'definition' && (
                        <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1 my-2">
                          <span className="text-[10px] font-mono font-bold text-brand-secondary uppercase tracking-widest">{block.key}</span>
                          <p className="text-sm text-white/80">{block.value}</p>
                        </div>
                      )}

                      {block.type === 'plain' && (
                        <p className="text-sm text-white/40 italic font-mono pl-4 border-l border-white/5">{block.text}</p>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                <div className="pt-12 pb-6 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-2">
                     <Sparkles className="w-4 h-4 text-white/20" />
                  </div>
                  <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">End of Organized Summary</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="border-t border-white/10 bg-black/60 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-brand" />
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-tight">System Ready</span>
          </div>
          <p className="text-[10px] font-mono text-white/20 uppercase">Powered by AnkitStudyPoint Engineering</p>
        </div>
        <div className="flex gap-4">
          <a href="#" className="text-[10px] font-mono text-white/40 hover:text-brand transition-colors">HELP</a>
          <a href="#" className="text-[10px] font-mono text-white/40 hover:text-brand transition-colors">API</a>
          <a href="#" className="text-[10px] font-mono text-white/40 hover:text-brand transition-colors">GITHUB</a>
        </div>
      </footer>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPreviewModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl h-full max-h-[90vh] bg-[#151820] border border-white/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-brand" />
                  <h3 className="font-mono text-sm font-bold text-white uppercase tracking-widest">PDF DOCUMENT PREVIEW</h3>
                </div>
                <button 
                  onClick={() => setShowPreviewModal(false)}
                  className="p-2 text-white/40 hover:text-white transition-colors hover:bg-white/5 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 bg-[#525659] relative overflow-hidden">
                {pdfGenerating ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#151820]">
                    <div className="w-12 h-12 border-4 border-white/10 border-t-brand rounded-full animate-spin" />
                    <p className="font-mono text-xs text-white/60">GENERATING OPTIMIZED PDF...</p>
                  </div>
                ) : (
                  <>
                    {isMobile ? (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6 bg-[#151820]">
                        <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center border border-brand/20">
                          <Smartphone className="w-10 h-10 text-brand" />
                        </div>
                        <div className="space-y-2">
                           <h4 className="text-xl font-bold text-white">Device Preview Ready</h4>
                           <p className="text-sm text-white/50 max-w-sm">Mobile browsers restrict nested PDF previews. Click save to view the professional formatted document in your native viewer.</p>
                        </div>
                        <div className="w-full max-w-xs p-4 bg-brand/5 border border-brand/20 rounded-2xl flex items-center gap-3 text-left">
                           <Info className="w-5 h-5 text-brand flex-shrink-0" />
                           <p className="text-[10px] font-mono text-brand/80 leading-relaxed uppercase">File will be saved to your "Downloads" folder with SEO-safe naming conventions.</p>
                        </div>
                      </div>
                    ) : (
                       <iframe 
                        src={previewBlobUrl + "#toolbar=1&navpanes=0"} 
                        className="w-full h-full border-none"
                        title="PDF Preview"
                      />
                    )}
                  </>
                )}
              </div>

              <div className="p-6 border-t border-white/10 bg-black/40 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                   <div className="flex items-center gap-2">
                     <Check className="w-3.5 h-3.5 text-brand" /> HIGH DEF
                   </div>
                   <div className="flex items-center gap-2">
                     <Check className="w-3.5 h-3.5 text-brand" /> SEO READY
                   </div>
                   <div className="flex items-center gap-2">
                     <Check className="w-3.5 h-3.5 text-brand" /> CROSS-DEVICE
                   </div>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                   <button 
                    onClick={() => setShowPreviewModal(false)}
                    className="flex-1 md:flex-none px-6 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/60 font-mono font-bold text-xs hover:bg-white/10 transition-all"
                   >
                     CLOSE
                   </button>
                   <button 
                    onClick={handleDownloadPdf}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl bg-brand text-black font-mono font-bold text-xs hover:bg-brand/90 transition-all shadow-[0_4px_20px_rgba(0,229,160,0.3)]"
                   >
                     <Download className="w-4 h-4" /> SAVE PDF
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({ label, checked, onChange, icon }: { label: string, checked: boolean, onChange: (v: boolean) => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center justify-between p-3 rounded-xl border transition-all select-none group",
        checked 
          ? "bg-brand/10 border-brand/30 text-brand" 
          : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn("transition-colors", checked ? "text-brand" : "text-white/20")}>
          {icon}
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn(
        "w-8 h-4 rounded-full relative transition-colors border",
        checked ? "bg-brand/20 border-brand/40" : "bg-white/5 border-white/10"
      )}>
        <motion.div 
          animate={{ x: checked ? 16 : 0 }}
          className={cn(
            "absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full transition-colors",
            checked ? "bg-brand" : "bg-white/20"
          )}
        />
      </div>
    </button>
  );
}
