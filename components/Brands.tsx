import React, { useState, useEffect, useRef } from 'react';
import { User, Post as PostType, Brand, Comment, ReactionType } from '../types';
import { Post } from './Feed/Post';
import { CreatePostModal } from './Feed/CreatePostModal';
import { CommentsSheet } from './Feed/CommentsSheet';

// Helper to generate brand URL slug
const generateBrandSlug = (brand: Brand) => {
    return `${brand.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${brand.id}`;
};

// Helper to generate canonical URL for brand
const generateBrandCanonicalUrl = (brand: Brand) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/brand/${generateBrandSlug(brand)}`;
};

// Helper to generate canonical URL for posts
const generatePostCanonicalUrl = (post: PostType) => {
    const baseUrl = window.location.origin;
    
    // Create a slug from post content or ID
    let slug = '';
    if (post.content && post.content.length > 0) {
        slug = post.content
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 60);
    }
    
    return slug 
        ? `${baseUrl}/post/${slug}-${post.id}`
        : `${baseUrl}/post/${post.id}`;
};

// Generate Brand Schema for SEO
const generateBrandSchema = (brand: Brand, posts: PostType[]) => {
    const canonicalUrl = generateBrandCanonicalUrl(brand);
    
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${canonicalUrl}#brand`,
        "name": brand.name,
        "description": brand.description || `${brand.name} on unera.social - Follow for updates, products, and community engagement.`,
        "url": canonicalUrl,
        "logo": brand.profileImage,
        "image": brand.coverImage,
        "sameAs": brand.website ? [brand.website] : [],
        "contactPoint": {
            "@type": "ContactPoint",
            "telephone": brand.contactPhone,
            "contactType": "customer service",
            "email": brand.contactEmail,
            "areaServed": brand.location || "Worldwide"
        },
        "address": {
            "@type": "PostalAddress",
            "addressLocality": brand.location
        },
        "foundingDate": new Date(brand.createdAt).toISOString().split('T')[0],
        "knowsAbout": brand.category,
        "numberOfEmployees": {
            "@type": "QuantitativeValue",
            "value": "1"
        },
        "interactionStatistic": [
            {
                "@type": "InteractionCounter",
                "interactionType": "https://schema.org/FollowAction",
                "userInteractionCount": brand.followers?.length || 0
            },
            {
                "@type": "InteractionCounter",
                "interactionType": "https://schema.org/PostAction",
                "userInteractionCount": posts.length
            }
        ]
    };
};

// Generate Post Schema for SEO
const generatePostSchema = (post: PostType, author: any, comments: Comment[]) => {
    const canonicalUrl = generatePostCanonicalUrl(post);
    
    const postSchema: any = {
        "@context": "https://schema.org",
        "@type": "SocialMediaPosting",
        "@id": `${canonicalUrl}#post`,
        "headline": post.content?.substring(0, 100) || "Post on unera.social",
        "description": post.content?.substring(0, 300) || "Social media post",
        "url": canonicalUrl,
        "datePublished": new Date(post.createdAt).toISOString(),
        "dateModified": new Date(post.createdAt).toISOString(),
        "author": {
            "@type": author?.type === 'brand' ? "Organization" : "Person",
            "name": author?.name || "Unknown",
            "url": author?.type === 'brand' ? generateBrandCanonicalUrl(author) : `${window.location.origin}/@${author?.id}`
        },
        "interactionStatistic": [
            {
                "@type": "InteractionCounter",
                "interactionType": "https://schema.org/LikeAction",
                "userInteractionCount": post.reactions?.length || 0
            },
            {
                "@type": "InteractionCounter",
                "interactionType": "https://schema.org/ShareAction",
                "userInteractionCount": post.shares || 0
            },
            {
                "@type": "InteractionCounter",
                "interactionType": "https://schema.org/CommentAction",
                "userInteractionCount": comments?.length || 0
            }
        ]
    };
    
    // Add image if exists
    if (post.image) {
        postSchema.image = post.image;
    }
    
    // Add video if exists
    if (post.video) {
        postSchema.video = {
            "@type": "VideoObject",
            "contentUrl": post.video,
            "embedUrl": post.video,
            "uploadDate": new Date(post.createdAt).toISOString()
        };
    }
    
    // Add audio if exists
    if (post.audioTrack) {
        postSchema.audio = {
            "@type": "AudioObject",
            "contentUrl": post.audioTrack.url,
            "name": post.audioTrack.title,
            "description": post.audioTrack.artist,
            "duration": `PT${Math.floor(post.audioTrack.duration / 60)}M${post.audioTrack.duration % 60}S`
        };
    }
    
    return postSchema;
};

// Generate Article Schema for text-based posts
const generateArticleSchema = (post: PostType, author: any) => {
    const canonicalUrl = generatePostCanonicalUrl(post);
    
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.content?.substring(0, 100) || "Article on unera.social",
        "description": post.content?.substring(0, 300) || "Read this article on unera.social",
        "url": canonicalUrl,
        "datePublished": new Date(post.createdAt).toISOString(),
        "dateModified": new Date(post.createdAt).toISOString(),
        "author": {
            "@type": author?.type === 'brand' ? "Organization" : "Person",
            "name": author?.name || "Unknown"
        },
        "publisher": {
            "@type": "Organization",
            "name": "unera.social",
            "logo": {
                "@type": "ImageObject",
                "url": "https://unera.social/logo.png"
            }
        },
        "articleBody": post.content || ""
    };
};

// Generate Breadcrumb Schema
const generateBreadcrumbSchema = (brand?: Brand, post?: PostType) => {
    const baseUrl = window.location.origin;
    
    const items = [
        {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": `${baseUrl}`
        }
    ];
    
    if (brand) {
        items.push({
            "@type": "ListItem",
            "position": 2,
            "name": "Brands",
            "item": `${baseUrl}/brands`
        });
        
        items.push({
            "@type": "ListItem",
            "position": 3,
            "name": brand.name,
            "item": generateBrandCanonicalUrl(brand)
        });
        
        if (post) {
            items.push({
                "@type": "ListItem",
                "position": 4,
                "name": "Post",
                "item": generatePostCanonicalUrl(post)
            });
        }
    } else {
        items.push({
            "@type": "ListItem",
            "position": 2,
            "name": "Brands Directory",
            "item": `${baseUrl}/brands`
        });
    }
    
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items
    };
};

// SEO Manager Component (integrated into Brands.tsx)
const BrandSEOManager: React.FC<{
    brand?: Brand;
    post?: PostType;
    posts?: PostType[];
    isBrandPage?: boolean;
    isPostPage?: boolean;
}> = ({ brand, post, posts = [], isBrandPage = false, isPostPage = false }) => {
    useEffect(() => {
        if (!brand && !post) return;
        
        const originalTitle = document.title;
        const originalDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        
        // Update page title
        if (isBrandPage && brand) {
            document.title = `${brand.name} - Brand Page | unera.social`;
            
            // Update meta description
            let description = brand.description || `${brand.name} on unera.social. Follow for updates and community engagement.`;
            if (description.length > 155) {
                description = description.substring(0, 155) + '...';
            }
            
            // Update or create description meta tag
            let metaDescription = document.querySelector('meta[name="description"]');
            if (!metaDescription) {
                metaDescription = document.createElement('meta');
                metaDescription.setAttribute('name', 'description');
                document.head.appendChild(metaDescription);
            }
            metaDescription.setAttribute('content', description);
            
            // Update Open Graph tags
            const ogTags = [
                { property: 'og:title', content: `${brand.name} - Brand Page | unera.social` },
                { property: 'og:description', content: description },
                { property: 'og:image', content: brand.profileImage || brand.coverImage || 'https://unera.social/default-brand.jpg' },
                { property: 'og:url', content: window.location.href },
                { property: 'og:type', content: 'profile' },
                { property: 'og:site_name', content: 'unera.social' },
            ];
            
            ogTags.forEach(tag => {
                let element = document.querySelector(`meta[property="${tag.property}"]`);
                if (!element) {
                    element = document.createElement('meta');
                    element.setAttribute('property', tag.property);
                    document.head.appendChild(element);
                }
                element.setAttribute('content', tag.content);
            });
            
            // Update Twitter Card tags
            const twitterTags = [
                { name: 'twitter:card', content: 'summary_large_image' },
                { name: 'twitter:title', content: `${brand.name} - Brand Page | unera.social` },
                { name: 'twitter:description', content: description },
                { name: 'twitter:image', content: brand.profileImage || brand.coverImage || 'https://unera.social/default-brand.jpg' },
                { name: 'twitter:site', content: '@unerasocial' },
            ];
            
            twitterTags.forEach(tag => {
                let element = document.querySelector(`meta[name="${tag.name}"]`);
                if (!element) {
                    element = document.createElement('meta');
                    element.setAttribute('name', tag.name);
                    document.head.appendChild(element);
                }
                element.setAttribute('content', tag.content);
            });
            
        } else if (isPostPage && post && brand) {
            // For individual post pages
            const postTitle = post.content?.substring(0, 60) || 'Post';
            document.title = `${postTitle} - ${brand.name} | unera.social`;
            
            let description = post.content?.substring(0, 155) || `Post by ${brand.name} on unera.social`;
            if (description.length > 155) {
                description = description.substring(0, 155) + '...';
            }
            
            // Update meta description
            let metaDescription = document.querySelector('meta[name="description"]');
            if (!metaDescription) {
                metaDescription = document.createElement('meta');
                metaDescription.setAttribute('name', 'description');
                document.head.appendChild(metaDescription);
            }
            metaDescription.setAttribute('content', description);
            
            // Update Open Graph tags for post
            const ogImage = post.image || brand.profileImage || 'https://unera.social/default-post.jpg';
            const ogTags = [
                { property: 'og:title', content: `${postTitle} - ${brand.name}` },
                { property: 'og:description', content: description },
                { property: 'og:image', content: ogImage },
                { property: 'og:url', content: window.location.href },
                { property: 'og:type', content: 'article' },
                { property: 'og:site_name', content: 'unera.social' },
            ];
            
            ogTags.forEach(tag => {
                let element = document.querySelector(`meta[property="${tag.property}"]`);
                if (!element) {
                    element = document.createElement('meta');
                    element.setAttribute('property', tag.property);
                    document.head.appendChild(element);
                }
                element.setAttribute('content', tag.content);
            });
        }
        
        // Add canonical URL
        let canonicalUrl = '';
        if (isBrandPage && brand) {
            canonicalUrl = generateBrandCanonicalUrl(brand);
        } else if (isPostPage && post) {
            canonicalUrl = generatePostCanonicalUrl(post);
        }
        
        if (canonicalUrl) {
            // Remove existing canonical link
            const existingLink = document.querySelector('link[rel="canonical"]');
            if (existingLink) {
                document.head.removeChild(existingLink);
            }
            
            // Add new canonical link
            const link = document.createElement('link');
            link.rel = 'canonical';
            link.href = canonicalUrl;
            document.head.appendChild(link);
        }
        
        // Cleanup function
        return () => {
            document.title = originalTitle;
            
            // Restore original description
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
                metaDescription.setAttribute('content', originalDescription);
            }
            
            // Remove canonical link
            const canonicalLink = document.querySelector('link[rel="canonical"]');
            if (canonicalLink) {
                document.head.removeChild(canonicalLink);
            }
            
            // Note: We're not removing OG and Twitter tags as they might be used by other components
            // In a production app, you'd want to manage these more carefully
        };
    }, [brand, post, isBrandPage, isPostPage]);
    
    // Render JSON-LD schemas
    const renderSchemas = () => {
        const schemas = [];
        
        // Always add breadcrumb schema
        schemas.push(
            <script
                key="breadcrumb"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(generateBreadcrumbSchema(brand, post)) }}
            />
        );
        
        // Add brand schema if on brand page
        if (isBrandPage && brand) {
            const brandPosts = posts.filter(p => p.authorId === brand.id);
            schemas.push(
                <script
                    key="brand"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(generateBrandSchema(brand, brandPosts)) }}
                />
            );
            
            // Add schemas for recent posts (Google likes individual post schemas)
            const recentPosts = brandPosts.slice(0, 10); // Limit to 10 recent posts
            recentPosts.forEach((postItem, index) => {
                const author = { ...brand, type: 'brand' as const };
                schemas.push(
                    <script
                        key={`post-${postItem.id}`}
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{ 
                            __html: JSON.stringify(
                                postItem.type === 'text' || !postItem.type
                                    ? generateArticleSchema(postItem, author)
                                    : generatePostSchema(postItem, author, postItem.comments || [])
                            )
                        }}
                    />
                );
            });
        }
        
        // Add post schema if on individual post page
        if (isPostPage && post && brand) {
            const author = { ...brand, type: 'brand' as const };
            schemas.push(
                <script
                    key="individual-post"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ 
                        __html: JSON.stringify(
                            post.type === 'text' || !post.type
                                ? generateArticleSchema(post, author)
                                : generatePostSchema(post, author, post.comments || [])
                        )
                    }}
                />
            );
        }
        
        return schemas;
    };
    
    return <>{renderSchemas()}</>;
};

interface BrandsPageProps {
    currentUser: User | null;
    brands: Brand[];
    posts: PostType[];
    users: User[];
    onCreateBrand: (brandData: Partial<Brand>) => void;
    onFollowBrand: (brandId: number) => void;
    onProfileClick: (userId: number) => void;
    onPostAsBrand: (brandId: number, content: any) => void;
    onReact: (postId: number, type: ReactionType) => void;
    onShare: (postId: number) => void;
    onOpenComments: (postId: number) => void;
    onUpdateBrand: (brandId: number, data: Partial<Brand>) => void;
    onDeleteBrand: (brandId: number) => void;
    onMessage: (brandId: number) => void;
    onCreateEvent: (brandId: number, eventData: any) => void;
    onUpdateBrandImage?: (brandId: number, type: 'cover' | 'profile', file: File) => void;
    onDeletePost?: (postId: number) => void;
    onVerifyBrand?: (brandId: number) => void;
    initialBrandId?: number | null;
    onPlayAudioTrack?: (track: any) => void;
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
    onDeletePost,
    onVerifyBrand,
    initialBrandId = null,
    onPlayAudioTrack
}) => {
    const [activeBrandId, setActiveBrandId] = useState<number | null>(initialBrandId);
    const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
    const [showPostModal, setShowPostModal] = useState(false);
    const [selectedBrandForPost, setSelectedBrandForPost] = useState<number | null>(null);
    const [activeCommentsPostId, setActiveCommentsPostId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    // Brand creation form state
    const [newBrandName, setNewBrandName] = useState('');
    const [newBrandCategory, setNewBrandCategory] = useState('');
    const [newBrandDescription, setNewBrandDescription] = useState('');
    const [newBrandLocation, setNewBrandLocation] = useState('');
    const [newBrandWebsite, setNewBrandWebsite] = useState('');
    const [newBrandContactEmail, setNewBrandContactEmail] = useState('');
    const [newBrandContactPhone, setNewBrandContactPhone] = useState('');
    
    const activeBrand = activeBrandId ? brands.find(b => b.id === activeBrandId) : null;
    const brandPosts = activeBrand ? posts.filter(p => p.authorId === activeBrand.id) : [];
    
    // Filter brands based on search and category
    const filteredBrands = brands.filter(brand => {
        if (searchQuery && !brand.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        if (selectedCategory !== 'all' && brand.category !== selectedCategory) {
            return false;
        }
        return true;
    });
    
    // Handle brand creation
    const handleCreateBrand = () => {
        if (!newBrandName.trim()) {
            alert('Please enter a brand name');
            return;
        }
        
        onCreateBrand({
            name: newBrandName,
            category: newBrandCategory || 'Business',
            description: newBrandDescription,
            location: newBrandLocation,
            website: newBrandWebsite,
            contactEmail: newBrandContactEmail,
            contactPhone: newBrandContactPhone
        });
        
        setShowCreateBrandModal(false);
        resetBrandForm();
    };
    
    const resetBrandForm = () => {
        setNewBrandName('');
        setNewBrandCategory('');
        setNewBrandDescription('');
        setNewBrandLocation('');
        setNewBrandWebsite('');
        setNewBrandContactEmail('');
        setNewBrandContactPhone('');
    };
    
    // Get unique categories from brands
    const brandCategories = Array.from(new Set(brands.map(b => b.category))).filter(Boolean);
    
    // Update URL when brand is selected
    useEffect(() => {
        if (activeBrand && typeof window !== 'undefined') {
            const slug = generateBrandSlug(activeBrand);
            window.history.pushState({}, '', `/brand/${slug}`);
        }
    }, [activeBrand]);
    
    // Handle back to brands list
    const handleBackToList = () => {
        setActiveBrandId(null);
        if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/brands');
        }
    };
    
    // Generate sitemap URLs for all brands (for SEO purposes)
    const generateBrandSitemapData = () => {
        return brands.map(brand => ({
            url: generateBrandCanonicalUrl(brand),
            lastModified: new Date(brand.createdAt).toISOString(),
            changeFrequency: 'weekly' as const,
            priority: 0.7
        }));
    };
    
    // Generate sitemap URLs for all brand posts
    const generatePostSitemapData = () => {
        const postUrls: Array<{
            url: string;
            lastModified: string;
            changeFrequency: 'daily' | 'weekly' | 'monthly';
            priority: number;
        }> = [];
        
        brands.forEach(brand => {
            const brandPosts = posts.filter(p => p.authorId === brand.id);
            brandPosts.forEach(post => {
                postUrls.push({
                    url: generatePostCanonicalUrl(post),
                    lastModified: new Date(post.createdAt).toISOString(),
                    changeFrequency: 'monthly',
                    priority: 0.5
                });
            });
        });
        
        return postUrls;
    };
    
    // Render the main component
    return (
        <>
            {/* SEO Manager */}
            <BrandSEOManager
                brand={activeBrand || undefined}
                posts={brandPosts}
                isBrandPage={!!activeBrand}
            />
            
            {/* Hidden SEO data for sitemap generation */}
            <div className="hidden" aria-hidden="true">
                <h1>Brands Directory - unera.social</h1>
                <p>Discover and follow brands on unera.social. Connect with businesses, creators, and communities.</p>
                {activeBrand && (
                    <>
                        <h2>{activeBrand.name} - Brand Page</h2>
                        <p>{activeBrand.description || `Follow ${activeBrand.name} for updates`}</p>
                    </>
                )}
                <div data-sitemap-brands={JSON.stringify(generateBrandSitemapData())}></div>
                <div data-sitemap-posts={JSON.stringify(generatePostSitemapData())}></div>
            </div>
            
            <div className="min-h-screen bg-[#18191A] text-white">
                {!activeBrand ? (
                    // Brands Directory View
                    <div className="max-w-7xl mx-auto px-4 py-8">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold">Brands Directory</h1>
                                <p className="text-gray-400 mt-2">Discover and follow brands on unera.social</p>
                            </div>
                            <button
                                onClick={() => setShowCreateBrandModal(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
                            >
                                <i className="fas fa-plus"></i> Create Brand Page
                            </button>
                        </div>
                        
                        {/* Search and Filter */}
                        <div className="bg-[#242526] rounded-xl p-4 mb-8">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="relative">
                                        <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                        <input
                                            type="text"
                                            placeholder="Search brands..."
                                            className="w-full bg-[#3A3B3C] border border-[#4E4F50] rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <select
                                        className="bg-[#3A3B3C] border border-[#4E4F50] rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                    >
                                        <option value="all">All Categories</option>
                                        {brandCategories.map(category => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                    <div className="flex bg-[#3A3B3C] rounded-lg overflow-hidden">
                                        <button
                                            className={`px-4 py-3 ${viewMode === 'grid' ? 'bg-blue-600' : 'hover:bg-[#4E4F50]'}`}
                                            onClick={() => setViewMode('grid')}
                                        >
                                            <i className="fas fa-th-large"></i>
                                        </button>
                                        <button
                                            className={`px-4 py-3 ${viewMode === 'list' ? 'bg-blue-600' : 'hover:bg-[#4E4F50]'}`}
                                            onClick={() => setViewMode('list')}
                                        >
                                            <i className="fas fa-list"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Brands Grid/List */}
                        {filteredBrands.length > 0 ? (
                            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                                {filteredBrands.map(brand => (
                                    <div
                                        key={brand.id}
                                        className={`bg-[#242526] rounded-xl overflow-hidden cursor-pointer hover:shadow-2xl transition-all ${viewMode === 'list' ? 'flex' : ''}`}
                                        onClick={() => setActiveBrandId(brand.id)}
                                    >
                                        <div className={`relative ${viewMode === 'list' ? 'w-32 flex-shrink-0' : 'h-48'}`}>
                                            <img
                                                src={brand.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'}
                                                alt={`${brand.name} cover`}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute -bottom-6 left-6">
                                                <img
                                                    src={brand.profileImage || `https://ui-avatars.com/api/?name=${brand.name}&background=random&size=150`}
                                                    alt={brand.name}
                                                    className="w-20 h-20 rounded-full border-4 border-[#242526] object-cover"
                                                />
                                            </div>
                                        </div>
                                        <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : 'pt-10'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-xl font-bold">{brand.name}</h3>
                                                        {brand.isVerified && (
                                                            <i className="fas fa-check-circle text-blue-500"></i>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-400 text-sm mt-1">{brand.category}</p>
                                                    <p className="text-gray-300 mt-2 line-clamp-2">
                                                        {brand.description || 'No description provided'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onFollowBrand(brand.id);
                                                    }}
                                                    className={`px-4 py-2 rounded-lg font-semibold ${currentUser && brand.followers?.includes(currentUser.id) ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                >
                                                    {currentUser && brand.followers?.includes(currentUser.id) ? 'Following' : 'Follow'}
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                                                <span>
                                                    <i className="fas fa-users mr-1"></i>
                                                    {brand.followers?.length || 0} followers
                                                </span>
                                                <span>
                                                    <i className="fas fa-map-marker-alt mr-1"></i>
                                                    {brand.location || 'Online'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <i className="fas fa-building text-6xl text-gray-600 mb-4"></i>
                                <h3 className="text-xl font-bold mb-2">No brands found</h3>
                                <p className="text-gray-400 mb-6">Try adjusting your search or create a new brand</p>
                                <button
                                    onClick={() => setShowCreateBrandModal(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                                >
                                    Create First Brand
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    // Single Brand View
                    <div className="max-w-4xl mx-auto px-4 py-8">
                        <button
                            onClick={handleBackToList}
                            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
                        >
                            <i className="fas fa-arrow-left"></i>
                            Back to Brands
                        </button>
                        
                        {/* Brand Header */}
                        <div className="bg-[#242526] rounded-xl overflow-hidden mb-8">
                            <div className="relative h-64">
                                <img
                                    src={activeBrand.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&q=80'}
                                    alt={`${activeBrand.name} cover`}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                                    <div className="flex items-end gap-6">
                                        <img
                                            src={activeBrand.profileImage || `https://ui-avatars.com/api/?name=${activeBrand.name}&background=random&size=150`}
                                            alt={activeBrand.name}
                                            className="w-32 h-32 rounded-full border-4 border-white object-cover"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h1 className="text-3xl font-bold">{activeBrand.name}</h1>
                                                {activeBrand.isVerified && (
                                                    <i className="fas fa-check-circle text-blue-500 text-2xl"></i>
                                                )}
                                            </div>
                                            <p className="text-gray-300">{activeBrand.category}</p>
                                            <div className="flex items-center gap-4 mt-4">
                                                <button
                                                    onClick={() => onFollowBrand(activeBrand.id)}
                                                    className={`px-6 py-2 rounded-lg font-semibold ${currentUser && activeBrand.followers?.includes(currentUser.id) ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                >
                                                    {currentUser && activeBrand.followers?.includes(currentUser.id) ? 'Following' : 'Follow'}
                                                </button>
                                                <button
                                                    onClick={() => onMessage(activeBrand.id)}
                                                    className="px-6 py-2 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600"
                                                >
                                                    Message
                                                </button>
                                                {currentUser && (currentUser.role === 'admin' || currentUser.id === activeBrand.adminId) && (
                                                    <button
                                                        onClick={() => setSelectedBrandForPost(activeBrand.id)}
                                                        className="px-6 py-2 rounded-lg font-semibold bg-green-600 hover:bg-green-700"
                                                    >
                                                        <i className="fas fa-plus mr-2"></i>
                                                        Create Post
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Brand Info */}
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-xl font-bold mb-4">About</h3>
                                        <p className="text-gray-300 whitespace-pre-wrap">
                                            {activeBrand.description || 'No description provided.'}
                                        </p>
                                        <div className="flex flex-wrap gap-4 mt-6">
                                            {activeBrand.website && (
                                                <a
                                                    href={activeBrand.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                                                >
                                                    <i className="fas fa-globe"></i>
                                                    Website
                                                </a>
                                            )}
                                            {activeBrand.location && (
                                                <div className="flex items-center gap-2 text-gray-400">
                                                    <i className="fas fa-map-marker-alt"></i>
                                                    {activeBrand.location}
                                                </div>
                                            )}
                                            {activeBrand.contactEmail && (
                                                <div className="flex items-center gap-2 text-gray-400">
                                                    <i className="fas fa-envelope"></i>
                                                    {activeBrand.contactEmail}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-4">Brand Stats</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-[#3A3B3C] rounded-lg p-4 text-center">
                                                <div className="text-2xl font-bold">{activeBrand.followers?.length || 0}</div>
                                                <div className="text-gray-400 text-sm">Followers</div>
                                            </div>
                                            <div className="bg-[#3A3B3C] rounded-lg p-4 text-center">
                                                <div className="text-2xl font-bold">{brandPosts.length}</div>
                                                <div className="text-gray-400 text-sm">Posts</div>
                                            </div>
                                        </div>
                                        <div className="mt-6">
                                            <h4 className="font-bold mb-2">Admin Actions</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {currentUser && (currentUser.role === 'admin' || currentUser.id === activeBrand.adminId) && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                // Open edit modal
                                                                const newName = prompt('Enter new brand name:', activeBrand.name);
                                                                if (newName) {
                                                                    onUpdateBrand(activeBrand.id, { name: newName });
                                                                }
                                                            }}
                                                            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedBrandForPost(activeBrand.id)}
                                                            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                                                        >
                                                            Post
                                                        </button>
                                                    </>
                                                )}
                                                {currentUser?.role === 'admin' && onVerifyBrand && (
                                                    <button
                                                        onClick={() => onVerifyBrand(activeBrand.id)}
                                                        className={`px-3 py-1 rounded text-sm ${activeBrand.isVerified ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                    >
                                                        {activeBrand.isVerified ? 'Unverify' : 'Verify'}
                                                    </button>
                                                )}
                                                {currentUser?.role === 'admin' && (
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('Are you sure you want to delete this brand?')) {
                                                                onDeleteBrand(activeBrand.id);
                                                                handleBackToList();
                                                            }
                                                        }}
                                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Brand Posts */}
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">Posts</h2>
                                {currentUser && (currentUser.role === 'admin' || currentUser.id === activeBrand.adminId) && (
                                    <button
                                        onClick={() => setSelectedBrandForPost(activeBrand.id)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                                    >
                                        <i className="fas fa-plus"></i> Create Post
                                    </button>
                                )}
                            </div>
                            
                            {brandPosts.length > 0 ? (
                                <div className="space-y-6">
                                    {brandPosts.map(post => {
                                        const author = { ...activeBrand, type: 'brand' as const };
                                        return (
                                            <div key={post.id} className="post-container" itemScope itemType="https://schema.org/SocialMediaPosting">
                                                {/* Hidden microdata for SEO */}
                                                <meta itemProp="datePublished" content={new Date(post.createdAt).toISOString()} />
                                                <meta itemProp="author" content={activeBrand.name} />
                                                <meta itemProp="headline" content={post.content?.substring(0, 100) || ''} />
                                                
                                                <Post
                                                    post={post}
                                                    author={author}
                                                    currentUser={currentUser}
                                                    users={users}
                                                    onProfileClick={onProfileClick}
                                                    onReact={onReact}
                                                    onShare={onShare}
                                                    onViewImage={() => {}}
                                                    onOpenComments={() => setActiveCommentsPostId(post.id)}
                                                    onVideoClick={() => {}}
                                                    onViewProduct={() => {}}
                                                    onGroupClick={() => {}}
                                                    onPlayAudioTrack={onPlayAudioTrack}
                                                    onFollow={() => onFollowBrand(activeBrand.id)}
                                                    isFollowing={currentUser ? activeBrand.followers?.includes(currentUser.id) || false : false}
                                                    onHashtagClick={() => {}}
                                                    onDeletePost={onDeletePost}
                                                    isAdmin={currentUser?.role === 'admin'}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-[#242526] rounded-xl">
                                    <i className="fas fa-newspaper text-6xl text-gray-600 mb-4"></i>
                                    <h3 className="text-xl font-bold mb-2">No posts yet</h3>
                                    <p className="text-gray-400 mb-6">This brand hasn't posted anything yet</p>
                                    {currentUser && (currentUser.role === 'admin' || currentUser.id === activeBrand.adminId) && (
                                        <button
                                            onClick={() => setSelectedBrandForPost(activeBrand.id)}
                                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
                                        >
                                            Create First Post
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Create Brand Modal */}
                {showCreateBrandModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <div className="bg-[#242526] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                                <h2 className="text-2xl font-bold">Create Brand Page</h2>
                                <button
                                    onClick={() => setShowCreateBrandModal(false)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Brand Name *</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#3A3B3C] border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                                        placeholder="Enter brand name"
                                        value={newBrandName}
                                        onChange={(e) => setNewBrandName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Category</label>
                                    <select
                                        className="w-full bg-[#3A3B3C] border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                                        value={newBrandCategory}
                                        onChange={(e) => setNewBrandCategory(e.target.value)}
                                    >
                                        <option value="">Select category</option>
                                        <option value="Business">Business</option>
                                        <option value="Entertainment">Entertainment</option>
                                        <option value="Education">Education</option>
                                        <option value="Technology">Technology</option>
                                        <option value="Health">Health</option>
                                        <option value="Fashion">Fashion</option>
                                        <option value="Food">Food</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Description</label>
                                    <textarea
                                        className="w-full bg-[#3A3B3C] border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 h-32"
                                        placeholder="Describe your brand..."
                                        value={newBrandDescription}
                                        onChange={(e) => setNewBrandDescription(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Location</label>
                                        <input
                                            type="text"
                                            className="w-full bg-[#3A3B3C] border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                                            placeholder="City, Country"
                                            value={newBrandLocation}
                                            onChange={(e) => setNewBrandLocation(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Website</label>
                                        <input
                                            type="url"
                                            className="w-full bg-[#3A3B3C] border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                                            placeholder="https://example.com"
                                            value={newBrandWebsite}
                                            onChange={(e) => setNewBrandWebsite(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Contact Email</label>
                                        <input
                                            type="email"
                                            className="w-full bg-[#3A3B3C] border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                                            placeholder="contact@brand.com"
                                            value={newBrandContactEmail}
                                            onChange={(e) => setNewBrandContactEmail(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Contact Phone</label>
                                        <input
                                            type="tel"
                                            className="w-full bg-[#3A3B3C] border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                                            placeholder="+1234567890"
                                            value={newBrandContactPhone}
                                            onChange={(e) => setNewBrandContactPhone(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-4 pt-6 border-t border-gray-700">
                                    <button
                                        onClick={() => setShowCreateBrandModal(false)}
                                        className="px-6 py-3 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateBrand}
                                        className="px-6 py-3 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700"
                                    >
                                        Create Brand
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Create Post Modal for Brand */}
                {selectedBrandForPost && (
                    <CreatePostModal
                        currentUser={currentUser!}
                        users={users}
                        onClose={() => setSelectedBrandForPost(null)}
                        onCreatePost={(content, file, type, visibility, location, feeling, taggedUsers, background, linkPreview) => {
                            onPostAsBrand(selectedBrandForPost, {
                                text: content,
                                file,
                                type,
                                visibility,
                                location,
                                feeling,
                                taggedUsers,
                                background,
                                linkPreview
                            });
                            setSelectedBrandForPost(null);
                        }}
                    />
                )}
                
                {/* Comments Sheet */}
                {activeCommentsPostId && (
                    <CommentsSheet
                        post={posts.find(p => p.id === activeCommentsPostId)!}
                        currentUser={currentUser || users[0]}
                        users={users}
                        onClose={() => setActiveCommentsPostId(null)}
                        onComment={() => {}}
                        onLikeComment={() => {}}
                        getCommentAuthor={(id) => users.find(u => u.id === id)}
                        onProfileClick={onProfileClick}
                    />
                )}
            </div>
        </>
    );
};
