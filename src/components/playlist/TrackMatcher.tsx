import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  VStack,
  Badge,
  Spinner,
  HStack,
  RadioGroup,
  ProgressRoot,
  IconButton,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAudioPreview } from '@/hooks/useAudioPreview';
import { useTrackSearch } from '@/hooks/useTrackSearch';
import { useAudioPreview } from '@/hooks/useAudioPreview';
import { useTrackSearch } from '@/hooks/useTrackSearch';
import type { TrackSearchResult } from '@/services/music/types';
import type { Anime } from '@/types/anime';
import type { DraftTrack } from '@/types/playlist';

interface TrackMatcherProps {
  quarter: string;
  animeList: Anime[];
  onComplete: (tracks: DraftTrack[]) => void;
  onCancel: () => void;
  initialTracks?: DraftTrack[];
  startIndex?: number;
  singleEdit?: boolean;
}

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card.Root);

/**
 * ミリ秒を分:秒形式に変換
 */
function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * リリース日をフォーマット
 */
function formatReleaseDate(releaseDate: string): string {
  // Spotify APIは "YYYY-MM-DD", "YYYY-MM", "YYYY" のいずれかの形式で返す
  const parts = releaseDate.split('-');
  if (parts.length === 3) {
    // YYYY-MM-DD
    return `${parts[0]}/${parts[1]}/${parts[2]}`;
  } else if (parts.length === 2) {
    // YYYY-MM
    return `${parts[0]}/${parts[1]}`;
  } else {
    // YYYY
    return parts[0];
  }
}

export function TrackMatcher({
  animeList,
  onComplete,
  onCancel,
  initialTracks = [],
  startIndex = 0,
  singleEdit = false,
}: TrackMatcherProps) {
  const { searchTrack, canAutoMatch, getAutoMatchResult } = useTrackSearch();
  const { playingTrackId, playPreview, stopPreview, isLoading: isAudioLoading } = useAudioPreview();

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [matchedTracks, setMatchedTracks] = useState<DraftTrack[]>(initialTracks);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TrackSearchResult[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // 全楽曲リストを作成
  const allSongs = animeList.flatMap((anime) =>
    anime.songs.map((song) => ({
      animeId: anime.id,
      animeName: anime.name,
      song,
    })),
  );

  const totalSongs = allSongs.length;
  const currentSong = allSongs[currentIndex];

  // プロップ変化時にドラフトを同期
  useEffect(() => {
    setMatchedTracks(initialTracks);
  }, [initialTracks]);

  // 開始インデックスだけ同期
  useEffect(() => {
    setCurrentIndex(Math.min(startIndex, Math.max(0, totalSongs - 1)));
  }, [startIndex, totalSongs]);

  // 楽曲検索を実行
  useEffect(() => {
    if (!currentSong) return;

    const performSearch = async () => {
      stopPreview(); // 楽曲切り替え時に再生停止
      setIsSearching(true);
      setSearchResults([]);
      setSelectedTrackId(null);

      const results = await searchTrack(currentSong.song);
      setSearchResults(results);

      // 自動マッチング可能な場合は自動選択
      if (canAutoMatch(results)) {
        const autoMatch = getAutoMatchResult(results);
        if (autoMatch) {
          setSelectedTrackId(autoMatch.id);
        }
      }

      setIsSearching(false);
    };

    performSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const upsertDraftAndMaybeComplete = (draftTrack: DraftTrack) => {
    const nextTracks = [...matchedTracks];
    nextTracks[currentIndex] = draftTrack;
    setMatchedTracks(nextTracks);

    const isLast = currentIndex >= totalSongs - 1;
    if (singleEdit || isLast) {
      onComplete(nextTracks);
      return;
    }

    setCurrentIndex(currentIndex + 1);
  };

  const handleSelectTrack = (trackId: string) => {
    if (!currentSong) return;
    setSelectedTrackId(trackId);
    const selectedTrack = searchResults.find((r) => r.id === trackId);
    const draftTrack: DraftTrack = {
      animeId: currentSong.animeId,
      animeName: currentSong.animeName,
      song: currentSong.song,
      matchStatus: selectedTrack
        ? canAutoMatch(searchResults) && selectedTrack.confidence === 'exact'
          ? 'auto'
          : 'manual'
        : 'skipped',
      selectedTrack,
      candidates: searchResults,
    };
    upsertDraftAndMaybeComplete(draftTrack);
  };

  const handleSkip = () => {
    if (!currentSong) return;

    const draftTrack: DraftTrack = {
      animeId: currentSong.animeId,
      animeName: currentSong.animeName,
      song: currentSong.song,
      matchStatus: 'skipped',
      candidates: searchResults,
    };

    upsertDraftAndMaybeComplete(draftTrack);
  };

  const handleBack = () => {
    if (currentIndex === 0) return;
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    const prevDraft = matchedTracks[prevIndex];
    setSelectedTrackId(prevDraft?.selectedTrack?.id ?? null);
  };

  // 過去の選択を復元（戻る時/編集開始時用）
  useEffect(() => {
    const draft = matchedTracks[currentIndex];
    if (draft?.selectedTrack) {
      setSelectedTrackId(draft.selectedTrack.id);
    } else {
      setSelectedTrackId(null);
    }
  }, [currentIndex, matchedTracks, searchResults]);

  if (!currentSong) {
    return <Text color="fg.muted">楽曲がありません</Text>;
  }

  const progress = ((currentIndex + 1) / totalSongs) * 100;

  return (
    <VStack gap={6} align="stretch">
      {/* 進捗 */}
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Flex justify="space-between" mb={2} align="center">
          <Text fontSize="sm" fontWeight="medium" color="fg.muted">
            進捗
          </Text>
          <Text fontSize="md" fontWeight="semibold">
            {currentIndex + 1} / {totalSongs}
          </Text>
        </Flex>
        <ProgressRoot value={progress} colorScheme="green" borderRadius="md" h="6px" />
      </MotionBox>

      {/* 楽曲情報 */}
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        bg="bg.surface"
        borderWidth="1px"
        borderColor="border.default"
      >
        <Card.Header>
          <Heading size="sm" fontWeight="semibold" color="fg.default">
            楽曲情報
          </Heading>
        </Card.Header>
        <Card.Body>
          <VStack align="start" gap={2}>
            <Flex gap={2} flexWrap="wrap">
              <Badge colorScheme="gray" fontSize="xs">
                {currentSong.animeName}
              </Badge>
              <Badge colorScheme="gray" fontSize="xs">
                {currentSong.song.type}
              </Badge>
            </Flex>
            <Text fontWeight="semibold" fontSize="lg" color="fg.default">
              {currentSong.song.trackName}
            </Text>
            {currentSong.song.artist && (
              <Text fontSize="sm" color="fg.muted">
                アーティスト: {currentSong.song.artist}
              </Text>
            )}
          </VStack>
        </Card.Body>
      </MotionCard>

      {/* 検索結果 */}
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        bg="bg.surface"
        borderWidth="1px"
        borderColor="border.default"
      >
        <Card.Header>
          <Flex justify="space-between" align="center">
            <Heading size="sm" color="fg.default" fontWeight="semibold">
              マッチング結果
            </Heading>
            {isSearching && <Spinner size="sm" color="fg.muted" />}
          </Flex>
        </Card.Header>
        <Card.Body>
          {isSearching ? (
            <Flex justify="center" py={6} direction="column" align="center" gap={3}>
              <Spinner size="lg" color="fg.muted" />
              <Text color="fg.muted" fontSize="sm">
                検索中...
              </Text>
            </Flex>
          ) : searchResults.length === 0 ? (
            <Box py={6} textAlign="center">
              <Text color="fg.muted">楽曲が見つかりませんでした</Text>
            </Box>
          ) : (
            <VStack align="stretch" gap={3}>
              {canAutoMatch(searchResults) && (
                <Badge colorScheme="green" alignSelf="start" fontSize="sm">
                  完全一致が見つかりました
                </Badge>
              )}
              {!canAutoMatch(searchResults) && searchResults.length > 0 && (
                <Badge colorScheme="yellow" alignSelf="start" fontSize="sm">
                  複数の候補が見つかりました
                </Badge>
              )}

              <RadioGroup.Root value={selectedTrackId || undefined}>
                <VStack align="stretch" gap={2}>
                  <AnimatePresence>
                    {searchResults.map((result, index) => (
                      <MotionCard
                        key={result.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        variant="outline"
                        borderWidth="1px"
                        borderColor={
                          result.confidence === 'exact'
                            ? { base: 'green.500', _dark: 'green.600' }
                            : 'border.default'
                        }
                        bg={
                          result.confidence === 'exact'
                            ? { base: 'green.50', _dark: 'green.950' }
                            : 'bg.surface'
                        }
                        onClick={() => handleSelectTrack(result.id)}
                        cursor="pointer"
                        _hover={{
                          borderColor:
                            result.confidence === 'exact'
                              ? { base: 'green.600', _dark: 'green.500' }
                              : 'border.default',
                        }}
                      >
                        <Card.Body py={3}>
                          <Flex gap={3} align="start">
                            <RadioGroup.Item
                              value={result.id}
                              onChange={() => handleSelectTrack(result.id)}
                            />

                            {/* 再生ボタン */}
                            <IconButton
                              aria-label={playingTrackId === result.id ? '停止' : '再生'}
                              size="sm"
                              variant="ghost"
                              colorScheme="gray"
                              onClick={(e) => {
                                e.stopPropagation(); // カードクリック伝播防止
                                if (result.previewUrl) {
                                  playPreview(result.id, result.previewUrl);
                                }
                              }}
                              disabled={!result.previewUrl || isAudioLoading}
                            >
                              {playingTrackId === result.id ? (
                                <Pause size={16} />
                              ) : (
                                <Play size={16} />
                              )}
                            </IconButton>

                            <Box flex="1">
                              <Flex gap={2} align="center" mb={1} flexWrap="wrap">
                                <Text fontWeight="medium" color="fg.default" fontSize="sm">
                                  {result.name}
                                </Text>
                                {result.confidence === 'exact' && (
                                  <Badge colorScheme="green" size="sm">
                                    完全一致
                                  </Badge>
                                )}
                              </Flex>
                              <Text fontSize="sm" color="fg.muted">
                                {result.artist}
                                {result.durationMs && ` • ${formatDuration(result.durationMs)}`}
                                {result.releaseDate &&
                                  ` • ${formatReleaseDate(result.releaseDate)}`}
                              </Text>
                            </Box>
                          </Flex>
                        </Card.Body>
                      </MotionCard>
                    ))}
                  </AnimatePresence>
                </VStack>
              </RadioGroup.Root>
            </VStack>
          )}
        </Card.Body>
      </MotionCard>

      {/* アクション */}
      <HStack justify="space-between" align="center">
        <Button
          variant="outline"
          onClick={onCancel}
          borderColor="border.default"
          color="fg.default"
        >
          キャンセル
        </Button>
        <HStack>
          <Button
            variant="outline"
            onClick={handleBack}
            borderColor="border.default"
            color="fg.default"
            disabled={currentIndex === 0}
          >
            戻る
          </Button>
          <Button
            variant="outline"
            onClick={handleSkip}
            borderColor="border.default"
            color="fg.default"
          >
            スキップ
          </Button>
        </HStack>
      </HStack>
    </VStack>
  );
}
