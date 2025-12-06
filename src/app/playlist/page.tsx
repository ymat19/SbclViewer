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
import { useEffect, useState } from 'react';

import { QuarterSelector } from '@/components/playlist/QuarterSelector';
import { TrackConfirmation } from '@/components/playlist/TrackConfirmation';
import { TrackMatcher } from '@/components/playlist/TrackMatcher';
import { ColorModeButton } from '@/components/ui/color-mode';
import { useAnimeStatuses } from '@/hooks/useAnimeStatuses';
import { usePlaylistDrafts } from '@/hooks/usePlaylistDrafts';
import type { Anime } from '@/types/anime';
import type { DraftTrack, PlaylistDraft } from '@/types/playlist';

type Step = 'selector' | 'matcher' | 'confirmation';

export default function PlaylistPage() {
  const { getAllDrafts, saveDraft, drafts } = usePlaylistDrafts();
  const { statuses: animeStatuses } = useAnimeStatuses();
  const allDrafts = getAllDrafts();

  const [animeData, setAnimeData] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<Step>('selector');
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [matchedTracks, setMatchedTracks] = useState<DraftTrack[]>([]);

  // Load anime data
  useEffect(() => {
    fetch('/data.json')
      .then((res) => res.json())
      .then((data: Anime[]) => {
        setAnimeData(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load anime data:', error);
        setIsLoading(false);
      });
  }, []);

  const handleSelectQuarter = (quarter: string) => {
    setSelectedQuarter(quarter);
    // 既存のドラフトがあれば読み込む
    const existingDraft = drafts.get(quarter);
    if (existingDraft) {
      setMatchedTracks(existingDraft.tracks);
    } else {
      setMatchedTracks([]);
    }
    setCurrentStep('matcher');
  };

  const handleMatchingComplete = (tracks: DraftTrack[]) => {
    setMatchedTracks(tracks);
    setCurrentStep('confirmation');
  };

  const handleSave = () => {
    if (!selectedQuarter) return;

    const draft: PlaylistDraft = {
      quarter: selectedQuarter,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tracks: matchedTracks,
    };

    saveDraft(selectedQuarter, draft);
    setCurrentStep('selector');
    setSelectedQuarter(null);
    setMatchedTracks([]);
  };

  const handleCancel = () => {
    setCurrentStep('selector');
    setSelectedQuarter(null);
    setMatchedTracks([]);
  };

  const handleEditTrack = (index: number) => {
    // TODO: 個別の楽曲を再選択する機能（Phase 4で実装）
    console.log('Edit track at index:', index);
  };

  if (isLoading) {
    return (
      <Flex minH="100vh" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Spinner size="xl" color="blue.500" />
          <Text color="fg.muted">Loading...</Text>
        </VStack>
      </Flex>
    );
  }

  const quarterAnimeList =
    selectedQuarter && currentStep !== 'selector'
      ? animeData.filter(
          (anime) =>
            anime.quarter === selectedQuarter &&
            animeStatuses.get(anime.id) === 'watched' &&
            anime.songs.length > 0,
        )
      : [];

  return (
    <Box minH="100vh" bg="gray.950" py={6} px={4}>
      <Container maxW="6xl">
        <VStack gap={6} align="stretch">
          {/* ヘッダー */}
          <Flex justify="space-between" align="center" gap={4}>
            <Heading as="h1" size={{ base: 'lg', md: '2xl' }} color="white">
              プレイリスト作成
            </Heading>
            <Flex gap={2} align="center">
              <Link href="/" passHref legacyBehavior>
                <Button
                  as="a"
                  variant="outline"
                  size={{ base: 'sm', md: 'md' }}
                  borderColor="gray.600"
                  color="gray.300"
                >
                  通常モードに戻る
                </Button>
              </Link>
              <ColorModeButton />
            </Flex>
          </Flex>

          {/* 説明 */}
          {currentStep === 'selector' && (
            <Card.Root bg="gray.800" borderWidth="1px" borderColor="gray.700">
              <Card.Body>
                <Text mb={2} fontWeight="semibold" color="gray.200" fontSize="sm">
                  プレイリスト作成の流れ
                </Text>
                <VStack align="start" gap={1} fontSize="sm" color="gray.400">
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
                  <Heading as="h2" size={{ base: 'md', md: 'lg' }} mb={3} color="gray.200">
                    保存済みプレイリスト
                  </Heading>
                  <Card.Root bg="gray.800" borderWidth="1px" borderColor="gray.700">
                    <VStack gap={0} align="stretch" divideY="1px" divideColor="gray.700">
                      {allDrafts.map((draft) => (
                        <Box key={draft.quarter} p={4}>
                          <Flex justify="space-between" align="center" gap={4}>
                            <Box>
                              <Flex gap={2} align="center" mb={1}>
                                <Text fontWeight="semibold" fontSize="md" color="white">
                                  {draft.quarter}
                                </Text>
                                <Badge colorScheme="green" fontSize="xs">
                                  {draft.tracks.length} 曲
                                </Badge>
                              </Flex>
                              <Text fontSize="sm" color="gray.400">
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
                <Heading as="h2" size={{ base: 'md', md: 'lg' }} mb={3} color="gray.200">
                  新しくプレイリストを作成
                </Heading>
                <Card.Root bg="gray.800" borderWidth="1px" borderColor="gray.700">
                  <Card.Body>
                    <QuarterSelector
                      animeData={animeData}
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
