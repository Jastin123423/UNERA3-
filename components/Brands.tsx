import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, Brand, Post as PostType, Event, LinkPreview, AudioTrack } from '../types';
import { Post, CreatePostModal } from './Feed';
import { BRAND_CATEGORIES, LOCATIONS_DATA } from '../constants';
import { CreateEventModal } from './Events';

// --- HELPER: Generate canonical URL for brand ---
const generateBrandCanonicalUrl = (brandId: string, brandName?: string) => {
    const baseUrl = 'https://unera.social';
    let slug = '';
    
    if (brandName) {
        // Create URL-friendly slug from brand name
        slug = brandName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 60);
    }
    
    return slug 
        ? `${baseUrl}/brand/${slug}-${brandId}`
        : `${baseUrl}/brand/${brandId}`;
};

// --- HELPER: Generate canonical URL for brand post ---
const generateBrandPostCanonicalUrl = (postId: string, brandName: string, postTitle?: string) => {
    const baseUrl = 'https://unera.social';
    let postSlug = '';
    
    if (postTitle) {
        postSlug = postTitle
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 40);
    } else {
        postSlug = 'post';
    }
    
    const brandSlug = brandName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 40);
    
    return `${baseUrl}/brand/${brandSlug}/${postSlug}-${postId}`;
};

// --- HELPER: Generate Organization Schema (for brands) ---
const generateBrandSchema = (brand: Brand) => {
    const canonicalUrl = generateBrandCanonicalUrl(brand.id.toString(), brand.name);
    
    const brandSchema = {
        "@context": "https://schema.org",
        "@type": brand.isVerified ? "Corporation" : "LocalBusiness",
        "@id": `${canonicalUrl}#brand`,
        "name": brand.name,
        "description": brand.description || `${brand.name} - ${brand.category} on unera.social`,
        "url": canonicalUrl,
        "logo": brand.profileImage,
        "image": brand.coverImage,
        "address": {
            "@type": "PostalAddress",
            "addressLocality": brand.location || "Unknown",
            "addressCountry": "TZ"
        },
        "contactPoint": {
            "@type": "ContactPoint",
            "telephone": brand.contactPhone || "",
            "email": brand.contactEmail || "",
            "contactType": "customer service"
        },
        "sameAs": brand.website ? [brand.website] : [],
        "foundingDate": brand.createdAt || new Date().toISOString(),
        "founder": {
            "@type": "Person",
            "name": "Page Admin"
        },
        "numberOfEmployees": {
            "@type": "QuantitativeValue",
            "value": "1"
        },
        "brand": brand.name,
        "makesOffer": brand.followers ? {
            "@type": "Offer",
            "availability": "https://schema.org/InStock",
            "price": "0",
            "priceCurrency": "USD"
        } : undefined
    };
    
    return brandSchema;
};

// --- HELPER: Generate Article Schema (for brand posts) ---
const generateBrandPostSchema = (post: PostType, brand: Brand) => {
    const canonicalUrl = generateBrandPostCanonicalUrl(
        post.id.toString(), 
        brand.name,
        post.text?.substring(0, 50) || 'Brand Post'
    );
    
    const postSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "@id": `${canonicalUrl}#post`,
        "headline": post.text?.substring(0, 100) || `${brand.name} Post`,
        "description": post.text?.substring(0, 200) || `Post by ${brand.name} on unera.social`,
        "url": canonicalUrl,
        "image": post.image || post.videoThumbnail || brand.profileImage,
        "datePublished": post.createdAt || new Date().toISOString(),
        "dateModified": post.updatedAt || post.createdAt || new Date().toISOString(),
        "author": {
            "@type": "Organization",
            "name": brand.name,
            "url": generateBrandCanonicalUrl(brand.id.toString(), brand.name)
        },
        "publisher": {
            "@type": "Organization",
            "name": "unera.social",
            "url": "https://unera.social",
            "logo": {
                "@type": "ImageObject",
                "url": "https://unera.social/logo.png"
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalUrl
        },
        "articleBody": post.text || "",
        "wordCount": post.text?.length || 0,
        "genre": post.type === 'event' ? "Event" : "SocialMediaPosting"
    };
    
    return postSchema;
};

// --- HELPER: Generate WebPage Schema for brand listing ---
const generateBrandsListSchema = (brands: Brand[], currentPage: number = 1) => {
    const baseUrl = 'https://unera.social';
    
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Brands & Pages on unera.social",
        "description": "Discover businesses, creators, and organizations on unera.social",
        "url": `${baseUrl}/brands`,
        "numberOfItems": brands.length,
        "itemListElement": brands.slice(0, 20).map((brand, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
                "@type": "Organization",
                "@id": generateBrandCanonicalUrl(brand.id.toString(), brand.name),
                "name": brand.name,
                "description": brand.description || brand.category,
                "url": generateBrandCanonicalUrl(brand.id.toString(), brand.name),
                "image": brand.profileImage
            }
        }))
    };
};

// --- HELPER: Generate Deleted Brand/Post Schema (410 Gone) ---
const generateDeletedBrandSchema = (brandId: string, brandName?: string) => {
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": brandName || "Brand No Longer Available",
        "description": "This brand page has been permanently removed and is no longer available.",
        "url": generateBrandCanonicalUrl(brandId, brandName),
        "discontinued": new Date().toISOString()
    };
};

// --- 404 Page Component ---
const NotFoundPage: React.FC<{ 
    type: 'brand' | 'post' | 'page';
    onGoHome?: () => void;
    onGoBack?: () => void;
}> = ({ type, onGoHome, onGoBack }) => {
    return (
        <div className="min-h-screen bg-[#18191A] flex flex-col items-center justify-center p-4">
            <div className="bg-[#242526] rounded-2xl p-8 md:p-12 max-w-lg w-full text-center border border-[#3E4042]">
                <div className="w-24 h-24 bg-[#3A3B3C] rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#F02849]">
                    <i className="fas fa-exclamation-triangle text-4xl text-[#F02849]"></i>
                </div>
                
                <h1 className="text-3xl font-bold text-[#E4E6EB] mb-4">
                    {type === 'brand' ? 'Brand Not Found' : 
                     type === 'post' ? 'Post Not Found' : 
                     'Page Not Found'}
                </h1>
                
                <p className="text-[#B0B3B8] text-lg mb-2">
                    {type === 'brand' ? 'The brand page you\'re looking for doesn\'t exist or has been removed.' :
                     type === 'post' ? 'This post is no longer available or has been deleted.' :
                     'The page you\'re looking for couldn\'t be found.'}
                </p>
                
                <p className="text-[#90949C] text-sm mb-8">
                    Error 404 - Page Not Found
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button 
                        onClick={onGoBack}
                        className="px-6 py-3 bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] rounded-xl font-bold transition-all"
                    >
                        <i className="fas fa-arrow-left mr-2"></i> Go Back
                    </button>
                    <button 
                        onClick={onGoHome}
                        className="px-6 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl font-bold transition-all"
                    >
                        <i className="fas fa-home mr-2"></i> Go to Homepage
                    </button>
                </div>
                
                <div className="mt-8 pt-6 border-t border-[#3E4042]">
                    <p className="text-[#B0B3B8] text-sm mb-3">Suggestions:</p>
                    <ul className="text-[#90949C] text-sm text-left">
                        <li className="mb-1 flex items-start gap-2">
                            <i className="fas fa-check text-[#45BD62] mt-1"></i>
                            Check the URL for spelling errors
                        </li>
                        <li className="mb-1 flex items-start gap-2">
                            <i className="fas fa-check text-[#45BD62] mt-1"></i>
                            Browse our <a href="/brands" className="text-[#1877F2] hover:underline">Brands Directory</a>
                        </li>
                        <li className="flex items-start gap-2">
                            <i className="fas fa-check text-[#45BD62] mt-1"></i>
                            Use the search function to find content
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

// --- CREATE BRAND MODAL with SEO fields ---
interface CreateBrandModalProps {
    currentUser: User;
    onClose: () => void;
    onCreate: (brand: Partial<Brand>) => void;
}

const CreateBrandModal: React.FC<CreateBrandModalProps> = ({ currentUser, onClose, onCreate }) => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [website, setWebsite] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [keywords, setKeywords] = useState<string[]>([]);
    const [newKeyword, setNewKeyword] = useState('');
    
    const handleSubmit = () => {
        if (!name.trim() || !category || !location) return;
        onCreate({
            name,
            category,
            description,
            website,
            location,
            contactEmail,
            contactPhone,
            adminId: currentUser.id,
            profileImage: `https://ui-avatars.com/api/?name=${name}&background=random`,
            coverImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
            keywords,
            seoTitle: `${name} - ${category} on unera.social`,
            seoDescription: description.substring(0, 160) || `${name} - ${category} business page on unera.social`,
            canonicalUrl: generateBrandCanonicalUrl(Date.now().toString(), name)
        });
        onClose();
    };

    const addKeyword = () => {
        if (newKeyword.trim() && keywords.length < 10) {
            setKeywords([...keywords, newKeyword.trim().toLowerCase()]);
            setNewKeyword('');
        }
    };

    const removeKeyword = (index: number) => {
        setKeywords(keywords.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 animate-fade-in font-sans">
            <div className="bg-[#242526] w-full max-w-[600px] rounded-xl border border-[#3E4042] shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-[#3E4042] flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-[#E4E6EB]">{step === 1 ? 'Create a Page' : 'Complete Your Page'}</h3>
                        <p className="text-[#B0B3B8] text-xs mt-1">SEO-optimized brand page creation</p>
                    </div>
                    <div onClick={onClose} className="w-8 h-8 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] flex items-center justify-center cursor-pointer">
                        <i className="fas fa-times text-[#B0B3B8]"></i>
                    </div>
                </div>
                
                <div className="p-4 overflow-y-auto space-y-4">
                    {step === 1 ? (
                        <>
                            <div>
                                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">
                                    Page Name <span className="text-red-500">*</span>
                                    <span className="text-[#90949C] text-xs font-normal ml-2">(Appears in Google search results)</span>
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                                    placeholder="Business or Brand Name" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Category <span className="text-red-500">*</span></label>
                                <select className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" value={category} onChange={e => setCategory(e.target.value)}>
                                    <option value="">Select a Category</option>
                                    {BRAND_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">
                                    Description
                                    <span className="text-[#90949C] text-xs font-normal ml-2">(Appears in search results - 160 chars max)</span>
                                </label>
                                <textarea 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2] resize-none h-24" 
                                    placeholder="Describe your brand for search engines..." 
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)}
                                    maxLength={160}
                                />
                                <div className="text-right text-xs text-[#B0B3B8] mt-1">{description.length}/160</div>
                            </div>
                            <div>
                                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Keywords (for SEO)</label>
                                <div className="flex gap-2 mb-2">
                                    <input 
                                        type="text" 
                                        className="flex-1 bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                                        placeholder="Add keyword (e.g., restaurant, dar es salaam)" 
                                        value={newKeyword} 
                                        onChange={e => setNewKeyword(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                                    />
                                    <button 
                                        onClick={addKeyword}
                                        className="bg-[#1877F2] text-white px-4 rounded-lg font-bold"
                                        disabled={!newKeyword.trim() || keywords.length >= 10}
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {keywords.map((keyword, idx) => (
                                        <div key={idx} className="bg-[#3A3B3C] px-3 py-1 rounded-full text-sm text-[#E4E6EB] flex items-center gap-2">
                                            {keyword}
                                            <button onClick={() => removeKeyword(idx)} className="text-[#B0B3B8] hover:text-white">
                                                <i className="fas fa-times text-xs"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Location (Country/Region) <span className="text-red-500">*</span></label>
                                <input type="text" list="locations" className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" placeholder="e.g., Dar es Salaam, Tanzania" value={location} onChange={e => setLocation(e.target.value)} />
                                <datalist id="locations">
                                    {LOCATIONS_DATA.map(l => <option key={l.name} value={l.name} />)}
                                </datalist>
                            </div>
                            <button 
                                onClick={() => setStep(2)} 
                                disabled={!name.trim() || !category || !location} 
                                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50"
                            >
                                Next: Add Contact Info
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="bg-[#3A3B3C]/50 p-3 rounded-lg mb-2">
                                <h4 className="text-[#E4E6EB] font-bold mb-2">SEO Preview</h4>
                                <div className="text-[#B0B3B8] text-sm">
                                    <div className="text-[#1A0DAB] text-[18px] hover:underline cursor-pointer">{name}</div>
                                    <div className="text-[#006621] text-[14px]">{generateBrandCanonicalUrl(Date.now().toString(), name)}</div>
                                    <div className="text-[#545454] text-[14px]">{description.substring(0, 100)}...</div>
                                </div>
                            </div>
                            
                            <p className="text-sm text-[#B0B3B8] mb-2">Add contact details to help people reach you (Optional).</p>
                            <div>
                                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Website</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                                    placeholder="https://example.com" 
                                    value={website} 
                                    onChange={e => setWebsite(e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Business Email</label>
                                <input 
                                    type="email" 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                                    placeholder="contact@brand.com" 
                                    value={contactEmail} 
                                    onChange={e => setContactEmail(e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Business Phone</label>
                                <input 
                                    type="tel" 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                                    placeholder="+255..." 
                                    value={contactPhone} 
                                    onChange={e => setContactPhone(e.target.value)} 
                                />
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setStep(1)} 
                                    className="flex-1 bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] py-2.5 rounded-lg font-bold transition-colors"
                                >
                                    Back
                                </button>
                                <button 
                                    onClick={handleSubmit} 
                                    className="flex-1 bg-[#42B72A] hover:bg-[#36A420] text-white py-2.5 rounded-lg font-bold transition-colors"
                                >
                                    Create SEO-Optimized Page
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- EDIT BRAND MODAL with SEO fields ---
interface EditBrandModalProps {
    brand: Brand;
    onClose: () => void;
    onUpdate: (updatedData: Partial<Brand>) => void;
}

const EditBrandModal: React.FC<EditBrandModalProps> = ({ brand, onClose, onUpdate }) => {
    const [description, setDescription] = useState(brand.description || '');
    const [website, setWebsite] = useState(brand.website || '');
    const [location, setLocation] = useState(brand.location || '');
    const [contactEmail, setContactEmail] = useState(brand.contactEmail || '');
    const [contactPhone, setContactPhone] = useState(brand.contactPhone || '');
    const [keywords, setKeywords] = useState<string[]>(brand.keywords || []);
    const [newKeyword, setNewKeyword] = useState('');

    const addKeyword = () => {
        if (newKeyword.trim() && keywords.length < 10) {
            setKeywords([...keywords, newKeyword.trim().toLowerCase()]);
            setNewKeyword('');
        }
    };

    const removeKeyword = (index: number) => {
        setKeywords(keywords.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        const updatedData: Partial<Brand> = { 
            description, 
            website, 
            location, 
            contactEmail, 
            contactPhone,
            keywords,
            seoTitle: `${brand.name} - ${brand.category} on unera.social`,
            seoDescription: description.substring(0, 160) || `${brand.name} - ${brand.category} business page on unera.social`
        };
        onUpdate(updatedData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 animate-fade-in font-sans">
            <div className="bg-[#242526] w-full max-w-[700px] rounded-xl border border-[#3E4042] shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-[#3E4042] flex justify-between items-center">
                    <h2 className="text-xl font-bold text-[#E4E6EB]">Edit Page Info & SEO</h2>
                    <div onClick={onClose} className="w-8 h-8 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] flex items-center justify-center cursor-pointer">
                        <i className="fas fa-times text-[#B0B3B8]"></i>
                    </div>
                </div>
                <div className="p-4 overflow-y-auto space-y-4">
                    <div className="bg-[#3A3B3C]/50 p-3 rounded-lg mb-2">
                        <h4 className="text-[#E4E6EB] font-bold mb-2">SEO Preview</h4>
                        <div className="text-[#B0B3B8] text-sm">
                            <div className="text-[#1A0DAB] text-[18px]">{brand.name}</div>
                            <div className="text-[#006621] text-[14px]">{generateBrandCanonicalUrl(brand.id.toString(), brand.name)}</div>
                            <div className="text-[#545454] text-[14px]">{description.substring(0, 100)}...</div>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-[#B0B3B8] text-sm font-bold mb-1">
                            Description
                            <span className="text-[#90949C] text-xs font-normal ml-2">(Appears in search results - 160 chars max)</span>
                        </label>
                        <textarea 
                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none h-32 resize-none" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)}
                            maxLength={160}
                        />
                        <div className="text-right text-xs text-[#B0B3B8] mt-1">{description.length}/160</div>
                    </div>
                    
                    <div>
                        <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Keywords (for SEO)</label>
                        <div className="flex gap-2 mb-2">
                            <input 
                                type="text" 
                                className="flex-1 bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none" 
                                placeholder="Add keyword (e.g., restaurant, dar es salaam)" 
                                value={newKeyword} 
                                onChange={e => setNewKeyword(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                            />
                            <button 
                                onClick={addKeyword}
                                className="bg-[#1877F2] text-white px-4 rounded-lg font-bold"
                                disabled={!newKeyword.trim() || keywords.length >= 10}
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {keywords.map((keyword, idx) => (
                                <div key={idx} className="bg-[#3A3B3C] px-3 py-1 rounded-full text-sm text-[#E4E6EB] flex items-center gap-2">
                                    {keyword}
                                    <button onClick={() => removeKeyword(idx)} className="text-[#B0B3B8] hover:text-white">
                                        <i className="fas fa-times text-xs"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Location</label>
                        <input 
                            type="text" 
                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none" 
                            value={location} 
                            onChange={e => setLocation(e.target.value)} 
                        />
                    </div>
                    <div>
                        <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Website</label>
                        <input 
                            type="text" 
                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none" 
                            value={website} 
                            onChange={e => setWebsite(e.target.value)} 
                        />
                    </div>
                    <div>
                        <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Contact Email</label>
                        <input 
                            type="email" 
                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none" 
                            value={contactEmail} 
                            onChange={e => setContactEmail(e.target.value)} 
                        />
                    </div>
                    <div>
                        <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Contact Phone</label>
                        <input 
                            type="tel" 
                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none" 
                            value={contactPhone} 
                            onChange={e => setContactPhone(e.target.value)} 
                        />
                    </div>
                    <button 
                        onClick={handleSave} 
                        className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-2.5 rounded-lg font-bold transition-colors"
                    >
                        Save SEO Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- BRANDS PAGE COMPONENT with complete SEO ---
interface BrandsPageProps {
    currentUser: User | null;
    brands: Brand[];
    posts: PostType[];
    users: User[]; 
    onCreateBrand: (brand: Partial<Brand>) => void;
    onFollowBrand: (brandId: number) => void;
    onProfileClick: (id: number) => void;
    onPostAsBrand: (brandId: number, content: any) => void;
    onReact: (postId: number, type: any) => void;
    onShare: (postId: number) => void;
    onOpenComments: (postId: number) => void;
    onUpdateBrand?: (brandId: number, data: Partial<Brand>) => void;
    onDeleteBrand: (brandId: number) => void;
    onMessage?: (brandId: number) => void;
    onCreateEvent?: (brandId: number, event: Partial<Event>) => void;
    initialBrandId?: number | null;
    onPlayAudioTrack?: (track: AudioTrack) => void;
    onUpdateBrandImage?: (brandId: number, type: 'cover' | 'profile', file: File) => void;
    onDeletePost?: (postId: number) => void;
    onVerifyBrand?: (brandId: number) => void;
    deletedBrands?: Brand[]; // For 410 handling
    deletedPosts?: PostType[]; // For 410 handling
}

export const BrandsPage: React.FC<BrandsPageProps> = ({ 
    currentUser, brands, posts, users, onCreateBrand, onFollowBrand, 
    onProfileClick, onPostAsBrand, onReact, onShare, onOpenComments,
    onUpdateBrand, onDeleteBrand, onMessage, onCreateEvent, initialBrandId, onPlayAudioTrack,
    onUpdateBrandImage, onDeletePost, onVerifyBrand,
    deletedBrands = [],
    deletedPosts = []
}) => {
    const [view, setView] = useState<'list' | 'detail' | '404' | '410'>('list');
    const [activeBrandId, setActiveBrandId] = useState<number | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [showEditBrandModal, setShowEditBrandModal] = useState(false);
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [activeTab, setActiveTab] = useState<'Posts' | 'About' | 'Photos'>('Posts');
    const [searchQuery, setSearchQuery] = useState('');

    const profileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialBrandId) {
            const brand = brands.find(b => b.id === initialBrandId);
            const deletedBrand = deletedBrands.find(b => b.id === initialBrandId);
            
            if (deletedBrand) {
                setView('410');
                setActiveBrandId(initialBrandId);
            } else if (brand) {
                setActiveBrandId(brand.id);
                setView('detail');
                setActiveTab('Posts');
            } else {
                setView('404');
            }
        } else {
            setView('list');
            setActiveBrandId(null);
        }
    }, [initialBrandId, brands, deletedBrands]);

    const activeBrand = useMemo(() => brands.find(b => b.id === activeBrandId), [brands, activeBrandId]);
    const isOwner = currentUser && activeBrand && activeBrand.adminId === currentUser.id;
    const isPlatformAdmin = currentUser?.role === 'admin';
    const canManage = isOwner || isPlatformAdmin;
    const isFollowing = currentUser && activeBrand && activeBrand.followers.includes(currentUser.id);

    const brandPosts = useMemo(() => {
        if (!activeBrand) return [];
        return posts.filter(p => p.authorId === activeBrand.id).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
    }, [posts, activeBrand]);

    const handleBrandClick = (brandId: number) => {
        const brand = brands.find(b => b.id === brandId);
        if (brand) {
            setActiveBrandId(brandId);
            setView('detail');
            setActiveTab('Posts');
            window.scrollTo(0, 0);
            
            // Update URL for SEO (pushState for better crawling)
            const canonicalUrl = generateBrandCanonicalUrl(brandId.toString(), brand.name);
            window.history.pushState({}, '', canonicalUrl);
        }
    };

    const handleCreatePost = (text: string, file: File | null, type: any, visibility: any, location?: string, feeling?: string, taggedUsers?: number[], background?: string, linkPreview?: LinkPreview) => {
        if (!activeBrand) return;
        
        // Create proper content object with SEO fields
        const postContent = {
            text: text,
            content: text,
            file: file,
            type: type,
            visibility: visibility,
            location: location,
            feeling: feeling,
            taggedUsers: taggedUsers,
            background: background,
            linkPreview: linkPreview,
            seoTitle: text.substring(0, 60) || `${activeBrand.name} Post`,
            seoDescription: text.substring(0, 160) || `Post by ${activeBrand.name} on unera.social`,
            canonicalUrl: generateBrandPostCanonicalUrl(Date.now().toString(), activeBrand.name, text.substring(0, 50))
        };
        
        console.log("Creating SEO-optimized post as brand:", { brandId: activeBrand.id, content: postContent });
        
        onPostAsBrand(activeBrand.id, postContent);
        setShowCreatePostModal(false);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'profile') => {
        if (e.target.files && e.target.files[0] && activeBrand) {
            const file = e.target.files[0];
            
            if (onUpdateBrandImage) {
                onUpdateBrandImage(activeBrand.id, type, file);
            } else if (onUpdateBrand) {
                const url = URL.createObjectURL(file);
                onUpdateBrand(activeBrand.id, type === 'cover' ? { coverImage: url } : { profileImage: url });
            }
        }
    };

    // Generate canonical URL for current view
    const getCanonicalUrl = () => {
        const baseUrl = 'https://unera.social';
        
        if (view === 'list') {
            if (searchQuery || activeTab !== 'Posts') {
                const params = new URLSearchParams();
                if (searchQuery) params.append('q', searchQuery);
                if (activeTab !== 'Posts') params.append('tab', activeTab.toLowerCase());
                return `${baseUrl}/brands?${params.toString()}`;
            }
            return `${baseUrl}/brands`;
        }
        
        if (view === 'detail' && activeBrand) {
            return generateBrandCanonicalUrl(activeBrand.id.toString(), activeBrand.name);
        }
        
        return baseUrl;
    };

    // Generate schema data for current view
    const generateSchemas = () => {
        const schemas = [];
        
        // Always include website schema
        schemas.push({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "unera.social Brands",
            "url": "https://unera.social",
            "potentialAction": {
                "@type": "SearchAction",
                "target": "https://unera.social/brands?q={search_term_string}",
                "query-input": "required name=search_term_string"
            }
        });

        if (view === 'list') {
            // Breadcrumb schema
            schemas.push({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": "https://unera.social"
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Brands",
                        "item": "https://unera.social/brands"
                    }
                ]
            });

            // Brands list schema
            schemas.push(generateBrandsListSchema(brands));
        }

        if (view === 'detail' && activeBrand) {
            // Brand schema
            schemas.push(generateBrandSchema(activeBrand));

            // Breadcrumb for brand detail
            schemas.push({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": 1,
                        "name": "Home",
                        "item": "https://unera.social"
                    },
                    {
                        "@type": "ListItem",
                        "position": 2,
                        "name": "Brands",
                        "item": "https://unera.social/brands"
                    },
                    {
                        "@type": "ListItem",
                        "position": 3,
                        "name": activeBrand.name,
                        "item": generateBrandCanonicalUrl(activeBrand.id.toString(), activeBrand.name)
                    }
                ]
            });

            // Add schemas for brand posts
            brandPosts.slice(0, 5).forEach(post => {
                schemas.push(generateBrandPostSchema(post, activeBrand));
            });
        }

        if (view === '410' && activeBrandId) {
            const deletedBrand = deletedBrands.find(b => b.id === activeBrandId);
            if (deletedBrand) {
                schemas.push(generateDeletedBrandSchema(deletedBrand.id.toString(), deletedBrand.name));
            }
        }

        return schemas;
    };

    // Handle 404/410 views
    if (view === '404') {
        return <NotFoundPage type="brand" onGoHome={() => setView('list')} onGoBack={() => setView('list')} />;
    }

    if (view === '410') {
        return (
            <>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(generateDeletedBrandSchema(activeBrandId?.toString() || '', '')) }}
                />
                <meta name="robots" content="noindex, follow" />
                <div className="min-h-screen bg-[#18191A] flex flex-col items-center justify-center p-4">
                    <div className="bg-[#242526] rounded-2xl p-8 md:p-12 max-w-lg w-full text-center border border-[#3E4042]">
                        <div className="w-24 h-24 bg-[#3A3B3C] rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#F02849]">
                            <i className="fas fa-trash-alt text-4xl text-[#F02849]"></i>
                        </div>
                        
                        <h1 className="text-3xl font-bold text-[#E4E6EB] mb-4">Brand Page Removed</h1>
                        
                        <p className="text-[#B0B3B8] text-lg mb-2">
                            This brand page has been permanently deleted by the owner or administrator.
                        </p>
                        
                        <p className="text-[#90949C] text-sm mb-8">
                            Error 410 - Gone Forever
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button 
                                onClick={() => setView('list')}
                                className="px-6 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl font-bold transition-all"
                            >
                                <i className="fas fa-store mr-2"></i> Browse Brands
                            </button>
                            <button 
                                onClick={() => window.location.href = '/'}
                                className="px-6 py-3 bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] rounded-xl font-bold transition-all"
                            >
                                <i className="fas fa-home mr-2"></i> Home
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Main render with SEO metadata
    const schemas = generateSchemas();
    const canonicalUrl = getCanonicalUrl();

    if (view === 'list' || !activeBrand) {
        const myBrands = currentUser ? brands.filter(b => b.adminId === currentUser.id) : [];
        let otherBrands = currentUser ? brands.filter(b => b.adminId !== currentUser.id) : brands;

        if (searchQuery.trim()) {
            otherBrands = otherBrands.filter(b => 
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.keywords?.some(kw => kw.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        return (
            <>
                {/* SEO Metadata */}
                <link rel="canonical" href={canonicalUrl} />
                <title>Brands & Pages Directory - unera.social</title>
                <meta name="description" content="Discover businesses, creators, and organizations on unera.social. Find verified brand pages in various categories." />
                <meta name="keywords" content="brands, pages, businesses, organizations, unera.social, directory" />
                
                {/* JSON-LD Schema */}
                {schemas.map((schema, index) => (
                    <script
                        key={index}
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
                    />
                ))}

                <div className="w-full max-w-[1000px] mx-auto p-4 font-sans pb-20">
                    {/* Hidden SEO content */}
                    <div className="hidden" aria-hidden="true">
                        <h1>Brands Directory - unera.social</h1>
                        <p>Browse thousands of brand pages, businesses, and organizations on unera.social marketplace.</p>
                        <p>Categories: {BRAND_CATEGORIES.join(', ')}</p>
                        <p>Total brands: {brands.length}</p>
                    </div>

                    <div className="flex flex-col gap-4 mb-6 bg-[#242526] p-4 rounded-xl border border-[#3E4042]">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-[#E4E6EB]">Brands & Pages</h2>
                                <p className="text-[#B0B3B8] text-sm">Discover businesses and creators. <span className="text-[#1877F2] font-semibold">{brands.length} pages</span> available</p>
                            </div>
                            {currentUser && (
                                <button onClick={() => setShowCreateModal(true)} className="bg-[#263951] text-[#F3425F] hover:bg-[#2A3F5A] px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                                    <i className="fas fa-briefcase text-lg"></i> <span>Create Brand</span>
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <input 
                                type="text" 
                                className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 pl-10 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                                placeholder="Search Brands by name, category, or keyword..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B3B8]"></i>
                        </div>
                        {searchQuery && (
                            <div className="text-[#B0B3B8] text-sm">
                                <i className="fas fa-info-circle text-[#1877F2] mr-1"></i>
                                Found {otherBrands.length} brand{otherBrands.length !== 1 ? 's' : ''} for "{searchQuery}"
                            </div>
                        )}
                    </div>

                    {myBrands.length > 0 && !searchQuery && (
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-[#E4E6EB] mb-3">Pages You Manage</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {myBrands.map(brand => (
                                    <article 
                                        key={brand.id} 
                                        className="bg-[#242526] rounded-xl overflow-hidden border border-[#3E4042] cursor-pointer hover:shadow-lg transition-all flex flex-col"
                                        itemScope
                                        itemType="https://schema.org/Organization"
                                        onClick={() => handleBrandClick(brand.id)}
                                    >
                                        <meta itemProp="url" content={generateBrandCanonicalUrl(brand.id.toString(), brand.name)} />
                                        <meta itemProp="name" content={brand.name} />
                                        
                                        <div className="h-32 bg-gray-700 relative">
                                            <img 
                                                src={brand.coverImage} 
                                                className="w-full h-full object-cover" 
                                                alt={`${brand.name} cover`}
                                                itemProp="image"
                                            />
                                        </div>
                                        <div className="p-4 pt-10 relative">
                                            <div className="absolute -top-8 left-4 rounded-full border-4 border-[#242526] overflow-hidden w-16 h-16 bg-[#3A3B3C]">
                                                <img 
                                                    src={brand.profileImage} 
                                                    className="w-full h-full object-cover" 
                                                    alt={`${brand.name} logo`}
                                                    itemProp="logo"
                                                />
                                            </div>
                                            <h4 className="font-bold text-lg text-[#E4E6EB]" itemProp="name">{brand.name}</h4>
                                            <p className="text-[#B0B3B8] text-xs">
                                                <span itemProp="description">{brand.category}</span> • 
                                                <span itemProp="member"> {brand.followers.length} followers</span>
                                            </p>
                                            <meta itemProp="address" content={brand.location || 'Unknown'} />
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="text-xl font-bold text-[#E4E6EB] mb-3">{searchQuery ? 'Search Results' : 'Featured Brands'}</h3>
                        {otherBrands.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {otherBrands.map(brand => (
                                    <article 
                                        key={brand.id} 
                                        className="bg-[#242526] rounded-xl overflow-hidden border border-[#3E4042] flex flex-col"
                                        itemScope
                                        itemType="https://schema.org/Organization"
                                    >
                                        <meta itemProp="url" content={generateBrandCanonicalUrl(brand.id.toString(), brand.name)} />
                                        
                                        <div className="h-32 relative">
                                            <img 
                                                src={brand.coverImage} 
                                                className="w-full h-full object-cover cursor-pointer" 
                                                alt={`${brand.name} cover`}
                                                onClick={() => handleBrandClick(brand.id)}
                                                itemProp="image"
                                            />
                                        </div>
                                        <div className="p-4 flex flex-col flex-1 relative">
                                            <div 
                                                className="absolute -top-8 left-4 rounded-full border-4 border-[#242526] overflow-hidden w-16 h-16 bg-[#3A3B3C] cursor-pointer" 
                                                onClick={() => handleBrandClick(brand.id)}
                                            >
                                                <img 
                                                    src={brand.profileImage} 
                                                    className="w-full h-full object-cover" 
                                                    alt={`${brand.name} logo`}
                                                    itemProp="logo"
                                                />
                                            </div>
                                            <div className="mt-8">
                                                <h4 
                                                    className="font-bold text-lg text-[#E4E6EB] hover:underline cursor-pointer" 
                                                    onClick={() => handleBrandClick(brand.id)}
                                                    itemProp="name"
                                                >
                                                    {brand.name} 
                                                    {brand.isVerified && <i className="fas fa-check-circle text-[#1877F2] text-sm ml-1"></i>}
                                                </h4>
                                                <p className="text-[#B0B3B8] text-xs mb-1" itemProp="description">{brand.category}</p>
                                                <p className="text-[#B0B3B8] text-sm line-clamp-2 mb-4">{brand.description}</p>
                                                <div className="mb-3 flex flex-wrap gap-1">
                                                    {brand.keywords?.slice(0, 3).map((keyword, idx) => (
                                                        <span key={idx} className="text-[#90949C] text-xs bg-[#3A3B3C] px-2 py-1 rounded-full">
                                                            {keyword}
                                                        </span>
                                                    ))}
                                                </div>
                                                <button 
                                                    onClick={() => currentUser ? onFollowBrand(brand.id) : alert("Login to follow")} 
                                                    className="w-full bg-[#263951] text-[#F3425F] hover:bg-[#2A3F5A] font-bold py-2 rounded-lg transition-colors"
                                                >
                                                    {currentUser && brand.followers.includes(currentUser.id) ? 'Following' : 'Follow'}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-[#242526] rounded-xl p-8 text-center border border-[#3E4042]">
                                <i className="fas fa-search text-4xl text-[#3E4042] mb-4"></i>
                                <p className="text-[#B0B3B8]">No brands found matching your search.</p>
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')} 
                                        className="mt-4 px-4 py-2 bg-[#1877F2] text-white rounded-lg font-bold"
                                    >
                                        Clear Search
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {showCreateModal && currentUser && (
                        <CreateBrandModal currentUser={currentUser} onClose={() => setShowCreateModal(false)} onCreate={onCreateBrand} />
                    )}
                </div>
            </>
        );
    }

    // Brand Detail View
    return (
        <>
            {/* SEO Metadata for Brand Detail */}
            <link rel="canonical" href={canonicalUrl} />
            <title>{activeBrand.seoTitle || `${activeBrand.name} - ${activeBrand.category} on unera.social`}</title>
            <meta name="description" content={activeBrand.seoDescription || activeBrand.description || `${activeBrand.name} - ${activeBrand.category} business page on unera.social`} />
            {activeBrand.keywords && <meta name="keywords" content={activeBrand.keywords.join(', ')} />}
            <meta property="og:title" content={activeBrand.name} />
            <meta property="og:description" content={activeBrand.description || `${activeBrand.category} page on unera.social`} />
            <meta property="og:image" content={activeBrand.profileImage} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:type" content="business.business" />
            
            {/* JSON-LD Schema */}
            {schemas.map((schema, index) => (
                <script
                    key={index}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
                />
            ))}

            <div className="w-full bg-[#18191A] min-h-screen pb-10 font-sans">
                <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'profile')} />
                <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'cover')} />

                {/* Hidden SEO content */}
                <div className="hidden" aria-hidden="true">
                    <h1>{activeBrand.name}</h1>
                    <p>{activeBrand.description}</p>
                    <span>Category: {activeBrand.category}</span>
                    <span>Location: {activeBrand.location}</span>
                    <span>Followers: {activeBrand.followers.length}</span>
                    <span>URL: {canonicalUrl}</span>
                </div>

                <div className="bg-[#242526] border-b border-[#3E4042] shadow-sm mb-4">
                    <div className="max-w-[1100px] mx-auto">
                        <div className="h-[200px] md:h-[350px] relative group bg-[#3A3B3C]">
                            <img 
                                src={activeBrand.coverImage} 
                                className="w-full h-full object-cover md:rounded-b-xl" 
                                alt={`${activeBrand.name} cover image`}
                                itemProp="image"
                            />
                            {(canManage || isPlatformAdmin) && (
                                <div className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/20 font-bold text-white text-sm flex items-center gap-2" onClick={() => coverInputRef.current?.click()}>
                                    <i className="fas fa-camera"></i> Edit Cover
                                </div>
                            )}
                        </div>
                        <div className="px-4 pb-0">
                            <div className="flex flex-col md:flex-row items-start md:items-end -mt-[40px] md:-mt-[30px] relative z-10 gap-4 mb-4">
                                <div className="relative group">
                                    <div className="w-[100px] h-[100px] md:w-[140px] md:h-[140px] rounded-full border-4 border-[#242526] overflow-hidden bg-[#242526]">
                                        <img 
                                            src={activeBrand.profileImage} 
                                            className="w-full h-full object-cover" 
                                            alt={`${activeBrand.name} logo`}
                                            itemProp="logo"
                                        />
                                    </div>
                                    {(canManage || isPlatformAdmin) && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => profileInputRef.current?.click()}>
                                            <i className="fas fa-camera text-white text-2xl"></i>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-1 mt-2">
                                    <h1 className="text-2xl md:text-3xl font-bold text-[#E4E6EB] leading-tight mb-1 flex items-center gap-2" itemProp="name">
                                        {activeBrand.name} 
                                        {activeBrand.isVerified && <i className="fas fa-check-circle text-[#1877F2] text-[20px]" title="Verified Brand"></i>}
                                    </h1>
                                    <p className="text-[#B0B3B8] font-semibold text-[15px]">
                                        <span itemProp="description">{activeBrand.category}</span> • 
                                        <span itemProp="address" content={activeBrand.location}>{activeBrand.location}</span> • 
                                        <span itemProp="member"> {activeBrand.followers.length} followers</span>
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {activeBrand.keywords?.slice(0, 5).map((keyword, idx) => (
                                            <span key={idx} className="text-[#90949C] text-xs bg-[#3A3B3C] px-2 py-1 rounded-full">
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4 md:mt-0 w-full md:w-auto relative">
                                    {canManage ? (
                                        <>
                                            <button onClick={() => setShowCreateEventModal(true)} className="bg-[#3A3B3C] text-[#E4E6EB] px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#4E4F50] flex-1 md:flex-none">
                                                <i className="fas fa-plus"></i> Event
                                            </button>
                                            <button onClick={() => setShowEditBrandModal(true)} className="bg-[#3A3B3C] text-[#E4E6EB] px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#4E4F50] flex-1 md:flex-none">
                                                <i className="fas fa-pen"></i> Edit Page
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => currentUser ? onFollowBrand(activeBrand.id) : alert("Login to follow")} className={`${isFollowing ? 'bg-[#3A3B3C] text-[#E4E6EB]' : 'bg-[#1877F2] text-white'} px-6 py-2 rounded-lg font-bold text-base hover:opacity-90 flex-1 md:flex-none transition-colors`}>
                                                {isFollowing ? 'Following' : 'Follow'}
                                            </button>
                                            <button onClick={() => onMessage && onMessage(activeBrand.id)} className="bg-[#3A3B3C] text-[#E4E6EB] px-4 py-2 rounded-lg font-bold text-base hover:bg-[#4E4F50] flex-1 md:flex-none">
                                                <i className="fab fa-facebook-messenger mr-1"></i> Message
                                            </button>
                                            {activeBrand.contactPhone && (
                                                <a href={`tel:${activeBrand.contactPhone}`} className="bg-[#25D366] text-white px-4 py-2 rounded-lg font-bold text-base hover:bg-[#20bd5a] flex items-center justify-center gap-2 flex-1 md:flex-none no-underline">
                                                    <i className="fab fa-whatsapp"></i> WhatsApp
                                                </a>
                                            )}
                                        </>
                                    )}
                                    <button onClick={() => setShowOptionsMenu(!showOptionsMenu)} className="bg-[#3A3B3C] text-[#E4E6EB] px-3 py-2 rounded-lg font-bold hover:bg-[#4E4F50] transition-colors relative">
                                        <i className="fas fa-ellipsis-h"></i>
                                        {showOptionsMenu && (isPlatformAdmin || canManage) && (
                                            <div className="absolute top-full right-0 mt-2 w-48 bg-[#242526] border border-[#3E4042] rounded-lg shadow-xl z-20 py-1">
                                                {isPlatformAdmin && (
                                                    <>
                                                        {onVerifyBrand && (
                                                            <div onClick={() => { onVerifyBrand(activeBrand.id); setShowOptionsMenu(false); }} className="px-4 py-2 hover:bg-[#3A3B3C] text-[#1877F2] cursor-pointer flex items-center gap-2">
                                                                <i className="fas fa-check-circle"></i> {activeBrand.isVerified ? 'Unverify' : 'Verify'} Page
                                                            </div>
                                                        )}
                                                        <div onClick={() => { onDeleteBrand(activeBrand.id); setShowOptionsMenu(false); }} className="px-4 py-2 hover:bg-[#3A3B3C] text-red-500 cursor-pointer flex items-center gap-2">
                                                            <i className="fas fa-trash-alt"></i> Delete Page
                                                        </div>
                                                    </>
                                                )}
                                                {canManage && (
                                                    <div onClick={() => { setShowEditBrandModal(true); setShowOptionsMenu(false); }} className="px-4 py-2 hover:bg-[#3A3B3C] text-[#E4E6EB] cursor-pointer flex items-center gap-2">
                                                        <i className="fas fa-cog"></i> Page Settings
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-[#3E4042] mt-4"></div>
                            <div className="flex items-center gap-1 pt-1 overflow-x-auto">
                                {['Posts', 'About', 'Photos'].map(tab => (
                                    <div 
                                        key={tab} 
                                        onClick={() => setActiveTab(tab as any)} 
                                        className={`px-4 py-3 cursor-pointer font-semibold text-base border-b-[3px] transition-colors whitespace-nowrap ${activeTab === tab ? 'text-[#1877F2] border-[#1877F2]' : 'text-[#B0B3B8] border-transparent hover:bg-[#3A3B3C] rounded-t-lg'}`}
                                    >
                                        {tab}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1000px] mx-auto w-full flex flex-col md:flex-row gap-4 px-0 md:px-4">
                    <div className="w-full md:w-[360px] flex-shrink-0 flex flex-col gap-4 px-4 md:px-0">
                        <div className="bg-[#242526] rounded-xl p-4 shadow-sm border border-[#3E4042]">
                            <h2 className="text-xl font-bold text-[#E4E6EB] mb-4">About</h2>
                            <div className="flex flex-col gap-3 text-[#E4E6EB] text-[15px]">
                                <p itemProp="description">{activeBrand.description}</p>
                                <div className="h-[1px] bg-[#3E4042] w-full my-2"></div>
                                <div className="flex items-center gap-3 text-[#B0B3B8]">
                                    <i className="fas fa-info-circle w-5 text-center"></i>
                                    <span itemProp="knowsAbout">{activeBrand.category}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[#B0B3B8]">
                                    <i className="fas fa-map-marker-alt w-5 text-center"></i>
                                    <span itemProp="address">{activeBrand.location || 'Location not added'}</span>
                                </div>
                                {activeBrand.website && (
                                    <div className="flex items-center gap-3 text-[#B0B3B8]">
                                        <i className="fas fa-globe w-5 text-center"></i>
                                        <a 
                                            href={activeBrand.website.startsWith('http') ? activeBrand.website : `https://${activeBrand.website}`} 
                                            target="_blank" 
                                            rel="noreferrer noopener" 
                                            className="text-[#1877F2] hover:underline truncate"
                                            itemProp="url"
                                        >
                                            {activeBrand.website}
                                        </a>
                                    </div>
                                )}
                                {activeBrand.contactEmail && (
                                    <div className="flex items-center gap-3 text-[#B0B3B8]">
                                        <i className="fas fa-envelope w-5 text-center"></i>
                                        <span itemProp="email">{activeBrand.contactEmail}</span>
                                    </div>
                                )}
                                {activeBrand.contactPhone && (
                                    <div className="flex items-center gap-3 text-[#B0B3B8]">
                                        <i className="fas fa-phone w-5 text-center"></i>
                                        <span itemProp="telephone">{activeBrand.contactPhone}</span>
                                    </div>
                                )}
                                {(canManage || isPlatformAdmin) && (
                                    <button 
                                        className="w-full bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] font-semibold py-2 rounded-md transition-colors text-sm mt-2" 
                                        onClick={() => setShowEditBrandModal(true)}
                                    >
                                        Edit Details
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        {activeTab === 'Posts' && (
                            <>
                                {(canManage || isPlatformAdmin) && currentUser && (
                                    <>
                                        <div className="bg-[#242526] rounded-xl p-3 md:p-4 mb-4 shadow-sm border border-[#3E4042]">
                                            <div className="flex gap-2 mb-3">
                                                <img 
                                                    src={activeBrand.profileImage} 
                                                    alt={`${activeBrand.name} logo`} 
                                                    className="w-10 h-10 rounded-full object-cover cursor-pointer border border-[#3E4042]" 
                                                />
                                                <div 
                                                    className="flex-1 bg-[#3A3B3C] rounded-full px-3 md:px-4 py-2 hover:bg-[#4E4F50] cursor-pointer flex items-center transition-colors" 
                                                    onClick={() => setShowCreatePostModal(true)}
                                                >
                                                    <span className="text-[#B0B3B8] text-[17px] truncate">What's new with your brand?</span>
                                                </div>
                                            </div>
                                            <div className="border-t border-[#3E4042] pt-2 flex justify-between">
                                                <div className="flex items-center justify-center flex-1 gap-2 p-2 hover:bg-[#3A3B3C] rounded-lg cursor-pointer transition-colors" onClick={() => setShowCreatePostModal(true)}>
                                                    <i className="fas fa-video text-[#F3425F] text-[24px]"></i>
                                                    <span className="text-[#B0B3B8] font-semibold text-[15px] hidden sm:block">Live Video</span>
                                                </div>
                                                <div className="flex items-center justify-center flex-1 gap-2 p-2 hover:bg-[#3A3B3C] rounded-lg cursor-pointer transition-colors" onClick={() => setShowCreatePostModal(true)}>
                                                    <i className="fas fa-images text-[#45BD62] text-[24px]"></i>
                                                    <span className="text-[#B0B3B8] font-semibold text-[15px] hidden sm:block">Photo/Video</span>
                                                </div>
                                                <div className="flex items-center justify-center flex-1 gap-2 p-2 hover:bg-[#3A3B3C] rounded-lg cursor-pointer transition-colors" onClick={() => setShowCreateEventModal(true)}>
                                                    <i className="fas fa-calendar-plus text-[#F7B928] text-[24px]"></i>
                                                    <span className="text-[#B0B3B8] font-semibold text-[15px] hidden sm:block">Event</span>
                                                </div>
                                            </div>
                                        </div>

                                        {showCreatePostModal && (
                                            <CreatePostModal 
                                                currentUser={{
                                                    id: activeBrand.id,
                                                    name: activeBrand.name,
                                                    profileImage: activeBrand.profileImage,
                                                    email: "",
                                                    password: "",
                                                    role: "user",
                                                    followers: [],
                                                    following: [],
                                                    isVerified: activeBrand.isVerified,
                                                    joinedDate: new Date().toISOString()
                                                } as User} 
                                                users={users} 
                                                onClose={() => setShowCreatePostModal(false)}
                                                onCreatePost={handleCreatePost}
                                            />
                                        )}
                                    </>
                                )}
                                <div className="space-y-4">
                                    {brandPosts.length > 0 ? brandPosts.map(post => (
                                        <Post 
                                            key={post.id}
                                            post={post}
                                            author={activeBrand as any} 
                                            currentUser={currentUser}
                                            users={users} 
                                            onProfileClick={onProfileClick}
                                            onReact={onReact}
                                            onShare={onShare}
                                            onOpenComments={onOpenComments}
                                            onVideoClick={() => {}}
                                            onViewImage={() => {}}
                                            onPlayAudioTrack={onPlayAudioTrack}
                                            onDeletePost={onDeletePost}
                                            isAdmin={isPlatformAdmin}
                                            canonicalUrl={generateBrandPostCanonicalUrl(post.id.toString(), activeBrand.name, post.text?.substring(0, 50))}
                                        />
                                    )) : (
                                        <div className="bg-[#242526] rounded-xl p-8 text-center border border-[#3E4042] mx-4 md:mx-0">
                                            <i className="fas fa-newspaper text-4xl text-[#3E4042] mb-4"></i>
                                            <p className="text-[#B0B3B8]">No posts yet. Be the first to post something!</p>
                                            {canManage && (
                                                <button 
                                                    onClick={() => setShowCreatePostModal(true)}
                                                    className="mt-4 px-6 py-2 bg-[#1877F2] text-white rounded-lg font-bold"
                                                >
                                                    Create First Post
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                        {activeTab === 'Photos' && (
                            <div className="bg-[#242526] rounded-xl p-4 border border-[#3E4042] mx-4 md:mx-0">
                                <h2 className="text-xl font-bold text-[#E4E6EB] mb-4">Photos</h2>
                                <div className="grid grid-cols-3 gap-1">
                                    {brandPosts.filter(p => p.type === 'image' && p.image).map(p => (
                                        <img 
                                            key={p.id} 
                                            src={p.image} 
                                            className="aspect-square object-cover w-full cursor-pointer hover:opacity-90" 
                                            alt={`${activeBrand.name} photo`}
                                        />
                                    ))}
                                </div>
                                {brandPosts.filter(p => p.type === 'image').length === 0 && (
                                    <p className="text-[#B0B3B8] text-center py-8">No photos available.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {showEditBrandModal && activeBrand && (
                    <EditBrandModal 
                        brand={activeBrand} 
                        onClose={() => setShowEditBrandModal(false)} 
                        onUpdate={(data) => onUpdateBrand && onUpdateBrand(activeBrand.id, data)} 
                    />
                )}

                {showCreateEventModal && currentUser && onCreateEvent && (
                    <CreateEventModal 
                        currentUser={currentUser}
                        onClose={() => setShowCreateEventModal(false)}
                        onCreate={(e) => onCreateEvent(activeBrand.id, e)}
                    />
                )}
            </div>
        </>
    );
};
