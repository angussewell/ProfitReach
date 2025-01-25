import { Button } from '@/components/ui/button';

export function LoginButton() {
  return (
    <Button
      onClick={() => window.location.href = '/api/auth/ghl'}
      variant="default"
      size="lg"
    >
      Connect GoHighLevel Account
    </Button>
  );
} 