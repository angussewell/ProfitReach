declare global {
  interface Window {
    GHLOAuth: {
      init: (config: {
        client_id: string;
        redirect_uri: string;
        scope: string;
      }) => void;
      login: () => void;
    };
  }
}

export function GHLAuthButton() {
  const handleAuth = () => {
    if (typeof window === 'undefined') return;

    window.GHLOAuth.init({
      client_id: process.env.NEXT_PUBLIC_GHL_CLIENT_ID!,
      redirect_uri: process.env.NEXT_PUBLIC_GHL_REDIRECT_URI!,
      scope: 'businesses.readonly businesses.write contacts.readonly contacts.write locations.readonly locations.write'
    });

    window.GHLOAuth.login();
  };

  return (
    <button
      onClick={handleAuth}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      Connect with GoHighLevel
    </button>
  );
} 