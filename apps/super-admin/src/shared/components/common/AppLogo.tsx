const LOGO_SRC = '/shribi-smart-school-logo.png';

interface AppLogoProps {
  variant?: 'sidebar' | 'sidebar-collapsed' | 'login';
  className?: string;
  src?: string;
  alt?: string;
}

export default function AppLogo({
  variant = 'sidebar',
  className = '',
  src,
  alt,
}: AppLogoProps) {
  const logoSrc = src?.trim() || LOGO_SRC;
  const logoAlt = alt?.trim() || 'School logo';

  if (variant === 'login') {
    return (
      <img
        src={logoSrc}
        alt={logoAlt}
        className={`h-16 w-auto object-contain mx-auto ${className}`}
      />
    );
  }

  if (variant === 'sidebar-collapsed') {
    return (
      <img
        src={logoSrc}
        alt={logoAlt}
        className={`h-9 w-9 object-contain ${className}`}
      />
    );
  }

  return (
    <img
      src={logoSrc}
      alt={logoAlt}
      className={`h-full w-full max-h-11 max-w-full object-contain object-center ${className}`}
    />
  );
}
