// src/components/Auth/Auth.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { User } from '../types';

// ========== API BASE URL ==========
const API_BASE_URL = 'https://unera.social/api';

// ========== AUTH API ENDPOINTS (MATCHING YOUR PACKAGE) ==========
const AUTH_API = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }
    
    return response.json();
  },

  register: async (userData: {
    firstName: string;
    lastName?: string;
    email: string;
    password: string;
    nationality: string;
    location: string;
    birthDate: string;
    gender: string;
  }) => {
    // Generate username from first and last name
    const username = `${userData.firstName.toLowerCase()}${userData.lastName ? userData.lastName.toLowerCase() : ''}${Math.floor(Math.random() * 1000)}`;
    
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email: userData.email,
        password: userData.password,
        name: `${userData.firstName} ${userData.lastName || ''}`.trim(),
        firstName: userData.firstName,
        lastName: userData.lastName || '',
        nationality: userData.nationality,
        location: userData.location,
        birthDate: userData.birthDate,
        gender: userData.gender,
        profileImage: `https://ui-avatars.com/api/?name=${userData.firstName}+${userData.lastName || ''}&background=random`,
        coverImage: 'https://images.unsplash.com/photo-1554034483-04fda0d3507b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        bio: `Hello! I'm ${userData.firstName} ${userData.lastName || ''} from ${userData.location}, ${userData.nationality}.`,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }
    
    return response.json();
  },

  forgotPassword: async (email: string) => {
    // Note: You need to implement this endpoint in your backend
    const response = await fetch(`${API_BASE_URL}/users/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send reset email');
    }
    
    return response.json();
  },
};

interface ForgotPasswordProps {
    onBackToLogin: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackToLogin }) => {
    const [email, setEmail] = useState('');
    const [isSent, setIsSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Please enter your email address');
            return;
        }
        
        try {
            setIsLoading(true);
            setError('');
            
            await AUTH_API.forgotPassword(email);
            setIsSent(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#18191A] flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#242526] p-4 rounded-lg shadow-lg w-full max-w-[432px] border border-[#3E4042]">
                <div className="text-center mb-4 border-b border-[#3E4042] pb-3">
                    <h2 className="text-[25px] font-bold text-[#E4E6EB]">Find Your Account</h2>
                    <p className="text-[#B0B3B8] text-[15px]">Please enter your email to search for your account.</p>
                </div>
                
                {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm">
                        {error}
                    </div>
                )}
                
                {isSent ? (
                    <div className="text-center p-4">
                        <div className="text-4xl text-green-500 mb-4">✓</div>
                        <h3 className="text-xl font-bold text-[#E4E6EB]">Reset Link Sent!</h3>
                        <p className="text-[#B0B3B8] mt-2 text-sm">
                            If an account with the email <strong>{email}</strong> exists, 
                            a password reset link has been sent. Please check your inbox and spam folder.
                        </p>
                        <button 
                            onClick={onBackToLogin} 
                            className="w-full mt-6 bg-[#3A3B3C] hover:bg-[#4E4F50] text-white font-bold text-[17px] py-2 rounded-md transition-colors"
                        >
                            Back to Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <input 
                            type="email" 
                            placeholder="Email address" 
                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-md px-4 py-3.5 text-[17px] text-[#E4E6EB] placeholder-[#B0B3B8] focus:outline-none focus:border-[#1877F2]"
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            disabled={isLoading}
                        />
                        <div className="flex gap-2 mt-2">
                             <button 
                                type="button" 
                                onClick={onBackToLogin} 
                                className="w-full bg-[#3A3B3C] hover:bg-[#4E4F50] text-white font-bold text-[17px] py-2 rounded-md transition-colors"
                                disabled={isLoading}
                             >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold text-[17px] py-2 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

interface LoginProps {
    onLogin: (email: string, pass: string) => void;
    onNavigateToRegister: () => void;
    onNavigateToForgotPassword: () => void;
    onClose: () => void;
    error: string;
}

export const Login: React.FC<LoginProps> = ({ 
    onLogin, 
    onNavigateToRegister, 
    onNavigateToForgotPassword, 
    onClose, 
    error 
}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [localError, setLocalError] = useState('');
    const { t, setLanguage, language } = useLanguage();
    
    const handleSubmit = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        
        if (!email.trim() || !password.trim()) {
            setLocalError('Please enter both email and password');
            return;
        }
        
        try {
            setIsLoading(true);
            setLocalError('');
            
            // Call the provided onLogin handler (which should handle the API call)
            onLogin(email, password);
        } catch (err: any) {
            setLocalError(err.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#18191A] flex flex-col justify-between p-4 relative animate-fade-in">
            <div className="absolute top-4 right-4 w-10 h-10 bg-[#3A3B3C] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#4E4F50] transition-colors z-50" 
                 onClick={onClose} 
                 title="Continue as Guest">
                <span className="text-[#E4E6EB] text-xl">✕</span>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 max-w-[1000px] w-full mx-auto">
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-[500px]">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-[#1877F2] text-[40px] lg:text-[50px]">🌍</span>
                        <h1 className="text-[40px] lg:text-[50px] font-bold bg-gradient-to-r from-[#1877F2] to-[#1D8AF2] text-transparent bg-clip-text tracking-tight">UNERA</h1>
                    </div>
                    <p className="text-[24px] lg:text-[28px] text-[#E4E6EB] font-normal leading-8">
                        {t('tagline') || 'Connect with friends and the world around you'}
                    </p>
                </div>
                
                <div className="bg-[#242526] p-4 rounded-lg shadow-lg w-full max-w-[396px] flex flex-col gap-4 border border-[#3E4042]">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {(error || localError) && (
                            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded text-sm text-center">
                                {error || localError}
                            </div>
                        )}
                        
                        <input 
                            type="email" 
                            placeholder="Email address"
                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-md px-4 py-3.5 text-[17px] text-[#E4E6EB] placeholder-[#B0B3B8] focus:outline-none focus:border-[#1877F2] focus:shadow-[0_0_0_2px_#263951]" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            disabled={isLoading}
                        />
                        <input 
                            type="password" 
                            placeholder="Password" 
                            className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-md px-4 py-3.5 text-[17px] text-[#E4E6EB] placeholder-[#B0B3B8] focus:outline-none focus:border-[#1877F2] focus:shadow-[0_0_0_2px_#263951]" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            disabled={isLoading}
                        />
                        <button 
                            type="submit" 
                            className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold text-[20px] py-2.5 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Logging in...' : (t('login_btn') || 'Log In')}
                        </button>
                    </form>
                    
                    <div className="text-center">
                        <span 
                            onClick={onNavigateToForgotPassword} 
                            className="text-[#1877F2] text-[14px] hover:underline cursor-pointer"
                        >
                            {t('forgot_password') || 'Forgot password?'}
                        </span>
                    </div>
                    
                    <div className="border-b border-[#3E4042] my-1"></div>
                    
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={onNavigateToRegister} 
                            className="w-auto mx-auto bg-[#42B72A] hover:bg-[#36A420] text-white font-bold text-[17px] px-8 py-3 rounded-md transition-colors"
                        >
                            {t('create_new_account') || 'Create New Account'}
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="mt-8 text-center text-xs text-[#B0B3B8]">
                <p>
                    Login to comment, like, and share posts. 
                    <span 
                        className="text-[#E4E6EB] font-bold cursor-pointer hover:underline ml-1" 
                        onClick={onClose}
                    >
                        Continue as Guest
                    </span> to view.
                </p>
            </div>
            
            <div className="mt-auto pt-8 pb-4 w-full max-w-[1000px] mx-auto border-t border-[#3E4042]">
                <div className="flex flex-wrap justify-center gap-4 text-sm text-[#B0B3B8]">
                    <span 
                        className={`cursor-pointer hover:underline ${language === 'en' ? 'font-bold text-[#E4E6EB]' : ''}`} 
                        onClick={() => setLanguage('en')}
                    >
                        English (US)
                    </span>
                    <span 
                        className={`cursor-pointer hover:underline ${language === 'sw' ? 'font-bold text-[#E4E6EB]' : ''}`} 
                        onClick={() => setLanguage('sw')}
                    >
                        Kiswahili
                    </span>
                    <span 
                        className={`cursor-pointer hover:underline ${language === 'fr' ? 'font-bold text-[#E4E6EB]' : ''}`} 
                        onClick={() => setLanguage('fr')}
                    >
                        Français (France)
                    </span>
                    <span 
                        className={`cursor-pointer hover:underline ${language === 'es' ? 'font-bold text-[#E4E6EB]' : ''}`} 
                        onClick={() => setLanguage('es')}
                    >
                        Español
                    </span>
                </div>
            </div>
        </div>
    );
};

interface RegisterProps {
    onRegister: (newUser: Partial<User>) => void;
    onBackToLogin: () => void;
}

interface CountryData {
    name: { common: string };
    flag: string; // emoji
}

export const Register: React.FC<RegisterProps> = ({ onRegister, onBackToLogin }) => {
    const [firstName, setFirstName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nationality, setNationality] = useState('Tanzania');
    const [countryInput, setCountryInput] = useState('🇹🇿 Tanzania');
    const [countrySearch, setCountrySearch] = useState('');
    const [showCountryList, setShowCountryList] = useState(false);
    const countryRef = useRef<HTMLDivElement>(null);
    const [region, setRegion] = useState('');
    
    const [day, setDay] = useState(new Date().getDate());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear() - 18);
    
    const [gender, setGender] = useState('Female');
    const [countries, setCountries] = useState<CountryData[]>([]);
    const [isLoadingCountries, setIsLoadingCountries] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [registerError, setRegisterError] = useState('');
    
    const { t } = useLanguage();

    useEffect(() => {
        fetch('https://restcountries.com/v3.1/all?fields=name,flag')
            .then(res => res.json())
            .then(data => {
                const sorted = data.sort((a: CountryData, b: CountryData) => 
                    a.name.common.localeCompare(b.name.common)
                );
                setCountries(sorted);
                setIsLoadingCountries(false);
            })
            .catch(err => {
                console.error("Failed to fetch countries", err);
                setIsLoadingCountries(false);
            });
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
                setShowCountryList(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const filteredCountries = useMemo(() => {
        if (!countrySearch) return countries;
        return countries.filter(c =>
            c.name.common.toLowerCase().includes(countrySearch.toLowerCase())
        );
    }, [countries, countrySearch]);

    const validateForm = (): boolean => {
        if (!firstName.trim()) {
            setRegisterError('First name is required');
            return false;
        }

        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
            setRegisterError('Please enter a valid email address');
            return false;
        }

        if (!password.trim() || password.length < 6 || !/^\d+$/.test(password)) {
            setRegisterError('Password must be at least 6 numbers');
            return false;
        }

        if (password !== confirmPassword) {
            setRegisterError('Passwords do not match');
            return false;
        }

        if (!nationality.trim()) {
            setRegisterError('Please select your nationality');
            return false;
        }

        if (!region.trim()) {
            setRegisterError('Please enter your region');
            return false;
        }

        // Age validation (must be at least 13)
        const birthDate = new Date(year, month - 1, day);
        const age = new Date().getFullYear() - birthDate.getFullYear();
        if (age < 13) {
            setRegisterError('You must be at least 13 years old to register');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => { 
        e.preventDefault();
        
        if (!validateForm()) return;
        
        try {
            setIsSubmitting(true);
            setRegisterError('');
            
            const userData = {
                firstName,
                lastName: surname || '',
                email,
                password,
                nationality,
                location: region,
                birthDate: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
                gender,
            };
            
            // Call the provided onRegister handler (which should handle the API call)
            onRegister(userData);
            
        } catch (err: any) {
            setRegisterError(err.message || 'Registration failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const days = Array.from({ length: 31 }, (_, i) => i + 1); 
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; 
    const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div className="min-h-screen bg-[#18191A] flex flex-col items-center justify-center p-4 py-8 animate-fade-in">
            <div className="flex flex-col items-center mb-6">
                <div className="flex items-center gap-2">
                    <span className="text-[#1877F2] text-[40px]">🌍</span>
                    <h1 className="text-[40px] font-bold bg-gradient-to-r from-[#1877F2] to-[#1D8AF2] text-transparent bg-clip-text">UNERA</h1>
                </div>
            </div>
            
            <div className="bg-[#242526] p-4 rounded-lg shadow-lg w-full max-w-[432px] border border-[#3E4042]">
                <div className="text-center mb-4 border-b border-[#3E4042] pb-3">
                    <h2 className="text-[25px] font-bold text-[#E4E6EB]">
                        {t('sign_up_header') || 'Sign Up'}
                    </h2>
                    <p className="text-[#B0B3B8] text-[15px]">
                        {t('quick_easy') || "It's quick and easy."}
                    </p>
                </div>
                
                {registerError && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm">
                        {registerError}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder={t('first_name') || "First name"} 
                            className="w-1/2 bg-[#3A3B3C] border border-[#3E4042] rounded-md px-3 py-2 text-[15px] text-[#E4E6EB] placeholder-[#B0B3B8] focus:outline-none focus:border-[#505151]" 
                            value={firstName} 
                            onChange={(e) => setFirstName(e.target.value)} 
                            required 
                            disabled={isSubmitting}
                        />
                        <input 
                            type="text" 
                            placeholder={t('surname_optional') || "Surname (optional)"} 
                            className="w-1/2 bg-[#3A3B3C] border border-[#3E4042] rounded-md px-3 py-2 text-[15px] text-[#E4E6EB] placeholder-[#B0B3B8] focus:outline-none focus:border-[#505151]" 
                            value={surname} 
                            onChange={(e) => setSurname(e.target.value)} 
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="flex flex-col gap-1" ref={countryRef}>
                        <label className="text-[12px] text-[#B0B3B8]">Nationality</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-md px-3 py-2 text-[15px] text-[#E4E6EB] focus:outline-none focus:border-[#505151]"
                                value={countryInput}
                                onChange={(e) => {
                                    setCountryInput(e.target.value);
                                    setCountrySearch(e.target.value);
                                    if (!showCountryList) setShowCountryList(true);
                                }}
                                onFocus={() => setShowCountryList(true)}
                                placeholder="Search for a country..."
                                disabled={isSubmitting}
                            />
                            {showCountryList && !isSubmitting && (
                                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-[#3A3B3C] border border-[#505151] rounded-md max-h-48 overflow-y-auto">
                                    {isLoadingCountries ? (
                                        <div className="p-2 text-center text-[#B0B3B8]">Loading...</div>
                                    ) : filteredCountries.length > 0 ? (
                                        filteredCountries.map((c, idx) => (
                                            <div
                                                key={idx}
                                                className="p-2 hover:bg-[#4E4F50] cursor-pointer text-[#E4E6EB] flex items-center gap-2"
                                                onClick={() => {
                                                    setNationality(c.name.common);
                                                    setCountryInput(`${c.flag} ${c.name.common}`);
                                                    setShowCountryList(false);
                                                    setCountrySearch('');
                                                }}
                                            >
                                                <span>{c.flag}</span>
                                                <span>{c.name.common}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-2 text-center text-[#B0B3B8]">No country found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <input 
                        type="text" 
                        placeholder="Region (e.g. Dar es Salaam)" 
                        className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-md px-3 py-2 text-[15px] text-[#E4E6EB] placeholder-[#B0B3B8] focus:outline-none focus:border-[#505151]" 
                        value={region} 
                        onChange={(e) => setRegion(e.target.value)} 
                        required 
                        disabled={isSubmitting}
                    />
                    
                    <input 
                        type="email" 
                        placeholder="Email address" 
                        className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-md px-3 py-2 text-[15px] text-[#E4E6EB] placeholder-[#B0B3B8] focus:outline-none focus:border-[#505151]" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        disabled={isSubmitting}
                    />
                    
                    <input 
                        type="password" 
                        placeholder="Password (6 numbers minimum)" 
                        pattern="[0-9]*"
                        inputMode="numeric"
                        minLength={6}
                        className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-md px-3 py-2 text-[15px] text-[#E4E6EB] placeholder-[#B0B3B8] focus:outline-none focus:border-[#505151]" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        title="Password must be at least 6 numbers"
                        disabled={isSubmitting}
                    />
                    
                    <input 
                        type="password" 
                        placeholder="Confirm Password" 
                        pattern="[0-9]*"
                        inputMode="numeric"
                        minLength={6}
                        className="w-full bg-[#3A3B3C] border border-[#3E4042] rounded-md px-3 py-2 text-[15px] text-[#E4E6EB] placeholder-[#B0B3B8] focus:outline-none focus:border-[#505151]" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        required 
                        disabled={isSubmitting}
                    />
                    
                    <div className="mt-1">
                        <label className="text-[12px] text-[#B0B3B8] block mb-1">
                            {t('dob') || "Date of birth"}
                        </label>
                        <div className="flex gap-2">
                            <select 
                                value={day} 
                                onChange={(e) => setDay(Number(e.target.value))} 
                                className="w-1/3 bg-[#3A3B3C] border border-[#3E4042] rounded-md p-1 text-[#E4E6EB]"
                                disabled={isSubmitting}
                            >
                                {days.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select 
                                value={month} 
                                onChange={(e) => setMonth(Number(e.target.value))} 
                                className="w-1/3 bg-[#3A3B3C] border border-[#3E4042] rounded-md p-1 text-[#E4E6EB]"
                                disabled={isSubmitting}
                            >
                                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                            <select 
                                value={year} 
                                onChange={(e) => setYear(Number(e.target.value))} 
                                className="w-1/3 bg-[#3A3B3C] border border-[#3E4042] rounded-md p-1 text-[#E4E6EB]"
                                disabled={isSubmitting}
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="mt-1">
                        <label className="text-[12px] text-[#B0B3B8] block mb-1">
                            {t('gender') || "Gender"}
                        </label>
                        <div className="flex gap-2 justify-between">
                            <label className="border border-[#3E4042] rounded-md p-2 flex items-center justify-between flex-1 cursor-pointer bg-[#3A3B3C] hover:bg-[#4E4F50] transition-colors">
                                <span className="text-[#E4E6EB]">{t('female') || 'Female'}</span>
                                <input 
                                    type="radio" 
                                    name="gender" 
                                    checked={gender === 'Female'} 
                                    onChange={() => setGender('Female')}
                                    disabled={isSubmitting}
                                />
                            </label>
                            <label className="border border-[#3E4042] rounded-md p-2 flex items-center justify-between flex-1 cursor-pointer bg-[#3A3B3C] hover:bg-[#4E4F50] transition-colors">
                                <span className="text-[#E4E6EB]">{t('male') || 'Male'}</span>
                                <input 
                                    type="radio" 
                                    name="gender" 
                                    checked={gender === 'Male'} 
                                    onChange={() => setGender('Male')}
                                    disabled={isSubmitting}
                                />
                            </label>
                        </div>
                    </div>
                    
                    <p className="text-[11px] text-[#B0B3B8] my-2">
                        {t('terms_text') || 'By clicking Sign Up, you agree to our Terms, Privacy Policy and Cookies Policy.'}
                    </p>
                    
                    <div className="text-center mt-2">
                        <button 
                            type="submit" 
                            className="w-[200px] bg-[#00A400] hover:bg-[#008f00] text-white font-bold text-[18px] px-8 py-1.5 rounded-md transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating Account...' : (t('sign_up_btn') || 'Sign Up')}
                        </button>
                    </div>
                    
                    <div className="text-center mt-4">
                        <span 
                            className="text-[#1877F2] cursor-pointer hover:underline text-sm" 
                            onClick={onBackToLogin}
                        >
                            {t('have_account') || 'Already have an account?'}
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
};
