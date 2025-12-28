
import React, { useState, useRef } from 'react';

interface Tool {
    id: string;
    name: string;
    icon: string;
    category: 'PDF Tools' | 'AI Tools' | 'Image & Other' | 'You May Like';
    color: string;
    description: string;
    accept?: string;
}

const ALL_TOOLS: Tool[] = [
    // PDF Tools
    { id: 'pdf-edit', name: 'PDF Edit', icon: 'fas fa-pen-square', category: 'PDF Tools', color: '#E41E3F', description: 'Add text, shapes, and signatures to your PDF.', accept: '.pdf' },
    { id: 'pdf-to-word', name: 'PDF to Word', icon: 'fas fa-file-word', category: 'PDF Tools', color: '#2D88FF', description: 'Convert PDF documents to editable Word files.', accept: '.pdf' },
    { id: 'pdf-password', name: 'PDF Password', icon: 'fas fa-lock', category: 'PDF Tools', color: '#F7B928', description: 'Protect your PDF with a password.', accept: '.pdf' },
    { id: 'pdf-annotation', name: 'PDF Annotation', icon: 'fas fa-highlighter', category: 'PDF Tools', color: '#E41E3F', description: 'Highlight and annotate PDF text.', accept: '.pdf' },
    { id: 'pdf-to-ppt', name: 'PDF to PPT', icon: 'fas fa-file-powerpoint', category: 'PDF Tools', color: '#F02849', description: 'Convert PDF slides to PowerPoint presentations.', accept: '.pdf' },
    { id: 'pdf-to-excel', name: 'PDF to Excel', icon: 'fas fa-file-excel', category: 'PDF Tools', color: '#45BD62', description: 'Extract PDF tables to Excel spreadsheets.', accept: '.pdf' },
    { id: 'merge-pdf', name: 'Merge PDF', icon: 'fas fa-object-group', category: 'PDF Tools', color: '#E41E3F', description: 'Combine multiple PDFs into one file.', accept: '.pdf' },
    { id: 'pdf-signature', name: 'PDF Signature', icon: 'fas fa-signature', category: 'PDF Tools', color: '#2D88FF', description: 'Sign your PDF documents digitally.', accept: '.pdf' },
    { id: 'word-to-pdf', name: 'Word to PDF', icon: 'fas fa-file-alt', category: 'PDF Tools', color: '#2D88FF', description: 'Convert Word documents to PDF.', accept: '.doc,.docx' },
    { id: 'image-to-pdf', name: 'Image to PDF', icon: 'fas fa-file-image', category: 'PDF Tools', color: '#F7B928', description: 'Convert JPG/PNG images to PDF.', accept: 'image/*' },
    { id: 'ppt-to-pdf', name: 'PPT to PDF', icon: 'fas fa-file-powerpoint', category: 'PDF Tools', color: '#F02849', description: 'Convert PowerPoint slides to PDF.', accept: '.ppt,.pptx' },
    { id: 'excel-to-pdf', name: 'Excel to PDF', icon: 'fas fa-file-excel', category: 'PDF Tools', color: '#45BD62', description: 'Convert Excel sheets to PDF.', accept: '.xls,.xlsx' },
    { id: 'split-pdf', name: 'Split PDF', icon: 'fas fa-cut', category: 'PDF Tools', color: '#E41E3F', description: 'Extract pages from a PDF.', accept: '.pdf' },
    { id: 'pdf-numbering', name: 'PDF Numbering', icon: 'fas fa-list-ol', category: 'PDF Tools', color: '#2D88FF', description: 'Add page numbers to your PDF.', accept: '.pdf' },
    
    // Image & Other
    { id: 'image-resize', name: 'Image Resize', icon: 'fas fa-compress-arrows-alt', category: 'Image & Other', color: '#1877F2', description: 'Resize images to specific dimensions.', accept: 'image/*' },
    { id: 'scanner', name: 'Scanner', icon: 'fas fa-camera', category: 'Image & Other', color: '#242526', description: 'Scan documents using your camera.', accept: 'image/*' },
    
    // AI Tools (Mock)
    { id: 'ai-chat', name: 'AI Chat', icon: 'fas fa-robot', category: 'AI Tools', color: '#A033FF', description: 'Chat with UNERA AI Assistant.', accept: '' },
    { id: 'ai-summary', name: 'AI Summary', icon: 'fas fa-file-alt', category: 'AI Tools', color: '#45BD62', description: 'Summarize long documents with AI.', accept: '.pdf,.txt,.doc' },
];

interface ToolModalProps {
    tool: Tool;
    onClose: () => void;
}

const ToolModal: React.FC<ToolModalProps> = ({ tool, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setIsComplete(false);
        }
    };

    const handleProcess = () => {
        if (!file && tool.accept) return;
        
        setIsProcessing(true);
        
        // Mock local processing time
        setTimeout(() => {
            setIsProcessing(false);
            setIsComplete(true);
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-[#242526] w-full max-w-[400px] rounded-2xl border border-[#3E4042] shadow-2xl overflow-hidden flex flex-col relative animate-slide-up">
                
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-[#3A3B3C] rounded-full flex items-center justify-center text-[#B0B3B8] hover:text-white hover:bg-[#4E4F50] transition-colors z-10">
                    <i className="fas fa-times"></i>
                </button>

                {/* Header / Icon */}
                <div className="flex flex-col items-center pt-10 pb-6 px-6 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-[#3A3B3C] flex items-center justify-center mb-4 shadow-inner border border-[#3E4042]">
                        <i className={`${tool.icon} text-[48px]`} style={{ color: tool.color }}></i>
                    </div>
                    <h2 className="text-2xl font-bold text-[#E4E6EB] mb-2">{tool.name}</h2>
                    <p className="text-[#B0B3B8] text-sm leading-relaxed">{tool.description}</p>
                </div>

                {/* Action Area */}
                <div className="p-6 bg-[#18191A] border-t border-[#3E4042]">
                    {!isComplete ? (
                        <>
                            {tool.accept && (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed ${file ? 'border-[#45BD62] bg-[#45BD62]/10' : 'border-[#3E4042] hover:border-[#B0B3B8] hover:bg-[#3A3B3C]'} rounded-xl p-6 text-center cursor-pointer transition-all mb-4`}
                                >
                                    {file ? (
                                        <div className="flex items-center justify-center gap-2 text-[#E4E6EB]">
                                            <i className="fas fa-file text-xl"></i>
                                            <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <i className="fas fa-cloud-upload-alt text-2xl text-[#1877F2]"></i>
                                            <span className="text-[#B0B3B8] text-sm font-medium">Select File</span>
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" accept={tool.accept} onChange={handleFileChange} />
                                </div>
                            )}

                            <button 
                                onClick={handleProcess} 
                                disabled={isProcessing || (!!tool.accept && !file)}
                                className={`w-full py-3.5 rounded-xl font-bold text-[16px] transition-all flex items-center justify-center gap-2 ${
                                    isProcessing || (!!tool.accept && !file)
                                    ? 'bg-[#3A3B3C] text-[#B0B3B8] cursor-not-allowed' 
                                    : 'bg-[#1877F2] text-white hover:bg-[#166FE5] shadow-lg hover:shadow-blue-500/20 active:scale-95'
                                }`}
                            >
                                {isProcessing ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i> Processing...
                                    </>
                                ) : (
                                    'Convert / Start'
                                )}
                            </button>
                        </>
                    ) : (
                        <div className="text-center animate-fade-in">
                            <div className="w-16 h-16 bg-[#45BD62]/20 text-[#45BD62] rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-[#45BD62]/50">
                                <i className="fas fa-check"></i>
                            </div>
                            <h3 className="text-[#E4E6EB] font-bold text-lg mb-2">Success!</h3>
                            <p className="text-[#B0B3B8] text-sm mb-6">Your file has been processed.</p>
                            <button onClick={() => { setIsComplete(false); setFile(null); onClose(); alert("File downloaded to device storage."); }} className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-3.5 rounded-xl font-bold transition-all shadow-lg">
                                Download File
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const ToolsPage: React.FC = () => {
    const [activeTool, setActiveTool] = useState<Tool | null>(null);

    const categories = ['You May Like', 'AI Tools', 'PDF Tools', 'Image & Other'];

    const getToolsByCategory = (cat: string) => {
        if (cat === 'You May Like') {
            // Pick a few random popular tools for suggestion
            return ALL_TOOLS.filter(t => ['pdf-to-word', 'ai-chat', 'scanner', 'image-resize'].includes(t.id));
        }
        return ALL_TOOLS.filter(t => t.category === cat);
    };

    return (
        <div className="w-full max-w-[800px] mx-auto min-h-screen bg-[#18191A] font-sans pb-20">
            {/* Header */}
            <div className="sticky top-14 bg-[#18191A]/95 backdrop-blur-sm z-30 px-4 py-4 border-b border-[#3E4042]">
                <h1 className="text-2xl font-bold text-[#E4E6EB]">Tools</h1>
                <p className="text-[#B0B3B8] text-sm mt-1">Useful utilities for your daily tasks.</p>
            </div>

            <div className="p-4 space-y-8">
                {categories.map(cat => {
                    const tools = getToolsByCategory(cat);
                    if (tools.length === 0) return null;

                    return (
                        <div key={cat} className="animate-fade-in">
                            <h3 className="text-[#B0B3B8] font-bold text-sm uppercase tracking-wider mb-3 px-1">{cat}</h3>
                            <div className="bg-[#242526] rounded-xl p-4 border border-[#3E4042]">
                                <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                                    {tools.map(tool => (
                                        <div 
                                            key={tool.id} 
                                            className="flex flex-col items-center cursor-pointer group"
                                            onClick={() => setActiveTool(tool)}
                                        >
                                            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#3A3B3C] group-hover:bg-[#4E4F50] transition-all duration-200 mb-2 relative">
                                                <i className={`${tool.icon} text-[24px]`} style={{ color: tool.color }}></i>
                                            </div>
                                            <span className="text-[#E4E6EB] text-[11px] font-medium text-center leading-tight line-clamp-2 px-1">
                                                {tool.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {activeTool && <ToolModal tool={activeTool} onClose={() => setActiveTool(null)} />}
        </div>
    );
};
