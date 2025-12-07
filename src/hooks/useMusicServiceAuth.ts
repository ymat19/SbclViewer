import { useCallback, useEffect, useState } from 'react';

import { getMusicServiceInstance } from '@/services/music';

/**
 * 音楽サービスの認証状態を管理するフック
 */
export function useMusicServiceAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const musicService = getMusicServiceInstance();

  const checkAuth = useCallback(async () => {
    setIsChecking(true);
    try {
      const authenticated = await musicService.isAuthenticated();
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Failed to check authentication:', error);
      setIsAuthenticated(false);
    } finally {
      setIsChecking(false);
    }
  }, [musicService]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async () => {
    try {
      await musicService.authenticate();
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  };

  return {
    isAuthenticated,
    isChecking,
    login,
    checkAuth,
  };
}
