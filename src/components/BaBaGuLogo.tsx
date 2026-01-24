import logoImage from '@/assets/logo.png';

interface BaBaGuLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-10',
  md: 'h-14',
  lg: 'h-20',
};

export function BaBaGuLogo({ className = '', size = 'md' }: BaBaGuLogoProps) {
  return (
    <img 
      src={logoImage} 
      alt="BaBaGu" 
      className={`${sizeClasses[size]} ${className} w-auto object-contain`}
    />
  );
}
