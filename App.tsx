
import React, { useState, useRef, useEffect, TouchEvent } from 'react';
import { User, Post as PostType, ReactionType, Comment, Product, LinkPreview, Group, Brand, AudioTrack } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { INITIAL_USERS, LOCATIONS_DATA, REACTION_ICONS, REACTION_COLORS, GIF_CATEGORIES, MARKETPLACE_COUNTRIES, MARKETPLACE_CATEGORIES } from '../constants';
import { StickerPicker, EmojiPicker } from './Pickers';

// Facebook-style relative time formatter (same as in App.tsx)
const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const diffInSeconds = Math.floor(diff / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
        return `${diffInHours}h`;
    } else if (diffInDays < 7) {
        return `${diffInDays}d`;
    } else if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        return `${weeks}w`;
    } else if (diffInDays < 365) {
        const months = Math.floor(diffInDays / 30);
        return `${months}mo`;
    } else {
        const years = Math.floor(diffInDays / 365);
        return `${years}y`;
    }
};

// --- RICH TEXT RENDERER FOR MENTIONS & TAGS ---
const RichText = ({ text, users, onProfileClick, onHashtagClick }: { text: string, users?: User[], onProfileClick: (id: number) => void, onHashtagClick?: (tag: string) => void }) => {
    if (!text) return null;
    const parts = text.split(/(#[a-zA-Z0-9_]+|@\w+(?:\s\w+)?)/g);
    return (
        <span className="leading-relaxed text-[#E4E6EB] whitespace-pre-wrap break-words">
            {parts.map((part, index) => {
                if (part.startsWith('@')) {
                    const name = part.substring(1);
                    const user = users?.find(u => u.name.toLowerCase() === name.toLowerCase());
                    if (user) {
                        return (
                            <span key={index} className="text-[#1877F2] font-semibold cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); onProfileClick(user.id); }}>
                                {part}
                            </span>
                        );
                    }
                    return <span key={index} className="text-[#1877F2] font-semibold">{part}</span>;
                }
                if (part.startsWith('#')) {
                    return (
                        <span key={index} className="text-[#1877F2] cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); onHashtagClick && onHashtagClick(part); }}>
                            {part}
                        </span>
                    );
                }
                return <span key={index}>{part}</span>;
            })}
        </span>
    );
};

// --- FULL SCREEN IMAGE VIEWER WITH SWIPE SUPPORT ---
interface FullScreenImageViewerProps {
    images: string[];
    currentIndex: number;
    onClose: () => void;
    onIndexChange: (index: number) => void;
}

const FullScreenImageViewer: React.FC<FullScreenImageViewerProps> = ({ images, currentIndex, onClose, onIndexChange }) => {
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Minimum swipe distance required
    const minSwipeDistance = 50;

    const handleTouchStart = (e: TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && currentIndex < images.length - 1) {
            setIsTransitioning(true);
            setTimeout(() => {
                onIndexChange(currentIndex + 1);
                setIsTransitioning(false);
            }, 300);
        } else if (isRightSwipe && currentIndex > 0) {
            setIsTransitioning(true);
            setTimeout(() => {
                onIndexChange(currentIndex - 1);
                setIsTransitioning(false);
            }, 300);
        }
    };

    const goToNext = () => {
        if (currentIndex < images.length - 1) {
            setIsTransitioning(true);
            setTimeout(() => {
                onIndexChange(currentIndex + 1);
                setIsTransitioning(false);
            }, 300);
        }
    };

    const goToPrev = () => {
        if (currentIndex > 0) {
            setIsTransitioning(true);
            setTimeout(() => {
                onIndexChange(currentIndex - 1);
                setIsTransitioning(false);
            }, 300);
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowRight') goToNext();
        if (e.key === 'ArrowLeft') goToPrev();
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [currentIndex]);

    return (
        <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center">
            {/* Close button */}
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 z-40 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
            >
                <i className="fas fa-times text-white text-xl"></i>
            </button>

            {/* Previous button */}
            {currentIndex > 0 && (
                <button 
                    onClick={goToPrev}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 z-40 w-12 h-12 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                    <i className="fas fa-chevron-left text-white text-xl"></i>
                </button>
            )}

            {/* Next button */}
            {currentIndex < images.length - 1 && (
                <button 
                    onClick={goToNext}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 z-40 w-12 h-12 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                    <i className="fas fa-chevron-right text-white text-xl"></i>
                </button>
            )}

            {/* Main image */}
            <div 
                className="relative w-full h-full flex items-center justify-center"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <img 
                    src={images[currentIndex]} 
                    alt={`Image ${currentIndex + 1}`}
                    className={`max-w-full max-h-full object-contain ${isTransitioning ? 'opacity-50' : 'opacity-100'} transition-opacity duration-300`}
                />
            </div>

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-white font-medium">
                    {currentIndex + 1} / {images.length}
                </span>
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
                <div className="absolute bottom-20 left-0 right-0 overflow-x-auto px-4 pb-2 flex justify-center">
                    <div className="flex gap-2">
                        {images.map((img, index) => (
                            <div 
                                key={index}
                                onClick={() => {
                                    setIsTransitioning(true);
                                    setTimeout(() => {
                                        onIndexChange(index);
                                        setIsTransitioning(false);
                                    }, 300);
                                }}
                                className={`w-16 h-16 rounded-lg overflow-hidden cursor-pointer transition-all ${index === currentIndex ? 'ring-2 ring-[#1877F2] scale-110' : 'ring-1 ring-white/20'}`}
                            >
                                <img 
                                    src={img} 
                                    alt={`Thumbnail ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- IMAGE GRID COMPONENT (Facebook-style) ---
interface ImageGridProps {
    images: string[];
    onImageClick: (index: number) => void;
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, onImageClick }) => {
    if (!images || images.length === 0) return null;
    
    const displayedImages = images.slice(0, 9);
    const remainingCount = images.length - displayedImages.length;
    
    const getGridClass = () => {
        const count = displayedImages.length;
        if (count === 1) return "grid-cols-1";
        if (count === 2) return "grid-cols-2 gap-1";
        if (count === 3) return "grid-cols-2";
        if (count === 4) return "grid-cols-2 gap-1";
        return "grid-cols-3 gap-1";
    };

    const getImageClass = (index: number) => {
        const count = displayedImages.length;
        if (count === 1) return "row-span-2 col-span-2";
        if (count === 2) return "col-span-1 row-span-2";
        if (count === 3) {
            if (index === 0) return "row-span-2 col-span-1";
            return "row-span-1 col-span-1";
        }
        if (count === 4) return "row-span-1 col-span-1";
        return "row-span-1 col-span-1";
    };

    return (
        <div className={`grid ${getGridClass()} rounded-lg overflow-hidden mt-2`}>
            {displayedImages.map((image, index) => (
                <div 
                    key={index} 
                    className={`relative ${getImageClass(index)} cursor-pointer overflow-hidden bg-black`}
                    onClick={() => onImageClick(index)}
                >
                    <img 
                        src={image} 
                        alt={`Post image ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Overlay for remaining count */}
                    {index === displayedImages.length - 1 && remainingCount > 0 && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <span className="text-white text-2xl md:text-3xl font-bold">
                                +{remainingCount}
                            </span>
                        </div>
                    )}
                    
                    {/* Multi-image indicator for first image */}
                    {images.length > 1 && index === 0 && (
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center">
                            <i className="fas fa-layer-group text-white text-sm"></i>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

const getLinkPreview = (text: string): LinkPreview | null => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    if (match && match[0]) {
        const url = new URL(match[0]);
        const domain = url.hostname;
        if (domain.includes('youtube')) {
            return { url: url.href, title: "YouTube Video - Amazing Content", description: "Watch this incredible video on YouTube. Subscribe for more updates!", image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80", domain: "youtube.com" };
        } else if (domain.includes('github')) {
            return { url: url.href, title: "GitHub Repository", description: "Check out this open source project on GitHub. Contribute today!", image: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80", domain: "github.com" };
        } else {
            return { url: url.href, title: "Website Link", description: `Check out this link from ${domain}. Interesting content inside.`, image: "https://images.unsplash.com/photo-1432821596592-e2c18b78144f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80", domain: domain };
        }
    }
    return null;
};

const BACKGROUNDS = [
    { id: 'none', value: '' },
    { id: 'red', value: 'linear-gradient(45deg, #FF0057, #E64C4C)' },
    { id: 'blue', value: 'linear-gradient(45deg, #00C6FF, #0072FF)' },
    { id: 'green', value: 'linear-gradient(45deg, #a8ff78, #78ffd6)' },
    { id: 'purple', value: 'linear-gradient(45deg, #e65c00, #F9D423)' },
    { id: 'heart', value: 'url("https://images.unsplash.com/photo-1518199266791-5375a83190b7?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60")' },
    { id: 'dark', value: 'linear-gradient(to right, #434343 0%, black 100%)' },
    { id: 'fire', value: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)' },
];

const FEELINGS = ['Happy', 'Blessed', 'Loved', 'Sad', 'Excited', 'Thankful', 'Crazy', 'Tired', 'Cool', 'Relaxed'];

interface ReactionButtonProps {
    currentUserReactions: ReactionType | undefined;
    reactionCount: number;
    onReact: (type: ReactionType) => void;
    isGuest?: boolean;
}

export const ReactionButton: React.FC<ReactionButtonProps> = ({ currentUserReactions, reactionCount, onReact, isGuest }) => {
    const [showDock, setShowDock] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const handleMouseEnter = () => { 
        if (isGuest) return; 
        timerRef.current = setTimeout(() => setShowDock(true), 500); 
    };
    
    const handleMouseLeave = () => { 
        if (timerRef.current) clearTimeout(timerRef.current); 
        setTimeout(() => setShowDock(false), 300); 
    };
    
    const handleClick = () => { 
        if (isGuest) { 
            console.log("ReactionButton: Guest user attempting to react");
            return; 
        } 
        console.log("ReactionButton: Reacting with 'like'");
        onReact('like'); 
    };
    
    const reactionConfig = [
        { type: 'like' as const, icon: '👍', color: '#1877F2' }, 
        { type: 'love' as const, icon: '❤️', color: '#F3425F' }, 
        { type: 'haha' as const, icon: '😆', color: '#F7B928' }, 
        { type: 'wow' as const, icon: '😮', color: '#F7B928' }, 
        { type: 'sad' as const, icon: '😢', color: '#F7B928' }, 
        { type: 'angry' as const, icon: '😡', color: '#E41E3F' }
    ] as const;
    
    const activeReaction = currentUserReactions ? reactionConfig.find(r => r.type === currentUserReactions) : null;
    
    return (
        <div className="flex-1 relative group" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {showDock && (
                <div className="absolute -top-12 left-0 bg-[#242526] rounded-full shadow-xl p-1.5 flex gap-2 animate-fade-in border border-[#3E4042] z-50">
                    {reactionConfig.map(reaction => (
                        <div 
                            key={reaction.type} 
                            className="text-2xl hover:scale-125 transition-transform cursor-pointer hover:-translate-y-2 duration-200" 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                console.log(`ReactionButton: Clicked ${reaction.type} reaction`);
                                onReact(reaction.type); 
                                setShowDock(false); 
                            }}
                        >
                            {reaction.icon}
                        </div>
                    ))}
                </div>
            )}
            <button 
                onClick={handleClick} 
                className="w-full flex items-center justify-center gap-2 h-10 rounded hover:bg-[#3A3B3C] transition-colors active:scale-95"
            >
                {activeReaction ? (
                    <>
                        <span className="text-[20px]">{activeReaction.icon}</span>
                        <span className="text-[17px] font-medium" style={{ color: activeReaction.color }}>
                            {activeReaction.type.charAt(0).toUpperCase() + activeReaction.type.slice(1)}
                        </span>
                    </>
                ) : (
                    <>
                        <i className="far fa-thumbs-up text-[20px] text-[#B0B3B8]"></i>
                        <span className="text-[17px] font-medium text-[#B0B3B8]">Like</span>
                    </>
                )}
            </button>
        </div>
    );
};

// --- SHARE SHEET MODAL ---
interface ShareSheetProps {
    currentUser: User | null;
    groups: Group[];
    brands: Brand[];
    postId: number;
    onClose: () => void;
    onShare: (type: 'profile' | 'group' | 'brand', id?: string | number, caption?: string) => void;
    onCopyLink: () => void;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({ currentUser, groups, brands, postId, onClose, onShare, onCopyLink }) => {
    const [caption, setCaption] = useState('');
    const [view, setView] = useState<'main' | 'groups' | 'brands'>('main');
    const uniqueLink = `https://unera.social/posts/${postId}`;

    return (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end md:items-center md:justify-center p-0 md:p-4">
             <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
             <div className="bg-[#242526] w-full md:w-[550px] rounded-t-[2rem] md:rounded-[2rem] z-20 animate-slide-up flex flex-col max-h-[90vh] shadow-2xl overflow-hidden border border-[#3E4042]">
                <div className="p-4 border-b border-[#3E4042] flex items-center justify-between">
                    {view !== 'main' && <i className="fas fa-arrow-left text-[#B0B3B8] cursor-pointer" onClick={() => setView('main')}></i>}
                    <h3 className="text-[#E4E6EB] font-bold text-lg flex-1 text-center">
                        {view === 'main' ? 'Share Content' : view === 'groups' ? 'Share to Groups' : 'Share to Brand Pages'}
                    </h3>
                    <div onClick={onClose} className="w-8 h-8 rounded-full bg-[#3A3B3C] flex items-center justify-center cursor-pointer transition-colors"><i className="fas fa-times text-[#B0B3B8]"></i></div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {view === 'main' && (
                        <>
                            <div className="flex items-center gap-3 mb-6 bg-[#3A3B3C]/30 p-3 rounded-2xl border border-[#3E4042]">
                                <img src={currentUser?.profileImage} className="w-10 h-10 rounded-full object-cover" alt="" />
                                <div className="flex-1">
                                    <textarea className="w-full bg-transparent text-[#E4E6EB] outline-none resize-none text-[15px] placeholder-[#B0B3B8]" placeholder="Say something about this moment..." value={caption} onChange={e => setCaption(e.target.value)} rows={2} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                <button onClick={() => onShare('profile', undefined, caption)} className="flex items-center gap-3 p-4 bg-[#263951] hover:bg-[#2A3F5A] rounded-2xl transition-all border border-[#2D88FF]/30 group">
                                    <div className="w-12 h-12 bg-[#2D88FF] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><i className="fas fa-rss text-white text-xl"></i></div>
                                    <div className="text-left"><p className="text-[#E4E6EB] font-bold text-lg leading-tight">Share to Profile</p><p className="text-[#B0B3B8] text-sm">Post directly to your timeline</p></div>
                                </button>
                                <button onClick={() => setView('groups')} className="flex items-center gap-3 p-4 bg-[#1C1D1E] hover:bg-[#3A3B3C] rounded-2xl transition-all border border-[#3E4042] group">
                                    <div className="w-12 h-12 bg-[#45BD62] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><i className="fas fa-users text-white text-xl"></i></div>
                                    <div className="text-left"><p className="text-[#E4E6EB] font-bold text-lg leading-tight">Share to Group</p><p className="text-[#B0B3B8] text-sm">Send to a community discussion</p></div>
                                </button>
                                <button onClick={() => setView('brands')} className="flex items-center gap-3 p-4 bg-[#1C1D1E] hover:bg-[#3A3B3C] rounded-2xl transition-all border border-[#3E4042] group">
                                    <div className="w-12 h-12 bg-[#F7B928] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><i className="fas fa-award text-white text-xl"></i></div>
                                    <div className="text-left"><p className="text-[#E4E6EB] font-bold text-lg leading-tight">Share to Page</p><p className="text-[#B0B3B8] text-sm">Share on a business or brand page</p></div>
                                </button>
                            </div>

                            <div className="mt-8">
                                <p className="text-[#B0B3B8] text-sm font-bold uppercase tracking-widest mb-4">Share to Social Networks</p>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(uniqueLink)}`)}>
                                        <div className="w-14 h-14 bg-[#25D366] rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg group-hover:scale-110 transition-all"><i className="fab fa-whatsapp"></i></div>
                                        <span className="text-xs font-bold text-[#E4E6EB]">WhatsApp</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(uniqueLink)}`)}>
                                        <div className="w-14 h-14 bg-[#1877F2] rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg group-hover:scale-110 transition-all"><i className="fab fa-facebook"></i></div>
                                        <span className="text-xs font-bold text-[#E4E6EB]">Facebook</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(uniqueLink)}`)}>
                                        <div className="w-14 h-14 bg-[#1DA1F2] rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg group-hover:scale-110 transition-all"><i className="fab fa-twitter"></i></div>
                                        <span className="text-xs font-bold text-[#E4E6EB]">X / Twitter</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => { onCopyLink(); navigator.clipboard.writeText(uniqueLink); }}>
                                        <div className="w-14 h-14 bg-[#3A3B3C] rounded-2xl flex items-center justify-center text-[#E4E6EB] text-2xl shadow-lg group-hover:scale-110 transition-all border border-[#3E4042]"><i className="fas fa-link"></i></div>
                                        <span className="text-xs font-bold text-[#E4E6EB]">Copy Link</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {view === 'groups' && (
                        <div className="space-y-2">
                            {groups.map(g => (
                                <div key={g.id} className="flex items-center gap-3 p-3 bg-[#1C1D1E] hover:bg-[#3A3B3C] rounded-xl cursor-pointer transition-colors border border-[#3E4042]" onClick={() => onShare('group', g.id, caption)}>
                                    <img src={g.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
                                    <div><p className="text-[#E4E6EB] font-bold">{g.name}</p><p className="text-[#B0B3B8] text-xs">{g.members.length} Members</p></div>
                                </div>
                            ))}
                        </div>
                    )}

                    {view === 'brands' && (
                        <div className="space-y-2">
                            {brands.map(b => (
                                <div key={b.id} className="flex items-center gap-3 p-3 bg-[#1C1D1E] hover:bg-[#3A3B3C] rounded-xl cursor-pointer transition-colors border border-[#3E4042]" onClick={() => onShare('brand', b.id, caption)}>
                                    <img src={b.profileImage} className="w-12 h-12 rounded-full object-cover" alt="" />
                                    <div><p className="text-[#E4E6EB] font-bold">{b.name}</p><p className="text-[#B0B3B8] text-xs">{b.category}</p></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="p-4 bg-[#1C1D1E]/80 backdrop-blur-md border-t border-[#3E4042]">
                    <p className="text-[#B0B3B8] text-center text-xs">Post Link: <span className="text-[#1877F2] font-mono break-all">{uniqueLink}</span></p>
                </div>
             </div>
        </div>
    );
};

interface SuggestedProductsWidgetProps {
    products: Product[];
    currentUser: User;
    onViewProduct: (product: Product) => void;
    onSeeAll: () => void;
}

export const SuggestedProductsWidget: React.FC<SuggestedProductsWidgetProps> = ({ products, currentUser, onViewProduct, onSeeAll }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollRef.current && !isHovered) {
                if (scrollRef.current.scrollLeft + scrollRef.current.clientWidth >= scrollRef.current.scrollWidth) scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                else scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [isHovered]);
    if (products.length === 0) return null;
    return (
        <div className="bg-[#242526] rounded-xl border border-[#3E4042] mb-4 p-4 shadow-sm" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <div className="flex justify-between items-center mb-3"><h3 className="text-[#E4E6EB] font-bold text-[17px]">Suggested for you</h3><span className="text-[#1877F2] text-[15px] cursor-pointer hover:underline" onClick={onSeeAll}>See more</span></div>
            <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 scroll-smooth">{products.slice(0, 8).map(p => (<div key={p.id} className="min-w-[140px] bg-[#18191A] rounded-lg overflow-hidden border border-[#3E4042] cursor-pointer flex-shrink-0" onClick={() => onViewProduct(p)}><div className="h-32 bg-white"><img src={p.images[0]} className="w-full h-full object-cover" alt="" /></div><div className="p-2"><div className="font-bold text-[#E4E6EB] text-[15px] truncate">{p.title}</div><div className="text-[#F02849] font-bold text-[15px]">{MARKETPLACE_COUNTRIES.find(c => c.code === p.country)?.symbol || '$'}{p.mainPrice}</div></div></div>))}</div>
        </div>
    );
};

interface CreatePostProps {
    currentUser: User;
    onProfileClick: (id: number) => void;
    onClick: () => void;
    onCreateEventClick?: () => void;
}

export const CreatePost: React.FC<CreatePostProps> = ({ currentUser, onProfileClick, onClick, onCreateEventClick }) => {
    return (
        <div className="bg-[#242526] rounded-xl p-3 md:p-4 mb-4 shadow-sm border border-[#3E4042]">
            <div className="flex gap-2 mb-3"><img src={currentUser.profileImage} alt="Profile" className="w-10 h-10 rounded-full object-cover cursor-pointer border border-[#3E4042]" onClick={() => onProfileClick(currentUser.id)} /><div className="flex-1 bg-[#3A3B3C] rounded-full px-3 md:px-4 py-2 hover:bg-[#4E4F50] cursor-pointer flex items-center transition-colors" onClick={onClick}><span className="text-[#B0B3B8] text-[17px] truncate">What's on your mind?</span></div></div>
            <div className="border-t border-[#3E4042] pt-2 flex justify-between"><div className="flex items-center justify-center flex-1 gap-2 p-2 hover:bg-[#3A3B3C] rounded-lg cursor-pointer transition-colors" onClick={onClick}><i className="fas fa-video text-[#F3425F] text-[22px]"></i><span className="text-[#B0B3B8] font-semibold text-[15px] hidden sm:block">Live Video</span></div><div className="flex items-center justify-center flex-1 gap-2 p-2 hover:bg-[#3A3B3C] rounded-lg cursor-pointer transition-colors" onClick={onClick}><i className="fas fa-images text-[#45BD62] text-[22px]"></i><span className="text-[#B0B3B8] font-semibold text-[15px] hidden sm:block">Photo/Video</span></div><div className="flex items-center justify-center flex-1 gap-2 p-2 hover:bg-[#3A3B3C] rounded-lg cursor-pointer transition-colors" onClick={onCreateEventClick}><i className="fas fa-flag text-[#F7B928] text-[22px]"></i><span className="text-[#B0B3B8] font-semibold text-[15px] hidden sm:block">Life Event</span></div></div>
        </div>
    );
};

// --- CREATE POST MODAL WITH MULTI-IMAGE SUPPORT ---
interface CreatePostModalProps {
    currentUser: User;
    users: User[]; 
    onClose: () => void;
    // UPDATED: Now accepts multiple files for multi-image posts
    onCreatePost: (text: string, files: File[] | null, type: any, visibility: any, location?: string, feeling?: string, taggedUsers?: number[], background?: string, linkPreview?: LinkPreview) => void;
    onCreateEventClick?: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ currentUser, users, onClose, onCreatePost, onCreateEventClick }) => {
    const [view, setView] = useState<'main' | 'tag' | 'feeling' | 'location' | 'gif' | 'camera'>('main');
    const [text, setText] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [type, setType] = useState<'text' | 'image' | 'video' | 'multimage'>('text');
    const [visibility, setVisibility] = useState('Public');
    const [activeBackground, setActiveBackground] = useState('');
    const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
    const [taggedUsers, setTaggedUsers] = useState<number[]>([]);
    const [feeling, setFeeling] = useState('');
    const [location, setLocation] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [searchLocationQuery, setSearchLocationQuery] = useState('');
    const [locationResults, setLocationResults] = useState<any[]>([]);
    const [isLocationLoading, setIsLocationLoading] = useState(false);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [locationError, setLocationError] = useState('');
    const locationSearchTimeout = useRef<any>(null);

    const handleLocationSearch = (query: string) => {
        if (locationSearchTimeout.current) clearTimeout(locationSearchTimeout.current);
        setSearchLocationQuery(query);
        if (query.length < 2) {
            setLocationResults([]);
            return;
        }
        setIsLocationLoading(true);
        locationSearchTimeout.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=10`);
                if (!res.ok) throw new Error('Network response was not ok');
                const data = await res.json();
                setLocationResults(data);
            } catch (err) {
                console.error("Location search failed", err);
                setLocationResults([]);
            } finally {
                setIsLocationLoading(false);
            }
        }, 500);
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
          setLocationError("Geolocation is not supported by your browser.");
          return;
        }
        setIsFetchingLocation(true);
        setLocationError('');
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              if (!response.ok) throw new Error("Failed to fetch address.");
              const data = await response.json();
              if (data && data.display_name) {
                setLocation(data.display_name);
                setView('main');
              } else {
                throw new Error("Could not find address for coordinates.");
              }
            } catch (error) {
              setLocationError("Could not determine your address. Please search manually.");
            } finally {
              setIsFetchingLocation(false);
            }
          },
          (error) => {
            setLocationError("Unable to retrieve your location. Please enable location services or search manually.");
            setIsFetchingLocation(false);
          }
        );
      };

    useEffect(() => { const preview = getLinkPreview(text); setLinkPreview(preview); }, [text]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            
            // Check if total files exceed limit (9 max like Facebook)
            const totalFiles = files.length + newFiles.length;
            if (totalFiles > 9) {
                alert("You can only upload up to 9 images.");
                return;
            }
            
            // Filter to only allow images
            const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));
            
            setFiles(prev => [...prev, ...imageFiles]);
            
            // Create previews
            const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);
            
            // Set type based on number of images
            const totalImages = files.length + imageFiles.length;
            setType(totalImages === 1 ? 'image' : 'multimage');
            
            setActiveBackground('');
            setView('main');
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
        
        // Update type based on remaining files
        if (files.length === 1) {
            setType('text');
        } else if (files.length === 2) {
            setType('image'); // Only one file left, switch to single image
        }
    };

    const handleSubmit = () => { 
        if (!text && files.length === 0 && !activeBackground) return; 
        
        // Determine post type based on content
        let postType = type;
        if (files.length > 0) {
            postType = files.length === 1 ? 'image' : 'multimage';
        }
        
        // Pass all files to onCreatePost
        onCreatePost(text, files.length > 0 ? files : null, postType, visibility, location, feeling, taggedUsers, activeBackground, linkPreview || undefined); 
        onClose(); 
    };
    
    const OptionsItem = ({ icon, color, label, onClick }: { icon: string, color: string, label: string, onClick?: () => void }) => (
        <div className="flex items-center gap-3 p-3 hover:bg-[#3A3B3C] active:bg-[#3A3B3C] cursor-pointer transition-colors" onClick={onClick}>
            <i className={`${icon} text-[24px] w-8 text-center`} style={{ color }}></i>
            <span className="text-[#E4E6EB] text-[17px] font-medium">{label}</span>
        </div>
    );

    // Render Image Grid for previews
    const renderImageGrid = (images: string[]) => {
        if (images.length === 0) return null;
        
        const displayedImages = images.slice(0, 9);
        const remainingCount = images.length - displayedImages.length;
        
        const getGridClass = () => {
            const count = displayedImages.length;
            if (count === 1) return "grid-cols-1";
            if (count === 2) return "grid-cols-2 gap-1";
            if (count === 3) return "grid-cols-2";
            if (count === 4) return "grid-cols-2 gap-1";
            return "grid-cols-3 gap-1";
        };

        const getImageClass = (index: number) => {
            const count = displayedImages.length;
            if (count === 1) return "row-span-2 col-span-2";
            if (count === 2) return "col-span-1 row-span-2";
            if (count === 3) {
                if (index === 0) return "row-span-2 col-span-1";
                return "row-span-1 col-span-1";
            }
            if (count === 4) return "row-span-1 col-span-1";
            return "row-span-1 col-span-1";
        };

        return (
            <div className={`grid ${getGridClass()} rounded-lg overflow-hidden mt-2`}>
                {displayedImages.map((image, index) => (
                    <div 
                        key={index} 
                        className={`relative ${getImageClass(index)} overflow-hidden bg-black`}
                    >
                        <img 
                            src={image} 
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                        />
                        
                        {/* Remove button */}
                        <div 
                            onClick={() => removeFile(index)}
                            className="absolute top-2 right-2 w-6 h-6 bg-black/80 rounded-full flex items-center justify-center cursor-pointer hover:bg-black"
                        >
                            <i className="fas fa-times text-white text-xs"></i>
                        </div>
                        
                        {/* Overlay for remaining count */}
                        {index === displayedImages.length - 1 && remainingCount > 0 && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                <span className="text-white text-xl font-bold">
                                    +{remainingCount}
                                </span>
                            </div>
                        )}
                        
                        {/* Multi-image indicator for first image */}
                        {images.length > 1 && index === 0 && (
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center">
                                <i className="fas fa-layer-group text-white text-sm"></i>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    if (view === 'tag') {
        return (
            <div className="fixed inset-0 z-[150] bg-[#18191A] flex flex-col animate-slide-up font-sans">
                <div className="flex items-center p-4 border-b border-[#3E4042] gap-4">
                    <i className="fas fa-arrow-left text-[#E4E6EB] text-xl cursor-pointer" onClick={() => setView('main')}></i>
                    <h3 className="text-[#E4E6EB] text-lg font-bold">Tag People</h3>
                    <button onClick={() => setView('main')} className="ml-auto text-[#1877F2] font-bold">Done</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {users.filter(u => u.id !== currentUser.id).map(u => (
                        <div key={u.id} className="flex items-center justify-between p-2 hover:bg-[#3A3B3C] rounded-lg cursor-pointer" onClick={() => setTaggedUsers(prev => prev.includes(u.id) ? prev.filter(uid => uid !== u.id) : [...prev, u.id])}>
                            <div className="flex items-center gap-3">
                                <img src={u.profileImage} className="w-10 h-10 rounded-full object-cover" alt="" />
                                <span className="text-[#E4E6EB] font-semibold">{u.name}</span>
                            </div>
                            {taggedUsers.includes(u.id) && <i className="fas fa-check-circle text-[#1877F2] text-xl"></i>}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    
    if (view === 'feeling') return (
        <div className="fixed inset-0 z-[150] bg-[#18191A] flex flex-col animate-slide-up font-sans">
            <div className="flex items-center p-4 border-b border-[#3E4042] gap-4">
                <i className="fas fa-arrow-left text-[#E4E6EB] text-xl cursor-pointer" onClick={() => setView('main')}></i>
                <h3 className="text-[#E4E6EB] text-lg font-bold">How are you feeling?</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2">
                {FEELINGS.map(f => (
                    <div key={f} className="p-3 bg-[#242526] rounded-lg text-center cursor-pointer hover:bg-[#3A3B3C] text-[#E4E6EB]" onClick={() => { setFeeling(f); setView('main'); }}>
                        {f}
                    </div>
                ))}
            </div>
        </div>
    );
    
    if (view === 'location') {
        return (
            <div className="fixed inset-0 z-[150] bg-[#18191A] flex flex-col animate-slide-up font-sans">
                <div className="flex items-center p-4 border-b border-[#3E4042] gap-4">
                    <i className="fas fa-arrow-left text-[#E4E6EB] text-xl cursor-pointer" onClick={() => setView('main')}></i>
                    <h3 className="text-[#E4E6EB] text-lg font-bold">Add Location</h3>
                </div>
                <div className="p-4">
                    <button onClick={handleGetCurrentLocation} disabled={isFetchingLocation} className="w-full flex items-center justify-center gap-2 bg-[#263951] text-[#2D88FF] font-semibold p-3 rounded-lg mb-4 hover:bg-[#2A3F5A] transition-colors disabled:opacity-50">
                        {isFetchingLocation ? (<><i className="fas fa-spinner fa-spin"></i> Fetching...</>) : (<><i className="fas fa-map-marker-alt"></i> Use my current location</>)}
                    </button>
                    {locationError && <p className="text-red-500 text-sm text-center mb-4">{locationError}</p>}
                    <div className="relative">
                        <input type="text" placeholder="Search for a location..." className="w-full bg-[#3A3B3C] rounded-lg p-3 pl-10 text-[#E4E6EB] outline-none mb-4 border border-[#3E4042] focus:border-[#1877F2]" autoFocus value={searchLocationQuery} onChange={(e) => handleLocationSearch(e.target.value)} />
                        <i className="fas fa-search absolute left-3 top-3.5 text-[#B0B3B8]"></i>
                        {isLocationLoading && <i className="fas fa-spinner fa-spin absolute right-3 top-3.5 text-[#1877F2]"></i>}
                    </div>
                    <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
                        {locationResults.length > 0 ? (
                            locationResults.map(loc => (
                                <div key={loc.place_id} className="flex items-center gap-3 p-3 hover:bg-[#3A3B3C] rounded-lg cursor-pointer transition-colors" onClick={() => { setLocation(loc.display_name); setView('main'); }}>
                                    <div className="w-8 h-8 bg-[#3A3B3C] rounded-full flex items-center justify-center"><i className="fas fa-map-marker-alt text-[#E4E6EB]"></i></div>
                                    <span className="text-[#E4E6EB]">{loc.display_name}</span>
                                </div>
                            ))
                        ) : (!isLocationLoading && searchLocationQuery.length >= 2 && <div className="text-center p-4 text-[#B0B3B8]">No results found.</div>)}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[150] bg-[#18191A] flex flex-col animate-slide-up font-sans">
            <div className="flex items-center justify-between p-4 border-b border-[#3E4042]">
                <div className="flex items-center gap-4">
                    <i className="fas fa-arrow-left text-[#E4E6EB] text-xl cursor-pointer" onClick={onClose}></i>
                    <h3 className="text-[#E4E6EB] text-[20px] font-medium">Create Post</h3>
                </div>
                <button onClick={handleSubmit} disabled={!text && files.length === 0 && !activeBackground} className="text-[#E4E6EB] font-bold text-[17px] disabled:text-[#B0B3B8]">POST</button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                        <img src={currentUser.profileImage} alt="" className="w-12 h-12 rounded-full object-cover" />
                        <div>
                            <div className="flex items-center gap-1 flex-wrap">
                                <h4 className="font-bold text-[#E4E6EB] text-[17px]">{currentUser.name}</h4>
                                {feeling && <span className="text-[#E4E6EB] text-[15px]"> is feeling {feeling}</span>}
                                {location && <span className="text-[#E4E6EB] text-[15px]"> in <strong>{location}</strong></span>}
                                {taggedUsers.length > 0 && <span className="text-[#E4E6EB] text-[15px]"> with {taggedUsers.length} others</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="bg-[#3A3B3C] rounded-md px-2 py-1 inline-flex items-center gap-1 text-[13px] font-semibold text-[#E4E6EB] border border-[#3E4042]">
                                    <i className={`fas ${visibility === 'Public' ? 'fa-globe-americas' : 'fa-lock'} text-[12px]`}></i>
                                    <span>{visibility}</span>
                                    <i className="fas fa-caret-down"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className={`relative min-h-[150px] mb-4 transition-all ${activeBackground ? 'flex items-center justify-center p-8 rounded-lg text-center min-h-[300px]' : ''}`} style={{ background: activeBackground, backgroundSize: 'cover' }}>
                        <textarea 
                            className={`w-full bg-transparent outline-none text-[#E4E6EB] placeholder-[#B0B3B8] resize-none ${activeBackground ? 'text-center font-bold text-3xl drop-shadow-md placeholder-white/70' : 'text-[24px]'}`} 
                            placeholder="What's on your mind?" 
                            value={text} 
                            onChange={e => setText(e.target.value)} 
                            rows={activeBackground ? 4 : 5} 
                        />
                    </div>
                    
                    {linkPreview && files.length === 0 && !activeBackground && (
                        <div className="mb-4 bg-[#242526] border border-[#3E4042] rounded-lg overflow-hidden cursor-pointer hover:bg-[#3A3B3C] transition-colors">
                            <img src={linkPreview.image} alt="Preview" className="w-full h-48 object-cover" />
                            <div className="p-3 bg-[#3A3B3C]">
                                <div className="text-[#B0B3B8] text-xs uppercase font-bold mb-1">{linkPreview.domain}</div>
                                <div className="text-[#E4E6EB] font-bold text-[17px] mb-1 line-clamp-1">{linkPreview.title}</div>
                                <div className="text-[#B0B3B8] text-[14px] line-clamp-2">{linkPreview.description}</div>
                            </div>
                        </div>
                    )}
                    
                    {previews.length > 0 && (
                        <div className="mb-4">
                            {renderImageGrid(previews)}
                            
                            {/* Add more images button */}
                            {previews.length < 9 && (
                                <div className="flex gap-2 mt-2">
                                    <div 
                                        className="w-16 h-16 rounded-lg border-2 border-dashed border-[#3E4042] flex items-center justify-center cursor-pointer hover:bg-[#3A3B3C]"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <i className="fas fa-plus text-[#B0B3B8]"></i>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {!previews.length && (
                        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                            <div className={`w-8 h-8 rounded-lg cursor-pointer border-2 bg-[#3A3B3C] flex items-center justify-center flex-shrink-0 ${!activeBackground ? 'border-white' : 'border-[#3E4042]'}`} onClick={() => setActiveBackground('')}>
                                <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                                    <i className="fas fa-font text-black text-xs"></i>
                                </div>
                            </div>
                            {BACKGROUNDS.filter(bg => bg.id !== 'none').map(bg => (
                                <div 
                                    key={bg.id} 
                                    className={`w-8 h-8 rounded-lg cursor-pointer border-2 flex-shrink-0 ${activeBackground === bg.value ? 'border-white' : 'border-transparent'}`} 
                                    style={{ background: bg.value, backgroundSize: 'cover' }} 
                                    onClick={() => setActiveBackground(bg.value)}
                                ></div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="border-t border-[#3E4042]">
                    <OptionsItem icon="fas fa-images" color="#45BD62" label="Photo/video" onClick={() => fileInputRef.current?.click()} />
                    <OptionsItem icon="fas fa-user-tag" color="#1877F2" label="Tag people" onClick={() => setView('tag')} />
                    <OptionsItem icon="far fa-smile" color="#F7B928" label="Feeling/activity" onClick={() => setView('feeling')} />
                    <OptionsItem icon="fas fa-map-marker-alt" color="#F02849" label="Check in" onClick={() => setView('location')} />
                </div>
            </div>
            
            <div className="p-4 border-t border-[#3E4042]">
                <button onClick={handleSubmit} disabled={!text && files.length === 0 && !activeBackground} className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold py-3 rounded-lg transition-colors disabled:bg-[#3A3B3C] text-lg shadow-sm">POST</button>
            </div>
            
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
            <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
        </div>
    );
};

interface CommentsSheetProps {
    post: PostType;
    currentUser: User;
    users: User[];
    onClose: () => void;
    onComment: (postId: number, text: string, attachment?: any, parentId?: number) => void;
    onLikeComment: (commentId: number, isReply?: boolean, parentId?: number) => void;
    getCommentAuthor: (id: number) => User | undefined;
    onProfileClick: (id: number) => void;
}

export const CommentsSheet: React.FC<CommentsSheetProps> = ({ post, currentUser, users, onClose, onComment, onLikeComment, getCommentAuthor, onProfileClick }) => {
    const [text, setText] = useState('');
    const [showPicker, setShowPicker] = useState<'emoji' | 'sticker' | null>(null);
    const [replyingTo, setReplyingTo] = useState<{ id: number, name: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    const handleSubmit = (e: React.FormEvent) => { 
        e.preventDefault(); 
        if(text.trim()) { 
            console.log('CommentsSheet: Submitting comment:', { postId: post.id, text, replyingTo });
            onComment(post.id, text, undefined, replyingTo?.id); 
            setText(''); 
            setShowPicker(null); 
            setReplyingTo(null); 
        }
    };
    
    // Use formattedTime from comment or calculate it if missing
    const getCommentTime = (timestamp: number, formattedTime?: string) => {
        return formattedTime || formatRelativeTime(timestamp);
    };
    
    return (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end md:items-center md:justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="bg-[#242526] w-full md:w-[600px] md:h-[80vh] md:rounded-xl z-20 animate-slide-up flex flex-col h-[70vh] shadow-2xl overflow-hidden border border-[#3E4042]">
                <div className="p-3 border-b border-[#3E4042] flex justify-between items-center bg-[#242526]">
                    <div className="flex items-center gap-2">
                        <div className="bg-[#1877F2] p-1.5 rounded-full">
                            <i className="fas fa-thumbs-up text-white text-xs"></i>
                        </div>
                        <span className="text-[#B0B3B8] text-[15px] hover:underline cursor-pointer">{post.reactions.length}</span>
                        <i className="fas fa-chevron-right text-[#B0B3B8] text-xs"></i>
                    </div>
                    <div onClick={onClose} className="w-8 h-8 rounded-full bg-[#3A3B3C] flex items-center justify-center cursor-pointer">
                        <i className="fas fa-times text-[#B0B3B8]"></i>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                    {post.comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-[#B0B3B8] gap-2">
                            <div className="w-16 h-16 bg-[#3A3B3C] rounded-full flex items-center justify-center">
                                <i className="far fa-comments text-3xl"></i>
                            </div>
                            <p className="font-semibold text-[#E4E6EB]">No comments yet</p>
                            <p className="text-[15px]">Be the first to share your thoughts.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {post.comments.map(comment => { 
                                const author = getCommentAuthor(comment.userId); 
                                if (!author) return null; 
                                return (
                                    <div key={comment.id} className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <img src={author.profileImage} alt="" className="w-10 h-10 rounded-full object-cover cursor-pointer" onClick={() => onProfileClick(author.id)} />
                                            <div className="flex flex-col max-w-[85%]">
                                                <div className="bg-[#3A3B3C] px-4 py-3 rounded-2xl relative">
                                                    <span className="font-bold text-[15px] text-[#E4E6EB] cursor-pointer hover:underline block mb-1 hover:text-[#1877F2]" onClick={() => onProfileClick(author.id)}>{author.name}</span>
                                                    <div className="text-[16px] text-[#E4E6EB] break-words">
                                                        <RichText text={comment.text} users={users} onProfileClick={onProfileClick} />
                                                    </div>
                                                    {comment.attachment && <img src={comment.attachment.url} className="mt-2 rounded-lg max-h-[150px] w-auto" alt="" />}
                                                    {comment.likes > 0 && (
                                                        <div className="absolute -bottom-2 -right-1 bg-[#242526] rounded-full px-1.5 py-0.5 flex items-center shadow-sm border border-[#3E4042] gap-1">
                                                            <div className="bg-[#1877F2] rounded-full p-[2px]">
                                                                <i className="fas fa-thumbs-up text-white text-[8px]"></i>
                                                            </div>
                                                            <span className="text-[12px] text-[#B0B3B8]">{comment.likes}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-4 ml-3 mt-1 text-[13px] font-bold text-[#B0B3B8]">
                                                    <span className="font-normal">{getCommentTime(comment.timestamp, comment.formattedTime)}</span>
                                                    <span className={`cursor-pointer hover:underline ${comment.hasLiked ? 'text-[#1877F2]' : ''}`} onClick={() => onLikeComment(comment.id)}>Like</span>
                                                    <span className="cursor-pointer hover:underline" onClick={() => { setReplyingTo({ id: comment.id, name: author.name }); setText(`@${author.name} `); setTimeout(() => inputRef.current?.focus(), 0); }}>Reply</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {showPicker === 'sticker' && <StickerPicker onSelect={(url) => { onComment(post.id, '', { type: 'image', url }); setShowPicker(null); }} />}
                {showPicker === 'emoji' && <EmojiPicker onSelect={(emoji) => setText(prev => prev + emoji)} />}
                
                <div className="p-3 border-t border-[#3E4042] bg-[#242526]">
                    {replyingTo && (
                        <div className="flex items-center justify-between bg-[#3A3B3C] p-2 rounded-t-lg mb-1 text-sm text-[#B0B3B8]">
                            <span>Replying to <b>{replyingTo.name}</b></span>
                            <i className="fas fa-times cursor-pointer p-1" onClick={() => setReplyingTo(null)}></i>
                        </div>
                    )}
                    <div className="flex items-end gap-2">
                        <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-camera text-[#B0B3B8] text-xl cursor-pointer hover:bg-[#3A3B3C] p-1.5 rounded-full"></i>
                            <i className={`fas fa-sticky-note text-xl cursor-pointer hover:bg-[#3A3B3C] p-1.5 rounded-full ${showPicker === 'sticker' ? 'text-[#1877F2]' : 'text-[#B0B3B8]'}`} onClick={() => setShowPicker(showPicker === 'sticker' ? null : 'sticker')}></i>
                        </div>
                        <form className="flex-1 bg-[#3A3B3C] rounded-2xl flex items-center" onSubmit={handleSubmit}>
                            <input ref={inputRef} type="text" className="bg-transparent w-full px-4 py-2.5 text-[#E4E6EB] outline-none placeholder-[#B0B3B8] text-[16px]" placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : "Write a comment..."} value={text} onChange={e => setText(e.target.value)} onFocus={() => setShowPicker(null)} />
                            <i className={`far fa-smile text-xl cursor-pointer mr-3 ${showPicker === 'emoji' ? 'text-[#1877F2]' : 'text-[#B0B3B8]'}`} onClick={() => setShowPicker(showPicker === 'emoji' ? null : 'emoji')}></i>
                        </form>
                        <button type="submit" onClick={handleSubmit} disabled={!text.trim()} className="mb-2 text-[#1877F2] hover:bg-[#3A3B3C] p-2 rounded-full disabled:opacity-50">
                            <i className="fas fa-paper-plane text-lg"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN POST COMPONENT WITH MULTI-IMAGE SUPPORT ---
interface PostProps {
    post: PostType;
    author: User | Brand;
    currentUser: User | null; 
    users?: User[]; 
    onProfileClick: (id: number) => void;
    onGroupClick?: (groupId: string) => void;
    onReact: (postId: number, type: ReactionType) => void;
    onShare: (postId: number) => void;
    onDelete?: (postId: number) => void;
    onEdit?: (postId: number, content: string) => void;
    onHashtagClick?: (tag: string) => void;
    onViewImage: (url: string) => void; // Updated: Now only needs url for single image clicks
    onOpenComments: (postId: number) => void;
    onViewProduct?: (product: Product) => void;
    onVideoClick: (post: PostType) => void;
    sharedPost?: PostType;
    onFollow?: (userId: number) => void;
    isFollowing?: boolean;
    onPlayAudioTrack?: (track: AudioTrack) => void;
}

export const Post: React.FC<PostProps> = ({ 
    post, 
    author, 
    currentUser, 
    users, 
    onProfileClick, 
    onGroupClick, 
    onReact, 
    onShare, 
    onDelete, 
    onEdit, 
    onHashtagClick, 
    onViewImage, 
    onOpenComments, 
    onViewProduct, 
    onVideoClick, 
    sharedPost, 
    onFollow, 
    isFollowing, 
    onPlayAudioTrack 
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showFullScreenViewer, setShowFullScreenViewer] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const myReaction = currentUser ? post.reactions.find(r => r.userId === currentUser.id)?.type : undefined;
    const isOwner = currentUser?.id === post.authorId;
    const isAdmin = currentUser?.role === 'admin';
    const isVideo = post.type === 'video';

    // FIXED: Handle react function properly
    const handleReact = (type: ReactionType) => {
        console.log('Post component: handleReact called', { postId: post.id, type, currentUser });
        if (!currentUser) {
            console.log('Post component: No current user, showing alert');
            return; // This will trigger the ReactionButton's isGuest behavior
        }
        onReact(post.id, type);
    };

    // FIXED: Handle comment opening properly
    const handleOpenComments = () => {
        console.log('Post component: handleOpenComments called', { postId: post.id, currentUser });
        if (!currentUser) {
            console.log('Post component: No current user, cannot open comments');
            return; // This should show alert from the button click
        }
        onOpenComments(post.id);
    };

    // Helper to get all images from post (supports both single image and multi-image arrays)
    const getAllImages = () => {
        if (post.images && post.images.length > 0) {
            return post.images;
        }
        if (post.image) {
            return [post.image];
        }
        return [];
    };

    const images = getAllImages();

    const handleImageClick = (index: number) => {
        if (images.length === 1) {
            // Single image - use the existing onViewImage callback
            onViewImage(images[0]);
        } else {
            // Multiple images - open full-screen viewer
            setCurrentImageIndex(index);
            setShowFullScreenViewer(true);
        }
    };

    // Use formattedTime from post or calculate it if missing
    const getPostTime = () => {
        return post.formattedTime || formatRelativeTime(post.timestamp);
    };

    const renderContent = (content: string) => {
        if (!content) return null;
        const words = content.split(/\s+/);
        const isLong = words.length > 250;
        const isShortText = content.length < 150 && post.type === 'text' && images.length === 0 && !post.video && !post.background && !post.event && !post.product && !sharedPost;
        const textSizeClass = isShortText ? 'text-[24px] leading-tight font-normal' : 'text-[22px] leading-relaxed';
        let displayContent = content;
        if (isLong && !isExpanded) displayContent = words.slice(0, 250).join(' ') + '...';
        return (
            <div className={`px-3 md:px-4 pb-2 text-[#E4E6EB] ${textSizeClass}`}>
                <RichText text={displayContent} users={users} onProfileClick={onProfileClick} onHashtagClick={onHashtagClick} />
                {isLong && !isExpanded && (<span className="text-[#B0B3B8] font-semibold cursor-pointer hover:underline ml-1" onClick={() => setIsExpanded(true)}>See more</span>)}
            </div>
        );
    };

    return (
        <>
            {/* Full Screen Image Viewer */}
            {showFullScreenViewer && images.length > 0 && (
                <FullScreenImageViewer
                    images={images}
                    currentIndex={currentImageIndex}
                    onClose={() => setShowFullScreenViewer(false)}
                    onIndexChange={setCurrentImageIndex}
                />
            )}

            <div className="bg-[#242526] rounded-xl shadow-sm mb-4 animate-fade-in border border-[#3E4042] overflow-hidden">
                <div className="p-3 md:p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <img src={'profileImage' in author ? author.profileImage : ''} alt={author.name} className="w-10 h-10 rounded-full object-cover cursor-pointer border border-[#3E4042]" onClick={() => 'followers' in author && onProfileClick(author.id)} />
                        <div className="min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                                <h4 className="font-bold text-[#E4E6EB] text-[18.5px] cursor-pointer hover:underline truncate" onClick={() => 'followers' in author && onProfileClick(author.id)}>{author.name}</h4>
                                {post.groupName && (<span className="text-[#B0B3B8] text-[15px] flex items-center min-w-0"><i className="fas fa-caret-right mx-1 text-xs"></i><span className="font-bold text-[#E4E6EB] hover:underline cursor-pointer truncate" onClick={() => post.groupId && onGroupClick && onGroupClick(post.groupId)}>{post.groupName}</span></span>)}
                                {'isVerified' in author && author.isVerified && <i className="fas fa-check-circle text-[#1877F2] text-[13px] flex-shrink-0"></i>}
                                {post.feeling && <span className="text-[#B0B3B8] text-[15px] whitespace-nowrap">is feeling {post.feeling}</span>}
                            </div>
                            <div className="flex items-center gap-1.5 text-[#B0B3B8] text-[13px]">
                                <span>{getPostTime()}</span>
                                {post.location && (<><span>•</span><i className="fas fa-map-marker-alt text-[12px]"></i><span className="truncate max-w-[150px]">{post.location}</span></>)}
                                <span>•</span>
                                <i className={`fas ${post.visibility === 'Public' ? 'fa-globe-americas' : 'fa-user-friends'} text-[12px]`}></i>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isOwner && currentUser && 'followers' in author && onFollow && (
                            <button onClick={() => onFollow(author.id)} className={`flex items-center gap-2 text-sm font-bold px-5 py-2 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#242526] ${isFollowing ? 'bg-[#3A3B3C] text-[#E4E6EB] hover:bg-[#4E4F50] focus:ring-[#4E4F50]' : 'bg-[#1877F2] text-white hover:bg-[#166FE5] focus:ring-[#1877F2]'}`}>
                                {isFollowing ? (<><i className="fas fa-user-check text-xs"></i><span>Following</span></>) : (<><i className="fas fa-user-plus text-xs"></i><span>Follow</span></>)}
                            </button>
                        )}
                        <div className="relative">
                            <div className="w-9 h-9 hover:bg-[#3A3B3C] rounded-full flex items-center justify-center cursor-pointer" onClick={() => setShowMenu(!showMenu)}>
                                <i className="fas fa-ellipsis-h text-[#B0B3B8]"></i>
                            </div>
                            {showMenu && (
                                <div className="absolute right-0 top-10 bg-[#242526] rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-[#3E4042] w-[200px] z-10 py-2">
                                    <div className="px-3 py-2 hover:bg-[#3A3B3C] cursor-pointer flex items-center gap-3 text-[#E4E6EB]">
                                        <i className="far fa-bookmark w-5"></i> Save Post
                                    </div>
                                    {(isOwner || isAdmin) && (
                                        <>
                                            <div className="px-3 py-2 hover:bg-[#3A3B3C] cursor-pointer flex items-center gap-3 text-[#E4E6EB]">
                                                <i className="fas fa-pen w-5"></i> Edit Post
                                            </div>
                                            <div className="px-3 py-2 hover:bg-[#3A3B3C] cursor-pointer flex items-center gap-3 text-[#E4E6EB]" onClick={() => onDelete && onDelete(post.id)}>
                                                <i className="fas fa-trash w-5"></i> Move to trash
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {renderContent(post.content || '')}
                
                {post.type === 'audio' && post.audioTrack && (
                    <div className="mx-3 md:mx-4 mb-2 rounded-xl overflow-hidden cursor-pointer relative group border border-[#3E4042] shadow-lg" onClick={() => onPlayAudioTrack && onPlayAudioTrack(post.audioTrack!)}>
                        <img src={post.audioTrack.cover} alt="album cover" className="w-full h-full object-cover absolute inset-0 blur-md opacity-30 group-hover:opacity-50 transition-all" />
                        <div className="relative p-6 bg-black/40 backdrop-blur-sm flex items-center gap-6">
                            <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 relative">
                                <img src={post.audioTrack.cover} alt="album cover" className="w-full h-full object-cover rounded-lg shadow-2xl" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                    <div className="w-12 h-12 bg-[#1877F2]/80 rounded-full flex items-center justify-center border-2 border-white/50">
                                        <i className="fas fa-play text-white text-xl pl-1"></i>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#B0B3B8]">{post.audioTrack.type}</span>
                                <h3 className="text-xl md:text-2xl font-bold text-white truncate my-1">{post.audioTrack.title}</h3>
                                <p className="text-md text-[#B0B3B8] truncate">{post.audioTrack.artist}</p>
                            </div>
                        </div>
                    </div>
                )}
                
                {post.type === 'product' && post.product && (
                    <div className="mx-3 md:mx-4 mb-2 border border-[#3E4042] rounded-lg overflow-hidden cursor-pointer" onClick={() => onViewProduct && onViewProduct(post.product!)}>
                        <div className="aspect-video bg-black">
                            <img src={post.product.images[0]} alt={post.product.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-3 bg-[#3A3B3C]">
                            <div className="text-[#B0B3B8] text-xs uppercase font-bold">{MARKETPLACE_CATEGORIES.find(c => c.id === post.product?.category)?.name}</div>
                            <div className="text-[#E4E6EB] font-bold text-lg truncate">{post.product.title}</div>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-[#F02849] font-bold text-xl">{MARKETPLACE_COUNTRIES.find(c => c.code === post.product!.country)?.symbol || '$'}{post.product.mainPrice}</span>
                                <button className="bg-[#1877F2] text-white px-4 py-1.5 rounded-md font-semibold text-sm">View Item</button>
                            </div>
                        </div>
                    </div>
                )}
                
                {post.linkPreview && images.length === 0 && !post.video && (
                    <div className="mx-3 md:mx-4 mb-2 bg-[#242526] border border-[#3E4042] rounded-lg overflow-hidden cursor-pointer hover:bg-[#3A3B3C] transition-colors" onClick={() => window.open(post.linkPreview!.url, '_blank')}>
                        <img src={post.linkPreview.image} alt="Preview" className="w-full h-48 md:h-64 object-cover" />
                        <div className="p-3 bg-[#3A3B3C]">
                            <div className="text-[#B0B3B8] text-xs uppercase font-bold mb-1">{post.linkPreview.domain}</div>
                            <div className="text-[#E4E6EB] font-bold text-[17px] mb-1 line-clamp-1">{post.linkPreview.title}</div>
                            <div className="text-[#B0B3B8] text-[14px] line-clamp-2">{post.linkPreview.description}</div>
                        </div>
                    </div>
                )}
                
                {post.background && (
                    <div className="h-[300px] flex items-center justify-center p-8 text-center text-white font-bold text-2xl" style={{ background: post.background, backgroundSize: 'cover' }}>
                        {post.content}
                    </div>
                )}
                
                {post.type === 'event' && post.event && (
                    <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-[#3E4042]">
                        <img src={post.event.image} className="w-full h-40 object-cover" alt="" />
                        <div className="bg-[#3A3B3C] p-3 flex justify-between items-center">
                            <div>
                                <div className="text-red-500 text-xs font-bold uppercase">{new Date(post.event.date).toLocaleString('default', { month: 'short' })} {new Date(post.event.date).getDate()}</div>
                                <div className="text-[#E4E6EB] font-bold">{post.event.title}</div>
                                <div className="text-[#B0B3B8] text-sm">{post.event.location}</div>
                            </div>
                            <button className="border border-[#B0B3B8] text-[#E4E6EB] px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-[#4E4F50]">Interested</button>
                        </div>
                    </div>
                )}
                
                {/* MULTI-IMAGE SUPPORT - Full width with no frames */}
                {images.length > 0 && post.type === 'image' && !post.background && (
                    <div className="w-full mt-2">
                        <ImageGrid images={images} onImageClick={handleImageClick} />
                    </div>
                )}
                
                {post.type === 'video' && post.video && (
                    <div className="mt-1 bg-black w-full cursor-pointer relative h-[500px] md:h-[600px]" onClick={() => onVideoClick(post)}>
                        <video src={post.video} className="w-full h-full object-cover" />
                        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 border border-white/10 z-10">
                            <i className="fas fa-eye text-white text-xs animate-pulse"></i>
                            <span className="text-white font-bold text-xs">{post.views || 0}</span>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-16 h-16 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                                <i className="fas fa-play text-white text-2xl pl-1"></i>
                            </div>
                        </div>
                    </div>
                )}
                
                {!isVideo && (
                    <div className="px-3 md:px-4 py-2.5 flex items-center justify-between text-[#B0B3B8] text-[14px]">
                        <div className="flex items-center gap-1.5 cursor-pointer">
                            {post.reactions.length > 0 && (
                                <div className="flex -space-x-1">
                                    <div className="bg-[#1877F2] rounded-full p-[2px] z-10">
                                        <i className="fas fa-thumbs-up text-white text-[10px]"></i>
                                    </div>
                                    {post.reactions.some(r => r.type === 'love') && (
                                        <div className="bg-[#F3425F] rounded-full p-[2px]">
                                            <i className="fas fa-heart text-white text-[10px]"></i>
                                        </div>
                                    )}
                                </div>
                            )}
                            <span className="hover:underline">{post.reactions.length > 0 ? post.reactions.length : ''}</span>
                        </div>
                        <div className="flex gap-4">
                            <span className="hover:underline cursor-pointer" onClick={handleOpenComments}>{post.comments.length} comments</span>
                            <span className="hover:underline cursor-pointer">{post.shares} shares</span>
                        </div>
                    </div>
                )}
                
                {!isVideo && (
                    <div className="px-2 py-1 border-t border-[#3E4042] mx-2 mb-1 flex items-center justify-between">
                        {/* FIXED: Use handleReact function and properly pass isGuest flag */}
                        <ReactionButton 
                            currentUserReactions={myReaction} 
                            reactionCount={post.reactions.length} 
                            onReact={handleReact} 
                            isGuest={!currentUser} 
                        />
                        {/* FIXED: Fixed comment button to properly handle logged out users */}
                        <button 
                            className="flex-1 flex items-center justify-center gap-2 h-10 rounded hover:bg-[#3A3B3C] transition-colors group text-[#B0B3B8]" 
                            onClick={() => {
                                if (!currentUser) {
                                    alert("Please login to comment");
                                    return;
                                }
                                handleOpenComments();
                            }}
                        >
                            <i className="far fa-comment-alt text-[20px] group-hover:text-[#E4E6EB]"></i>
                            <span className="text-[17px] font-medium group-hover:text-[#E4E6EB]">Comment</span>
                        </button>
                        {/* FIXED: Share button should work for everyone */}
                        <button 
                            className="flex-1 flex items-center justify-center gap-2 h-10 rounded hover:bg-[#3A3B3C] transition-colors group text-[#B0B3B8]" 
                            onClick={() => {
                                if (!currentUser) {
                                    alert("Please login to share");
                                    return;
                                }
                                onShare(post.id);
                            }}
                        >
                            <i className="fas fa-share text-[20px] group-hover:text-[#E4E6EB]"></i>
                            <span className="text-[17px] font-medium group-hover:text-[#E4E6EB]">Share</span>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};
