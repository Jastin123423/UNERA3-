import React, { useState, useEffect, useRef } from 'react';
import { User, Product, LocationSearchResult } from '../types';
import { MARKETPLACE_CATEGORIES, MARKETPLACE_COUNTRIES } from '../constants';

// ========== API CONFIGURATION ==========
const API_BASE_URL = 'https://unera.social';

// API client function (matching App.tsx pattern)
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
const transformProductFromAPI = (apiProduct: any): Product => {
    // Extract country from address
    let countryCode = 'US';
    if (apiProduct.address) {
        const countryData = MARKETPLACE_COUNTRIES.find(c => 
            apiProduct.address.toLowerCase().includes(c.name.toLowerCase())
        );
        countryCode = countryData?.code || 'US';
    }
    
    // Determine seller info
    let sellerId = apiProduct.seller_id || apiProduct.sellerId || 1;
    let sellerName = apiProduct.seller_name || apiProduct.sellerName || 'Unknown Seller';
    let sellerAvatar = apiProduct.seller_avatar || apiProduct.sellerAvatar || 
                     `https://ui-avatars.com/api/?name=${encodeURIComponent(sellerName)}&background=random`;
    
    // If we have user data in the response, use it
    if (apiProduct.seller) {
        sellerId = apiProduct.seller.id;
        sellerName = apiProduct.seller.name || apiProduct.seller.username;
        sellerAvatar = apiProduct.seller.profile_image || apiProduct.seller.avatar || sellerAvatar;
    }
    
    return {
        id: apiProduct.id,
        title: apiProduct.title || `Product ${apiProduct.id}`,
        description: apiProduct.description || '',
        category: apiProduct.category || 'other',
        mainPrice: apiProduct.main_price || apiProduct.mainPrice || 0,
        discountPrice: apiProduct.discount_price || apiProduct.discountPrice || null,
        quantity: apiProduct.quantity || 1,
        images: apiProduct.images || apiProduct.image_urls || [],
        address: apiProduct.address || '',
        country: apiProduct.country || countryCode,
        phoneNumber: apiProduct.phone_number || apiProduct.phoneNumber || '',
        sellerId,
        sellerName,
        sellerAvatar,
        status: apiProduct.status || 'active',
        views: apiProduct.views || 0,
        ratings: apiProduct.ratings || [],
        comments: apiProduct.comments || [],
        date: new Date(apiProduct.created_at || apiProduct.date || Date.now()).getTime(),
        shareId: apiProduct.share_id || apiProduct.shareId || `prod_${apiProduct.id}`,
        condition: apiProduct.condition || 'used',
        deliveryOptions: apiProduct.delivery_options || ['pickup'],
        paymentMethods: apiProduct.payment_methods || ['cash'],
        tags: apiProduct.tags || []
    };
};

// Helper function to format price
const formatPrice = (price: number, countryCode: string): string => {
    const countryData = MARKETPLACE_COUNTRIES.find(c => c.code === countryCode);
    const symbol = countryData?.symbol || '$';
    return `${symbol}${price.toFixed(2)}`;
};

// --- OSM LOCATION SEARCH COMPONENT ---
const LocationSearch: React.FC<{ 
    value: string, 
    onSelect: (val: string, coordinates?: { lat: number, lon: number }) => void,
    disabled?: boolean
}> = ({ value, onSelect, disabled = false }) => {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<LocationSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchTimeout = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = async (q: string) => {
        if (q.length < 2) { 
            setResults([]); 
            return; 
        }
        
        setLoading(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=8`,
                { headers: { 'Accept-Language': 'en' } }
            );
            
            if (res.ok) {
                const data = await res.json();
                const formattedResults: LocationSearchResult[] = data.map((item: any) => ({
                    display_name: item.display_name,
                    lat: parseFloat(item.lat),
                    lon: parseFloat(item.lon),
                    type: item.type,
                    importance: item.importance || 0
                }));
                setResults(formattedResults);
            }
        } catch (err) {
            console.error("Location search failed", err);
            // Fallback: filter from known locations
            const localResults = MARKETPLACE_COUNTRIES
                .filter(loc => loc.name.toLowerCase().includes(q.toLowerCase()))
                .slice(0, 8)
                .map(country => ({
                    display_name: country.name,
                    lat: 0,
                    lon: 0,
                    type: 'country',
                    importance: 0.5
                }));
            setResults(localResults);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        setShowResults(true);
        
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => handleSearch(val), 300);
    };

    const handleSelect = (result: LocationSearchResult) => {
        onSelect(result.display_name, { lat: result.lat, lon: result.lon });
        setQuery(result.display_name);
        setShowResults(false);
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                <input 
                    className={`w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-3 text-[#E4E6EB] outline-none focus:border-[#1877F2] text-sm pl-10 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="Search city, street or region..." 
                    value={query} 
                    onChange={handleChange}
                    onFocus={() => !disabled && setShowResults(true)}
                    disabled={disabled}
                />
                <i className="fas fa-map-marker-alt absolute left-4 top-1/2 -translate-y-1/2 text-[#B0B3B8]"></i>
                {loading && <i className="fas fa-spinner fa-spin absolute right-4 top-1/2 -translate-y-1/2 text-[#1877F2]"></i>}
                {!loading && query && (
                    <button 
                        onClick={() => {
                            setQuery('');
                            onSelect('', undefined);
                            setResults([]);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B0B3B8] hover:text-[#E4E6EB]"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                )}
            </div>
            
            {showResults && results.length > 0 && !disabled && (
                <div className="absolute top-full left-0 right-0 z-[60] mt-1 bg-[#242526] border border-[#3E4042] rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-fade-in">
                    {results.map((result, i) => (
                        <div 
                            key={`${result.display_name}-${i}`} 
                            className="p-3 hover:bg-[#3A3B3C] cursor-pointer text-white text-sm border-b border-[#3E4042] last:border-0 transition-colors"
                            onClick={() => handleSelect(result)}
                        >
                            <div className="flex items-start gap-2">
                                <i className="fas fa-location-dot mt-0.5 text-[#B0B3B8] flex-shrink-0"></i>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[#E4E6EB] truncate">{result.display_name}</div>
                                    {result.type && (
                                        <div className="text-[#B0B3B8] text-xs mt-0.5">
                                            {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- HELPER: Generate canonical URL for product ---
const generateCanonicalUrl = (productId: string, productTitle?: string) => {
    const baseUrl = 'https://unera.social';
    let slug = '';
    
    if (productTitle) {
        slug = productTitle
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 60);
    }
    
    return slug 
        ? `${baseUrl}/marketplace/product/${slug}-${productId}`
        : `${baseUrl}/marketplace/product/${productId}`;
};

// --- HELPER: Generate Product Schema for SEO ---
const generateProductSchema = (product: Product) => {
    const canonicalUrl = generateCanonicalUrl(product.id.toString(), product.title);
    
    const countryData = MARKETPLACE_COUNTRIES.find(c => 
        product.address.toLowerCase().includes(c.name.toLowerCase())
    );
    const currency = countryData?.currency || 'USD';
    
    const avgRating = product.ratings?.length > 0 
        ? product.ratings.reduce((a, b) => a + b, 0) / product.ratings.length 
        : 4.5;
    
    const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": `${canonicalUrl}#product`,
        "name": product.title,
        "description": product.description.substring(0, 300) + (product.description.length > 300 ? '...' : ''),
        "image": product.images,
        "sku": `PROD-${product.id}`,
        "mpn": `MPN-${product.id}`,
        "brand": {
            "@type": "Brand",
            "name": product.sellerName || "Marketplace Seller"
        },
        "offers": {
            "@type": "Offer",
            "url": canonicalUrl,
            "priceCurrency": currency,
            "price": product.discountPrice || product.mainPrice,
            "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            "itemCondition": "https://schema.org/UsedCondition",
            "availability": product.quantity > 0 
                ? "https://schema.org/InStock" 
                : "https://schema.org/OutOfStock",
            "seller": {
                "@type": "Person",
                "name": product.sellerName,
                "telephone": product.phoneNumber
            }
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": avgRating.toFixed(1),
            "reviewCount": product.ratings?.length || 1,
            "bestRating": "5",
            "worstRating": "1"
        }
    };
    
    return productSchema;
};

// --- HELPER: Generate Breadcrumb Schema ---
const generateBreadcrumbSchema = (product?: Product) => {
    const baseUrl = 'https://unera.social';
    
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": `${baseUrl}`
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Marketplace",
                "item": `${baseUrl}/marketplace`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": product ? product.title : "Products",
                "item": product ? generateCanonicalUrl(product.id.toString(), product.title) : `${baseUrl}/marketplace/products`
            }
        ]
    };
    
    return breadcrumbSchema;
};

// --- PRODUCT DETAIL MODAL ---
interface ProductDetailModalProps {
    product: Product;
    currentUser: User | null;
    onClose: () => void;
    onMessage: (sellerId: number) => void;
    isDeleted?: boolean;
    onReportProduct?: (productId: number, reason: string) => Promise<void>;
    onUpdateProduct?: (productId: number, data: Partial<Product>) => Promise<void>;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ 
    product, 
    currentUser, 
    onClose, 
    onMessage,
    isDeleted = false,
    onReportProduct,
    onUpdateProduct
}) => {
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [reportReason, setReportReason] = useState('');
    const [showReportModal, setShowReportModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editedProduct, setEditedProduct] = useState<Partial<Product>>({});
    
    const countryData = MARKETPLACE_COUNTRIES.find(c => product.address.toLowerCase().includes(c.name.toLowerCase()));
    const symbol = countryData ? countryData.symbol : '$';
    const hasDiscount = !!product.discountPrice;

    // Generate canonical URL
    const canonicalUrl = generateCanonicalUrl(product.id.toString(), product.title);

    // Generate Schema
    const productSchema = generateProductSchema(product);
    const breadcrumbSchema = generateBreadcrumbSchema(product);

    const isOwner = currentUser && currentUser.id === product.sellerId;

    // Handle product report
    const handleReportProduct = async () => {
        if (!reportReason.trim() || !onReportProduct) {
            setError('Please provide a reason for reporting');
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        try {
            await onReportProduct(product.id, reportReason);
            setShowReportModal(false);
            setReportReason('');
            alert('Product reported successfully. Our team will review it.');
        } catch (err: any) {
            setError(err.message || 'Failed to report product');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle product update
    const handleUpdateProduct = async () => {
        if (!onUpdateProduct || Object.keys(editedProduct).length === 0) return;
        
        setIsLoading(true);
        setError('');
        
        try {
            await onUpdateProduct(product.id, editedProduct);
            setShowEditModal(false);
            setEditedProduct({});
            alert('Product updated successfully!');
        } catch (err: any) {
            setError(err.message || 'Failed to update product');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* SEO Structured Data */}
            <link rel="canonical" href={canonicalUrl} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
            
            {/* Modal UI */}
            <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-0 md:p-4 animate-fade-in font-sans">
                <div className="bg-[#242526] w-full max-w-[1100px] md:rounded-2xl overflow-hidden flex flex-col md:flex-row h-full md:h-[90vh] relative shadow-2xl border border-[#3E4042]">
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 z-30 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-md"
                        aria-label="Close product details"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>

                    {/* Product Actions Menu */}
                    <div className="absolute top-4 left-4 z-30">
                        <div className="relative group">
                            <button className="w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-md">
                                <i className="fas fa-ellipsis-h"></i>
                            </button>
                            <div className="absolute top-full left-0 mt-2 bg-[#242526] border border-[#3E4042] rounded-lg shadow-2xl w-48 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                                {isOwner ? (
                                    <>
                                        <button 
                                            onClick={() => setShowEditModal(true)}
                                            className="w-full px-4 py-2 text-left text-[#E4E6EB] hover:bg-[#3A3B3C] transition-colors flex items-center gap-2"
                                        >
                                            <i className="fas fa-edit text-[#1877F2]"></i>
                                            Edit Product
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => setShowReportModal(true)}
                                        className="w-full px-4 py-2 text-left text-[#E4E6EB] hover:bg-[#3A3B3C] transition-colors flex items-center gap-2"
                                    >
                                        <i className="fas fa-flag text-red-500"></i>
                                        Report Product
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {isDeleted ? (
                        // Deleted Product View
                        <div className="w-full flex flex-col items-center justify-center p-10 text-center">
                            <div className="w-32 h-32 bg-[#242526] rounded-full flex items-center justify-center mb-6 border-4 border-[#F02849]">
                                <i className="fas fa-trash-alt text-5xl text-[#F02849]"></i>
                            </div>
                            <h1 className="text-3xl font-bold text-[#E4E6EB] mb-4">Product No Longer Available</h1>
                            <p className="text-[#B0B3B8] text-lg mb-2 max-w-lg">
                                This product has been permanently removed by the seller and is no longer available for purchase.
                            </p>
                            <div className="flex gap-4">
                                <button 
                                    onClick={onClose}
                                    className="px-6 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl font-bold transition-all"
                                >
                                    Browse Other Products
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Active Product View
                        <>
                            {/* Left: Image Gallery */}
                            <div className="w-full md:w-[60%] bg-[#18191A] flex flex-col relative border-r border-[#3E4042]">
                                <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                                    <img 
                                        src={product.images[activeImageIndex]} 
                                        alt={`${product.title} - View ${activeImageIndex + 1}`} 
                                        className="max-w-full max-h-full object-contain transition-all duration-300"
                                        loading="lazy"
                                    />
                                    
                                    {product.images.length > 1 && (
                                        <>
                                            <button 
                                                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 rounded-full text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                                                onClick={() => setActiveImageIndex(prev => prev === 0 ? product.images.length - 1 : prev - 1)}
                                                aria-label="Previous image"
                                            >
                                                <i className="fas fa-chevron-left text-xl"></i>
                                            </button>
                                            <button 
                                                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 rounded-full text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                                                onClick={() => setActiveImageIndex(prev => prev === product.images.length - 1 ? 0 : prev + 1)}
                                                aria-label="Next image"
                                            >
                                                <i className="fas fa-chevron-right text-xl"></i>
                                            </button>
                                        </>
                                    )}
                                </div>
                                {/* Thumbnails */}
                                <div className="h-24 bg-[#242526]/50 backdrop-blur-sm flex items-center gap-3 px-4 overflow-x-auto border-t border-[#3E4042] scrollbar-hide">
                                    {product.images.map((img, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`h-16 min-w-[64px] rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${activeImageIndex === idx ? 'border-[#1877F2] scale-105 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                            onClick={() => setActiveImageIndex(idx)}
                                            aria-label={`View image ${idx + 1}`}
                                        >
                                            <img src={img} className="h-full w-full object-cover" alt={`Thumbnail ${idx + 1}`} loading="lazy" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Details */}
                            <div className="w-full md:w-[40%] flex flex-col h-full bg-[#242526] relative">
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <img src={product.sellerAvatar} alt={`${product.sellerName}'s profile`} className="w-12 h-12 rounded-full object-cover border-2 border-[#1877F2] flex-shrink-0" loading="lazy" />
                                            <div className="overflow-hidden">
                                                <h2 className="text-[#E4E6EB] font-bold text-lg leading-tight truncate">{product.sellerName}</h2>
                                                <p className="text-[#B0B3B8] text-xs truncate">Seller • Active in Marketplace</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <a 
                                                href={`tel:${product.phoneNumber}`}
                                                className="w-10 h-10 rounded-full bg-[#3A3B3C] hover:bg-[#45BD62] text-[#45BD62] hover:text-white flex items-center justify-center transition-all shadow-md no-underline"
                                                title="Call Seller"
                                                aria-label={`Call ${product.sellerName} at ${product.phoneNumber}`}
                                            >
                                                <i className="fas fa-phone-alt text-lg"></i>
                                            </a>
                                            <button 
                                                onClick={() => onMessage(product.sellerId)} 
                                                className="w-10 h-10 rounded-full bg-[#3A3B3C] hover:bg-[#1877F2] text-[#1877F2] hover:text-white flex items-center justify-center transition-all shadow-md"
                                                title="Message Seller"
                                                aria-label={`Message ${product.sellerName}`}
                                            >
                                                <i className="fab fa-facebook-messenger text-lg"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-[#E4E6EB] leading-snug mb-2">{product.title}</h3>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-[#F02849] font-bold text-3xl">{symbol}{hasDiscount ? product.discountPrice?.toFixed(2) : product.mainPrice.toFixed(2)}</span>
                                        {hasDiscount && <span className="text-[#B0B3B8] text-lg line-through">{symbol}{product.mainPrice.toFixed(2)}</span>}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3 p-4 bg-[#3A3B3C]/50 rounded-2xl border border-[#3E4042]">
                                            <i className="fas fa-location-dot text-[#1877F2] mt-1"></i>
                                            <div>
                                                <p className="text-[#E4E6EB] font-bold text-sm">Location</p>
                                                <p className="text-[#B0B3B8] text-sm leading-relaxed">{product.address}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-[#E4E6EB] font-bold text-lg mb-2">Description</h4>
                                            <div className="text-[#B0B3B8] text-[15px] leading-relaxed whitespace-pre-wrap bg-[#18191A] p-4 rounded-xl border border-[#3E4042]">
                                                {product.description}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-[#18191A] p-4 rounded-xl border border-[#3E4042] text-center">
                                            <span className="block text-[#B0B3B8] text-[10px] uppercase font-bold tracking-wider mb-1">Category</span>
                                            <span className="block text-[#E4E6EB] font-bold">{MARKETPLACE_CATEGORIES.find(c => c.id === product.category)?.name}</span>
                                        </div>
                                        <div className="bg-[#18191A] p-4 rounded-xl border border-[#3E4042] text-center">
                                            <span className="block text-[#B0B3B8] text-[10px] uppercase font-bold tracking-wider mb-1">Status</span>
                                            <span className="block text-[#45BD62] font-bold uppercase text-xs">{product.quantity > 0 ? 'In Stock' : 'Out of Stock'}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Product Stats */}
                                    <div className="grid grid-cols-3 gap-2 mt-4">
                                        <div className="text-center p-3 bg-[#3A3B3C]/30 rounded-lg">
                                            <div className="text-[#E4E6EB] font-bold">{product.views}</div>
                                            <div className="text-[#B0B3B8] text-xs">Views</div>
                                        </div>
                                        <div className="text-center p-3 bg-[#3A3B3C]/30 rounded-lg">
                                            <div className="text-[#E4E6EB] font-bold">{product.ratings?.length || 0}</div>
                                            <div className="text-[#B0B3B8] text-xs">Ratings</div>
                                        </div>
                                        <div className="text-center p-3 bg-[#3A3B3C]/30 rounded-lg">
                                            <div className="text-[#E4E6EB] font-bold">{new Date(product.date).toLocaleDateString()}</div>
                                            <div className="text-[#B0B3B8] text-xs">Listed</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Report Product Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-[#242526] w-full max-w-[500px] rounded-xl border border-[#3E4042] p-6">
                        <h3 className="text-xl font-bold text-[#E4E6EB] mb-4">Report Product</h3>
                        {error && (
                            <div className="mb-4 bg-red-900/30 border border-red-700 text-red-200 px-4 py-2 rounded-lg">
                                {error}
                            </div>
                        )}
                        <p className="text-[#B0B3B8] mb-4">Please tell us why you're reporting this product:</p>
                        <textarea 
                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-3 text-[#E4E6EB] outline-none h-32 resize-none mb-4"
                            value={reportReason}
                            onChange={e => setReportReason(e.target.value)}
                            placeholder="Describe the issue..."
                            disabled={isLoading}
                        />
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowReportModal(false)}
                                className="flex-1 bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] py-3 rounded-lg font-bold transition-colors"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleReportProduct}
                                disabled={isLoading || !reportReason.trim()}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Reporting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {showEditModal && isOwner && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-[#242526] w-full max-w-[600px] rounded-xl border border-[#3E4042] p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold text-[#E4E6EB] mb-4">Edit Product</h3>
                        {error && (
                            <div className="mb-4 bg-red-900/30 border border-red-700 text-red-200 px-4 py-2 rounded-lg">
                                {error}
                            </div>
                        )}
                        {/* Edit form would go here */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[#E4E6EB] font-semibold mb-2">Title</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-3 text-[#E4E6EB] outline-none"
                                    value={editedProduct.title || product.title}
                                    onChange={e => setEditedProduct({...editedProduct, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-[#E4E6EB] font-semibold mb-2">Price</label>
                                <input 
                                    type="number" 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-3 text-[#E4E6EB] outline-none"
                                    value={editedProduct.mainPrice || product.mainPrice}
                                    onChange={e => setEditedProduct({...editedProduct, mainPrice: parseFloat(e.target.value)})}
                                />
                            </div>
                            <div>
                                <label className="block text-[#E4E6EB] font-semibold mb-2">Quantity</label>
                                <input 
                                    type="number" 
                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-lg p-3 text-[#E4E6EB] outline-none"
                                    value={editedProduct.quantity || product.quantity}
                                    onChange={e => setEditedProduct({...editedProduct, quantity: parseInt(e.target.value)})}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => setShowEditModal(false)}
                                className="flex-1 bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] py-3 rounded-lg font-bold transition-colors"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpdateProduct}
                                disabled={isLoading}
                                className="flex-1 bg-[#1877F2] hover:bg-[#166FE5] text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

interface MarketplacePageProps {
    currentUser: User | null;
    products: Product[];
    onNavigateHome: () => void;
    onCreateProduct: (productData: Partial<Product>) => Promise<void>;
    onViewProduct: (product: Product) => void;
    onDeleteProduct?: (productId: number) => Promise<void>;
    onReportProduct?: (productId: number, reason: string) => Promise<void>;
    onUpdateProduct?: (productId: number, data: Partial<Product>) => Promise<void>;
    deletedProducts?: Product[];
    onFetchProducts?: (filters?: {
        category?: string;
        country?: string;
        search?: string;
        minPrice?: number;
        maxPrice?: number;
        condition?: string;
        sellerId?: number;
        limit?: number;
        offset?: number;
    }) => Promise<Product[]>;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({ 
    currentUser, 
    products, 
    onNavigateHome, 
    onCreateProduct, 
    onViewProduct,
    onDeleteProduct,
    onReportProduct,
    onUpdateProduct,
    deletedProducts = [],
    onFetchProducts
}) => {
    const [selectedCountry, setSelectedCountry] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSellModal, setShowSellModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);
    
    // Form State
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [desc, setDesc] = useState('');
    const [address, setAddress] = useState('');
    const [mainPrice, setMainPrice] = useState('');
    const [discountPrice, setDiscountPrice] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [phone, setPhone] = useState('');
    const [images, setImages] = useState<{id: number, data: string}[]>([]);
    const [condition, setCondition] = useState('used');
    const [deliveryOptions, setDeliveryOptions] = useState<string[]>(['pickup']);
    const [paymentMethods, setPaymentMethods] = useState<string[]>(['cash']);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [coordinates, setCoordinates] = useState<{ lat: number, lon: number } | undefined>();
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-detect user country
    useEffect(() => {
        if (currentUser) {
            if (selectedCountry === 'all') {
                const userCountry = MARKETPLACE_COUNTRIES.find(c => 
                    currentUser.location?.toLowerCase().includes(c.name.toLowerCase())
                );
                if (userCountry) setSelectedCountry(userCountry.code);
            }
            setPhone(currentUser.phone || '');
        }
    }, [currentUser]);

    // Fetch products when filters change
    useEffect(() => {
        const fetchProducts = async () => {
            if (onFetchProducts) {
                setIsLoading(true);
                try {
                    const filters: any = {};
                    if (selectedCategory !== 'all') filters.category = selectedCategory;
                    if (selectedCountry !== 'all') filters.country = selectedCountry;
                    if (searchQuery) filters.search = searchQuery;
                    
                    const fetchedProducts = await onFetchProducts(filters);
                    setFilteredProducts(fetchedProducts);
                } catch (error) {
                    console.error('Failed to fetch products:', error);
                    // Fallback to local filtering
                    filterLocalProducts();
                } finally {
                    setIsLoading(false);
                }
            } else {
                filterLocalProducts();
            }
        };

        fetchProducts();
    }, [selectedCountry, selectedCategory, searchQuery, onFetchProducts]);

    const filterLocalProducts = () => {
        const activeProducts = products.filter(p => p.status !== 'deleted');
        const filtered = activeProducts.filter(p => {
            if (selectedCountry !== 'all' && p.country !== selectedCountry) return false;
            if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
            if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
        setFilteredProducts(filtered);
    };

    const handleSellClick = () => {
        if (!currentUser) {
            alert("Please log in to sell products.");
            return;
        }
        setShowSellModal(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            if (images.length + e.target.files.length > 10) {
                alert("Maximum 10 images allowed for a professional listing");
                return;
            }
            Array.from(e.target.files).forEach((file: File) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (ev.target?.result) {
                        setImages(prev => [...prev, { 
                            id: Date.now() + Math.random(), 
                            data: ev.target!.result as string,
                            file // Keep file reference for upload
                        }]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (id: number) => {
        setImages(prev => prev.filter(img => img.id !== id));
    };

    const handleLocationSelect = (location: string, coords?: { lat: number, lon: number }) => {
        setAddress(location);
        setCoordinates(coords);
    };

    const handleAddTag = () => {
        const trimmedTag = tagInput.trim();
        if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
            setTags([...tags, trimmedTag]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!title || !category || !desc || !address || !mainPrice || !phone || images.length === 0) {
            alert("Please fill all required fields and upload at least one image.");
            return;
        }

        // Extract country from address
        const detectedCountry = MARKETPLACE_COUNTRIES.find(c => 
            address.toLowerCase().includes(c.name.toLowerCase())
        )?.code || 'US';

        setIsLoading(true);
        
        try {
            const newProduct: Partial<Product> = {
                title: title.trim(),
                category,
                description: desc.trim(),
                country: detectedCountry,
                address: address.trim(),
                mainPrice: parseFloat(mainPrice),
                discountPrice: discountPrice ? parseFloat(discountPrice) : null,
                quantity: parseInt(quantity) || 1,
                phoneNumber: phone.trim(),
                images: images.map(i => i.data),
                status: 'active',
                views: 0,
                ratings: [],
                comments: [],
                date: Date.now(),
                condition,
                deliveryOptions,
                paymentMethods,
                tags,
                coordinates
            };

            await onCreateProduct(newProduct);
            
            // Reset form
            setTitle('');
            setCategory('');
            setDesc('');
            setAddress('');
            setMainPrice('');
            setDiscountPrice('');
            setQuantity('1');
            setPhone('');
            setImages([]);
            setCondition('used');
            setDeliveryOptions(['pickup']);
            setPaymentMethods(['cash']);
            setTags([]);
            setCoordinates(undefined);
            
            setShowSellModal(false);
        } catch (error: any) {
            alert(error.message || 'Failed to create product listing');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteProduct = async (productId: number) => {
        if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
            return;
        }
        
        if (onDeleteProduct) {
            setIsLoading(true);
            try {
                await onDeleteProduct(productId);
                alert("Product has been permanently deleted.");
            } catch (error: any) {
                alert(error.message || "Failed to delete product");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const activeCountry = MARKETPLACE_COUNTRIES.find(c => c.code === selectedCountry) || MARKETPLACE_COUNTRIES[0];
    const marketplaceCanonicalUrl = 'https://unera.social/marketplace';

    // Generate JSON-LD schema for product collection
    const generateProductCollectionSchema = () => {
        return {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Marketplace Products - unera.social",
            "description": "Buy and sell products on unera.social marketplace",
            "url": marketplaceCanonicalUrl,
            "numberOfItems": filteredProducts.length,
            "itemListElement": filteredProducts.map((product, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "Product",
                    "name": product.title,
                    "url": generateCanonicalUrl(product.id.toString(), product.title),
                    "description": product.description.substring(0, 150) + (product.description.length > 150 ? '...' : ''),
                    "image": product.images[0],
                    "offers": {
                        "@type": "Offer",
                        "price": product.discountPrice || product.mainPrice,
                        "priceCurrency": MARKETPLACE_COUNTRIES.find(c => 
                            product.address.toLowerCase().includes(c.name.toLowerCase())
                        )?.currency || "USD"
                    }
                }
            }))
        };
    };

    return (
        <>
            {/* SEO Structured Data */}
            <link rel="canonical" href={marketplaceCanonicalUrl} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(generateBreadcrumbSchema()) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(generateProductCollectionSchema()) }}
            />

            <div className="min-h-screen bg-[#18191A] font-sans pb-20">
                {/* Header */}
                <div className="bg-[#242526] sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-md border-b border-[#3E4042]">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={onNavigateHome}>
                        <div className="w-10 h-10 rounded-full bg-[#3A3B3C] flex items-center justify-center group-hover:bg-[#4E4F50] transition-colors">
                            <i className="fas fa-arrow-left text-[#E4E6EB]"></i>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#E4E6EB]">Marketplace</h2>
                            <p className="text-[#B0B3B8] text-xs">unera.social</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-[#3A3B3C] px-3 py-1.5 rounded-full flex items-center gap-2 cursor-pointer hover:bg-[#4E4F50] transition-colors" 
                             onClick={() => setSelectedCountry('all')}>
                            <span className="text-lg">{activeCountry.flag}</span>
                            <span className="text-sm font-bold text-[#E4E6EB]">{activeCountry.code === 'all' ? 'Worldwide' : activeCountry.name}</span>
                            <i className="fas fa-chevron-down text-[#B0B3B8] text-[10px]"></i>
                        </div>
                        <button onClick={handleSellClick} 
                                className="bg-[#1877F2] hover:bg-[#166FE5] text-white px-5 py-2 rounded-full font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                disabled={isLoading}>
                            {isLoading ? (
                                <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                                <>
                                    <i className="fas fa-plus"></i> Sell
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="sticky top-[64px] z-40 bg-[#18191A]/80 backdrop-blur-xl pt-3 pb-3 border-b border-[#3E4042]/50 px-4 space-y-4">
                    <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-3">
                        <div className="flex-1 bg-[#242526] rounded-xl flex items-center px-4 py-3 border border-[#3E4042] focus-within:border-[#1877F2] transition-colors">
                            <i className="fas fa-search text-[#B0B3B8] mr-3"></i>
                            <input 
                                type="text" 
                                placeholder="What are you looking for?" 
                                className="bg-transparent text-[#E4E6EB] outline-none flex-1 text-[15px] placeholder-[#B0B3B8]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                disabled={isLoading}
                            />
                            {isLoading && (
                                <i className="fas fa-spinner fa-spin text-[#1877F2] ml-2"></i>
                            )}
                        </div>
                        
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            <button 
                                onClick={() => setSelectedCategory('all')}
                                className={`px-5 py-2 rounded-xl font-bold whitespace-nowrap text-sm transition-all border ${
                                    selectedCategory === 'all' 
                                    ? 'bg-[#1877F2] text-white border-[#1877F2] shadow-lg shadow-blue-500/20' 
                                    : 'bg-[#242526] text-[#B0B3B8] border-[#3E4042] hover:bg-[#3A3B3C]'
                                }`}
                                disabled={isLoading}
                            >
                                All
                            </button>
                            {MARKETPLACE_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                                <button 
                                    key={cat.id} 
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-5 py-2 rounded-xl font-bold whitespace-nowrap text-sm transition-all border ${
                                        selectedCategory === cat.id 
                                        ? 'bg-[#1877F2] text-white border-[#1877F2] shadow-lg shadow-blue-500/20' 
                                        : 'bg-[#242526] text-[#B0B3B8] border-[#3E4042] hover:bg-[#3A3B3C]'
                                    }`}
                                    disabled={isLoading}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="max-w-[1400px] mx-auto px-4 mt-6">
                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex justify-center py-10">
                            <div className="w-12 h-12 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}

                    {/* Products Grid */}
                    {!isLoading && filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredProducts.map(product => {
                                const pCountry = MARKETPLACE_COUNTRIES.find(c => product.address.toLowerCase().includes(c.name.toLowerCase()));
                                const symbol = pCountry ? pCountry.symbol : '$';
                                const canonicalUrl = generateCanonicalUrl(product.id.toString(), product.title);
                                const isOwner = currentUser && currentUser.id === product.sellerId;
                                
                                return (
                                    <div 
                                        key={product.id} 
                                        className="bg-[#242526] rounded-2xl overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all border border-[#3E4042] flex flex-col group relative"
                                    >
                                        <div 
                                            className="relative aspect-square overflow-hidden bg-[#18191A]"
                                            onClick={() => onViewProduct(product)}
                                        >
                                            <img 
                                                src={product.images[0]} 
                                                alt={`${product.title} - Main image`} 
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                loading="lazy"
                                            />
                                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white uppercase flex items-center gap-1">
                                                <i className="fas fa-location-dot text-[#1877F2]"></i>
                                                <span className="truncate max-w-[80px]">{product.address.split(',')[0]}</span>
                                            </div>
                                            
                                            {isOwner && onDeleteProduct && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteProduct(product.id);
                                                    }}
                                                    disabled={isLoading}
                                                    className="absolute top-3 right-3 bg-black/70 hover:bg-red-500/80 text-white rounded-full w-8 h-8 flex items-center justify-center transition-all backdrop-blur-sm"
                                                >
                                                    {isLoading ? (
                                                        <i className="fas fa-spinner fa-spin text-xs"></i>
                                                    ) : (
                                                        <i className="fas fa-trash-alt text-xs"></i>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        <div className="p-3 flex-1 flex flex-col">
                                            <h3 className="text-[#E4E6EB] font-bold text-sm line-clamp-2 mb-2 min-h-[40px]">
                                                {product.title}
                                            </h3>
                                            <div className="mt-auto">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[#F02849] font-black text-lg">
                                                        {symbol}{product.mainPrice.toFixed(0)}
                                                    </span>
                                                    <div 
                                                        className="w-8 h-8 rounded-lg bg-[#3A3B3C] group-hover:bg-[#1877F2] flex items-center justify-center text-[#B0B3B8] group-hover:text-white transition-colors"
                                                        onClick={() => onViewProduct(product)}
                                                    >
                                                        <i className="fas fa-chevron-right text-xs"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : !isLoading && (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-24 h-24 bg-[#242526] rounded-full flex items-center justify-center mb-6 border border-[#3E4042]">
                                <i className="fas fa-store-slash text-4xl text-[#3E4042]"></i>
                            </div>
                            <h3 className="text-[#E4E6EB] font-bold text-xl mb-2">No items found</h3>
                            <p className="text-[#B0B3B8] max-w-xs mb-8">Try adjusting your filters or expand your search.</p>
                            <button onClick={() => {setSelectedCountry('all'); setSelectedCategory('all'); setSearchQuery('');}} 
                                    className="px-8 py-3 bg-[#3A3B3C] text-[#E4E6EB] rounded-xl font-bold hover:bg-[#4E4F50] transition-colors">
                                Clear all filters
                            </button>
                        </div>
                    )}
                </div>

                {/* Sell Modal */}
                {showSellModal && (
                    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
                        <div className="bg-[#242526] w-full max-w-[700px] rounded-3xl border border-[#3E4042] flex flex-col max-h-[90vh] shadow-2xl animate-slide-up">
                            <div className="p-6 border-b border-[#3E4042] flex justify-between items-center bg-[#1C1D1E] rounded-t-3xl">
                                <div>
                                    <h2 className="text-2xl font-bold text-[#E4E6EB]">Create Listing</h2>
                                    <p className="text-[#B0B3B8] text-sm">Sell to your local community</p>
                                </div>
                                <button onClick={() => setShowSellModal(false)} 
                                        className="w-10 h-10 rounded-full bg-[#3A3B3C] hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center transition-all"
                                        disabled={isLoading}>
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                                {/* Images Section */}
                                <div>
                                    <label className="block text-[#E4E6EB] font-bold mb-3">Product Photos (Max 10)</label>
                                    <div 
                                        onClick={() => !isLoading && fileInputRef.current?.click()} 
                                        className={`border-2 border-dashed border-[#3E4042] bg-[#18191A] rounded-2xl p-10 text-center cursor-pointer transition-all ${!isLoading ? 'hover:bg-[#242526] hover:border-[#1877F2]' : 'opacity-50'}`}
                                    >
                                        <i className="fas fa-cloud-upload-alt text-5xl text-[#3E4042] mb-4"></i>
                                        <p className="text-[#E4E6EB] font-bold">Click to upload images</p>
                                        <p className="text-[#B0B3B8] text-xs mt-1">Upload at least one clear photo</p>
                                    </div>
                                    <input type="file" 
                                           ref={fileInputRef} 
                                           className="hidden" 
                                           multiple 
                                           accept="image/*" 
                                           onChange={handleFileChange}
                                           disabled={isLoading} />
                                    
                                    {images.length > 0 && (
                                        <div className="grid grid-cols-5 gap-3 mt-6">
                                            {images.map(img => (
                                                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-[#3E4042]">
                                                    <img src={img.data} alt="Uploaded" className="w-full h-full object-cover" />
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeImage(img.id)} 
                                                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] hover:bg-red-500 transition-all"
                                                        disabled={isLoading}
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Basic Information */}
                                <div className="space-y-4">
                                    <label className="block text-[#E4E6EB] font-bold">Basic Information</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input 
                                            type="text" 
                                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-xl p-4 text-[#E4E6EB] outline-none focus:border-[#1877F2] disabled:opacity-50" 
                                            placeholder="Product Name *" 
                                            value={title} 
                                            onChange={e => setTitle(e.target.value)} 
                                            required 
                                            disabled={isLoading}
                                        />
                                        <select 
                                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-xl p-4 text-[#E4E6EB] outline-none focus:border-[#1877F2] disabled:opacity-50" 
                                            value={category} 
                                            onChange={e => setCategory(e.target.value)}
                                            required
                                            disabled={isLoading}
                                        >
                                            <option value="">Select Category *</option>
                                            {MARKETPLACE_CATEGORIES.filter(c => c.id !== 'all').map(c => 
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            )}
                                        </select>
                                    </div>
                                </div>

                                {/* Location & Contact */}
                                <div className="space-y-4">
                                    <label className="block text-[#E4E6EB] font-bold">Location & Contact</label>
                                    <LocationSearch value={address} onSelect={handleLocationSelect} disabled={isLoading} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input 
                                            type="tel" 
                                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-xl p-4 text-[#E4E6EB] outline-none focus:border-[#1877F2] disabled:opacity-50" 
                                            placeholder="Phone Number *" 
                                            value={phone} 
                                            onChange={e => setPhone(e.target.value)} 
                                            required 
                                            disabled={isLoading}
                                        />
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B0B3B8] font-bold">$</span>
                                                <input 
                                                    type="number" 
                                                    className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-xl p-4 pl-8 text-[#E4E6EB] outline-none focus:border-[#1877F2] disabled:opacity-50" 
                                                    placeholder="Price *" 
                                                    value={mainPrice} 
                                                    onChange={e => setMainPrice(e.target.value)} 
                                                    required 
                                                    disabled={isLoading}
                                                />
                                            </div>
                                            <input 
                                                type="number" 
                                                className="w-24 bg-[#3A3B3C] border border-[#3E4042] rounded-xl p-4 text-[#E4E6EB] outline-none focus:border-[#1877F2] disabled:opacity-50" 
                                                placeholder="Qty" 
                                                value={quantity} 
                                                onChange={e => setQuantity(e.target.value)}
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-4">
                                    <label className="block text-[#E4E6EB] font-bold">Description</label>
                                    <textarea 
                                        className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-2xl p-5 text-[#E4E6EB] outline-none focus:border-[#1877F2] h-48 resize-none disabled:opacity-50" 
                                        placeholder="Product description *" 
                                        value={desc} 
                                        onChange={e => setDesc(e.target.value)}
                                        required
                                        disabled={isLoading}
                                    ></textarea>
                                </div>

                                {/* Tags */}
                                <div className="space-y-4">
                                    <label className="block text-[#E4E6EB] font-bold">Tags (Optional)</label>
                                    <div className="flex gap-2 mb-2">
                                        <input 
                                            type="text" 
                                            className="flex-1 bg-[#3A3B3C] border border-[#3E4042] rounded-xl p-3 text-[#E4E6EB] outline-none focus:border-[#1877F2] disabled:opacity-50" 
                                            value={tagInput}
                                            onChange={e => setTagInput(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                            placeholder="Add tags to help buyers find your product"
                                            disabled={isLoading || tags.length >= 10}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddTag}
                                            className="bg-[#3A3B3C] hover:bg-[#4E4F50] text-[#E4E6EB] px-4 rounded-xl transition-colors disabled:opacity-50"
                                            disabled={isLoading || !tagInput.trim() || tags.length >= 10}
                                        >
                                            Add
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map(tag => (
                                            <div key={tag} className="bg-[#3A3B3C] px-3 py-1 rounded-full flex items-center gap-1">
                                                <span className="text-[#E4E6EB] text-sm">#{tag}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="text-[#B0B3B8] hover:text-[#E4E6EB]"
                                                    disabled={isLoading}
                                                >
                                                    <i className="fas fa-times text-xs"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Creating Listing...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-check-circle"></i> 
                                            Publish Listing
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

// Exportable API functions
export const marketplaceApiFunctions = {
    fetchProducts: async (filters?: {
        category?: string;
        country?: string;
        search?: string;
        minPrice?: number;
        maxPrice?: number;
        condition?: string;
        sellerId?: number;
        limit?: number;
        offset?: number;
        sortBy?: string;
    }): Promise<Product[]> => {
        try {
            let endpoint = '/api/products';
            const queryParams = new URLSearchParams();
            
            if (filters) {
                if (filters.category) queryParams.append('category', filters.category);
                if (filters.country) queryParams.append('country', filters.country);
                if (filters.search) queryParams.append('search', filters.search);
                if (filters.minPrice) queryParams.append('min_price', filters.minPrice.toString());
                if (filters.maxPrice) queryParams.append('max_price', filters.maxPrice.toString());
                if (filters.condition) queryParams.append('condition', filters.condition);
                if (filters.sellerId) queryParams.append('seller_id', filters.sellerId.toString());
                if (filters.limit) queryParams.append('limit', filters.limit.toString());
                if (filters.offset) queryParams.append('offset', filters.offset.toString());
                if (filters.sortBy) queryParams.append('sort_by', filters.sortBy);
                
                if (Array.from(queryParams).length > 0) {
                    endpoint += `?${queryParams.toString()}`;
                }
            }
            
            const response = await apiFetch(endpoint);
            if (response.success && Array.isArray(response.data)) {
                return response.data.map(transformProductFromAPI);
            }
            return [];
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    },
    
    fetchProductById: async (productId: number): Promise<Product | null> => {
        try {
            const response = await apiFetch(`/api/products/${productId}`);
            if (response.success && response.data) {
                return transformProductFromAPI(response.data);
            }
            return null;
        } catch (error) {
            console.error('Error fetching product:', error);
            return null;
        }
    },
    
    createProduct: async (productData: Partial<Product>, files?: File[]): Promise<Product> => {
        try {
            // If we have files, use FormData
            if (files && files.length > 0) {
                const formData = new FormData();
                
                // Append product data as JSON
                const productJson = {
                    title: productData.title,
                    description: productData.description,
                    category: productData.category,
                    country: productData.country,
                    address: productData.address,
                    main_price: productData.mainPrice,
                    discount_price: productData.discountPrice,
                    quantity: productData.quantity,
                    phone_number: productData.phoneNumber,
                    condition: productData.condition,
                    delivery_options: productData.deliveryOptions,
                    payment_methods: productData.paymentMethods,
                    tags: productData.tags,
                    coordinates: productData.coordinates
                };
                formData.append('product', JSON.stringify(productJson));
                
                // Append files
                files.forEach((file, index) => {
                    formData.append(`image_${index}`, file);
                });
                
                const response = await apiFetch('/api/products', {
                    method: 'POST',
                    body: formData,
                    headers: {} // Remove Content-Type for FormData
                });
                
                if (response.success) {
                    return transformProductFromAPI(response.data);
                }
                throw new Error(response.error || 'Failed to create product');
            } else {
                // No files, use JSON
                const apiProductData = {
                    title: productData.title,
                    description: productData.description,
                    category: productData.category,
                    country: productData.country,
                    address: productData.address,
                    main_price: productData.mainPrice,
                    discount_price: productData.discountPrice,
                    quantity: productData.quantity,
                    phone_number: productData.phoneNumber,
                    condition: productData.condition,
                    delivery_options: productData.deliveryOptions,
                    payment_methods: productData.paymentMethods,
                    tags: productData.tags,
                    coordinates: productData.coordinates,
                    images: productData.images || []
                };
                
                const response = await apiFetch('/api/products', {
                    method: 'POST',
                    body: JSON.stringify(apiProductData)
                });
                
                if (response.success) {
                    return transformProductFromAPI(response.data);
                }
                throw new Error(response.error || 'Failed to create product');
            }
        } catch (error: any) {
            throw new Error(error.message || 'Failed to create product');
        }
    },
    
    updateProduct: async (productId: number, productData: Partial<Product>): Promise<Product> => {
        try {
            const response = await apiFetch(`/api/products/${productId}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
            
            if (response.success) {
                return transformProductFromAPI(response.data);
            }
            throw new Error(response.error || 'Failed to update product');
        } catch (error: any) {
            throw new Error(error.message || 'Failed to update product');
        }
    },
    
    deleteProduct: async (productId: number): Promise<boolean> => {
        try {
            const response = await apiFetch(`/api/products/${productId}`, {
                method: 'DELETE'
            });
            
            return response.success;
        } catch (error) {
            console.error('Error deleting product:', error);
            return false;
        }
    },
    
    reportProduct: async (productId: number, reason: string, userId?: number): Promise<boolean> => {
        try {
            const response = await apiFetch(`/api/products/${productId}/report`, {
                method: 'POST',
                body: JSON.stringify({ 
                    reason, 
                    user_id: userId 
                })
            });
            
            return response.success;
        } catch (error) {
            console.error('Error reporting product:', error);
            return false;
        }
    },
    
    uploadProductImages: async (productId: number, files: File[]): Promise<string[]> => {
        try {
            const formData = new FormData();
            files.forEach((file, index) => {
                formData.append(`images`, file);
            });
            
            const response = await apiFetch(`/api/products/${productId}/images`, {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type for FormData
            });
            
            if (response.success && Array.isArray(response.data)) {
                return response.data;
            }
            throw new Error('Failed to upload images');
        } catch (error: any) {
            throw new Error(error.message || 'Failed to upload images');
        }
    },
    
    viewProduct: async (productId: number, userId?: number): Promise<boolean> => {
        try {
            const response = await apiFetch(`/api/products/${productId}/view`, {
                method: 'POST',
                body: JSON.stringify({ user_id: userId })
            });
            
            return response.success;
        } catch (error) {
            console.error('Error recording product view:', error);
            return false;
        }
    }
};
