import { landingMetadata } from '@/lib/site-seo';
import HomeClient from './HomeClient';

export const metadata = landingMetadata;

export default function Home() {
  return <HomeClient />;
}
