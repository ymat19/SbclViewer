'use client';

import {
  Box,
  Container,
  Heading,
  VStack,
  Text,
  NativeSelectRoot,
  NativeSelectField,
  Card,
  Flex,
  Spinner,
  Badge,
  Tabs,
  Button,
  createToaster,
  Toaster,
  ToastRoot,
  ToastTitle,
  ToastCloseTrigger,
  ToastActionTrigger,
  IconButton,
} from '@chakra-ui/react';
import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ListMusic, Music } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

import animeDataJson from '@/../public/data.json';
import { AnimeDetailDialog } from '@/components/AnimeDetailDialog';
import { SwipeableAnimeItem } from '@/components/SwipeableAnimeItem';
import { ColorModeButton } from '@/components/ui/color-mode';
import { useAnimeStatuses } from '@/hooks/useAnimeStatuses';
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';
import type { Anime, Song, ViewTab, AnimeStatus } from '@/types/anime';

const toaster = createToaster({
  placement: 'bottom',
  duration: 4000,
  max: 1,
});

function HomeContent() {
  useSpotifyAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentTab, setCurrentTab] = useState<ViewTab>('unselected');
  const { statuses: animeStatuses, setStatus: setAnimeStatus } = useAnimeStatuses();
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const animeData = animeDataJson as Anime[];
  const quarters = useMemo(
    () => Array.from(new Set(animeData.map((anime) => anime.quarter))).sort(),
    [animeData],
  );
  const selectedQuarterParam = searchParams.get('quarter');
  const defaultQuarter =
    quarters.find((q) => q === '2010q1') ?? quarters[quarters.length - 1] ?? '';
  const selectedQuarter = selectedQuarterParam ?? defaultQuarter;
  const playlistHref = `/playlist${selectedQuarter ? `?quarter=${encodeURIComponent(selectedQuarter)}` : ''}`;

  const handleSetStatus = (id: string, newStatus: AnimeStatus | null) => {
    const anime = animeData.find((a) => a.id === id);
    const previousStatus = animeStatuses.get(id) || null;
    setAnimeStatus(id, newStatus);
    const statusText =
      newStatus === 'watched' ? '視聴済み' : newStatus === 'unwatched' ? '未視聴' : '未選択';
    toaster.create({
      title: `${anime?.name} → ${statusText}`,
      type: 'success',
      action: {
        label: '元に戻す',
        onClick: () => {
          setAnimeStatus(id, previousStatus);
          toaster.create({
            title: '取り消しました',
            type: 'info',
            duration: 2000,
          });
        },
      },
    });
  };

  const setSelectedQuarter = (quarter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('quarter', quarter);
    router.push(`?${params.toString()}`);
  };

  const goToPreviousQuarter = () => {
    const currentIndex = quarters.indexOf(selectedQuarter);
    if (currentIndex > 0) {
      setSelectedQuarter(quarters[currentIndex - 1]);
    }
  };

  const goToNextQuarter = () => {
    const currentIndex = quarters.indexOf(selectedQuarter);
    if (currentIndex < quarters.length - 1) {
      setSelectedQuarter(quarters[currentIndex + 1]);
    }
  };

  const handleAnimeClick = (anime: Anime) => {
    setSelectedAnime(anime);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedAnime(null);
  };

  const quarterAnime = animeData.filter(
    (anime) => anime.quarter === selectedQuarter && anime.songs.length > 0,
  );

  const filteredAnime = quarterAnime.filter((anime) => {
    const status = animeStatuses.get(anime.id);
    if (currentTab === 'unselected') {
      return status === undefined;
    } else if (currentTab === 'watched') {
      return status === 'watched';
    } else {
      return status === 'unwatched';
    }
  });

  const watchedAnime = quarterAnime.filter((anime) => animeStatuses.get(anime.id) === 'watched');

  const allSongs: Array<Song & { animeName: string }> = watchedAnime.flatMap((anime) =>
    anime.songs.map((song) => ({
      ...song,
      animeName: anime.name,
    })),
  );

  const unwatchedCount = quarterAnime.filter(
    (anime) => animeStatuses.get(anime.id) === 'unwatched',
  ).length;
  const unselectedCount = quarterAnime.filter((anime) => !animeStatuses.has(anime.id)).length;
  const watchedCount = quarterAnime.filter(
    (anime) => animeStatuses.get(anime.id) === 'watched',
  ).length;

  return (
    <>
      <Toaster toaster={toaster}>
        {(toast) => (
          <ToastRoot key={toast.id} width="auto" maxW="90vw" p={2}>
            {toast.title && (
              <ToastTitle fontSize="sm" mb={0}>
                {toast.title}
              </ToastTitle>
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
      <AnimeDetailDialog anime={selectedAnime} open={isDialogOpen} onClose={handleCloseDialog} />
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
            {/* Compact Header */}
            <Flex justify="space-between" align="center" px={1}>
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
                  <Music size={16} color="#ff6b6b" />
                </Box>
                <Heading as="h1" size="md" lineHeight="1.2">
                  アニソン
                  <Text as="span" fontSize="xs" color="fg.muted" ml={1} fontWeight="normal">
                    Playlist
                  </Text>
                </Heading>
              </Flex>
              <Flex gap={1} align="center">
                <Button
                  asChild
                  size="sm"
                  bg="rgba(255, 107, 107, 0.15)"
                  color="#ff6b6b"
                  _hover={{ bg: 'rgba(255, 107, 107, 0.25)' }}
                  borderRadius="10px"
                  fontSize="xs"
                  h="34px"
                  px={3}
                >
                  <Link href={playlistHref}>
                    <ListMusic size={14} />
                    作成
                  </Link>
                </Button>
                <ColorModeButton />
              </Flex>
            </Flex>

            {/* Quarter Selector - Compact */}
            <Box className="glass-card" p={3} borderRadius="16px">
              <Flex gap={2} align="center">
                <IconButton
                  onClick={goToPreviousQuarter}
                  disabled={quarters.indexOf(selectedQuarter) === 0}
                  variant="ghost"
                  size="sm"
                  aria-label="Previous quarter"
                  color="fg.muted"
                  minW="36px"
                  h="36px"
                  borderRadius="10px"
                  _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <ChevronLeft size={18} />
                </IconButton>
                <NativeSelectRoot flex="1">
                  <NativeSelectField
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                    fontSize="sm"
                    h="36px"
                  >
                    {quarters.map((quarter) => (
                      <option key={quarter} value={quarter}>
                        {quarter}
                      </option>
                    ))}
                  </NativeSelectField>
                </NativeSelectRoot>
                <IconButton
                  onClick={goToNextQuarter}
                  disabled={quarters.indexOf(selectedQuarter) === quarters.length - 1}
                  variant="ghost"
                  size="sm"
                  aria-label="Next quarter"
                  color="fg.muted"
                  minW="36px"
                  h="36px"
                  borderRadius="10px"
                  _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <ChevronRight size={18} />
                </IconButton>
              </Flex>
            </Box>

            {/* Anime List with Tabs */}
            <Box overflow="hidden">
              <Tabs.Root
                value={currentTab}
                onValueChange={(e) => setCurrentTab(e.value as ViewTab)}
                variant="line"
                fitted
              >
                <Tabs.List borderBottomColor="rgba(255, 255, 255, 0.06)" gap={0}>
                  <Tabs.Trigger
                    value="unwatched"
                    py={3}
                    fontSize="sm"
                    color="fg.muted"
                    _selected={{ color: '#ff6b6b' }}
                  >
                    <Flex gap={1.5} align="center">
                      <Text whiteSpace="nowrap">未視聴</Text>
                      <Badge
                        fontSize="2xs"
                        px={1.5}
                        py={0}
                        borderRadius="full"
                        className="badge-coral"
                      >
                        {unwatchedCount}
                      </Badge>
                    </Flex>
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="unselected"
                    py={3}
                    fontSize="sm"
                    color="fg.muted"
                    _selected={{ color: '#ffb347' }}
                  >
                    <Flex gap={1.5} align="center">
                      <Text whiteSpace="nowrap">未選択</Text>
                      <Badge
                        fontSize="2xs"
                        px={1.5}
                        py={0}
                        borderRadius="full"
                        className="badge-amber"
                      >
                        {unselectedCount}
                      </Badge>
                    </Flex>
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="watched"
                    py={3}
                    fontSize="sm"
                    color="fg.muted"
                    _selected={{ color: '#4ecdc4' }}
                  >
                    <Flex gap={1.5} align="center">
                      <Text whiteSpace="nowrap">視聴済</Text>
                      <Badge
                        fontSize="2xs"
                        px={1.5}
                        py={0}
                        borderRadius="full"
                        className="badge-teal"
                      >
                        {watchedCount}
                      </Badge>
                    </Flex>
                  </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value={currentTab} pt={3} px={0}>
                  <Card.Root
                    maxH="50vh"
                    overflowY="auto"
                    bg="transparent"
                    border="none"
                    shadow="none"
                    className="custom-scroll"
                  >
                    {filteredAnime.length === 0 ? (
                      <Card.Body py={8}>
                        <Text color="fg.muted" textAlign="center" fontSize="sm">
                          該当する作品がありません
                        </Text>
                      </Card.Body>
                    ) : (
                      <VStack gap={2} align="stretch">
                        <AnimatePresence mode="popLayout">
                          {filteredAnime.map((anime) => (
                            <SwipeableAnimeItem
                              key={anime.id}
                              anime={anime}
                              currentTab={currentTab}
                              onSetStatus={handleSetStatus}
                              onClickAnime={handleAnimeClick}
                            />
                          ))}
                        </AnimatePresence>
                      </VStack>
                    )}
                  </Card.Root>
                </Tabs.Content>
              </Tabs.Root>
            </Box>

            {/* Songs List */}
            <Box>
              <Flex justify="space-between" align="center" mb={3} px={1}>
                <Heading as="h2" size="sm">
                  視聴済みの楽曲
                </Heading>
                <Badge fontSize="xs" px={2.5} py={0.5} borderRadius="full" className="badge-teal">
                  {allSongs.length}曲
                </Badge>
              </Flex>
              {allSongs.length === 0 ? (
                <Box className="glass-card" p={5} textAlign="center">
                  <Text color="fg.muted" fontSize="sm">
                    右スワイプで視聴済みに追加
                  </Text>
                </Box>
              ) : (
                <VStack gap={2} align="stretch">
                  {allSongs.map((song, index) => (
                    <Box key={index} className="glass-card" p={3}>
                      <Flex mb={1.5} gap={1.5} flexWrap="wrap" align="center">
                        <Badge fontSize="2xs" px={1.5} className="badge-teal">
                          {song.animeName}
                        </Badge>
                        <Badge
                          fontSize="2xs"
                          px={1.5}
                          bg="rgba(255, 255, 255, 0.06)"
                          color="fg.muted"
                        >
                          {song.type}
                        </Badge>
                      </Flex>
                      <Text fontWeight="medium" fontSize="sm" mb={0.5}>
                        {song.trackName}
                      </Text>
                      <VStack align="start" gap={0} fontSize="xs" color="fg.muted">
                        {song.artist && <Text>{song.artist}</Text>}
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              )}
            </Box>
          </VStack>
        </Container>
      </Box>
    </>
  );
}

export default function Home() {
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
      <HomeContent />
    </Suspense>
  );
}
