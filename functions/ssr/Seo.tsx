
import React from 'react';
import { User, Post } from '../../types';

interface SeoProps {
    type: 'home' | 'profile' | 'post' | 'error';
    data?: any;
}

const SITE_NAME = "UNERA Social";
const BASE_URL = "https://unera.social";
const TWITTER_HANDLE = "@unera_social";

const DefaultTags = () => (
    <>
        <title>{SITE_NAME} - Connect & Share</title>
        <meta name="description" content="A fully functional social network application with feed, reels, stories, chat, and multi-language support." />
        <link rel="canonical" href={BASE_URL} />
        <meta property="og:title" content={`${SITE_NAME} - Connect & Share`} />
        <meta property="og:description" content="Connect with friends and the world around you on UNERA." />
        <meta property="og:url" content={BASE_URL} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:image" content={`${BASE_URL}/og-image.png`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content={TWITTER_HANDLE} />
    </>
);

const ProfileSeo = ({ user }: { user: User }) => {
    const url = `${BASE_URL}/@${user.username}`;
    const title = `${user.name} | ${SITE_NAME}`;
    const description = user.bio || `Connect with ${user.name} on UNERA.`;

    const schema = {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "mainEntity": {
            "@type": "Person",
            "name": user.name,
            "url": url,
            "image": user.profileImage,
            "description": user.bio,
            "identifier": user.id,
            "mainEntityOfPage": url,
        }
    };

    return (
        <>
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={url} />
            <meta property="og:type" content="profile" />
            <meta property="og:image" content={user.profileImage} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={user.profileImage} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        </>
    );
};

const PostSeo = ({ post, author }: { post: Post, author: User }) => {
    const url = `${BASE_URL}/post/${post.id}`;
    const title = `${author.name}: "${(post.content || '').substring(0, 50)}..." | ${SITE_NAME}`;
    const description = post.content || `A post by ${author.name} on UNERA.`;

    const schema = {
        "@context": "https://schema.org",
        "@type": "SocialMediaPosting",
        "headline": (post.content || '').substring(0, 110),
        "url": url,
        "author": {
            "@type": "Person",
            "name": author.name,
            "url": `${BASE_URL}/@${author.username}`
        },
        "datePublished": new Date(post.createdAt || Date.now()).toISOString(),
        "articleBody": post.content,
        ...(post.image && { "image": post.image }),
    };

    return (
        <>
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={url} />
            <meta property="og:type" content="article" />
            {post.image && <meta property="og:image" content={post.image} />}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            {post.image && <meta name="twitter:image" content={post.image} />}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        </>
    );
};

const ErrorSeo = ({ data }: { data?: { noindex?: boolean, title?: string } }) => (
    <>
        <title>{data?.title || 'Error'} | {SITE_NAME}</title>
        {data?.noindex && <meta name="robots" content="noindex, nofollow" />}
    </>
);

export const Seo: React.FC<SeoProps> = ({ type, data }) => {
    switch (type) {
        case 'home':
            return <DefaultTags />;
        case 'profile':
            return <ProfileSeo user={data} />;
        case 'post':
            return <PostSeo post={data.post} author={data.author} />;
        case 'error':
            return <ErrorSeo data={data} />;
        default:
            return <DefaultTags />;
    }
};
