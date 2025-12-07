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
  createToaster,
  Toaster,
  ToastRoot,
  ToastTitle,
  ToastCloseTrigger,
  ToastActionTrigger,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo, useState } from 'react';

import animeDataJson from '@/../public/data.json';
import { QuarterSelector } from '@/components/playlist/QuarterSelector';
import { TrackConfirmation } from '@/components/playlist/TrackConfirmation';
import { TrackMatcher } from '@/components/playlist/TrackMatcher';
import { Checkbox } from '@/components/ui/checkbox';
import { ColorModeButton } from '@/components/ui/color-mode';
import { useAnimeStatuses } from '@/hooks/useAnimeStatuses';
import { useMusicServiceAuth } from '@/hooks/useMusicServiceAuth';
import { usePlaylistDrafts } from '@/hooks/usePlaylistDrafts';
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';
import { getMusicServiceInstance } from '@/services/music';
import type { Anime } from '@/types/anime';
import type { DraftTrack, PlaylistDraft, SongFilterMode } from '@/types/playlist';
import { generateMergedPlaylistName, compareQuarters } from '@/utils/quarterHelper';

type Step = 'selector' | 'matcher' | 'confirmation';

const toaster = createToaster({
  placement: 'bottom',
  duration: 5000,
  max: 3,
});

function PlaylistPageContent() {
  const searchParams = useSearchParams();
  const { getAllDrafts, saveDraft, drafts } = usePlaylistDrafts();
  const { statuses: animeStatuses } = useAnimeStatuses();
  const { isAuthenticated, isChecking, login, checkAuth } = useMusicServiceAuth();

  // Spotify認証コールバックを処理（認証完了後に状態を再チェック）
  useSpotifyAuth(checkAuth);
  const allDrafts = getAllDrafts();

  const [currentStep, setCurrentStep] = useState<Step>('selector');
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [matchedTracks, setMatchedTracks] = useState<DraftTrack[]>([]);
  const [songFilter, setSongFilter] = useState<SongFilterMode>('oped');
  const [matchStartIndex, setMatchStartIndex] = useState(0);
  const [isEditingTrack, setIsEditingTrack] = useState(false);
  const [creatingPlaylistFor, setCreatingPlaylistFor] = useState<string | null>(null);
  const [selectedQuartersForMerge, setSelectedQuartersForMerge] = useState<Set<string>>(new Set());
  const [isCreatingMergedPlaylist, setIsCreatingMergedPlaylist] = useState(false);
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

  const handleCreatePlaylist = async (quarter: string) => {
    const draft = drafts.get(quarter);
    if (!draft) return;

    // マッチング済みの楽曲のみを抽出
    const matchedTracks = draft.tracks.filter((t) => t.selectedTrack);
    if (matchedTracks.length === 0) {
      toaster.create({
        title: 'エラー',
        description: 'プレイリストに追加できる楽曲がありません',
        type: 'error',
      });
      return;
    }

    setCreatingPlaylistFor(quarter);

    try {
      const musicService = getMusicServiceInstance();
      const trackUris = matchedTracks.map((t) => t.selectedTrack!.uri);

      const playlist = await musicService.createPlaylist({
        name: `${quarter} アニメ主題歌`,
        description: `${quarter}の視聴済みアニメの主題歌プレイリスト（${matchedTracks.length}曲）`,
        trackUris,
      });

      toaster.create({
        title: 'プレイリストを作成しました',
        description: `${playlist.name}（${matchedTracks.length}曲）`,
        type: 'success',
        action: {
          label: 'Spotifyで開く',
          onClick: () => {
            window.open(playlist.url, '_blank', 'noopener,noreferrer');
          },
        },
      });
    } catch (error) {
      console.error('Playlist creation failed:', error);
      toaster.create({
        title: 'プレイリスト作成に失敗しました',
        description: error instanceof Error ? error.message : '不明なエラーが発生しました',
        type: 'error',
      });
    } finally {
      setCreatingPlaylistFor(null);
    }
  };

  const handleCreateMergedPlaylist = async () => {
    if (selectedQuartersForMerge.size === 0) {
      toaster.create({
        title: 'エラー',
        description: 'クォーターを選択してください',
        type: 'error',
      });
      return;
    }

    // 選択されたクォーターのドラフトを取得
    const selectedDrafts = Array.from(selectedQuartersForMerge)
      .map((quarter) => ({ quarter, draft: drafts.get(quarter) }))
      .filter(
        (item): item is { quarter: string; draft: PlaylistDraft } => item.draft !== undefined,
      );

    if (selectedDrafts.length === 0) {
      toaster.create({
        title: 'エラー',
        description: '選択されたクォーターのプレイリストが見つかりません',
        type: 'error',
      });
      return;
    }

    // 全てのマッチング済みトラックを収集（重複を除く）
    const trackUrisSet = new Set<string>();
    const allMatchedTracks: DraftTrack[] = [];

    for (const { draft } of selectedDrafts) {
      for (const track of draft.tracks) {
        if (track.selectedTrack && !trackUrisSet.has(track.selectedTrack.uri)) {
          trackUrisSet.add(track.selectedTrack.uri);
          allMatchedTracks.push(track);
        }
      }
    }

    if (allMatchedTracks.length === 0) {
      toaster.create({
        title: 'エラー',
        description: 'プレイリストに追加できる楽曲がありません',
        type: 'error',
      });
      return;
    }

    setIsCreatingMergedPlaylist(true);

    try {
      const musicService = getMusicServiceInstance();
      const trackUris = Array.from(trackUrisSet);

      // クォーターをソートしてプレイリスト名を生成
      const sortedQuarters = Array.from(selectedQuartersForMerge).sort(compareQuarters);
      const playlistName = generateMergedPlaylistName(sortedQuarters);
      const description = `${sortedQuarters.join(', ')}の視聴済みアニメの主題歌プレイリスト（${allMatchedTracks.length}曲）`;

      const playlist = await musicService.createPlaylist({
        name: playlistName,
        description,
        trackUris,
      });

      toaster.create({
        title: 'プレイリストを作成しました',
        description: `${playlist.name}（${allMatchedTracks.length}曲）`,
        type: 'success',
        action: {
          label: 'Spotifyで開く',
          onClick: () => {
            window.open(playlist.url, '_blank', 'noopener,noreferrer');
          },
        },
      });

      // 選択をクリア
      setSelectedQuartersForMerge(new Set());
    } catch (error) {
      console.error('Merged playlist creation failed:', error);
      toaster.create({
        title: 'プレイリスト作成に失敗しました',
        description: error instanceof Error ? error.message : '不明なエラーが発生しました',
        type: 'error',
      });
    } finally {
      setIsCreatingMergedPlaylist(false);
    }
  };

  const handleToggleQuarterSelection = (quarter: string) => {
    setSelectedQuartersForMerge((prev) => {
      const next = new Set(prev);
      if (next.has(quarter)) {
        next.delete(quarter);
      } else {
        next.add(quarter);
      }
      return next;
    });
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

          {/* 認証状態チェック */}
          {isChecking ? (
            <Card.Root bg="bg.surface" borderWidth="1px" borderColor="border.default">
              <Card.Body>
                <Flex justify="center" align="center" py={4}>
                  <Spinner size="lg" color="blue.500" />
                  <Text ml={3} color="fg.muted">
                    認証状態を確認中...
                  </Text>
                </Flex>
              </Card.Body>
            </Card.Root>
          ) : !isAuthenticated ? (
            <Card.Root bg="bg.surface" borderWidth="1px" borderColor="border.default">
              <Card.Body>
                <VStack gap={4} align="stretch">
                  <Box>
                    <Heading as="h3" size="md" mb={2}>
                      Spotifyでログイン
                    </Heading>
                    <Text fontSize="sm" color="fg.muted">
                      プレイリストを作成するには、Spotifyアカウントでログインする必要があります。
                    </Text>
                  </Box>
                  <Button colorScheme="green" size="lg" onClick={login} width="full">
                    Spotifyでログイン
                  </Button>
                </VStack>
              </Card.Body>
            </Card.Root>
          ) : null}

          {/* メインコンテンツ */}
          {!isChecking && isAuthenticated && currentStep === 'selector' && (
            <>
              {/* 保存済みドラフト一覧 */}
              {allDrafts.length > 0 && (
                <Box>
                  <Flex justify="space-between" align="center" mb={3}>
                    <Heading as="h2" size={{ base: 'md', md: 'lg' }}>
                      保存済みプレイリスト
                    </Heading>
                    {selectedQuartersForMerge.size > 0 && (
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={handleCreateMergedPlaylist}
                        loading={isCreatingMergedPlaylist}
                        disabled={isCreatingMergedPlaylist}
                      >
                        選択したクォーターをまとめる ({selectedQuartersForMerge.size}件)
                      </Button>
                    )}
                  </Flex>
                  <Card.Root bg="bg.surface" borderWidth="1px" borderColor="border.default">
                    <VStack gap={0} align="stretch" divideY="1px" divideColor="border.default">
                      {allDrafts.map((draft) => (
                        <Box key={draft.quarter} p={4}>
                          <Flex justify="space-between" align="center" gap={4}>
                            <Flex align="center" gap={3} flex="1">
                              <Checkbox
                                checked={selectedQuartersForMerge.has(draft.quarter)}
                                onCheckedChange={() => handleToggleQuarterSelection(draft.quarter)}
                                disabled={
                                  isCreatingMergedPlaylist ||
                                  draft.tracks.filter((t) => t.selectedTrack).length === 0
                                }
                              />
                              <Box flex="1">
                                <Flex gap={2} align="center" mb={1}>
                                  <Text fontWeight="semibold" fontSize="md">
                                    {draft.quarter}
                                  </Text>
                                  <Badge colorScheme="green" fontSize="xs">
                                    {draft.tracks.filter((t) => t.selectedTrack).length} /{' '}
                                    {draft.tracks.length} 曲
                                  </Badge>
                                </Flex>
                                <Text fontSize="sm" color="fg.muted">
                                  更新: {new Date(draft.updatedAt).toLocaleString('ja-JP')}
                                </Text>
                              </Box>
                            </Flex>
                            <Flex gap={2}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSelectQuarter(draft.quarter)}
                                borderColor="border.default"
                                color="fg.default"
                                disabled={isCreatingMergedPlaylist}
                              >
                                編集
                              </Button>
                              <Button
                                size="sm"
                                colorScheme="green"
                                onClick={() => handleCreatePlaylist(draft.quarter)}
                                loading={creatingPlaylistFor === draft.quarter}
                                disabled={
                                  creatingPlaylistFor !== null ||
                                  isCreatingMergedPlaylist ||
                                  draft.tracks.filter((t) => t.selectedTrack).length === 0
                                }
                              >
                                プレイリストを作成
                              </Button>
                            </Flex>
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

          {!isChecking && isAuthenticated && currentStep === 'matcher' && selectedQuarter && (
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

          {!isChecking && isAuthenticated && currentStep === 'confirmation' && selectedQuarter && (
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
      <Toaster toaster={toaster}>
        {(toast) => (
          <ToastRoot key={toast.id} width="auto" maxW="90vw" p={2}>
            {toast.title && (
              <ToastTitle fontSize="sm" mb={toast.description ? 1 : 0}>
                {toast.title}
              </ToastTitle>
            )}
            {toast.description && (
              <Text fontSize="xs" color="fg.muted">
                {toast.description}
              </Text>
            )}
            <ToastCloseTrigger top={1} right={1} />
            {toast.action && (
              <ToastActionTrigger asChild>
                <Button size="xs" variant="outline" mt={1} onClick={toast.action.onClick}>
                  {toast.action.label}
                </Button>
              </ToastActionTrigger>
            )}
          </ToastRoot>
        )}
      </Toaster>
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
