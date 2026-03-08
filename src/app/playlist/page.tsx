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
import { ArrowLeft, ListMusic, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useMemo, useState } from 'react';

import animeDataJson from '@/../public/data.json';
import { AIAssist } from '@/components/playlist/AIAssist';
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
import type { Anime, AnimeStatus } from '@/types/anime';
import type { DraftTrack, PlaylistDraft, SongFilterMode } from '@/types/playlist';
import {
  generateMergedPlaylistName,
  compareQuarters,
  quarterToJapaneseName,
} from '@/utils/quarterHelper';

type Step =
  | 'selector'
  | 'method-select'
  | 'matcher'
  | 'ai-assist'
  | 'confirmation'
  | 'multi-ai-select'
  | 'multi-ai-assist';

const toaster = createToaster({
  placement: 'bottom',
  duration: 5000,
  max: 3,
});

interface MultiAIQuarterSelectProps {
  animeData: Anime[];
  animeStatuses: Map<string, AnimeStatus>;
  selectedQuarters: Set<string>;
  onToggleQuarter: (quarter: string) => void;
  onStart: () => void;
  onCancel: () => void;
}

function MultiAIQuarterSelect({
  animeData,
  animeStatuses,
  selectedQuarters,
  onToggleQuarter,
  onStart,
  onCancel,
}: MultiAIQuarterSelectProps) {
  const watchedQuarters = Array.from(
    new Set(
      animeData
        .filter((anime) => animeStatuses.get(anime.id) === 'watched' && anime.songs.length > 0)
        .map((anime) => anime.quarter),
    ),
  )
    .sort()
    .reverse();

  const allSelected =
    watchedQuarters.length > 0 && watchedQuarters.every((q) => selectedQuarters.has(q));

  const handleToggleAll = () => {
    if (allSelected) {
      // 全解除
      for (const q of watchedQuarters) {
        if (selectedQuarters.has(q)) onToggleQuarter(q);
      }
    } else {
      // 全選択
      for (const q of watchedQuarters) {
        if (!selectedQuarters.has(q)) onToggleQuarter(q);
      }
    }
  };

  return (
    <VStack gap={4} align="stretch">
      <Box className="glass-card" p={4}>
        <Flex justify="space-between" align="center" mb={2}>
          <Heading as="h2" size="sm">
            まとめてAI連携
          </Heading>
          <Button
            size="xs"
            variant="ghost"
            color="fg.muted"
            _hover={{ color: '#63b3ed' }}
            onClick={handleToggleAll}
          >
            {allSelected ? '全解除' : '全選択'}
          </Button>
        </Flex>
        <Text fontSize="xs" color="fg.muted" mb={4}>
          AI連携するシーズンを選択してください。
        </Text>
        <VStack gap={2} align="stretch">
          {watchedQuarters.map((quarter) => {
            const quarterAnime = animeData.filter(
              (anime) =>
                anime.quarter === quarter &&
                animeStatuses.get(anime.id) === 'watched' &&
                anime.songs.length > 0,
            );
            const totalSongs = quarterAnime.reduce((sum, anime) => sum + anime.songs.length, 0);

            return (
              <Box
                key={quarter}
                p={3}
                borderWidth="1px"
                borderRadius="md"
                borderColor={
                  selectedQuarters.has(quarter) ? 'rgba(99, 179, 237, 0.5)' : 'border.default'
                }
                bg={selectedQuarters.has(quarter) ? 'rgba(99, 179, 237, 0.08)' : 'bg.surface'}
                cursor="pointer"
                onClick={() => onToggleQuarter(quarter)}
                _hover={{ borderColor: 'rgba(99, 179, 237, 0.3)' }}
              >
                <Flex align="center" gap={3}>
                  <Checkbox
                    checked={selectedQuarters.has(quarter)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Box flex="1">
                    <Text fontWeight="semibold" fontSize="sm">
                      {quarterToJapaneseName(quarter)}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {quarterAnime.length}作品 ・ {totalSongs}曲
                    </Text>
                  </Box>
                </Flex>
              </Box>
            );
          })}
        </VStack>
      </Box>

      <Flex justify="space-between" px={1}>
        <Button variant="ghost" size="xs" color="fg.muted" onClick={onCancel}>
          キャンセル
        </Button>
        <Button
          size="sm"
          bg="rgba(99, 179, 237, 0.15)"
          color="#63b3ed"
          _hover={{ bg: 'rgba(99, 179, 237, 0.25)' }}
          borderRadius="8px"
          onClick={onStart}
          disabled={selectedQuarters.size === 0}
        >
          AI連携開始 ({selectedQuarters.size}シーズン)
        </Button>
      </Flex>
    </VStack>
  );
}

function PlaylistPageContent() {
  const searchParams = useSearchParams();
  const { getAllDrafts, saveDraft, saveDrafts, deleteDraft, drafts } = usePlaylistDrafts();
  const { statuses: animeStatuses } = useAnimeStatuses();
  const { isAuthenticated, isChecking, login, checkAuth } = useMusicServiceAuth();

  useSpotifyAuth(checkAuth);
  const allDrafts = getAllDrafts().sort((a, b) => compareQuarters(b.quarter, a.quarter));

  const [currentStep, setCurrentStep] = useState<Step>('selector');
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [matchedTracks, setMatchedTracks] = useState<DraftTrack[]>([]);
  const [songFilter, setSongFilter] = useState<SongFilterMode>('oped');
  const [matchStartIndex, setMatchStartIndex] = useState(0);
  const [isEditingTrack, setIsEditingTrack] = useState(false);
  const [creatingPlaylistFor, setCreatingPlaylistFor] = useState<string | null>(null);
  const [selectedQuartersForMerge, setSelectedQuartersForMerge] = useState<Set<string>>(new Set());
  const [isCreatingMergedPlaylist, setIsCreatingMergedPlaylist] = useState(false);
  const [selectedQuartersForAI, setSelectedQuartersForAI] = useState<Set<string>>(new Set());
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
      setCurrentStep('method-select');
    }
  };

  const handleMatchingComplete = (tracks: DraftTrack[]) => {
    setMatchedTracks(tracks);
    setCurrentStep('confirmation');
    setIsEditingTrack(false);
  };

  const handleAIComplete = (resultsByQuarter: Map<string, DraftTrack[]>) => {
    if (resultsByQuarter.size === 1 && selectedQuarter) {
      // 単一シーズン: 確認画面へ
      const tracks = resultsByQuarter.get(selectedQuarter) ?? [];
      handleMatchingComplete(tracks);
    } else {
      // 複数シーズン: 各シーズンのドラフトを一括保存してセレクターに戻る
      const draftsToSave = new Map<string, PlaylistDraft>();
      const now = new Date().toISOString();
      for (const [quarter, tracks] of resultsByQuarter) {
        draftsToSave.set(quarter, {
          quarter,
          createdAt: now,
          updatedAt: now,
          tracks,
          songFilter,
        });
      }
      saveDrafts(draftsToSave);
      setSelectedQuartersForAI(new Set());
      setCurrentStep('selector');
      toaster.create({
        title: `${resultsByQuarter.size}シーズンのドラフトを保存しました`,
        type: 'success',
      });
    }
  };

  const handleResetDraft = (quarter: string) => {
    if (
      window.confirm(
        `${quarter} のプレイリスト作成状況をリセットしますか？\n（視聴状況は保持されます）`,
      )
    ) {
      deleteDraft(quarter);
      toaster.create({
        title: `${quarter} のドラフトをリセットしました`,
        type: 'success',
      });
    }
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

    const matchedTracks = draft.tracks.filter((t) => t.selectedTrack);
    if (matchedTracks.length === 0) {
      toaster.create({
        title: 'プレイリストに追加できる楽曲がありません',
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
        title: `${playlist.name}を作成しました`,
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
        title: error instanceof Error ? error.message : 'プレイリスト作成に失敗しました',
        type: 'error',
      });
    } finally {
      setCreatingPlaylistFor(null);
    }
  };

  const handleCreateMergedPlaylist = async () => {
    if (selectedQuartersForMerge.size === 0) {
      toaster.create({
        title: 'クォーターを選択してください',
        type: 'error',
      });
      return;
    }

    const selectedDrafts = Array.from(selectedQuartersForMerge)
      .sort((a, b) => compareQuarters(b, a))
      .map((quarter) => ({ quarter, draft: drafts.get(quarter) }))
      .filter(
        (item): item is { quarter: string; draft: PlaylistDraft } => item.draft !== undefined,
      );

    if (selectedDrafts.length === 0) {
      toaster.create({
        title: 'プレイリストが見つかりません',
        type: 'error',
      });
      return;
    }

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
        title: 'プレイリストに追加できる楽曲がありません',
        type: 'error',
      });
      return;
    }

    setIsCreatingMergedPlaylist(true);

    try {
      const musicService = getMusicServiceInstance();
      const trackUris = allMatchedTracks.map((t) => t.selectedTrack!.uri);

      const sortedQuarters = Array.from(selectedQuartersForMerge).sort(compareQuarters);
      const playlistName = generateMergedPlaylistName(sortedQuarters);
      const first = sortedQuarters[0]?.toUpperCase() ?? '';
      const last = sortedQuarters[sortedQuarters.length - 1]?.toUpperCase() ?? '';
      const description =
        sortedQuarters.length <= 8
          ? `${sortedQuarters.join(', ')}の視聴済みアニメの主題歌プレイリスト（${allMatchedTracks.length}曲）`
          : `${first}〜${last}（${sortedQuarters.length}シーズン）の視聴済みアニメの主題歌プレイリスト（${allMatchedTracks.length}曲）`;

      const playlist = await musicService.createPlaylist({
        name: playlistName,
        description,
        trackUris,
      });

      toaster.create({
        title: `${playlist.name}を作成しました`,
        type: 'success',
        action: {
          label: 'Spotifyで開く',
          onClick: () => {
            window.open(playlist.url, '_blank', 'noopener,noreferrer');
          },
        },
      });

      setSelectedQuartersForMerge(new Set());
    } catch (error) {
      console.error('Merged playlist creation failed:', error);
      toaster.create({
        title: error instanceof Error ? error.message : 'プレイリスト作成に失敗しました',
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
    <Box
      minH="100vh"
      bg="bg.canvas"
      color="fg.default"
      pt={3}
      pb={6}
      px={3}
      position="relative"
      zIndex={1}
    >
      <Container maxW="6xl" px={0}>
        <VStack gap={4} align="stretch">
          {/* Header */}
          <Flex justify="space-between" align="center" px={1}>
            <Flex align="center" gap={2}>
              <Button
                asChild
                variant="ghost"
                size="sm"
                color="fg.muted"
                px={2}
                borderRadius="10px"
                h="34px"
              >
                <Link href={homeHref}>
                  <ArrowLeft size={16} />
                </Link>
              </Button>
              <Flex align="center" gap={2}>
                <Box
                  w="32px"
                  h="32px"
                  borderRadius="10px"
                  bg="rgba(255, 107, 107, 0.15)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                >
                  <ListMusic size={16} color="#ff6b6b" />
                </Box>
                <Heading as="h1" size="md">
                  プレイリスト
                </Heading>
              </Flex>
            </Flex>
            <ColorModeButton />
          </Flex>

          {/* Instructions */}
          {currentStep === 'selector' && (
            <Box className="glass-card" p={3}>
              <VStack align="start" gap={1} fontSize="xs" color="fg.muted">
                <Text>1. クォーターを選択</Text>
                <Text>2. 楽曲を検索・マッチング</Text>
                <Text>3. 確認して保存</Text>
                <Text>4. プレイリストを作成</Text>
              </VStack>
            </Box>
          )}

          {/* Auth check */}
          {isChecking ? (
            <Flex justify="center" align="center" py={8}>
              <Spinner size="lg" color="#ff6b6b" />
              <Text ml={3} color="fg.muted" fontSize="sm">
                認証確認中...
              </Text>
            </Flex>
          ) : !isAuthenticated ? (
            <Box className="glass-card" p={5}>
              <VStack gap={4} align="stretch">
                <Box>
                  <Heading as="h3" size="sm" mb={2}>
                    Spotifyでログイン
                  </Heading>
                  <Text fontSize="xs" color="fg.muted">
                    プレイリスト作成にはSpotifyアカウントが必要です。
                  </Text>
                </Box>
                <Button
                  size="lg"
                  onClick={login}
                  width="full"
                  bg="#1DB954"
                  color="white"
                  _hover={{ bg: '#1ed760' }}
                  borderRadius="12px"
                  h="48px"
                  fontSize="sm"
                  fontWeight="semibold"
                >
                  Spotifyでログイン
                </Button>
              </VStack>
            </Box>
          ) : null}

          {/* Main content */}
          {!isChecking && isAuthenticated && currentStep === 'selector' && (
            <>
              {/* Saved drafts */}
              {allDrafts.length > 0 && (
                <Box>
                  <Flex justify="space-between" align="center" mb={3} px={1}>
                    <Flex align="center" gap={2}>
                      <Heading as="h2" size="sm">
                        保存済み
                      </Heading>
                      {(() => {
                        const mergeableQuarters = allDrafts
                          .filter((d) => d.tracks.filter((t) => t.selectedTrack).length > 0)
                          .map((d) => d.quarter);
                        const allMergeSelected =
                          mergeableQuarters.length > 0 &&
                          mergeableQuarters.every((q) => selectedQuartersForMerge.has(q));
                        return (
                          <Button
                            size="xs"
                            variant="ghost"
                            color="fg.muted"
                            _hover={{ color: '#ff6b6b' }}
                            onClick={() => {
                              if (allMergeSelected) {
                                setSelectedQuartersForMerge(new Set());
                              } else {
                                setSelectedQuartersForMerge(new Set(mergeableQuarters));
                              }
                            }}
                            disabled={isCreatingMergedPlaylist || mergeableQuarters.length === 0}
                          >
                            {allMergeSelected ? '全解除' : '全選択'}
                          </Button>
                        );
                      })()}
                    </Flex>
                    {selectedQuartersForMerge.size > 0 && (
                      <Button
                        size="xs"
                        bg="rgba(255, 107, 107, 0.15)"
                        color="#ff6b6b"
                        _hover={{ bg: 'rgba(255, 107, 107, 0.25)' }}
                        borderRadius="8px"
                        fontSize="2xs"
                        onClick={handleCreateMergedPlaylist}
                        loading={isCreatingMergedPlaylist}
                        disabled={isCreatingMergedPlaylist}
                      >
                        まとめる ({selectedQuartersForMerge.size})
                      </Button>
                    )}
                  </Flex>
                  <VStack gap={2} align="stretch">
                    {allDrafts.map((draft) => (
                      <Box key={draft.quarter} className="glass-card" p={3}>
                        <Flex align="center" gap={2} mb={2}>
                          <Checkbox
                            checked={selectedQuartersForMerge.has(draft.quarter)}
                            onCheckedChange={() => handleToggleQuarterSelection(draft.quarter)}
                            disabled={
                              isCreatingMergedPlaylist ||
                              draft.tracks.filter((t) => t.selectedTrack).length === 0
                            }
                          />
                          <Box flex="1">
                            <Flex gap={2} align="center">
                              <Text fontWeight="semibold" fontSize="sm">
                                {draft.quarter}
                              </Text>
                              <Badge fontSize="2xs" className="badge-teal">
                                {draft.tracks.filter((t) => t.selectedTrack).length}/
                                {draft.tracks.length}曲
                              </Badge>
                            </Flex>
                            <Text fontSize="2xs" color="fg.muted" mt={0.5}>
                              {new Date(draft.updatedAt).toLocaleString('ja-JP')}
                            </Text>
                          </Box>
                        </Flex>
                        <Flex gap={2}>
                          <Button
                            size="xs"
                            flex="1"
                            variant="outline"
                            onClick={() => handleSelectQuarter(draft.quarter)}
                            borderColor="rgba(255, 255, 255, 0.1)"
                            color="fg.default"
                            borderRadius="8px"
                            h="34px"
                            fontSize="xs"
                            disabled={isCreatingMergedPlaylist}
                          >
                            編集
                          </Button>
                          <Button
                            size="xs"
                            flex="1"
                            bg="#1DB954"
                            color="white"
                            _hover={{ bg: '#1ed760' }}
                            borderRadius="8px"
                            h="34px"
                            fontSize="xs"
                            onClick={() => handleCreatePlaylist(draft.quarter)}
                            loading={creatingPlaylistFor === draft.quarter}
                            disabled={
                              creatingPlaylistFor !== null ||
                              isCreatingMergedPlaylist ||
                              draft.tracks.filter((t) => t.selectedTrack).length === 0
                            }
                          >
                            作成
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            color="fg.muted"
                            _hover={{ color: 'red.400' }}
                            borderRadius="8px"
                            h="34px"
                            px={2}
                            onClick={() => handleResetDraft(draft.quarter)}
                            disabled={isCreatingMergedPlaylist || creatingPlaylistFor !== null}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </Flex>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              )}

              {/* Quarter selector */}
              <Box>
                <Heading as="h2" size="sm" mb={3} px={1}>
                  新規作成
                </Heading>
                <Box mb={3} px={1}>
                  <Flex gap={2} wrap="wrap">
                    <Button
                      size="xs"
                      bg={songFilter === 'oped' ? 'rgba(255, 107, 107, 0.2)' : 'transparent'}
                      color={songFilter === 'oped' ? '#ff6b6b' : 'fg.muted'}
                      border="1px solid"
                      borderColor={
                        songFilter === 'oped'
                          ? 'rgba(255, 107, 107, 0.3)'
                          : 'rgba(255, 255, 255, 0.1)'
                      }
                      borderRadius="8px"
                      h="30px"
                      fontSize="xs"
                      onClick={() => setSongFilter('oped')}
                    >
                      OP/EDのみ
                    </Button>
                    <Button
                      size="xs"
                      bg={songFilter === 'all' ? 'rgba(255, 179, 71, 0.2)' : 'transparent'}
                      color={songFilter === 'all' ? '#ffb347' : 'fg.muted'}
                      border="1px solid"
                      borderColor={
                        songFilter === 'all'
                          ? 'rgba(255, 179, 71, 0.3)'
                          : 'rgba(255, 255, 255, 0.1)'
                      }
                      borderRadius="8px"
                      h="30px"
                      fontSize="xs"
                      onClick={() => setSongFilter('all')}
                    >
                      全楽曲
                    </Button>
                    <Button
                      size="xs"
                      bg="rgba(99, 179, 237, 0.2)"
                      color="#63b3ed"
                      border="1px solid"
                      borderColor="rgba(99, 179, 237, 0.3)"
                      borderRadius="8px"
                      h="30px"
                      fontSize="xs"
                      onClick={() => setCurrentStep('multi-ai-select')}
                    >
                      まとめてAI連携
                    </Button>
                  </Flex>
                </Box>
                <Card.Root className="glass-card">
                  <Card.Body p={3}>
                    <QuarterSelector
                      animeData={filteredAnimeData}
                      animeStatuses={animeStatuses}
                      drafts={drafts}
                      onSelectQuarter={handleSelectQuarter}
                    />
                  </Card.Body>
                </Card.Root>
              </Box>

              {/* データリセット */}
              <Box px={1} pt={2}>
                <Button
                  variant="ghost"
                  size="xs"
                  color="fg.muted"
                  _hover={{ color: 'red.400' }}
                  onClick={() => {
                    if (
                      window.confirm(
                        'すべてのローカルデータ（視聴状況・ドラフト・認証情報）をリセットしますか？',
                      )
                    ) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                >
                  すべてのデータをリセット
                </Button>
              </Box>
            </>
          )}

          {!isChecking && isAuthenticated && currentStep === 'method-select' && selectedQuarter && (
            <Box className="glass-card" p={5}>
              <VStack gap={4} align="stretch">
                <Heading as="h3" size="sm">
                  マッチング方法を選択
                </Heading>
                <Text fontSize="xs" color="fg.muted">
                  楽曲とSpotifyトラックのマッチング方法を選んでください。
                </Text>
                <VStack gap={2} align="stretch">
                  <Button
                    size="lg"
                    bg="rgba(255, 107, 107, 0.15)"
                    color="#ff6b6b"
                    _hover={{ bg: 'rgba(255, 107, 107, 0.25)' }}
                    borderRadius="12px"
                    h="48px"
                    fontSize="sm"
                    fontWeight="semibold"
                    onClick={() => setCurrentStep('matcher')}
                  >
                    手動マッチング
                  </Button>
                  <Button
                    size="lg"
                    bg="rgba(99, 179, 237, 0.15)"
                    color="#63b3ed"
                    _hover={{ bg: 'rgba(99, 179, 237, 0.25)' }}
                    borderRadius="12px"
                    h="48px"
                    fontSize="sm"
                    fontWeight="semibold"
                    onClick={() => setCurrentStep('ai-assist')}
                  >
                    AI連携
                  </Button>
                </VStack>
                <Button variant="ghost" size="xs" color="fg.muted" onClick={handleCancel}>
                  キャンセル
                </Button>
              </VStack>
            </Box>
          )}

          {!isChecking && isAuthenticated && currentStep === 'ai-assist' && selectedQuarter && (
            <AIAssist
              entries={[{ quarter: selectedQuarter, animeList: quarterAnimeList }]}
              onComplete={handleAIComplete}
              onCancel={handleCancel}
              onSwitchToManual={() => setCurrentStep('matcher')}
            />
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

          {/* 複数シーズンAI連携 - シーズン選択 */}
          {!isChecking && isAuthenticated && currentStep === 'multi-ai-select' && (
            <MultiAIQuarterSelect
              animeData={filteredAnimeData}
              animeStatuses={animeStatuses}
              selectedQuarters={selectedQuartersForAI}
              onToggleQuarter={(quarter) => {
                setSelectedQuartersForAI((prev) => {
                  const next = new Set(prev);
                  if (next.has(quarter)) {
                    next.delete(quarter);
                  } else {
                    next.add(quarter);
                  }
                  return next;
                });
              }}
              onStart={() => setCurrentStep('multi-ai-assist')}
              onCancel={() => {
                setSelectedQuartersForAI(new Set());
                setCurrentStep('selector');
              }}
            />
          )}

          {/* 複数シーズンAI連携 - AI処理 */}
          {!isChecking &&
            isAuthenticated &&
            currentStep === 'multi-ai-assist' &&
            selectedQuartersForAI.size > 0 && (
              <AIAssist
                entries={Array.from(selectedQuartersForAI)
                  .sort()
                  .reverse()
                  .map((quarter) => ({
                    quarter,
                    animeList: filteredAnimeData.filter(
                      (anime) =>
                        anime.quarter === quarter && animeStatuses.get(anime.id) === 'watched',
                    ),
                  }))}
                onComplete={handleAIComplete}
                onCancel={() => {
                  setSelectedQuartersForAI(new Set());
                  setCurrentStep('selector');
                }}
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
        <Flex minH="100vh" alignItems="center" justifyContent="center" bg="bg.canvas">
          <VStack gap={4}>
            <Spinner size="xl" color="#ff6b6b" />
            <Text color="fg.muted" fontSize="sm">
              読み込み中...
            </Text>
          </VStack>
        </Flex>
      }
    >
      <PlaylistPageContent />
    </Suspense>
  );
}
