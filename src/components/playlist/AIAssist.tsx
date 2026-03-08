'use client';

import { Box, Button, Flex, Heading, Text, VStack, Textarea, Progress } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';

import { useTrackSearch } from '@/hooks/useTrackSearch';
import {
  generateExportJson,
  generateMultiExportJson,
  generatePromptText,
  parseAIResponse,
  parseMultiAIResponse,
  convertToDraftTracks,
  convertMultiDraftTracks,
} from '@/lib/ai/exportPrompt';
import type { TrackSearchResult } from '@/services/music/types';
import type { Anime } from '@/types/anime';
import type { DraftTrack } from '@/types/playlist';

interface AIAssistEntry {
  quarter: string;
  animeList: Anime[];
}

interface AIAssistProps {
  entries: AIAssistEntry[];
  onComplete: (resultsByQuarter: Map<string, DraftTrack[]>) => void;
  onCancel: () => void;
  onSwitchToManual?: () => void;
}

type Phase = 'searching' | 'copy' | 'import' | 'direct-import';

export function AIAssist({ entries, onComplete, onCancel, onSwitchToManual }: AIAssistProps) {
  const { searchTrack } = useTrackSearch();
  const [phase, setPhase] = useState<Phase>('searching');
  const [searchProgress, setSearchProgress] = useState({ current: 0, total: 0 });
  const [searchResultsByQuarter, setSearchResultsByQuarter] = useState<
    Map<string, Map<string, TrackSearchResult[]>>
  >(new Map());
  const [promptCopied, setPromptCopied] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const searchStartedRef = useRef(false);

  const isMultiQuarter = entries.length > 1;

  // マウント時に全曲のSpotify検索を逐次実行
  useEffect(() => {
    if (searchStartedRef.current) return;
    searchStartedRef.current = true;

    const allSongs: { quarter: string; animeId: string; songIndex: number; anime: Anime }[] = [];
    for (const entry of entries) {
      for (const anime of entry.animeList) {
        anime.songs.forEach((_, songIndex) => {
          allSongs.push({ quarter: entry.quarter, animeId: anime.id, songIndex, anime });
        });
      }
    }

    setSearchProgress({ current: 0, total: allSongs.length });

    (async () => {
      const resultsByQuarter = new Map<string, Map<string, TrackSearchResult[]>>();
      for (const entry of entries) {
        resultsByQuarter.set(entry.quarter, new Map());
      }

      for (let i = 0; i < allSongs.length; i++) {
        const { quarter, animeId, songIndex, anime } = allSongs[i];
        const song = anime.songs[songIndex];
        const key = `${animeId}-${songIndex}`;

        try {
          const searchResult = await searchTrack(song);
          resultsByQuarter.get(quarter)!.set(key, searchResult);
        } catch (error) {
          console.error(`Search failed for ${key}:`, error);
          resultsByQuarter.get(quarter)!.set(key, []);
        }

        setSearchProgress({ current: i + 1, total: allSongs.length });
      }

      setSearchResultsByQuarter(resultsByQuarter);
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
    let json: string;

    if (isMultiQuarter) {
      const exportEntries = entries.map((entry) => ({
        quarter: entry.quarter,
        animeList: entry.animeList,
        searchResults: searchResultsByQuarter.get(entry.quarter) ?? new Map(),
      }));
      const exportData = generateMultiExportJson(exportEntries);
      json = JSON.stringify(exportData, null, 2);
    } else {
      const entry = entries[0];
      const searchResults = searchResultsByQuarter.get(entry.quarter) ?? new Map();
      const exportData = generateExportJson(entry.quarter, entry.animeList, searchResults);
      json = JSON.stringify(exportData, null, 2);
    }

    await navigator.clipboard.writeText(json);
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  const handleImport = () => {
    setImportError(null);
    try {
      if (isMultiQuarter) {
        const parsed = parseMultiAIResponse(importText);
        const entriesMap = new Map(
          entries.map((entry) => [
            entry.quarter,
            {
              animeList: entry.animeList,
              searchResults: searchResultsByQuarter.get(entry.quarter) ?? new Map(),
            },
          ]),
        );
        const results = convertMultiDraftTracks(parsed, entriesMap);
        onComplete(results);
      } else {
        const entry = entries[0];
        const searchResults = searchResultsByQuarter.get(entry.quarter) ?? new Map();
        const parsed = parseAIResponse(importText);
        const tracks = convertToDraftTracks(parsed, entry.animeList, searchResults);
        const results = new Map<string, DraftTrack[]>();
        results.set(entry.quarter, tracks);
        onComplete(results);
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '取り込みに失敗しました。');
    }
  };

  const handleDirectImport = () => {
    setImportError(null);
    try {
      const emptySearchResults = new Map<string, TrackSearchResult[]>();

      if (isMultiQuarter) {
        const parsed = parseMultiAIResponse(importText);
        const entriesMap = new Map(
          entries.map((entry) => [
            entry.quarter,
            {
              animeList: entry.animeList,
              searchResults: emptySearchResults,
            },
          ]),
        );
        const results = convertMultiDraftTracks(parsed, entriesMap);
        onComplete(results);
      } else {
        const parsed = parseAIResponse(importText);
        // 単一クォーターの場合、レスポンスのquarterからentriesを特定
        const entry = entries[0];
        const tracks = convertToDraftTracks(parsed, entry.animeList, emptySearchResults);
        const results = new Map<string, DraftTrack[]>();
        results.set(entry.quarter, tracks);
        onComplete(results);
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '取り込みに失敗しました。');
    }
  };

  const quarterLabel = isMultiQuarter ? `${entries.length}シーズン` : (entries[0]?.quarter ?? '');

  return (
    <VStack gap={4} align="stretch">
      <Box className="glass-card" p={4}>
        <Heading as="h2" size="sm" mb={3}>
          AI連携 {isMultiQuarter && `（${quarterLabel}）`}
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
              value={
                searchProgress.total > 0 ? (searchProgress.current / searchProgress.total) * 100 : 0
              }
              size="sm"
              borderRadius="full"
            >
              <Progress.Track bg="rgba(255, 255, 255, 0.1)">
                <Progress.Range bg="#ff6b6b" />
              </Progress.Track>
            </Progress.Root>
            <Button
              size="sm"
              variant="outline"
              borderColor="rgba(255, 255, 255, 0.1)"
              color="fg.muted"
              borderRadius="8px"
              onClick={() => setPhase('direct-import')}
            >
              検索をスキップして直接取り込む
            </Button>
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
            <Button
              size="sm"
              variant="outline"
              borderColor="rgba(99, 179, 237, 0.3)"
              color="#63b3ed"
              borderRadius="8px"
              onClick={() => setPhase('direct-import')}
            >
              検索スキップで直接取り込む
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

        {/* 直接取り込みフェーズ（検索スキップ） */}
        {phase === 'direct-import' && (
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="fg.muted">
              spotifyId付きのJSONを直接貼り付けてください。
              <br />
              Spotify検索をスキップし、JSONのspotifyIdをそのまま使用します。
            </Text>
            <Textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportError(null);
              }}
              placeholder="spotifyId付きJSONをここに貼り付け..."
              rows={8}
              fontSize="xs"
              bg="rgba(0, 0, 0, 0.2)"
              borderColor="rgba(255, 255, 255, 0.1)"
              borderRadius="8px"
              _focus={{ borderColor: '#63b3ed' }}
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
                onClick={() => setPhase('searching')}
              >
                戻る
              </Button>
              <Button
                size="sm"
                flex="1"
                bg="#63b3ed"
                color="white"
                _hover={{ bg: '#7ec8f0' }}
                borderRadius="8px"
                onClick={handleDirectImport}
                disabled={!importText.trim()}
              >
                直接取り込み
              </Button>
            </Flex>
          </VStack>
        )}
      </Box>

      {/* フッター */}
      <Flex justify="space-between" align="center" px={1}>
        {onSwitchToManual ? (
          <Button
            variant="ghost"
            size="xs"
            color="fg.muted"
            _hover={{ color: '#ff6b6b' }}
            onClick={onSwitchToManual}
          >
            手動マッチングに切り替え
          </Button>
        ) : (
          <Box />
        )}
        <Button variant="ghost" size="xs" color="fg.muted" onClick={onCancel}>
          キャンセル
        </Button>
      </Flex>
    </VStack>
  );
}
