import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Brand, Post as PostType, User, Event } from '../types';
import Post from './Feed/Post';
import { CreatePostModal } from './Feed';
import { Link } from 'react-router-dom';

interface BrandsPageProps {
    currentUser: User | null;
    brands: Brand[];
    posts: PostType[];
    users: User[];
    onCreateBrand: (brandData: Partial<Brand>) => void;
    onFollowBrand: (brandId: number) => void;
    onProfileClick: (userId: number) => void;
    onPostAsBrand: (
        brandId: number,
        content: string,
        files: File[] | null,
        type: string,
        visibility: string,
        location?: string,
        feeling?: string,
        taggedUsers?: number[],
        background?: string,
        linkPreview?: any
    ) => void;
    onReact: (postId: number, type: any) => void;
    onShare: (postId: number) => void;
    onOpenComments: (postId: number) => void;
    onUpdateBrand: (brandId: number, updates: Partial<Brand>) => void;
    onDeleteBrand: (brandId: number) => void;
    onMessage: (brandId: number) => void;
    onCreateEvent: (brandId: number, eventData: Partial<Event>) => void;
    onUpdateBrandImage: (brandId: number, type: 'cover' | 'profile', file: File) => void;
    onDeletePost: (postId: number) => void;
    onVerifyBrand: (brandId: number) => void;
    initialBrandId?: number | null;
    onPlayAudioTrack?: (track: any) => void;
}

const BrandsPage: React.FC<BrandsPageProps> = ({
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
    onDeletePost,
    onVerifyBrand,
    initialBrandId,
    onPlayAudioTrack
}) => {
    const { t } = useLanguage();
    const [activeBrand, setActiveBrand] = useState<Brand | null>(null);
    const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [selectedBrandForPost, setSelectedBrandForPost] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    // Initialize active brand if initialBrandId is provided
    useEffect(() => {
        if (initialBrandId) {
            const brand = brands.find(b => b.id === initialBrandId);
            if (brand) {
                setActiveBrand(brand);
            }
        }
    }, [initialBrandId, brands]);

    // Filter brands based on search and category
    const filteredBrands = useMemo(() => {
        return brands.filter(brand => {
            const matchesSearch = searchQuery === '' || 
                brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                brand.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                brand.category.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesCategory = categoryFilter === 'all' || brand.category === categoryFilter;
            
            return matchesSearch && matchesCategory;
        });
    }, [brands, searchQuery, categoryFilter]);

    // Get unique categories
    const categories = useMemo(() => {
        const uniqueCategories = new Set(brands.map(brand => brand.category));
        return ['all', ...Array.from(uniqueCategories)];
    }, [brands]);

    // Get brand posts
    const brandPosts = useMemo(() => {
        if (!activeBrand) return [];
        return posts.filter(post => 
            post.authorId === activeBrand.id || post.brandId === activeBrand.id
        );
    }, [posts, activeBrand]);

    // Check if user follows a brand
    const isFollowingBrand = (brandId: number) => {
        if (!currentUser) return false;
        const brand = brands.find(b => b.id === brandId);
        return brand ? brand.followers.includes(currentUser.id) : false;
    };

    // Handle brand creation
    const handleCreateBrand = (brandData: Partial<Brand>) => {
        onCreateBrand(brandData);
        setShowCreateBrandModal(false);
    };

    // Handle posting as brand
    const handlePostAsBrand = (
        content: string,
        files: File[] | null,
        type: string,
        visibility: string,
        location?: string,
        feeling?: string,
        taggedUsers?: number[],
        background?: string,
        linkPreview?: any
    ) => {
        if (!selectedBrandForPost) return;
        
        onPostAsBrand(
            selectedBrandForPost,
            content,
            files,
            type,
            visibility,
            location,
            feeling,
            taggedUsers,
            background,
            linkPreview
        );
        
        setShowCreatePostModal(false);
        setSelectedBrandForPost(null);
    };

    // Handle image upload for brand
    const handleImageUpload = (brandId: number, type: 'cover' | 'profile', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onUpdateBrandImage(brandId, type, file);
        }
    };

    // Render brand card
    const renderBrandCard = (brand: Brand) => {
        const isFollowing = isFollowingBrand(brand.id);
        const isAdmin = currentUser && (brand.adminId === currentUser.id || currentUser.role === 'admin');

        return (
            <div key={brand.id} className="bg-[#242526] rounded-lg p-4 mb-4">
                <div className="flex items-center">
                    <img 
                        src={brand.profileImage} 
                        alt={brand.name}
                        className="w-16 h-16 rounded-full object-cover mr-4 cursor-pointer"
                        onClick={() => setActiveBrand(brand)}
                    />
                    <div className="flex-1">
                        <div className="flex items-center">
                            <h3 
                                className="text-lg font-semibold text-white cursor-pointer hover:underline"
                                onClick={() => setActiveBrand(brand)}
                            >
                                {brand.name}
                            </h3>
                            {brand.isVerified && (
                                <span className="ml-2 text-blue-500" title="Verified">
                                    ✓
                                </span>
                            )}
                        </div>
                        <p className="text-gray-400 text-sm">{brand.category}</p>
                        <p className="text-gray-300 text-sm mt-1 line-clamp-2">
                            {brand.description || 'No description provided.'}
                        </p>
                        <div className="flex items-center mt-2 text-sm text-gray-400">
                            <span>{brand.followers.length} followers</span>
                            <span className="mx-2">•</span>
                            <span>{brand.posts?.length || 0} posts</span>
                        </div>
                    </div>
                </div>
                
                <div className="mt-4 flex space-x-2">
                    {currentUser && (
                        <>
                            <button
                                onClick={() => onFollowBrand(brand.id)}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                                    isFollowing 
                                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                            
                            {isAdmin && (
                                <button
                                    onClick={() => {
                                        setSelectedBrandForPost(brand.id);
                                        setShowCreatePostModal(true);
                                    }}
                                    className="flex-1 py-2 px-4 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700"
                                >
                                    Post as Brand
                                </button>
                            )}
                        </>
                    )}
                    
                    <button
                        onClick={() => setActiveBrand(brand)}
                        className="flex-1 py-2 px-4 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600"
                    >
                        View Page
                    </button>
                </div>
            </div>
        );
    };

    // Render brand detail view
    const renderBrandDetail = () => {
        if (!activeBrand) return null;

        const isFollowing = isFollowingBrand(activeBrand.id);
        const isAdmin = currentUser && (activeBrand.adminId === currentUser.id || currentUser.role === 'admin');
        const brandAdmin = users.find(u => u.id === activeBrand.adminId);

        return (
            <div className="bg-[#242526] rounded-lg overflow-hidden">
                {/* Brand Cover Image */}
                <div className="relative h-64">
                    <img 
                        src={activeBrand.coverImage} 
                        alt={`${activeBrand.name} cover`}
                        className="w-full h-full object-cover"
                    />
                    {isAdmin && (
                        <div className="absolute top-4 right-4">
                            <label className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-lg cursor-pointer hover:bg-opacity-70">
                                Change Cover
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleImageUpload(activeBrand.id, 'cover', e)}
                                />
                            </label>
                        </div>
                    )}
                </div>

                {/* Brand Profile Section */}
                <div className="px-8 pb-6">
                    <div className="flex items-end -mt-16 mb-6">
                        <div className="relative">
                            <img 
                                src={activeBrand.profileImage} 
                                alt={activeBrand.name}
                                className="w-32 h-32 rounded-full border-4 border-[#242526] object-cover"
                            />
                            {isAdmin && (
                                <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                                    📷
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImageUpload(activeBrand.id, 'profile', e)}
                                    />
                                </label>
                            )}
                        </div>
                        
                        <div className="ml-6 flex-1">
                            <div className="flex items-center">
                                <h1 className="text-3xl font-bold text-white">{activeBrand.name}</h1>
                                {activeBrand.isVerified && (
                                    <span className="ml-3 text-blue-500 text-2xl" title="Verified">
                                        ✓
                                    </span>
                                )}
                                {currentUser?.role === 'admin' && (
                                    <button
                                        onClick={() => onVerifyBrand(activeBrand.id)}
                                        className="ml-3 bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-yellow-700"
                                    >
                                        {activeBrand.isVerified ? 'Unverify' : 'Verify'}
                                    </button>
                                )}
                            </div>
                            
                            <p className="text-gray-400 mt-1">{activeBrand.category}</p>
                            <p className="text-gray-300 mt-3">{activeBrand.description}</p>
                            
                            <div className="flex items-center mt-4 text-gray-400">
                                {activeBrand.location && (
                                    <span className="flex items-center mr-6">
                                        📍 {activeBrand.location}
                                    </span>
                                )}
                                {activeBrand.website && (
                                    <a 
                                        href={activeBrand.website} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center mr-6 text-blue-400 hover:underline"
                                    >
                                        🌐 Website
                                    </a>
                                )}
                                {brandAdmin && (
                                    <span className="flex items-center">
                                        👑 Admin: 
                                        <span 
                                            className="ml-1 text-white cursor-pointer hover:underline"
                                            onClick={() => onProfileClick(brandAdmin.id)}
                                        >
                                            {brandAdmin.name}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex space-x-3">
                            {currentUser && (
                                <>
                                    <button
                                        onClick={() => onFollowBrand(activeBrand.id)}
                                        className={`px-6 py-2 rounded-lg font-medium ${
                                            isFollowing 
                                                ? 'bg-gray-700 text-white hover:bg-gray-600'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                    >
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                    
                                    {isAdmin && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setSelectedBrandForPost(activeBrand.id);
                                                    setShowCreatePostModal(true);
                                                }}
                                                className="px-6 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700"
                                            >
                                                Create Post
                                            </button>
                                            
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`Are you sure you want to delete "${activeBrand.name}"?`)) {
                                                        onDeleteBrand(activeBrand.id);
                                                        setActiveBrand(null);
                                                    }
                                                }}
                                                className="px-6 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700"
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </>
                            )}
                            
                            <button
                                onClick={() => onMessage(activeBrand.id)}
                                className="px-6 py-2 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600"
                            >
                                Message
                            </button>
                        </div>
                    </div>

                    {/* Brand Stats */}
                    <div className="flex border-t border-gray-700 pt-6 mt-6">
                        <div className="text-center px-8">
                            <div className="text-2xl font-bold text-white">{activeBrand.followers.length}</div>
                            <div className="text-gray-400">Followers</div>
                        </div>
                        <div className="text-center px-8 border-l border-r border-gray-700">
                            <div className="text-2xl font-bold text-white">{brandPosts.length}</div>
                            <div className="text-gray-400">Posts</div>
                        </div>
                        <div className="text-center px-8">
                            <div className="text-2xl font-bold text-white">
                                {activeBrand.posts?.length || 0}
                            </div>
                            <div className="text-gray-400">Total Posts</div>
                        </div>
                    </div>
                </div>

                {/* Brand Posts */}
                <div className="px-8 pb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Recent Posts</h2>
                    
                    {brandPosts.length > 0 ? (
                        <div className="space-y-6">
                            {brandPosts.map(post => {
                                const author = users.find(u => u.id === post.authorId);
                                if (!author) return null;
                                
                                return (
                                    <Post
                                        key={post.id}
                                        post={post}
                                        author={author}
                                        currentUser={currentUser}
                                        users={users}
                                        onProfileClick={onProfileClick}
                                        onReact={onReact}
                                        onShare={onShare}
                                        onViewImage={() => {}}
                                        onOpenComments={onOpenComments}
                                        onVideoClick={() => {}}
                                        onViewProduct={() => {}}
                                        onPlayAudioTrack={onPlayAudioTrack}
                                        onFollow={onFollowBrand}
                                        isFollowing={isFollowing}
                                        onHashtagClick={() => {}}
                                        onDeletePost={onDeletePost}
                                        isAdmin={currentUser?.role === 'admin'}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="text-gray-400 text-lg mb-4">No posts yet</div>
                            {isAdmin && (
                                <button
                                    onClick={() => {
                                        setSelectedBrandForPost(activeBrand.id);
                                        setShowCreatePostModal(true);
                                    }}
                                    className="px-6 py-3 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700"
                                >
                                    Create First Post
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Simple Create Brand Modal
    const renderCreateBrandModal = () => {
        if (!showCreateBrandModal) return null;

        const [formData, setFormData] = useState({
            name: '',
            category: 'Business',
            description: '',
            location: '',
            website: '',
            contactEmail: '',
            contactPhone: ''
        });

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (formData.name.trim()) {
                handleCreateBrand(formData);
            }
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-[#242526] rounded-lg p-6 w-full max-w-md">
                    <h2 className="text-2xl font-bold text-white mb-4">Create Brand Page</h2>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-300 mb-2">Brand Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full bg-[#3A3B3C] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-300 mb-2">Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                                    className="w-full bg-[#3A3B3C] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="Business">Business</option>
                                    <option value="Entertainment">Entertainment</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Food & Beverage">Food & Beverage</option>
                                    <option value="Fashion">Fashion</option>
                                    <option value="Education">Education</option>
                                    <option value="Health">Health</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-gray-300 mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    className="w-full bg-[#3A3B3C] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-300 mb-2">Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                                    className="w-full bg-[#3A3B3C] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setShowCreateBrandModal(false)}
                                className="px-6 py-2 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Create Brand
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#18191A] text-white p-4 md:p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Brands</h1>
                <p className="text-gray-400 mt-2">Discover and follow your favorite brand pages</p>
                
                {currentUser && (
                    <button
                        onClick={() => setShowCreateBrandModal(true)}
                        className="mt-4 px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
                    >
                        + Create Brand Page
                    </button>
                )}
            </div>

            {/* Search and Filter */}
            <div className="mb-8 bg-[#242526] rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search brands..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#3A3B3C] text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    
                    <div className="flex space-x-2 overflow-x-auto">
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setCategoryFilter(category)}
                                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                                    categoryFilter === category
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-[#3A3B3C] text-gray-300 hover:bg-[#4A4B4C]'
                                }`}
                            >
                                {category === 'all' ? 'All Categories' : category}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Brands List */}
                <div className={`${activeBrand ? 'lg:w-1/3' : 'w-full'}`}>
                    <h2 className="text-xl font-bold mb-4">
                        {filteredBrands.length} {filteredBrands.length === 1 ? 'Brand' : 'Brands'}
                    </h2>
                    
                    {filteredBrands.length > 0 ? (
                        <div>
                            {filteredBrands.map(renderBrandCard)}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-[#242526] rounded-lg">
                            <div className="text-gray-400 text-lg mb-4">No brands found</div>
                            {currentUser && (
                                <button
                                    onClick={() => setShowCreateBrandModal(true)}
                                    className="px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    Create First Brand
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Brand Detail View */}
                {activeBrand && (
                    <div className="lg:w-2/3">
                        <div className="mb-4">
                            <button
                                onClick={() => setActiveBrand(null)}
                                className="text-blue-400 hover:text-blue-300 flex items-center"
                            >
                                ← Back to Brands
                            </button>
                        </div>
                        {renderBrandDetail()}
                    </div>
                )}
            </div>

            {/* Modals */}
            {renderCreateBrandModal()}
            
            {showCreatePostModal && currentUser && selectedBrandForPost && (
                <CreatePostModal
                    currentUser={currentUser}
                    users={users}
                    onClose={() => {
                        setShowCreatePostModal(false);
                        setSelectedBrandForPost(null);
                    }}
                    onCreatePost={handlePostAsBrand}
                    isBrandPost={true}
                    brandName={brands.find(b => b.id === selectedBrandForPost)?.name}
                />
            )}
        </div>
    );
};

export default BrandsPage;
