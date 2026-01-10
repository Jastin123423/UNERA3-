import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, Brand, Post as PostType, Event, LinkPreview, AudioTrack } from '../types';
import { Post, CreatePostModal } from './Feed';
import { BRAND_CATEGORIES, LOCATIONS_DATA } from '../constants';
import { CreateEventModal } from './Events';

// ========== API CLIENT ==========
const API_BASE_URL = 'https://unera.social';

const apiFetch = async (endpoint: string, options: RequestInit = {}, withAuth = true) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (withAuth) {
        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            mode: 'cors',
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('API did not return JSON');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `API Error: ${response.status}`);
        }

        if (Array.isArray(data)) {
            return { data: data, success: true };
        }
        
        return data;
    } catch (error) {
        console.error('API Error for', endpoint, ':', error);
        return { data: [], success: false, error: error.message };
    }
};

// Transform API data
const transformBrandFromAPI = (apiBrand: any): Brand => {
    return {
        id: apiBrand.id,
        name: apiBrand.name || `Brand ${apiBrand.id}`,
        description: apiBrand.description || '',
        category: apiBrand.category || 'Business',
        location: apiBrand.location || '',
        website: apiBrand.website || '',
        contactEmail: apiBrand.contact_email || apiBrand.contactEmail || '',
        contactPhone: apiBrand.contact_phone || apiBrand.contactPhone || '',
        profileImage: apiBrand.profile_image || apiBrand.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(apiBrand.name || 'Brand')}&background=random`,
        coverImage: apiBrand.cover_image || apiBrand.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        adminId: apiBrand.admin_id || apiBrand.adminId || 1,
        followers: apiBrand.followers || [],
        posts: apiBrand.posts || [],
        isVerified: apiBrand.is_verified || apiBrand.isVerified || false,
        isRestricted: apiBrand.is_restricted || false,
        rating: apiBrand.rating || 0,
        totalReviews: apiBrand.total_reviews || 0,
        businessHours: apiBrand.business_hours || apiBrand.businessHours || {},
        socialLinks: apiBrand.social_links || apiBrand.socialLinks || {},
        createdAt: apiBrand.created_at || Date.now()
    };
};

// --- CREATE BRAND MODAL ---
interface CreateBrandModalProps {
    currentUser: User;
    onClose: () => void;
    onCreate: (brand: Partial<Brand>) => Promise<void>;
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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const handleSubmit = async () => {
        if (!name.trim() || !category || !location) {
            setError('Please fill in all required fields');
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        try {
            await onCreate({
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
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create brand');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 animate-fade-in font-sans">
            <div className="bg-[#242526] w-full max-w-[500px] rounded-xl border border-[#3E4042] shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-[#3E4042] flex justify-between items-center">
                    <h3 className="text-xl font-bold text-[#E4E6EB]">{step === 1 ? 'Create a Page' : 'Contact Info'}</h3>
                    <div onClick={onClose} className="w-8 h-8 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] flex items-center justify-center cursor-pointer">
                        <i className="fas fa-times text-[#B0B3B8]"></i>
                    </div>
                </div>
                
                <div className="p-4 overflow-y-auto space-y-4">
                    {error && (
                        <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-2 rounded-lg">
                            {error}
                        </div>
                    )}
                    
                    {step === 1 ? (
                        <>
                            <div>
                                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Page Name <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                                    placeholder="Business or Brand Name" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Category <span className="text-red-500">*</span></label>
                                <select 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                                    value={category} 
                                    onChange={e => setCategory(e.target.value)}
                                    disabled={isLoading}
                                >
                                    <option value="">Select a Category</option>
                                    {BRAND_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Description</label>
                                <textarea 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2] resize-none h-24" 
                                    placeholder="Describe your brand..." 
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Location (Country/Region) <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    list="locations" 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                                    placeholder="e.g. Dar es Salaam, Tanzania" 
                                    value={location} 
                                    onChange={e => setLocation(e.target.value)}
                                    disabled={isLoading}
                                />
                                <datalist id="locations">
                                    {LOCATIONS_DATA.map(l => <option key={l.name} value={l.name} />)}
                                </datalist>
                            </div>
                            <button 
                                onClick={() => setStep(2)} 
                                disabled={!name.trim() || !category || !location || isLoading}
                                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Loading...' : 'Next'}
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-[#B0B3B8] mb-2">Add contact details to help people reach you (Optional).</p>
                            <div>
                                <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Website</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                                    placeholder="https://example.com" 
                                    value={website} 
                                    onChange={e => setWebsite(e.target.value)}
                                    disabled={isLoading}
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
                                    disabled={isLoading}
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
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setStep(1)} 
                                    disabled={isLoading}
                                    className="flex-1 bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50"
                                >
                                    Back
                                </button>
                                <button 
                                    onClick={handleSubmit} 
                                    disabled={isLoading}
                                    className="flex-1 bg-[#42B72A] hover:bg-[#36A420] text-white py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Creating...
                                        </span>
                                    ) : 'Create Page'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- EDIT BRAND MODAL ---
interface EditBrandModalProps {
    brand: Brand;
    onClose: () => void;
    onUpdate: (updatedData: Partial<Brand>) => Promise<void>;
}

const EditBrandModal: React.FC<EditBrandModalProps> = ({ brand, onClose, onUpdate }) => {
    const [description, setDescription] = useState(brand.description || '');
    const [website, setWebsite] = useState(brand.website || '');
    const [location, setLocation] = useState(brand.location || '');
    const [contactEmail, setContactEmail] = useState(brand.contactEmail || '');
    const [contactPhone, setContactPhone] = useState(brand.contactPhone || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            await onUpdate({ description, website, location, contactEmail, contactPhone });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update brand');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 animate-fade-in font-sans">
            <div className="bg-[#242526] w-full max-w-[600px] rounded-xl border border-[#3E4042] shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-[#3E4042] flex justify-between items-center">
                    <h2 className="text-xl font-bold text-[#E4E6EB]">Edit Page Info</h2>
                    <div onClick={onClose} className="w-8 h-8 rounded-full bg-[#3A3B3C] hover:bg-[#4E4F50] flex items-center justify-center cursor-pointer">
                        <i className="fas fa-times text-[#B0B3B8]"></i>
                    </div>
                </div>
                <div className="p-4 overflow-y-auto space-y-4">
                    {error && (
                        <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-2 rounded-lg">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Description</label>
                        <textarea 
                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none h-24 resize-none disabled:opacity-50" 
                            value={description} 
                            onChange={e => setDescription(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Location</label>
                        <input 
                            type="text" 
                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none disabled:opacity-50" 
                            value={location} 
                            onChange={e => setLocation(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Website</label>
                        <input 
                            type="text" 
                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none disabled:opacity-50" 
                            value={website} 
                            onChange={e => setWebsite(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Contact Email</label>
                        <input 
                            type="email" 
                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none disabled:opacity-50" 
                            value={contactEmail} 
                            onChange={e => setContactEmail(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-[#B0B3B8] text-sm font-bold mb-1">Contact Phone</label>
                        <input 
                            type="tel" 
                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 text-[#E4E6EB] outline-none disabled:opacity-50" 
                            value={contactPhone} 
                            onChange={e => setContactPhone(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <button 
                        onClick={handleSave} 
                        disabled={isLoading}
                        className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <i className="fas fa-spinner fa-spin"></i>
                                Saving...
                            </span>
                        ) : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- BRANDS PAGE COMPONENT ---
interface BrandsPageProps {
    currentUser: User | null;
    brands: Brand[];
    posts: PostType[];
    users: User[]; 
    onCreateBrand: (brand: Partial<Brand>) => Promise<void>;
    onFollowBrand: (brandId: number) => void;
    onProfileClick: (id: number) => void;
    onPostAsBrand: (brandId: number, content: any) => Promise<void>;
    onReact: (postId: number, type: any) => void;
    onShare: (postId: number) => void;
    onOpenComments: (postId: number) => void;
    onUpdateBrand?: (brandId: number, data: Partial<Brand>) => Promise<void>;
    onDeleteBrand?: (brandId: number) => Promise<void>;
    onMessage?: (brandId: number) => void;
    onCreateEvent?: (brandId: number, event: Partial<Event>) => void;
    onUpdateBrandImage?: (brandId: number, type: 'cover' | 'profile', file: File) => void;
    onVerifyBrand?: (brandId: number) => void;
    initialBrandId?: number | null;
    onPlayAudioTrack?: (track: AudioTrack) => void;
}

export const BrandsPage: React.FC<BrandsPageProps> = ({ 
    currentUser, 
    brands, 
    posts, 
    users, 
    onCreateBrand, 
    onFollowBrand, 
    onProfileClick, 
    onPostAsBrand, 
    onReact, 
    onShare, 
    onOpenComments,
    onUpdateBrand, 
    onDeleteBrand, 
    onMessage, 
    onCreateEvent, 
    onUpdateBrandImage, 
    onVerifyBrand, 
    initialBrandId, 
    onPlayAudioTrack
}) => {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [activeBrandId, setActiveBrandId] = useState<number | null>(initialBrandId || null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [showEditBrandModal, setShowEditBrandModal] = useState(false);
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'Posts' | 'About' | 'Photos'>('Posts');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const profileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    // Initialize view based on initialBrandId
    useEffect(() => {
        if (initialBrandId) {
            const brand = brands.find(b => b.id === initialBrandId);
            if (brand) {
                setActiveBrandId(brand.id);
                setView('detail');
                setActiveTab('Posts');
            }
        } else {
            setView('list');
            setActiveBrandId(null);
        }
    }, [initialBrandId, brands]);

    const activeBrand = useMemo(() => brands.find(b => b.id === activeBrandId), [brands, activeBrandId]);
    const isAdmin = currentUser && activeBrand && activeBrand.adminId === currentUser.id;
    const isFollowing = currentUser && activeBrand && activeBrand.followers.includes(currentUser.id);

    // Filter brands based on search
    const filteredBrands = useMemo(() => {
        let result = brands;
        
        // Filter by search query
        if (searchQuery.trim()) {
            result = result.filter(b => 
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        return result;
    }, [brands, searchQuery]);

    // Get user's brands
    const myBrands = useMemo(() => {
        return currentUser ? filteredBrands.filter(b => b.adminId === currentUser.id) : [];
    }, [filteredBrands, currentUser]);

    // Get other brands (not managed by current user)
    const otherBrands = useMemo(() => {
        return currentUser 
            ? filteredBrands.filter(b => b.adminId !== currentUser.id)
            : filteredBrands;
    }, [filteredBrands, currentUser]);

    const handleBrandClick = (brandId: number) => {
        setActiveBrandId(brandId);
        setView('detail');
        setActiveTab('Posts');
        window.scrollTo(0, 0);
    };

    // Handle create brand with API
    const handleCreateBrand = async (brandData: Partial<Brand>) => {
        try {
            await onCreateBrand(brandData);
            setShowCreateModal(false);
        } catch (error) {
            throw error;
        }
    };

    // Handle update brand with API
    const handleUpdateBrand = async (brandId: number, data: Partial<Brand>) => {
        if (!onUpdateBrand) return;
        
        try {
            await onUpdateBrand(brandId, data);
            setShowEditBrandModal(false);
        } catch (error) {
            throw error;
        }
    };

    // Handle create post as brand
    const handleCreatePostAsBrand = async (
        text: string, 
        files: File[] | null, 
        type: any, 
        visibility: any, 
        location?: string, 
        feeling?: string, 
        taggedUsers?: number[], 
        background?: string, 
        linkPreview?: LinkPreview
    ) => {
        if (!activeBrand) return;
        
        try {
            await onPostAsBrand(activeBrand.id, { 
                text, 
                files, 
                type, 
                visibility, 
                location, 
                feeling, 
                taggedUsers, 
                background, 
                linkPreview 
            });
            setShowCreatePostModal(false);
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post');
        }
    };

    // Handle image change
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'profile') => {
        if (!e.target.files || !e.target.files[0] || !activeBrand || !onUpdateBrandImage) return;
        
        const file = e.target.files[0];
        
        try {
            onUpdateBrandImage(activeBrand.id, type, file);
        } catch (error) {
            console.error('Error updating image:', error);
            alert('Failed to update image');
        }
    };

    // Handle follow brand
    const handleFollowBrandWithAPI = async (brandId: number) => {
        if (!currentUser) {
            alert("Login to follow");
            return;
        }
        
        try {
            onFollowBrand(brandId);
        } catch (error) {
            console.error('Error following brand:', error);
            alert('Failed to follow brand');
        }
    };

    // Handle delete brand
    const handleDeleteBrand = async (brandId: number) => {
        if (!onDeleteBrand || !window.confirm('Are you sure you want to delete this brand? This action cannot be undone.')) {
            return;
        }
        
        try {
            await onDeleteBrand(brandId);
            setView('list');
            setActiveBrandId(null);
        } catch (error) {
            console.error('Error deleting brand:', error);
            alert('Failed to delete brand');
        }
    };

    // Handle verify brand
    const handleVerifyBrand = async (brandId: number) => {
        if (!onVerifyBrand) return;
        
        try {
            await onVerifyBrand(brandId);
            alert(`Brand ${activeBrand?.isVerified ? 'unverified' : 'verified'} successfully!`);
        } catch (error) {
            console.error('Error verifying brand:', error);
            alert('Failed to verify brand');
        }
    };

    // Get brand posts
    const brandPosts = useMemo(() => {
        if (!activeBrand) return [];
        return posts
            .filter(p => p.authorId === activeBrand.id)
            .sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
    }, [posts, activeBrand]);

    if (view === 'list' || !activeBrand) {
        return (
            <div className="w-full max-w-[1000px] mx-auto p-4 font-sans pb-20">
                <div className="flex flex-col gap-4 mb-6 bg-[#242526] p-4 rounded-xl border border-[#3E4042]">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-[#E4E6EB]">Brands & Pages</h2>
                            <p className="text-[#B0B3B8] text-sm">Discover businesses and creators.</p>
                        </div>
                        {currentUser && (
                            <button 
                                onClick={() => setShowCreateModal(true)} 
                                className="bg-[#263951] text-[#F3425F] hover:bg-[#2A3F5A] px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                            >
                                <i className="fas fa-briefcase text-lg"></i> <span>Create Brand</span>
                            </button>
                        )}
                    </div>
                    <div className="relative">
                        <input 
                            type="text" 
                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-2.5 pl-10 text-[#E4E6EB] outline-none focus:border-[#1877F2]" 
                            placeholder="Search Brands..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B3B8]"></i>
                    </div>
                </div>

                {myBrands.length > 0 && !searchQuery && (
                    <div className="mb-8">
                        <h3 className="text-xl font-bold text-[#E4E6EB] mb-3">Pages You Manage</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {myBrands.map(brand => (
                                <div key={brand.id} className="bg-[#242526] rounded-xl overflow-hidden border border-[#3E4042] cursor-pointer hover:shadow-lg transition-all flex flex-col" onClick={() => handleBrandClick(brand.id)}>
                                    <div className="h-32 bg-gray-700 relative">
                                        <img src={brand.coverImage} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="p-4 pt-10 relative">
                                        <div className="absolute -top-8 left-4 rounded-full border-4 border-[#242526] overflow-hidden w-16 h-16 bg-[#3A3B3C]">
                                            <img src={brand.profileImage} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <h4 className="font-bold text-lg text-[#E4E6EB]">{brand.name}</h4>
                                        <p className="text-[#B0B3B8] text-xs">{brand.category} • {brand.followers.length} followers</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <h3 className="text-xl font-bold text-[#E4E6EB] mb-3">{searchQuery ? 'Search Results' : 'Suggested Pages'}</h3>
                    {otherBrands.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {otherBrands.map(brand => (
                                <div key={brand.id} className="bg-[#242526] rounded-xl overflow-hidden border border-[#3E4042] flex flex-col">
                                    <div className="h-32 relative cursor-pointer" onClick={() => handleBrandClick(brand.id)}>
                                        <img src={brand.coverImage} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="p-4 flex flex-col flex-1 relative">
                                        <div className="absolute -top-8 left-4 rounded-full border-4 border-[#242526] overflow-hidden w-16 h-16 bg-[#3A3B3C] cursor-pointer" onClick={() => handleBrandClick(brand.id)}>
                                            <img src={brand.profileImage} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <div className="mt-8">
                                            <h4 className="font-bold text-lg text-[#E4E6EB] hover:underline cursor-pointer" onClick={() => handleBrandClick(brand.id)}>
                                                {brand.name} 
                                                {brand.isVerified && <i className="fas fa-check-circle text-[#1877F2] text-sm ml-1"></i>}
                                            </h4>
                                            <p className="text-[#B0B3B8] text-xs mb-1">{brand.category}</p>
                                            <p className="text-[#B0B3B8] text-sm line-clamp-2 mb-4">{brand.description}</p>
                                            <button 
                                                onClick={() => handleFollowBrandWithAPI(brand.id)} 
                                                className="w-full bg-[#263951] text-[#F3425F] hover:bg-[#2A3F5A] font-bold py-2 rounded-lg transition-colors"
                                            >
                                                {currentUser && brand.followers.includes(currentUser.id) ? 'Following' : 'Follow'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-[#B0B3B8]">No brands found.</p>
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')} 
                                    className="mt-2 text-[#1877F2] hover:underline"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {showCreateModal && currentUser && (
                    <CreateBrandModal 
                        currentUser={currentUser} 
                        onClose={() => setShowCreateModal(false)} 
                        onCreate={handleCreateBrand} 
                    />
                )}
            </div>
        );
    }

    // Brand Detail View
    return (
        <div className="w-full bg-[#18191A] min-h-screen pb-10 font-sans">
            <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'profile')} />
            <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageChange(e, 'cover')} />

            <div className="bg-[#242526] border-b border-[#3E4042] shadow-sm mb-4">
                <div className="max-w-[1100px] mx-auto">
                    <div className="h-[200px] md:h-[350px] relative group bg-[#3A3B3C]">
                        <img src={activeBrand.coverImage} className="w-full h-full object-cover md:rounded-b-xl" alt="Cover" />
                        {isAdmin && (
                            <div className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/20 font-bold text-white text-sm flex items-center gap-2" onClick={() => coverInputRef.current?.click()}>
                                <i className="fas fa-camera"></i> Edit Cover
                            </div>
                        )}
                    </div>
                    <div className="px-4 pb-0">
                        <div className="flex flex-col md:flex-row items-start md:items-end -mt-[40px] md:-mt-[30px] relative z-10 gap-4 mb-4">
                            <div className="relative group">
                                <div className="w-[100px] h-[100px] md:w-[140px] md:h-[140px] rounded-full border-4 border-[#242526] overflow-hidden bg-[#242526]">
                                    <img src={activeBrand.profileImage} className="w-full h-full object-cover" alt="" />
                                </div>
                                {isAdmin && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => profileInputRef.current?.click()}>
                                        <i className="fas fa-camera text-white text-2xl"></i>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 mt-2">
                                <h1 className="text-2xl md:text-3xl font-bold text-[#E4E6EB] leading-tight mb-1 flex items-center gap-2">
                                    {activeBrand.name} 
                                    {activeBrand.isVerified && <i className="fas fa-check-circle text-[#1877F2] text-[20px]"></i>}
                                </h1>
                                <p className="text-[#B0B3B8] font-semibold text-[15px]">
                                    {activeBrand.category} • {activeBrand.location} • {activeBrand.followers.length} followers
                                </p>
                            </div>

                            <div className="flex gap-2 mt-4 md:mt-0 w-full md:w-auto flex-wrap">
                                {isAdmin ? (
                                    <>
                                        <button onClick={() => setShowCreateEventModal(true)} className="bg-[#3A3B3C] text-[#E4E6EB] px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#4E4F50] flex-1 md:flex-none min-w-[100px]">
                                            <i className="fas fa-plus"></i> Event
                                        </button>
                                        <button onClick={() => setShowEditBrandModal(true)} className="bg-[#3A3B3C] text-[#E4E6EB] px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#4E4F50] flex-1 md:flex-none min-w-[100px]">
                                            <i className="fas fa-pen"></i> Edit Page
                                        </button>
                                        {currentUser?.role === 'admin' && (
                                            <button onClick={() => onVerifyBrand && handleVerifyBrand(activeBrand.id)} className="bg-blue-900/50 text-blue-300 px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-800/50 flex-1 md:flex-none min-w-[100px]">
                                                <i className="fas fa-check-circle"></i> {activeBrand.isVerified ? 'Unverify' : 'Verify'}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => handleFollowBrandWithAPI(activeBrand.id)} 
                                            className={`${isFollowing ? 'bg-[#3A3B3C] text-[#E4E6EB]' : 'bg-[#1877F2] text-white'} px-6 py-2 rounded-lg font-bold text-base hover:opacity-90 flex-1 md:flex-none min-w-[120px] transition-colors`}
                                        >
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                        <button 
                                            onClick={() => onMessage && onMessage(activeBrand.id)} 
                                            className="bg-[#3A3B3C] text-[#E4E6EB] px-4 py-2 rounded-lg font-bold text-base hover:bg-[#4E4F50] flex-1 md:flex-none min-w-[120px]"
                                        >
                                            <i className="fab fa-facebook-messenger mr-1"></i> Message
                                        </button>
                                        {activeBrand.contactPhone && (
                                            <a 
                                                href={`tel:${activeBrand.contactPhone}`} 
                                                className="bg-[#25D366] text-white px-4 py-2 rounded-lg font-bold text-base hover:bg-[#20bd5a] flex items-center justify-center gap-2 flex-1 md:flex-none min-w-[120px] no-underline"
                                            >
                                                <i className="fab fa-whatsapp"></i> WhatsApp
                                            </a>
                                        )}
                                    </>
                                )}
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
                            <p>{activeBrand.description || 'No description provided.'}</p>
                            <div className="h-[1px] bg-[#3E4042] w-full my-2"></div>
                            <div className="flex items-center gap-3 text-[#B0B3B8]">
                                <i className="fas fa-info-circle w-5 text-center"></i>
                                <span>{activeBrand.category}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[#B0B3B8]">
                                <i className="fas fa-map-marker-alt w-5 text-center"></i>
                                <span>{activeBrand.location || 'Location not added'}</span>
                            </div>
                            {activeBrand.website && (
                                <div className="flex items-center gap-3 text-[#B0B3B8]">
                                    <i className="fas fa-globe w-5 text-center"></i>
                                    <a 
                                        href={activeBrand.website.startsWith('http') ? activeBrand.website : `https://${activeBrand.website}`} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="text-[#1877F2] hover:underline truncate"
                                    >
                                        {activeBrand.website}
                                    </a>
                                </div>
                            )}
                            {activeBrand.contactEmail && (
                                <div className="flex items-center gap-3 text-[#B0B3B8]">
                                    <i className="fas fa-envelope w-5 text-center"></i>
                                    <span>{activeBrand.contactEmail}</span>
                                </div>
                            )}
                            {isAdmin && (
                                <button 
                                    className="w-full bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] font-semibold py-2 rounded-md transition-colors text-sm mt-2"
                                    onClick={() => setShowEditBrandModal(true)}
                                >
                                    Edit Details
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Stats Widget */}
                    <div className="bg-[#242526] rounded-xl p-4 shadow-sm border border-[#3E4042]">
                        <h2 className="text-xl font-bold text-[#E4E6EB] mb-4">Stats</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 bg-[#3A3B3C] rounded-lg">
                                <div className="text-[#E4E6EB] font-bold text-2xl">{activeBrand.followers.length}</div>
                                <div className="text-[#B0B3B8] text-xs">Followers</div>
                            </div>
                            <div className="text-center p-3 bg-[#3A3B3C] rounded-lg">
                                <div className="text-[#E4E6EB] font-bold text-2xl">{brandPosts.length}</div>
                                <div className="text-[#B0B3B8] text-xs">Posts</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    {activeTab === 'Posts' && (
                        <>
                            {isAdmin && currentUser && (
                                <>
                                    <div className="bg-[#242526] rounded-xl p-3 md:p-4 mb-4 shadow-sm border border-[#3E4042]">
                                        <div className="flex gap-2 mb-3">
                                            <img src={activeBrand.profileImage} alt="" className="w-10 h-10 rounded-full object-cover cursor-pointer border border-[#3E4042]" />
                                            <div 
                                                className="flex-1 bg-[#3A3B3C] rounded-full px-3 md:px-4 py-2 hover:bg-[#4E4F50] cursor-pointer flex items-center transition-colors" 
                                                onClick={() => setShowCreatePostModal(true)}
                                            >
                                                <span className="text-[#B0B3B8] text-[17px] truncate">What new brand idea Today?</span>
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
                                            currentUser={{...currentUser, name: activeBrand.name, profileImage: activeBrand.profileImage} as User} 
                                            users={users} 
                                            onClose={() => setShowCreatePostModal(false)}
                                            onCreatePost={handleCreatePostAsBrand}
                                        />
                                    )}
                                </>
                            )}
                            <div className="space-y-4">
                                {brandPosts.length > 0 ? brandPosts.map(post => (
                                    <Post 
                                        key={post.id}
                                        post={post}
                                        author={{...activeBrand, type: 'brand'}} 
                                        currentUser={currentUser}
                                        users={users} 
                                        onProfileClick={onProfileClick}
                                        onReact={onReact}
                                        onShare={onShare}
                                        onOpenComments={onOpenComments}
                                        onVideoClick={() => {}}
                                        onViewImage={() => {}}
                                        onPlayAudioTrack={onPlayAudioTrack}
                                    />
                                )) : (
                                    <div className="bg-[#242526] rounded-xl p-8 text-center border border-[#3E4042] mx-4 md:mx-0">
                                        <p className="text-[#B0B3B8]">No posts yet.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    {activeTab === 'Photos' && (
                        <div className="bg-[#242526] rounded-xl p-4 border border-[#3E4042] mx-4 md:mx-0">
                            <h2 className="text-xl font-bold text-[#E4E6EB] mb-4">Photos</h2>
                            <div className="grid grid-cols-3 gap-1">
                                {brandPosts
                                    .filter(p => (p.type === 'image' && p.images && p.images.length > 0) || p.image)
                                    .flatMap(p => {
                                        if (p.images && p.images.length > 0) {
                                            return p.images.map((img, idx) => (
                                                <img key={`${p.id}-${idx}`} src={img} className="aspect-square object-cover w-full cursor-pointer hover:opacity-90" alt="" />
                                            ));
                                        } else if (p.image) {
                                            return [<img key={p.id} src={p.image} className="aspect-square object-cover w-full cursor-pointer hover:opacity-90" alt="" />];
                                        }
                                        return [];
                                    })
                                }
                            </div>
                            {brandPosts.filter(p => (p.type === 'image' && (p.images?.length || p.image))).length === 0 && 
                                <p className="text-[#B0B3B8] text-center py-8">No photos available.</p>
                            }
                        </div>
                    )}
                </div>
            </div>

            {showEditBrandModal && activeBrand && (
                <EditBrandModal 
                    brand={activeBrand} 
                    onClose={() => setShowEditBrandModal(false)} 
                    onUpdate={(data) => handleUpdateBrand(activeBrand.id, data)} 
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
    );
};

// PROFESSIONAL EXPORT STATEMENT
export { BrandsPage };
