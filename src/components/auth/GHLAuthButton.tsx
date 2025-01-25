import { generateAuthUrl } from '@/utils/auth';

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
    window.location.href = generateAuthUrl();
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