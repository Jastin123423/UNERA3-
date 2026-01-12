// components/Common/SafeImage.tsx
import React from 'react';
import { User, Brand } from '../types';

interface SafeImageProps {
  user: User | Brand | null | undefined;
  className?: string;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: boolean;
  onClick?: () => void;
}

// Safe helper function (same as in App.tsx)
const getSafeProfileImage = (user: User | Brand | null | undefined): string => {
  if (!user || typeof user !== 'object') {
    return '/default-profile.png';
  }
  
  if (!('profileImage' in user) || !user.profileImage) {
    if ('isVerified' in user && 'followers' in user) {
      return '/default-brand.png';
    }
    return '/default-profile.png';
  }
  
  return user.profileImage;
};

const SafeImage: React.FC<SafeImageProps> = ({ 
  user, 
  className = '', 
  alt = 'Profile', 
  fallback,
  size = 'md',
  rounded = true,
  onClick
}) => {
  // Get safe image source
  const src = getSafeProfileImage(user);
  
  // Size classes
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };
  
  // Shape classes
  const shapeClass = rounded ? 'rounded-full' : 'rounded';
  
  // Final classes
  const finalClassName = `${sizeClasses[size]} ${shapeClass} object-cover ${className}`;
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className={finalClassName}
      onClick={onClick}
      onError={(e) => {
        // If image fails to load, use fallback or default
        e.currentTarget.src = fallback || 
          (('isVerified' in (user || {})) ? '/default-brand.png' : '/default-profile.png');
      }}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    />
  );
};

export default SafeImage;
