// Prevent static optimization for the entire app during build
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

// Explicitly define which paths should be statically generated
export const generateStaticParams = async () => {
  return [
    // Add paths that should be static here
    // Example: { slug: 'about' }
  ];
}; 