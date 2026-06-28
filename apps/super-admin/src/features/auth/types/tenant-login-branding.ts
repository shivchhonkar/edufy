export interface TenantLoginBranding {
  tenant: {
    id: number;
    name: string;
    slug: string;
  };
  school: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo_url: string | null;
  };
  branding: {
    primary_color: string;
    secondary_color: string;
    tagline: string | null;
    subdomain: string;
    support_phone: string | null;
    support_email: string | null;
  };
}
