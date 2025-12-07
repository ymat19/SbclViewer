'use client';

import {
  Box,
  Container,
  Heading,
  VStack,
  Text,
  Button,
  Flex,
  Card,
  Badge,
  Spinner,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo, useState } from 'react';

import animeDataJson from '@/../public/data.json';
import { QuarterSelector } from '@/components/playlist/QuarterSelector';
import { TrackConfirmation } from '@/components/playlist/TrackConfirmation';
import { TrackMatcher } from '@/components/playlist/TrackMatcher';
import { ColorModeButton } from '@/components/ui/color-mode';
import { useAnimeStatuses } from '@/hooks/useAnimeStatuses';
import { usePlaylistDrafts } from '@/hooks/usePlaylistDrafts';
import type { Anime } from '@/types/anime';
import type { DraftTrack, PlaylistDraft, SongFilterMode } from '@/types/playlist';

type Step = 'selector' | 'matcher' | 'confirmation';

function PlaylistPageContent() {
  const searchParams = useSearchParams();
  const { getAllDrafts, saveDraft, drafts } = usePlaylistDrafts();
  const { statuses: animeStatuses } = useAnimeStatuses();
  const allDrafts = getAllDrafts();

  const [currentStep, setCurrentStep] = useState<Step>('selector');
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [matchedTracks, setMatchedTracks] = useState<DraftTrack[]>([]);
  const [songFilter, setSongFilter] = useState<SongFilterMode>('oped');
  const [matchStartIndex, setMatchStartIndex] = useState(0);
  const [isEditingTrack, setIsEditingTrack] = useState(false);
  const animeData = animeDataJson as Anime[];
  const filterSongs = useCallback(
    (songs: Anime['songs']) =>
      songFilter === 'all' ? songs : songs.filter((song) => /^(op|ed)/i.test(song.type.trim())),
    [songFilter],
  );
  const filteredAnimeData = useMemo(
    () =>
      animeData
        .map((anime) => ({
          ...anime,
          songs: filterSongs(anime.songs),
        }))
        .filter((anime) => anime.songs.length > 0),
    [animeData, filterSongs],
  );

  const handleSelectQuarter = (quarter: string) => {
    setSelectedQuarter(quarter);
    // 既存のドラフトがあれば読み込む
    const existingDraft = drafts.get(quarter);
    if (existingDraft) {
      setMatchedTracks(existingDraft.tracks);
      if (existingDraft.songFilter) {
        setSongFilter(existingDraft.songFilter);
      }
      setMatchStartIndex(0);
      setIsEditingTrack(false);
      setCurrentStep(existingDraft.tracks.length > 0 ? 'confirmation' : 'matcher');
    } else {
      setMatchedTracks([]);
      setMatchStartIndex(0);
      setIsEditingTrack(false);
      setCurrentStep('matcher');
    }
  };

  const handleMatchingComplete = (tracks: DraftTrack[]) => {
    setMatchedTracks(tracks);
    setCurrentStep('confirmation');
    setIsEditingTrack(false);
  };

  const handleSave = () => {
    if (!selectedQuarter) return;

    const draft: PlaylistDraft = {
      quarter: selectedQuarter,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tracks: matchedTracks,
      songFilter,
    };

    saveDraft(selectedQuarter, draft);
    setCurrentStep('selector');
    setSelectedQuarter(null);
    setMatchedTracks([]);
  };

  const handleCancel = () => {
    if (selectedQuarter) {
      const existingDraft = drafts.get(selectedQuarter);
      if (existingDraft) {
        setMatchedTracks(existingDraft.tracks);
        if (existingDraft.songFilter) {
          setSongFilter(existingDraft.songFilter);
        }
      }
    }
    setCurrentStep('selector');
    setIsEditingTrack(false);
    setMatchStartIndex(0);
  };

  const handleEditTrack = (index: number) => {
    setMatchStartIndex(index);
    setIsEditingTrack(true);
    setCurrentStep('matcher');
  };

  const incomingQuarter = searchParams.get('quarter');
  const homeQuarter = selectedQuarter ?? incomingQuarter;
  const homeHref = homeQuarter ? `/?quarter=${encodeURIComponent(homeQuarter)}` : '/';

  const quarterAnimeList =
    selectedQuarter && currentStep !== 'selector'
      ? filteredAnimeData.filter(
          (anime) => anime.quarter === selectedQuarter && animeStatuses.get(anime.id) === 'watched',
        )
      : [];

  return (
    <Box minH="100vh" bg="bg.canvas" color="fg.default" py={6} px={4}>
      <Container maxW="6xl">
        <VStack gap={6} align="stretch">
          {/* ヘッダー */}
          <Flex justify="space-between" align="center" gap={4}>
            <Heading as="h1" size={{ base: 'lg', md: '2xl' }}>
              プレイリスト作成
            </Heading>
            <Flex gap={2} align="center">
              <Button
                asChild
                variant="outline"
                size={{ base: 'sm', md: 'md' }}
                borderColor="border.default"
                color="fg.default"
              >
                <Link href={homeHref}>通常モードに戻る</Link>
              </Button>
              <ColorModeButton />
            </Flex>
          </Flex>

          {/* 説明 */}
          {currentStep === 'selector' && (
            <Card.Root bg="bg.surface" borderWidth="1px" borderColor="border.default">
              <Card.Body>
                <Text mb={2} fontWeight="semibold" fontSize="sm" color="fg.default">
                  プレイリスト作成の流れ
                </Text>
                <VStack align="start" gap={1} fontSize="sm" color="fg.muted">
                  <Text>1. 視聴済みアニメがあるクォーターを選択</Text>
                  <Text>2. 楽曲を検索してマッチング（モックサービス使用中）</Text>
                  <Text>3. 確認画面で楽曲を確定してローカルに保存</Text>
                  <Text>4. 保存済みプレイリストから音楽サービスのプレイリストを作成</Text>
                </VStack>
              </Card.Body>
            </Card.Root>
          )}

          {/* メインコンテンツ */}
          {currentStep === 'selector' && (
            <>
              {/* 保存済みドラフト一覧 */}
              {allDrafts.length > 0 && (
                <Box>
                  <Heading as="h2" size={{ base: 'md', md: 'lg' }} mb={3}>
                    保存済みプレイリスト
                  </Heading>
                  <Card.Root bg="bg.surface" borderWidth="1px" borderColor="border.default">
                    <VStack gap={0} align="stretch" divideY="1px" divideColor="border.default">
                      {allDrafts.map((draft) => (
                        <Box key={draft.quarter} p={4}>
                          <Flex justify="space-between" align="center" gap={4}>
                            <Box>
                              <Flex gap={2} align="center" mb={1}>
                                <Text fontWeight="semibold" fontSize="md">
                                  {draft.quarter}
                                </Text>
                                <Badge colorScheme="green" fontSize="xs">
                                  {draft.tracks.length} 曲
                                </Badge>
                              </Flex>
                              <Text fontSize="sm" color="fg.muted">
                                更新: {new Date(draft.updatedAt).toLocaleString('ja-JP')}
                              </Text>
                            </Box>
                            <Button
                              size="sm"
                              colorScheme="green"
                              onClick={() => handleSelectQuarter(draft.quarter)}
                            >
                              編集
                            </Button>
                          </Flex>
                        </Box>
                      ))}
                    </VStack>
                  </Card.Root>
                </Box>
              )}

              {/* クォーター選択 */}
              <Box>
                <Heading as="h2" size={{ base: 'md', md: 'lg' }} mb={3}>
                  新しくプレイリストを作成
                </Heading>
                <Box mb={3}>
                  <Text color="fg.default" fontSize="sm" mb={2}>
                    対象楽曲
                  </Text>
                  <Flex gap={2} wrap="wrap">
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant={songFilter === 'oped' ? 'solid' : 'outline'}
                      onClick={() => setSongFilter('oped')}
                    >
                      OP/EDのみ
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="gray"
                      variant={songFilter === 'all' ? 'solid' : 'outline'}
                      onClick={() => setSongFilter('all')}
                    >
                      全ての楽曲
                    </Button>
                  </Flex>
                  <Text color="fg.muted" fontSize="xs" mt={1}>
                    OP/EDのみではtypeがOP/EDの曲だけを対象にします。
                  </Text>
                </Box>
                <Card.Root bg="bg.surface" borderWidth="1px" borderColor="border.default">
                  <Card.Body>
                    <QuarterSelector
                      animeData={filteredAnimeData}
                      animeStatuses={animeStatuses}
                      drafts={drafts}
                      onSelectQuarter={handleSelectQuarter}
                    />
                  </Card.Body>
                </Card.Root>
              </Box>
            </>
          )}

          {currentStep === 'matcher' && selectedQuarter && (
            <TrackMatcher
              quarter={selectedQuarter}
              animeList={quarterAnimeList}
              onComplete={handleMatchingComplete}
              onCancel={handleCancel}
              initialTracks={matchedTracks}
              startIndex={matchStartIndex}
              singleEdit={isEditingTrack}
            />
          )}

          {currentStep === 'confirmation' && selectedQuarter && (
            <TrackConfirmation
              quarter={selectedQuarter}
              tracks={matchedTracks}
              onSave={handleSave}
              onCancel={handleCancel}
              onEditTrack={handleEditTrack}
            />
          )}
        </VStack>
      </Container>
    </Box>
  );
}

export default function PlaylistPage() {
  return (
    <Suspense
      fallback={
        <Flex minH="100vh" alignItems="center" justifyContent="center">
          <VStack gap={4}>
            <Spinner size="xl" color="blue.500" />
            <Text color="fg.muted">Loading...</Text>
          </VStack>
        </Flex>
      }
    >
      <PlaylistPageContent />
    </Suspense>
  );
}
