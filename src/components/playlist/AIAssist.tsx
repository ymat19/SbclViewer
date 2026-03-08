'use client';

import { Box, Button, Flex, Heading, Text, VStack, Textarea, Progress } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';

import { useTrackSearch } from '@/hooks/useTrackSearch';
import {
  generateExportJson,
  generatePromptText,
  parseAIResponse,
  convertToDraftTracks,
} from '@/lib/ai/exportPrompt';
import type { TrackSearchResult } from '@/services/music/types';
import type { Anime } from '@/types/anime';
import type { DraftTrack } from '@/types/playlist';

interface AIAssistProps {
  quarter: string;
  animeList: Anime[];
  onComplete: (tracks: DraftTrack[]) => void;
  onCancel: () => void;
  onSwitchToManual: () => void;
}

type Phase = 'searching' | 'copy' | 'import';

export function AIAssist({ quarter, animeList, onComplete, onCancel, onSwitchToManual }: AIAssistProps) {
  const { searchTrack } = useTrackSearch();
  const [phase, setPhase] = useState<Phase>('searching');
  const [searchProgress, setSearchProgress] = useState({ current: 0, total: 0 });
  const [searchResults, setSearchResults] = useState<Map<string, TrackSearchResult[]>>(new Map());
  const [promptCopied, setPromptCopied] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const searchStartedRef = useRef(false);

  // マウント時に全曲のSpotify検索を逐次実行
  useEffect(() => {
    if (searchStartedRef.current) return;
    searchStartedRef.current = true;

    const allSongs: { animeId: string; songIndex: number; anime: Anime }[] = [];
    for (const anime of animeList) {
      anime.songs.forEach((_, songIndex) => {
        allSongs.push({ animeId: anime.id, songIndex, anime });
      });
    }

    setSearchProgress({ current: 0, total: allSongs.length });

    (async () => {
      const results = new Map<string, TrackSearchResult[]>();

      for (let i = 0; i < allSongs.length; i++) {
        const { animeId, songIndex, anime } = allSongs[i];
        const song = anime.songs[songIndex];
        const key = `${animeId}-${songIndex}`;

        try {
          const searchResult = await searchTrack(song);
          results.set(key, searchResult);
        } catch (error) {
          console.error(`Search failed for ${key}:`, error);
          results.set(key, []);
        }

        setSearchProgress({ current: i + 1, total: allSongs.length });
      }

      setSearchResults(results);
      setPhase('copy');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyPrompt = async () => {
    const prompt = generatePromptText();
    await navigator.clipboard.writeText(prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const handleCopyJson = async () => {
    const exportData = generateExportJson(quarter, animeList, searchResults);
    const json = JSON.stringify(exportData, null, 2);
    await navigator.clipboard.writeText(json);
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  const handleImport = () => {
    setImportError(null);
    try {
      const parsed = parseAIResponse(importText);
      const tracks = convertToDraftTracks(parsed, animeList, searchResults);
      onComplete(tracks);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '取り込みに失敗しました。');
    }
  };

  return (
    <VStack gap={4} align="stretch">
      <Box className="glass-card" p={4}>
        <Heading as="h2" size="sm" mb={3}>
          AI連携
        </Heading>

        {/* 検索フェーズ */}
        {phase === 'searching' && (
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="fg.muted">
              全曲のSpotify検索を実行中...
            </Text>
            <Text fontSize="sm" fontWeight="semibold">
              {searchProgress.current}/{searchProgress.total}曲検索中...
            </Text>
            <Progress.Root
              value={searchProgress.total > 0 ? (searchProgress.current / searchProgress.total) * 100 : 0}
              size="sm"
              borderRadius="full"
            >
              <Progress.Track bg="rgba(255, 255, 255, 0.1)">
                <Progress.Range bg="#ff6b6b" />
              </Progress.Track>
            </Progress.Root>
          </VStack>
        )}

        {/* コピーフェーズ */}
        {phase === 'copy' && (
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="fg.muted">
              検索完了。以下をコピーしてAIに貼り付けてください。
            </Text>
            <Flex gap={2}>
              <Button
                size="sm"
                flex="1"
                bg="rgba(255, 107, 107, 0.15)"
                color="#ff6b6b"
                _hover={{ bg: 'rgba(255, 107, 107, 0.25)' }}
                borderRadius="8px"
                onClick={handleCopyPrompt}
              >
                {promptCopied ? 'コピー済み' : 'プロンプトをコピー'}
              </Button>
              <Button
                size="sm"
                flex="1"
                bg="rgba(255, 107, 107, 0.15)"
                color="#ff6b6b"
                _hover={{ bg: 'rgba(255, 107, 107, 0.25)' }}
                borderRadius="8px"
                onClick={handleCopyJson}
              >
                {jsonCopied ? 'コピー済み' : 'JSONをコピー'}
              </Button>
            </Flex>

            <Button
              size="sm"
              variant="outline"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="fg.default"
              borderRadius="8px"
              onClick={() => setPhase('import')}
            >
              AIの応答を取り込む
            </Button>
          </VStack>
        )}

        {/* インポートフェーズ */}
        {phase === 'import' && (
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="fg.muted">
              AIの応答JSONを貼り付けてください。
            </Text>
            <Textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportError(null);
              }}
              placeholder="AIの応答をここに貼り付け..."
              rows={8}
              fontSize="xs"
              bg="rgba(0, 0, 0, 0.2)"
              borderColor="rgba(255, 255, 255, 0.1)"
              borderRadius="8px"
              _focus={{ borderColor: '#ff6b6b' }}
            />
            {importError && (
              <Text fontSize="xs" color="red.400">
                {importError}
              </Text>
            )}
            <Flex gap={2}>
              <Button
                size="sm"
                flex="1"
                variant="outline"
                borderColor="rgba(255, 255, 255, 0.1)"
                color="fg.default"
                borderRadius="8px"
                onClick={() => setPhase('copy')}
              >
                戻る
              </Button>
              <Button
                size="sm"
                flex="1"
                bg="#ff6b6b"
                color="white"
                _hover={{ bg: '#ff8a8a' }}
                borderRadius="8px"
                onClick={handleImport}
                disabled={!importText.trim()}
              >
                取り込み
              </Button>
            </Flex>
          </VStack>
        )}
      </Box>

      {/* フッター */}
      <Flex justify="space-between" align="center" px={1}>
        <Button
          variant="ghost"
          size="xs"
          color="fg.muted"
          _hover={{ color: '#ff6b6b' }}
          onClick={onSwitchToManual}
        >
          手動マッチングに切り替え
        </Button>
        <Button
          variant="ghost"
          size="xs"
          color="fg.muted"
          onClick={onCancel}
        >
          キャンセル
        </Button>
      </Flex>
    </VStack>
  );
}
