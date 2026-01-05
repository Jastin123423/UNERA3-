const handlePostAsBrand = (
    brandId: number, 
    content: any // Now accepts object with all parameters
) => {
    if (!currentUser) {
        alert("Please login to post as a brand.");
        return;
    }
    
    // Destructure all parameters
    const { 
        text, 
        files, 
        type, 
        visibility, 
        location, 
        feeling, 
        taggedUsers, 
        background, 
        linkPreview 
    } = content;
    
    // Verify the current user is admin of this brand
    const brand = brands.find(b => b.id === brandId);
    if (!brand) {
        alert("Brand not found.");
        return;
    }
    
    if (brand.adminId !== currentUser.id && !isAdmin) {
        alert("You don't have permission to post as this brand.");
        return;
    }
    
    // Handle multiple images
    let images: string[] = [];
    let video: string | undefined = undefined;
    
    if (files && files.length > 0) {
        if (type === 'video' && files.length === 1) {
            video = URL.createObjectURL(files[0]);
        } else if (type === 'image' || type === 'multimage') {
            images = files.map(file => URL.createObjectURL(file));
        }
    }
    
    const timestamp = Date.now();
    const formattedTime = formatRelativeTime(timestamp);
    const newPost: PostType = { 
        id: timestamp,
        authorId: brandId,
        content: text,
        images: images.length > 0 ? images : undefined,
        video: video,
        timestamp: timestamp,
        formattedTime: formattedTime,
        createdAt: timestamp,
        reactions: [], 
        comments: [], 
        shares: 0,
        views: 0,
        type: type === 'multimage' ? 'image' : (type === 'video' ? 'video' : (images.length > 0 ? 'image' : 'text')),
        visibility: visibility as any,
        location, 
        feeling, 
        taggedUsers, 
        background, 
        linkPreview,
        brandId: brandId
    };
    
    // Add to main posts array
    setPosts(prev => [newPost, ...prev]);
    
    // Update brand's posts array
    setBrands(prev => prev.map(b => 
        b.id === brandId 
            ? { ...b, posts: [...(b.posts || []), timestamp] }
            : b
    ));
    
    // Notify brand followers
    brand.followers.forEach(followerId => {
        if (followerId !== currentUser.id) {
            handleCreateNotification(
                followerId,
                currentUser.id,
                'brand_post',
                `${brand.name} posted: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
                { brandId, postId: timestamp }
            );
        }
    });
    
    // Enhanced notification logic for tagged users in brand posts
    if (taggedUsers && taggedUsers.length > 0) {
        taggedUsers.forEach(userId => {
            if (userId !== currentUser.id) {
                handleCreateNotification(
                    userId,
                    currentUser.id,
                    'tag_post',
                    `${brand.name} tagged you in a post.`,
                    { postId: timestamp, brandId }
                );
            }
        });
    }
    
    alert("Brand post published successfully!");
    return newPost;
};
