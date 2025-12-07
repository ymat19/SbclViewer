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
} from '@chakra-ui/react';
import { AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useMemo, useState } from 'react';

import { AnimeDetailDialog } from '@/components/AnimeDetailDialog';
import { SwipeableAnimeItem } from '@/components/SwipeableAnimeItem';
import { ColorModeButton } from '@/components/ui/color-mode';
import { useAnimeStatuses } from '@/hooks/useAnimeStatuses';
import type { Anime, Song, ViewTab, AnimeStatus } from '@/types/anime';
import animeDataJson from '@/../public/data.json';

const toaster = createToaster({
  placement: 'bottom',
  duration: 4000,
  max: 1, // 同時に1つのトーストのみ表示
});

function HomeContent() {
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

  // Enhanced setStatus with undo functionality
  const handleSetStatus = (id: string, newStatus: AnimeStatus | null) => {
    const anime = animeData.find((a) => a.id === id);
    const previousStatus = animeStatuses.get(id) || null;

    // Set the new status
    setAnimeStatus(id, newStatus);

    // Show toast with undo option
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

  // Update URL when quarter changes
  const setSelectedQuarter = (quarter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('quarter', quarter);
    router.push(`?${params.toString()}`);
  };

  // Navigate to previous quarter
  const goToPreviousQuarter = () => {
    const currentIndex = quarters.indexOf(selectedQuarter);
    if (currentIndex > 0) {
      setSelectedQuarter(quarters[currentIndex - 1]);
    }
  };

  // Navigate to next quarter
  const goToNextQuarter = () => {
    const currentIndex = quarters.indexOf(selectedQuarter);
    if (currentIndex < quarters.length - 1) {
      setSelectedQuarter(quarters[currentIndex + 1]);
    }
  };

  // Handle anime click to show details
  const handleAnimeClick = (anime: Anime) => {
    setSelectedAnime(anime);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedAnime(null);
  };

  // Filter anime by selected quarter and exclude anime without songs
  const quarterAnime = animeData.filter(
    (anime) => anime.quarter === selectedQuarter && anime.songs.length > 0,
  );

  // Filter by current tab
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

  // Get watched anime for song list
  const watchedAnime = quarterAnime.filter((anime) => animeStatuses.get(anime.id) === 'watched');

  // Get all songs from watched anime
  const allSongs: Array<Song & { animeName: string }> = watchedAnime.flatMap((anime) =>
    anime.songs.map((song) => ({
      ...song,
      animeName: anime.name,
    })),
  );

  // Count anime in each tab
  const unwatchedCount = quarterAnime.filter((anime) => animeStatuses.get(anime.id) === 'unwatched')
    .length;
  const unselectedCount = quarterAnime.filter((anime) => !animeStatuses.has(anime.id)).length;
  const watchedCount = quarterAnime.filter((anime) => animeStatuses.get(anime.id) === 'watched')
    .length;

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
      <Box minH="100vh" bg="bg.canvas" color="fg.default" py={4} px={4}>
        <Container maxW="6xl">
          <VStack gap={6} align="stretch">
            <Flex justify="space-between" align="center" gap={4}>
              <Heading as="h1" size={{ base: 'lg', md: '2xl' }}>
                Anime Song Playlist Creator
              </Heading>
              <Flex gap={2} align="center">
                <Link href={playlistHref} passHref legacyBehavior>
                  <Button as="a" colorScheme="blue" size={{ base: 'sm', md: 'md' }}>
                    プレイリストを作成
                  </Button>
                </Link>
                <ColorModeButton />
              </Flex>
            </Flex>

            {/* Quarter Selector */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
                Select Quarter:
              </Text>
              <Flex gap={2} align="center" maxW={{ base: 'full', md: '2xl' }}>
                <Button
                  onClick={goToPreviousQuarter}
                  disabled={quarters.indexOf(selectedQuarter) === 0}
                  variant="outline"
                  size="md"
                  aria-label="Previous quarter"
                >
                  ←
                </Button>
                <NativeSelectRoot flex="1" maxW={{ base: 'full', md: 'xs' }}>
                  <NativeSelectField
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                    bg="bg.surface"
                    color="fg.default"
                  >
                    {quarters.map((quarter) => (
                      <option key={quarter} value={quarter}>
                        {quarter}
                      </option>
                    ))}
                  </NativeSelectField>
                </NativeSelectRoot>
                <Button
                  onClick={goToNextQuarter}
                  disabled={quarters.indexOf(selectedQuarter) === quarters.length - 1}
                  variant="outline"
                  size="md"
                  aria-label="Next quarter"
                >
                  →
                </Button>
              </Flex>
            </Box>

            {/* Anime List with Tabs */}
            <Box overflow="hidden">
              <Heading as="h2" size={{ base: 'md', md: 'lg' }} mb={4}>
                Anime List
              </Heading>
              <Tabs.Root
                value={currentTab}
                onValueChange={(e) => setCurrentTab(e.value as ViewTab)}
                variant="enclosed"
                fitted={false}
              >
                <Tabs.List mx={-1}>
                  <Tabs.Trigger value="unwatched">
                    <Flex gap={2} align="center">
                      <Text whiteSpace="nowrap">未視聴</Text>
                      <Badge colorScheme="red" borderRadius="full">
                        {unwatchedCount}
                      </Badge>
                    </Flex>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="unselected">
                    <Flex gap={2} align="center">
                      <Text whiteSpace="nowrap">未選択</Text>
                      <Badge colorScheme="gray" borderRadius="full">
                        {unselectedCount}
                      </Badge>
                    </Flex>
                  </Tabs.Trigger>
                  <Tabs.Trigger value="watched">
                    <Flex gap={2} align="center">
                      <Text whiteSpace="nowrap">視聴済み</Text>
                      <Badge colorScheme="green" borderRadius="full">
                        {watchedCount}
                      </Badge>
                    </Flex>
                  </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value={currentTab} pt={4}>
                  <Card.Root maxH="md" overflowY="auto" bg="bg.surface" borderWidth="1px" borderColor="border.default">
                    {filteredAnime.length === 0 ? (
                      <Card.Body>
                        <Text color="fg.muted">このクォーターに該当する作品がありません。</Text>
                      </Card.Body>
                    ) : (
                      <VStack gap={0} align="stretch" divideY="1px">
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
              <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={2}>
                <Heading as="h2" size={{ base: 'md', md: 'lg' }}>
                  Songs from Watched Anime
                </Heading>
                <Badge
                  colorScheme="green"
                  fontSize={{ base: 'xs', md: 'sm' }}
                  px={3}
                  py={1}
                  borderRadius="full"
                >
                  {allSongs.length} songs
                </Badge>
              </Flex>
              <Card.Root bg="bg.surface" borderWidth="1px" borderColor="border.default">
                {allSongs.length === 0 ? (
                  <Card.Body>
                    <Text color="fg.muted">
                      Select anime to see their songs. Swipe right to add, swipe left to remove.
                    </Text>
                  </Card.Body>
                ) : (
                  <VStack gap={0} align="stretch" divideY="1px">
                    {allSongs.map((song, index) => (
                      <Box key={index} p={4}>
                        <Flex mb={1} gap={2} flexWrap="wrap" align="center">
                          <Badge colorScheme="blue" fontSize="xs">
                            {song.animeName}
                          </Badge>
                          <Badge colorScheme="gray" fontSize="xs">
                            {song.type}
                          </Badge>
                        </Flex>
                        <Text fontWeight="medium" mb={1}>
                          {song.trackName}
                        </Text>
                        <VStack align="start" gap={0} fontSize="sm" color="fg.muted">
                          {song.artist && <Text>Artist: {song.artist}</Text>}
                          {song.composer && <Text>Composer: {song.composer}</Text>}
                          {song.lyrics && <Text>Lyrics: {song.lyrics}</Text>}
                          {song.arranger && <Text>Arranger: {song.arranger}</Text>}
                        </VStack>
                      </Box>
                    ))}
                  </VStack>
                )}
              </Card.Root>
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
        <Flex minH="100vh" alignItems="center" justifyContent="center">
          <VStack gap={4}>
            <Spinner size="xl" color="blue.500" />
            <Text color="fg.muted">Loading...</Text>
          </VStack>
        </Flex>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
