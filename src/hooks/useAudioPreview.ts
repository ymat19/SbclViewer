import { useEffect, useRef, useState } from 'react';

export function useAudioPreview() {
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // クリーンアップ: コンポーネントアンマウント時
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playPreview = async (trackId: string, previewUrl: string) => {
    try {
      setError(null);
      setIsLoading(true);

      // 既に再生中のトラックがあれば停止
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // 同じトラックをクリックした場合は停止のみ
      if (playingTrackId === trackId) {
        setPlayingTrackId(null);
        setIsLoading(false);
        return;
      }

      // 新しいAudio要素を作成
      const audio = new Audio(previewUrl);
      audioRef.current = audio;

      // イベントリスナー設定
      audio.addEventListener('loadeddata', () => {
        setIsLoading(false);
      });

      audio.addEventListener('error', () => {
        setError('プレビューの読み込みに失敗しました');
        setIsLoading(false);
        setPlayingTrackId(null);
      });

      audio.addEventListener('ended', () => {
        setPlayingTrackId(null);
      });

      // 再生開始
      await audio.play();
      setPlayingTrackId(trackId);
    } catch (err) {
      console.error('Audio playback failed:', err);
      setError('再生に失敗しました');
      setPlayingTrackId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingTrackId(null);
  };

  return {
    playingTrackId,
    isLoading,
    error,
    playPreview,
    stopPreview,
  };
}
